// NewCommitment — /commitments/new (Zone 2, no shell chrome)
// Discrete 4-step wizard: Compose -> Context -> Plan -> Companion
//
// Navigation:
//   Bottom-center floating island: Back / Continue (Step N of 4)
//   Top-right index island: clickable step list, highlights active, tick on satisfied steps
//
// Companion step holds the primary "Start commitment" CTA (Continue becomes Start commitment).
// Cancel is always inert (no persona PATCH, no create, no API call) until Start commitment.
//
// Motion: step panels cross-fade + rise 8px on step change, gated by prefers-reduced-motion.

import { Check, Lock, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { MOCK_AUTH } from '../auth/api'
import { createCommitment, patchCommitment, startCommitment } from '../commitments/api'
import { useDemoTour } from '../demo/DemoTour'
import { listPersonas } from '../mock/provider'
import type { Persona } from '../types/api'
import { Button } from '../ui/Button'
import { DatePicker } from '../ui/DatePicker'
import type { SelectOption } from '../ui/Select'
import { Select } from '../ui/Select'
import { Tooltip } from '../ui/Tooltip'
import { PERSONA_PORTRAITS } from './personaPortraits'

// Hard-coded action enum (Q4 recommended set, matches mockActiveCommitment.action default).
const ACTION_OPTIONS = ['complete', 'finish', 'ship', 'write', 'build', 'submit'] as const
type Action = (typeof ACTION_OPTIONS)[number]
const ACTION_SELECT_OPTIONS: SelectOption[] = ACTION_OPTIONS.map((a) => ({ value: a, label: a }))

// evidence_type is now chosen per-submission in the workspace check-in/finish flow.
// GitHub repo field is still optionally configurable here for high-trust evidence (Q7).

// Step order: Compose -> Plan -> Companion (Context intake moved to workspace, PO decision 1)
const STEPS = ['nc-compose', 'nc-plan', 'nc-companion'] as const
type StepId = (typeof STEPS)[number]

// Local draft shape for plan-step fields (held locally; NO API writes until handleStart).
interface DraftPlan {
  cadence: string
  evidence_config: Record<string, unknown> | null // github repo config only; evidence_type chosen in workspace
  stake_enabled: boolean
  stake_contact_name: string
  stake_contact_email: string
  notify_email: string // X-NOTIF: the user's own reminder email (mandatory)
}

const DEFAULT_DRAFT_PLAN: DraftPlan = {
  cadence: 'daily',
  evidence_config: null,
  stake_enabled: false,
  stake_contact_name: '',
  stake_contact_email: '',
  notify_email: ''
}

// Shared lenient email check (X-NOTIF): reminder email + stake witness email.
const isValidEmail = (value: string): boolean => /\S+@\S+\.\S+/.test(value)
const MYT_OFFSET_HOURS = 8

// NOW + 1 hour in UTC, returned as a local MYT datetime-local string for the DatePicker.
function demoDeadlineLocal(): string {
  const utc = new Date(Date.now() + 60 * 60 * 1000)
  const myt = new Date(utc.getTime() + MYT_OFFSET_HOURS * 60 * 60 * 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    `${myt.getUTCFullYear()}-${pad(myt.getUTCMonth() + 1)}-${pad(myt.getUTCDate())}` +
    `T${pad(myt.getUTCHours())}:${pad(myt.getUTCMinutes())}`
  )
}

function mytWallClockToUtcInstant(value: string): Date | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/)
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const hour = Number(match[4])
  const minute = Number(match[5])

  if (month < 1 || month > 12 || hour > 23 || minute > 59) return null

  const wallDate = new Date(Date.UTC(year, month - 1, day, hour, minute))
  if (
    wallDate.getUTCFullYear() !== year ||
    wallDate.getUTCMonth() !== month - 1 ||
    wallDate.getUTCDate() !== day ||
    wallDate.getUTCHours() !== hour ||
    wallDate.getUTCMinutes() !== minute
  ) {
    return null
  }

  return new Date(Date.UTC(year, month - 1, day, hour - MYT_OFFSET_HOURS, minute))
}

// ── StepPanel: fade+rise animation on step entry ─────────────────────────────

function StepPanel({ children, id, active }: { children: React.ReactNode; id: StepId; active: boolean }) {
  const prefersReduced = useRef(window.matchMedia('(prefers-reduced-motion: reduce)').matches)

  const className = prefersReduced.current
    ? `nc-step-panel${active ? ' nc-step-panel-active' : ''}`
    : `nc-step-panel nc-step-panel-motion${active ? ' nc-step-panel-active' : ''}`

  return (
    <section id={id} className={className} aria-hidden={!active}>
      {children}
    </section>
  )
}

// ── IndexIsland: top-right step index, click jumps to step ───────────────────

interface IslandStep {
  id: StepId
  label: string
  done: boolean
}

function IndexIsland({
  steps,
  activeStep,
  onJump
}: {
  steps: IslandStep[]
  activeStep: StepId
  onJump: (id: StepId) => void
}) {
  return (
    <nav className="nc-island" aria-label="On this page">
      <p className="nc-island-heading">On this page</p>
      <ul className="nc-island-list">
        {steps.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              className={`nc-island-link${activeStep === s.id ? ' nc-island-link-active' : ''}`}
              onClick={() => onJump(s.id)}
            >
              <span className="nc-island-label">{s.label}</span>
              {s.done && (
                <span className="nc-island-tick">
                  <Check size={11} aria-hidden="true" />
                  <span className="sr-only">complete</span>
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}

// ── BottomNavIsland: Back / Continue / step counter ──────────────────────────

interface BottomNavProps {
  stepIndex: number
  totalSteps: number
  onBack: () => void
  onContinue: () => void
  isFinalStep: boolean
  starting: boolean
  continueDisabled: boolean
}

function BottomNavIsland({
  stepIndex,
  totalSteps,
  onBack,
  onContinue,
  isFinalStep,
  starting,
  continueDisabled
}: BottomNavProps) {
  return (
    <nav className="nc-bottom-island" aria-label="Step navigation">
      <button
        type="button"
        className="nc-bottom-back"
        onClick={onBack}
        disabled={stepIndex === 0}
        aria-label="Go to previous step"
      >
        Back
      </button>
      <span className="nc-bottom-counter" aria-live="polite">
        Step {stepIndex + 1} of {totalSteps}
      </span>
      <Button variant={isFinalStep ? 'accent' : 'primary'} onClick={onContinue} disabled={continueDisabled || starting}>
        {isFinalStep ? (starting ? 'Starting...' : 'Start commitment') : 'Continue'}
      </Button>
    </nav>
  )
}

// ── ComposeSection: inline mad-lib sentence constructor ───────────────────────

interface ComposeSectionProps {
  action: Action
  setAction: (a: Action) => void
  deliverable: string
  setDeliverable: (d: string) => void
  deadlineLocal: string
  setDeadlineLocal: (d: string) => void
  composeError: string | null
  demoMode: boolean
  active: boolean
}

// Soft cap on the deliverable phrase so commitments stay short and scannable.
const DELIVERABLE_WORD_LIMIT = 10

function countWords(s: string): number {
  const t = s.trim()
  return t ? t.split(/\s+/).length : 0
}

function ComposeSection({
  action,
  setAction,
  deliverable,
  setDeliverable,
  deadlineLocal,
  setDeadlineLocal,
  composeError,
  demoMode,
  active
}: ComposeSectionProps) {
  const deliverableWords = countWords(deliverable)
  return (
    <StepPanel id="nc-compose" active={active}>
      <div className="nc-section-inner">
        <h2 className="nc-section-heading">Make your commitment</h2>

        {/* Inline mad-lib sentence: "I will [verb] [the deliverable] by [date]" */}
        <div className="nc-madlib">
          <span className="nc-madlib-prose">I will</span>
          <span className="nc-madlib-field">
            <label className="sr-only" htmlFor="nc-action-trigger">
              Action verb
            </label>
            <Select
              aria-label="Choose action"
              value={action}
              onChange={(v) => setAction(v as Action)}
              options={ACTION_SELECT_OPTIONS}
            />
          </span>
          <span className="nc-madlib-field nc-madlib-deliverable-wrap">
            <label className="sr-only" htmlFor="nc-deliverable">
              the deliverable
            </label>
            <input
              id="nc-deliverable"
              data-tour="commitment-deliverable"
              className="nc-madlib-input"
              type="text"
              placeholder="what you will deliver"
              value={deliverable}
              onChange={(e) => {
                const next = e.target.value
                const words = next.trim().split(/\s+/).filter(Boolean)
                // Cap at the word limit by trimming to the first N words (handles typing + paste).
                setDeliverable(
                  words.length <= DELIVERABLE_WORD_LIMIT ? next : words.slice(0, DELIVERABLE_WORD_LIMIT).join(' ')
                )
              }}
              autoComplete="off"
              readOnly={demoMode}
              style={demoMode ? { cursor: 'not-allowed' } : undefined}
            />
            <span
              className={`nc-deliverable-counter${deliverableWords >= DELIVERABLE_WORD_LIMIT ? ' nc-deliverable-counter--full' : ''}`}
              aria-hidden="true"
            >
              {deliverableWords}/{DELIVERABLE_WORD_LIMIT}
            </span>
          </span>
          <span className="nc-madlib-prose">by</span>
          <span className="nc-madlib-field">
            {demoMode ? (
              <span className="nc-demo-deadline">
                <DatePicker value={deadlineLocal} onChange={setDeadlineLocal} aria-label="Demo deadline" disabled />
              </span>
            ) : (
              <>
                <label className="sr-only" htmlFor="nc-deadline-trigger">
                  Deadline date
                </label>
                <DatePicker value={deadlineLocal} onChange={setDeadlineLocal} aria-label="Choose deadline" />
              </>
            )}
          </span>
        </div>

        {composeError && <p className="compose-error">{composeError}</p>}

        {/* Live sentence preview */}
        <p className="nc-sentence-preview">
          I will <em>{action}</em> {deliverable || 'the deliverable'}{' '}
          {deadlineLocal
            ? `by ${new Date(deadlineLocal).toLocaleDateString('en-MY', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                timeZone: 'Asia/Kuala_Lumpur'
              })}`
            : 'by the deadline'}
        </p>
      </div>
    </StepPanel>
  )
}

// ── PlanSection ───────────────────────────────────────────────────────────────
// Purely local-state — NO API calls here. All changes are held in draft until
// handleStart fires. Cancel at any point writes nothing to the server.

interface PlanSectionProps {
  draft: DraftPlan
  onDraftChange: (d: DraftPlan) => void
  action: string
  deliverable: string
  deadlineLocal: string
  stakeContactValid: boolean
  notifyEmailError: string | null
  active: boolean
  demoMode: boolean
}

function PlanSection({
  draft,
  onDraftChange,
  action,
  deliverable,
  deadlineLocal,
  stakeContactValid,
  notifyEmailError,
  active,
  demoMode
}: PlanSectionProps) {
  // Demo mode prefills + locks every plan field for a stable walkthrough.
  const lockedInput = demoMode ? { readOnly: true as const, style: { cursor: 'not-allowed' } } : {}
  const repo =
    draft.evidence_config !== null && typeof draft.evidence_config?.repo === 'string'
      ? (draft.evidence_config.repo as string)
      : ''

  const deadlineDisplay = deadlineLocal
    ? new Date(deadlineLocal).toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' })
    : ''

  return (
    <StepPanel id="nc-plan" active={active}>
      <div className="nc-section-inner">
        <h2 className="nc-section-heading">Your plan</h2>

        {/* Locked identity fields (hard fields set in Compose - AI-read-only, TR-25/26) */}
        <div className="plan-locked-fields">
          <p className="plan-locked-note">
            <Lock
              size={13}
              aria-hidden="true"
              style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }}
            />
            Only you can change these. Kawan reads them but never edits them.
          </p>
          <div className="plan-locked-row">
            <span className="plan-locked-label">Action</span>
            <span className="plan-locked-value">{action}</span>
          </div>
          <div className="plan-locked-row">
            <span className="plan-locked-label">Deliverable</span>
            <span className="plan-locked-value">{deliverable}</span>
          </div>
          <div className="plan-locked-row">
            <span className="plan-locked-label">Deadline</span>
            <span className="plan-locked-value">{deadlineDisplay}</span>
          </div>
        </div>

        {/* Safe hard-field GUI controls (GUI-set, user session, never AI - TR-25/26) */}
        {/* Un-boxed: dropdowns stand alone, no surrounding container */}
        <div className="nc-plan-settings">
          {/* GitHub repo field - shown always for optional high-trust evidence config (Q7) */}
          <div className="plan-setting-row plan-setting-repo">
            <span className="plan-setting-label">
              GitHub repo
              <Tooltip text="Optional. If you add your repo, Kawan can reference your commits when you check in." />
            </span>
            <input
              className="plan-setting-input"
              type="text"
              placeholder="owner/repo (optional)"
              aria-label="GitHub repository (owner/repo)"
              defaultValue={repo}
              onBlur={(e) => {
                const val = e.target.value.trim()
                if (val !== repo) {
                  onDraftChange({ ...draft, evidence_config: val ? { repo: val } : null })
                }
              }}
              {...lockedInput}
            />
          </div>

          {/* Terms — email-witness stake (spec §5.2 step 3b). Monetary stake is [ROADMAP]. */}
          <div className="plan-setting-row">
            <div>
              <span className="plan-setting-label">Add a witness</span>
              <p className="toggle-sub">If you miss this, we tell someone you name. Email only.</p>
            </div>
            <button
              type="button"
              aria-pressed={draft.stake_enabled}
              aria-label="Toggle witness stake"
              className={`toggle-btn${draft.stake_enabled ? ' toggle-btn-on' : ''}`}
              onClick={() => onDraftChange({ ...draft, stake_enabled: !draft.stake_enabled })}
              disabled={demoMode}
              style={demoMode ? { cursor: 'not-allowed' } : undefined}
            >
              <span className="toggle-knob" />
            </button>
          </div>

          {draft.stake_enabled && (
            <div className="plan-setting-row plan-setting-repo">
              <span className="plan-setting-label">Witness name</span>
              <input
                className="plan-setting-input"
                type="text"
                placeholder="Full name"
                aria-label="Witness contact name"
                value={draft.stake_contact_name}
                onChange={(e) => onDraftChange({ ...draft, stake_contact_name: e.target.value })}
                {...lockedInput}
              />
            </div>
          )}

          {draft.stake_enabled && (
            <div className="plan-setting-row plan-setting-repo">
              <span className="plan-setting-label">Witness email</span>
              <input
                className="plan-setting-input"
                type="email"
                placeholder="email@example.com"
                aria-label="Witness contact email"
                value={draft.stake_contact_email}
                onChange={(e) => onDraftChange({ ...draft, stake_contact_email: e.target.value })}
                {...lockedInput}
              />
              {!stakeContactValid && (draft.stake_contact_name.trim() || draft.stake_contact_email) && (
                <p className="compose-error">Enter a witness name and a valid email, or turn off the witness toggle.</p>
              )}
            </div>
          )}

          {/* X-NOTIF (ADR-0006): mandatory per-commitment reminder email — the user's OWN
              address, distinct from the witness above. */}
          <div className="plan-setting-row plan-setting-repo">
            <span className="plan-setting-label">
              Reminder email{' '}
              <span className="plan-required-mark" aria-hidden="true">
                *
              </span>
            </span>
            <p className="toggle-sub">Required. We&apos;ll email you when it&apos;s time to check in.</p>
            <input
              className="plan-setting-input"
              type="email"
              placeholder="you@example.com"
              aria-label="Your reminder email (required)"
              value={draft.notify_email}
              onChange={(e) => onDraftChange({ ...draft, notify_email: e.target.value })}
              {...lockedInput}
            />
            {notifyEmailError && <p className="compose-error">{notifyEmailError}</p>}
          </div>
        </div>
      </div>
    </StepPanel>
  )
}

// ── CompanionSection: horizontal cube-card grid ───────────────────────────────
// Always horizontal at every width - horizontal scroll + scroll-snap on narrow screens.
// portrait image + name + role + short description per card.
// "Start commitment" CTA is surfaced via the bottom-center nav island on this step.

interface CompanionSectionProps {
  selectedPersona: Persona | null
  onSelect: (p: Persona) => void
  startError: string | null
  composeValid: boolean
  active: boolean
}

function PersonaPortrait({ persona, name }: { persona: Persona; name: string }) {
  const [imgFailed, setImgFailed] = useState(false)
  const initial = name.charAt(0).toUpperCase()

  if (imgFailed) {
    return (
      <div className="nc-companion-portrait-fallback" aria-hidden="true">
        {initial}
      </div>
    )
  }

  return (
    <img
      className="nc-companion-portrait-img"
      src={PERSONA_PORTRAITS[persona]}
      alt={`Portrait of ${name}`}
      onError={() => setImgFailed(true)}
      loading="lazy"
    />
  )
}

function CompanionSection({ selectedPersona, onSelect, startError, composeValid, active }: CompanionSectionProps) {
  const personas = listPersonas()

  return (
    <StepPanel id="nc-companion" active={active}>
      <div className="nc-section-inner">
        <h2 className="nc-section-heading">Choose your companion</h2>
        <p className="nc-companion-sub">
          Your companion checks in with you, reviews your evidence, and gives you a verdict. Pick the one that fits how
          you want to be held to account.
        </p>

        {/* Horizontal cube-card grid - always horizontal, scroll-snap on narrow */}
        <div className="nc-companion-grid">
          {personas.map((p) => {
            const isSelected = selectedPersona !== null && selectedPersona === p.id
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={isSelected}
                className={`nc-companion-card${isSelected ? ' nc-companion-card-selected' : ''}`}
                onClick={() => onSelect(p.id as Persona)}
              >
                <div className="nc-companion-portrait">
                  <PersonaPortrait persona={p.id as Persona} name={p.name} />
                </div>
                <div className="nc-companion-card-body">
                  <p className="nc-companion-name">{p.name}</p>
                  <p className="nc-companion-archetype">{p.archetype}</p>
                  <p className="nc-companion-tone">{p.tone}</p>
                </div>
                {isSelected && (
                  <div className="nc-companion-check" aria-hidden="true">
                    <Check size={12} />
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {startError && <p className="compose-error">{startError}</p>}

        {!composeValid && <p className="nc-cta-hint">Fill in the Compose step before starting.</p>}
      </div>
    </StepPanel>
  )
}

// ── NewCommitment (root page) ─────────────────────────────────────────────────

export function NewCommitment() {
  const navigate = useNavigate()
  const { setPersona } = useAuth()
  const { active: demoActive, currentStep, setDemoCommitmentId, setOverride } = useDemoTour()

  // Current step index (0 = Compose, 1 = Plan, 2 = Companion)
  const [stepIndex, setStepIndex] = useState(0)
  const activeStep = STEPS[stepIndex]

  // Demo: the Create-step spotlight highlights only the "Make your commitment" (Compose) sub-step.
  // On the Plan/Companion sub-steps, blank the spotlight so the outline + annotation don't linger.
  useEffect(() => {
    if (!demoActive || currentStep !== 1) return
    setOverride(activeStep === 'nc-compose' ? null : { hintText: '' })
    return () => setOverride(null)
  }, [demoActive, currentStep, activeStep, setOverride])

  // Companion selection - starts unset; user must actively choose.
  // NO setPersona call here; committed only in handleStart.
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null)

  // Compose state - lifted so it persists across steps and feeds handleStart.
  // NO API calls until the final "Start commitment" - Cancel at any prior point is inert.
  const [action, setAction] = useState<Action>('complete')
  // Demo mode prefills the deliverable so the walkthrough is stable and consistent.
  const [deliverable, setDeliverable] = useState(() => (demoActive ? 'my portfolio website' : ''))
  // Demo mode: deadline is locked to NOW+1h (MYT); normal mode: user picks via DatePicker.
  const [deadlineLocal, setDeadlineLocal] = useState(() => (demoActive ? demoDeadlineLocal() : ''))
  const [composeError, setComposeError] = useState<string | null>(null)

  // Plan draft - held locally; NO API writes until handleStart. Demo mode prefills every field
  // (repo, witness, reminder email) so the walkthrough showcases a complete plan without typing.
  const [draftPlan, setDraftPlan] = useState<DraftPlan>(() =>
    demoActive
      ? {
          ...DEFAULT_DRAFT_PLAN,
          evidence_config: { repo: 'kawan-demo/portfolio' },
          stake_enabled: true,
          stake_contact_name: 'Alex Tan',
          stake_contact_email: 'alex@example.com',
          notify_email: 'demo@kawan.app'
        }
      : { ...DEFAULT_DRAFT_PLAN }
  )
  // Track whether the user has attempted to advance from the plan step (for error visibility).
  const [planTouched, setPlanTouched] = useState(false)

  // Start commitment state
  const [starting, setStarting] = useState(false)
  const [startError, setStartError] = useState<string | null>(null)

  // Compose validity for step tick + CTA guard.
  function isComposeValid(): boolean {
    if (!deliverable.trim()) return false
    if (!deadlineLocal) return false
    const dl = mytWallClockToUtcInstant(deadlineLocal)
    if (dl === null) return false
    if (dl <= new Date()) return false
    return true
  }

  const composeValid = isComposeValid()

  // Whether the stake witness contact is complete and valid (name + valid email).
  const stakeContactValid = Boolean(draftPlan.stake_contact_name.trim() && isValidEmail(draftPlan.stake_contact_email))
  // True when the toggle is on but the contact is incomplete — blocks Start.
  const stakeIncomplete = draftPlan.stake_enabled && !stakeContactValid
  // Reminder email is mandatory: empty or invalid both block Start (X-NOTIF).
  const notifyEmailEmpty = draftPlan.notify_email.trim() === ''
  const notifyEmailInvalid = !notifyEmailEmpty && !isValidEmail(draftPlan.notify_email)
  const notifyEmailBlocked = notifyEmailEmpty || notifyEmailInvalid
  // Inline error shown after the user has touched the plan step.
  const notifyEmailError = planTouched
    ? notifyEmailEmpty
      ? 'A reminder email is required.'
      : notifyEmailInvalid
        ? 'Enter a valid email address.'
        : null
    : notifyEmailInvalid
      ? 'Enter a valid email address.'
      : null

  // Island steps with completion state
  const planDone = !notifyEmailBlocked && !stakeIncomplete
  const islandSteps: IslandStep[] = [
    { id: 'nc-compose', label: 'Compose', done: composeValid },
    { id: 'nc-plan', label: 'Plan', done: planDone },
    { id: 'nc-companion', label: 'Companion', done: selectedPersona !== null }
  ]

  const isFinalStep = stepIndex === STEPS.length - 1

  // ── Cancel - fully inert: NO API calls, NO persona writes ────────────────
  // Because createCommitment is deferred to handleStart, Cancel at any point
  // leaves the server and localStorage byte-for-byte unchanged.
  function handleCancel() {
    navigate('/home')
  }

  function handleBack() {
    if (stepIndex > 0) setStepIndex(stepIndex - 1)
  }

  function handleContinue() {
    if (isFinalStep) {
      handleStart()
    } else {
      // Mark plan touched when leaving the plan step so inline errors appear.
      if (activeStep === 'nc-plan') setPlanTouched(true)
      setStepIndex(stepIndex + 1)
    }
  }

  // ── Start commitment - first and only API write in the entire flow ─────────
  async function handleStart() {
    if (starting) return

    // Validate compose before writing anything
    if (!deliverable.trim()) {
      setComposeError('Please describe what you will deliver.')
      setStepIndex(0)
      return
    }
    if (!deadlineLocal) {
      setComposeError('Please pick a deadline.')
      setStepIndex(0)
      return
    }
    const deadlineDate = mytWallClockToUtcInstant(deadlineLocal)
    if (deadlineDate === null) {
      setComposeError('Please pick a valid deadline.')
      setStepIndex(0)
      return
    }
    if (deadlineDate <= new Date()) {
      setComposeError('Deadline must be in the future.')
      setStepIndex(0)
      return
    }
    const diffMs = deadlineDate.getTime() - Date.now()
    // The demo locks the deadline to NOW+1h, so skip the under-an-hour confirm there to keep
    // the guided walkthrough uninterrupted.
    if (diffMs < 60 * 60 * 1000 && !demoActive) {
      if (!window.confirm("That's under an hour. Are you sure?")) return
    }

    if (selectedPersona === null) {
      setStartError('Please choose a companion.')
      return
    }

    // Mandatory reminder email validation at submit time.
    if (notifyEmailBlocked) {
      setPlanTouched(true)
      setStepIndex(1) // jump back to the plan step
      return
    }

    if (MOCK_AUTH) {
      await setPersona(selectedPersona)
      navigate('/workspace/mock')
      return
    }

    setStarting(true)
    setStartError(null)
    const deadlineISO = deadlineDate.toISOString()
    try {
      // 1. Create the commitment (first write)
      let created: Awaited<ReturnType<typeof createCommitment>>
      try {
        created = await createCommitment({ action, deliverable, deadline: deadlineISO })
        if (demoActive) setDemoCommitmentId(created.id)
      } catch (err) {
        const status = err instanceof Error ? (err as Error & { status?: number }).status : undefined
        const msg = err instanceof Error ? err.message : ''
        if (status === 409 || msg.includes('409')) {
          setStartError('You can have at most 3 active commitments at once. Complete or end one first.')
        } else {
          setStartError(msg || 'Failed to create commitment. Please try again.')
        }
        setStarting(false)
        return
      }
      // 2. Apply plan-step settings (cadence / evidence_config / stake / notify_email) if needed.
      // evidence_type and skip_days_total are no longer set by the create UI; server defaults apply.
      // stakeContactValid is pre-checked above; stakeIncomplete blocks reaching here.
      const stakeValid = Boolean(draftPlan.stake_enabled && stakeContactValid)
      const notifyEmail = draftPlan.notify_email.trim()
      const needsPatch =
        draftPlan.cadence !== created.cadence || draftPlan.evidence_config !== null || stakeValid || notifyEmail !== ''
      if (needsPatch) {
        const patchBody: Parameters<typeof patchCommitment>[1] = {
          cadence: draftPlan.cadence,
          evidence_config: draftPlan.evidence_config as Record<string, unknown> | undefined
        }
        if (stakeValid) {
          patchBody.stake_enabled = true
          patchBody.stake_contact_name = draftPlan.stake_contact_name.trim()
          patchBody.stake_contact_email = draftPlan.stake_contact_email.trim()
        }
        if (notifyEmail) patchBody.notify_email = notifyEmail
        await patchCommitment(created.id, patchBody)
      }
      // 3. Start the commitment (draft to active)
      await startCommitment(created.id)
      // 4. Persist persona selection ONLY on full success
      await setPersona(selectedPersona)
      navigate(`/workspace/${created.id}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to start commitment. Please try again.'
      setStartError(msg)
    } finally {
      setStarting(false)
    }
  }

  // The final step's Continue becomes Start commitment; requires composeValid + companion selected + no plan errors.
  const continueDisabled =
    isFinalStep && (!composeValid || selectedPersona === null || stakeIncomplete || notifyEmailBlocked)

  return (
    <div className="workspace-root nc-root">
      {/* Fixed topbar with Cancel only */}
      <div className="workspace-topbar">
        <button type="button" className="workspace-back-btn" aria-label="Cancel and go back" onClick={handleCancel}>
          <X size={14} aria-hidden="true" /> Cancel
        </button>
        <div className="nc-topbar-title">New commitment</div>
        <div className="workspace-spacer" aria-hidden="true" />
      </div>

      {/* Page body: step content + pinned index island */}
      <div className="nc-body">
        {/* Step panels — only the active one is shown */}
        <div className="nc-steps">
          <ComposeSection
            action={action}
            setAction={setAction}
            deliverable={deliverable}
            setDeliverable={setDeliverable}
            deadlineLocal={deadlineLocal}
            setDeadlineLocal={setDeadlineLocal}
            composeError={composeError}
            demoMode={demoActive}
            active={activeStep === 'nc-compose'}
          />
          <PlanSection
            draft={draftPlan}
            onDraftChange={setDraftPlan}
            action={action}
            deliverable={deliverable}
            deadlineLocal={deadlineLocal}
            stakeContactValid={stakeContactValid}
            notifyEmailError={notifyEmailError}
            active={activeStep === 'nc-plan'}
            demoMode={demoActive}
          />
          <CompanionSection
            selectedPersona={selectedPersona}
            onSelect={setSelectedPersona}
            startError={startError}
            composeValid={composeValid}
            active={activeStep === 'nc-companion'}
          />
        </div>

        {/* Top-right index island — clickable step index (hidden under 900px) */}
        <div className="nc-island-col">
          <IndexIsland steps={islandSteps} activeStep={activeStep} onJump={(id) => setStepIndex(STEPS.indexOf(id))} />
        </div>
      </div>

      {/* Bottom-center floating navigation island */}
      <BottomNavIsland
        stepIndex={stepIndex}
        totalSteps={STEPS.length}
        onBack={handleBack}
        onContinue={handleContinue}
        isFinalStep={isFinalStep}
        starting={starting}
        continueDisabled={continueDisabled}
      />
    </div>
  )
}
