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

import { Check, Clock, Lock, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { MOCK_AUTH } from '../auth/api'
import { createCommitment, patchCommitment, startCommitment } from '../commitments/api'
import { listPersonas } from '../mock/provider'
import type { EvidenceType, Persona } from '../types/api'
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

// Cadence options — daily presets only (scheduler collapses non-daily to daily, spec §7.3).
const CADENCE_OPTIONS: SelectOption[] = [
  { value: 'daily_evening', label: 'Daily (evening)' },
  { value: 'daily', label: 'Daily' }
]

// Evidence options (Q7 - include github with repo field).
const EVIDENCE_OPTIONS_FULL: { value: EvidenceType; label: string; trust: string }[] = [
  { value: 'github', label: 'GitHub commits', trust: 'high trust' },
  { value: 'screenshot', label: 'Screenshot', trust: 'medium trust' }
]
const EVIDENCE_SELECT_OPTIONS: SelectOption[] = EVIDENCE_OPTIONS_FULL.map((o) => ({
  value: o.value,
  label: `${o.label} (${o.trust})`
}))

// Skip-days options (0-2).
const SKIP_DAYS_OPTIONS: SelectOption[] = [0, 1, 2].map((n) => ({ value: String(n), label: String(n) }))

// Step order: Compose -> Context -> Plan -> Companion
const STEPS = ['nc-compose', 'nc-context', 'nc-plan', 'nc-companion'] as const
type StepId = (typeof STEPS)[number]

// Local draft shape for plan-step fields (held locally; NO API writes until handleStart).
interface DraftPlan {
  cadence: string
  evidence_type: EvidenceType
  evidence_config: Record<string, unknown> | null
  skip_days_total: number
  stake_enabled: boolean
  stake_contact_name: string
  stake_contact_email: string
}

const DEFAULT_DRAFT_PLAN: DraftPlan = {
  cadence: 'daily_evening',
  evidence_type: 'screenshot',
  evidence_config: null,
  skip_days_total: 0,
  stake_enabled: false,
  stake_contact_name: '',
  stake_contact_email: ''
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
  active: boolean
}

function ComposeSection({
  action,
  setAction,
  deliverable,
  setDeliverable,
  deadlineLocal,
  setDeadlineLocal,
  composeError,
  active
}: ComposeSectionProps) {
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
              className="nc-madlib-input"
              type="text"
              placeholder="what you will deliver"
              value={deliverable}
              onChange={(e) => setDeliverable(e.target.value)}
              autoComplete="off"
            />
          </span>
          <span className="nc-madlib-prose">by</span>
          <span className="nc-madlib-field">
            <label className="sr-only" htmlFor="nc-deadline-trigger">
              Deadline date
            </label>
            <DatePicker value={deadlineLocal} onChange={setDeadlineLocal} aria-label="Choose deadline" />
          </span>
        </div>

        {composeError && <p className="compose-error">{composeError}</p>}

        {/* Live sentence preview */}
        <p className="nc-sentence-preview">
          I will <em>{action}</em> {deliverable || 'the deliverable'}{' '}
          {deadlineLocal
            ? `by ${new Date(deadlineLocal).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}`
            : 'by the deadline'}
        </p>
      </div>
    </StepPanel>
  )
}

// ── ContextSection (stub - AI intake deferred, Open Q1) ──────────────────────
// LANE C SEAM: replace this component body with the real intake chat when
// POST /api/commitments/{id}/context/turn and its response schema land.

function ContextSection({ active }: { active: boolean }) {
  return (
    <StepPanel id="nc-context" active={active}>
      <div className="nc-section-inner">
        <h2 className="nc-section-heading">Tell Kawan more</h2>
        {/* AI intake chat - STUBBED (Lane C absent, Open Q1). No POST .../context/turn call. */}
        <div className="nc-context-stub">
          <div className="nc-context-stub-icon" aria-hidden="true">
            <Clock size={28} color="var(--ink-faint)" />
          </div>
          <p className="nc-context-stub-label">A few questions about your goal (coming soon)</p>
          <p className="nc-context-stub-sub">
            Kawan will ask up to 3 questions here to understand your context. Continue past this section to set your
            plan details now.
          </p>
        </div>
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
  active: boolean
}

function PlanSection({
  draft,
  onDraftChange,
  action,
  deliverable,
  deadlineLocal,
  stakeContactValid,
  active
}: PlanSectionProps) {
  const evidenceType = draft.evidence_type
  const repo =
    draft.evidence_config !== null && typeof draft.evidence_config?.repo === 'string'
      ? (draft.evidence_config.repo as string)
      : ''

  const trustLabel = EVIDENCE_OPTIONS_FULL.find((o) => o.value === evidenceType)?.trust ?? ''
  const deadlineDisplay = deadlineLocal ? new Date(deadlineLocal).toLocaleString('en-MY') : ''

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

        {/* AI roadmap - STUBBED (no POST .../plan call - Lane C absent, Open Q1) */}
        {/* LANE C SEAM: replace this placeholder with the real roadmap renderer when
            POST /api/commitments/{id}/plan and its roadmap schema land. */}
        <div className="plan-roadmap-placeholder">
          <p className="plan-placeholder-text">
            Your plan shows up here after we talk it through (coming with the AI layer)
          </p>
        </div>

        {/* Safe hard-field GUI controls (GUI-set, user session, never AI - TR-25/26) */}
        {/* Un-boxed: dropdowns stand alone, no surrounding container */}
        <div className="nc-plan-settings">
          <div className="plan-setting-row">
            <span className="plan-setting-label">
              Cadence
              <Tooltip text="How often Kawan checks in on your progress." />
            </span>
            <Select
              className="plan-setting-select"
              aria-label="Check-in cadence"
              value={draft.cadence}
              onChange={(v) => onDraftChange({ ...draft, cadence: v })}
              options={CADENCE_OPTIONS}
            />
          </div>

          <div className="plan-setting-row">
            <span className="plan-setting-label">
              Evidence
              <Tooltip text="How you will prove progress. Screenshot requires you to upload proof. GitHub checks your commits automatically." />
            </span>
            <Select
              className="plan-setting-select"
              aria-label="Evidence type"
              value={evidenceType}
              onChange={(v) => {
                const t = v as EvidenceType
                const evidence_config = t === 'github' ? (draft.evidence_config ?? {}) : null
                onDraftChange({ ...draft, evidence_type: t, evidence_config })
              }}
              options={EVIDENCE_SELECT_OPTIONS}
            />
          </div>

          {/* GitHub repo field - shown when evidence_type = github (Q7) */}
          {evidenceType === 'github' && (
            <div className="plan-setting-row plan-setting-repo">
              <span className="plan-setting-label">
                GitHub repo <span className="plan-trust-label">{trustLabel}</span>
              </span>
              <input
                className="plan-setting-input"
                type="text"
                placeholder="owner/repo"
                aria-label="GitHub repository (owner/repo)"
                defaultValue={repo}
                onBlur={(e) => {
                  if (e.target.value !== repo) {
                    onDraftChange({ ...draft, evidence_config: { repo: e.target.value } })
                  }
                }}
              />
            </div>
          )}

          <div className="plan-setting-row">
            <span className="plan-setting-label">
              Skip days
              <Tooltip text="The number of check-ins you can skip without penalty. 0 means every check-in counts." />
            </span>
            <Select
              className="plan-setting-select"
              aria-label="Allowed skip days"
              value={String(draft.skip_days_total)}
              onChange={(v) => onDraftChange({ ...draft, skip_days_total: Number(v) })}
              options={SKIP_DAYS_OPTIONS}
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
              />
              {!stakeContactValid && (draft.stake_contact_name.trim() || draft.stake_contact_email) && (
                <p className="compose-error">Enter a witness name and a valid email, or turn off the witness toggle.</p>
              )}
            </div>
          )}
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

  // Current step index (0 = Compose, 1 = Context, 2 = Plan, 3 = Companion)
  const [stepIndex, setStepIndex] = useState(0)
  const activeStep = STEPS[stepIndex]

  // Companion selection - starts unset; user must actively choose.
  // NO setPersona call here; committed only in handleStart.
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null)

  // Compose state - lifted so it persists across steps and feeds handleStart.
  // NO API calls until the final "Start commitment" - Cancel at any prior point is inert.
  const [action, setAction] = useState<Action>('complete')
  const [deliverable, setDeliverable] = useState('')
  const [deadlineLocal, setDeadlineLocal] = useState('')
  const [composeError, setComposeError] = useState<string | null>(null)

  // Plan draft - held locally; NO API writes until handleStart.
  const [draftPlan, setDraftPlan] = useState<DraftPlan>({ ...DEFAULT_DRAFT_PLAN })

  // Start commitment state
  const [starting, setStarting] = useState(false)
  const [startError, setStartError] = useState<string | null>(null)

  // Compose validity for step tick + CTA guard.
  function isComposeValid(): boolean {
    if (!deliverable.trim()) return false
    if (!deadlineLocal) return false
    const dl = new Date(deadlineLocal)
    if (Number.isNaN(dl.getTime())) return false
    if (dl <= new Date()) return false
    return true
  }

  const composeValid = isComposeValid()

  // Whether the stake witness contact is complete and valid (name + valid email).
  const stakeContactValid = Boolean(
    draftPlan.stake_contact_name.trim() && /\S+@\S+\.\S+/.test(draftPlan.stake_contact_email)
  )
  // True when the toggle is on but the contact is incomplete — blocks Start.
  const stakeIncomplete = draftPlan.stake_enabled && !stakeContactValid

  // Island steps with completion state
  const islandSteps: IslandStep[] = [
    { id: 'nc-compose', label: 'Compose', done: composeValid },
    { id: 'nc-context', label: 'Context', done: false },
    { id: 'nc-plan', label: 'Plan', done: false },
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
    const deadlineDate = new Date(deadlineLocal)
    if (deadlineDate <= new Date()) {
      setComposeError('Deadline must be in the future.')
      setStepIndex(0)
      return
    }
    const diffMs = deadlineDate.getTime() - Date.now()
    if (diffMs < 60 * 60 * 1000) {
      if (!window.confirm("That's under an hour. Are you sure?")) return
    }

    if (selectedPersona === null) {
      setStartError('Please choose a companion.')
      return
    }

    if (MOCK_AUTH) {
      await setPersona(selectedPersona)
      navigate('/home')
      return
    }

    setStarting(true)
    setStartError(null)
    const deadlineISO = deadlineDate.toISOString()
    try {
      // 1. Create the commitment (first write)
      const created = await createCommitment({ action, deliverable, deadline: deadlineISO })
      // 2. Apply plan-step settings (cadence / evidence / skip / stake) if they differ from server defaults
      // stakeContactValid is pre-checked above; stakeIncomplete blocks reaching here, so if toggle is on,
      // the contact is guaranteed valid.
      const stakeValid = Boolean(draftPlan.stake_enabled && stakeContactValid)
      const needsPatch =
        draftPlan.cadence !== created.cadence ||
        draftPlan.evidence_type !== created.evidence_type ||
        draftPlan.skip_days_total !== created.skip_days_total ||
        stakeValid
      if (needsPatch) {
        const patchBody: Parameters<typeof patchCommitment>[1] = {
          cadence: draftPlan.cadence,
          evidence_type: draftPlan.evidence_type,
          evidence_config: draftPlan.evidence_config as Record<string, unknown> | undefined,
          skip_days_total: draftPlan.skip_days_total
        }
        if (stakeValid) {
          patchBody.stake_enabled = true
          patchBody.stake_contact_name = draftPlan.stake_contact_name.trim()
          patchBody.stake_contact_email = draftPlan.stake_contact_email.trim()
        }
        await patchCommitment(created.id, patchBody)
      }
      // 3. Start the commitment (draft to active)
      await startCommitment(created.id)
      // 4. Persist persona selection ONLY on full success
      await setPersona(selectedPersona)
      navigate(`/commitments/${created.id}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to start commitment. Please try again.'
      setStartError(msg)
    } finally {
      setStarting(false)
    }
  }

  // The final step's Continue becomes Start commitment; requires composeValid + companion selected + no incomplete stake.
  const continueDisabled = isFinalStep && (!composeValid || selectedPersona === null || stakeIncomplete)

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
            active={activeStep === 'nc-compose'}
          />
          <ContextSection active={activeStep === 'nc-context'} />
          <PlanSection
            draft={draftPlan}
            onDraftChange={setDraftPlan}
            action={action}
            deliverable={deliverable}
            deadlineLocal={deadlineLocal}
            stakeContactValid={stakeContactValid}
            active={activeStep === 'nc-plan'}
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
