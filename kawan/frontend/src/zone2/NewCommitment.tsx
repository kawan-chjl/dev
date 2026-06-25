// NewCommitment — /commitments/new (Zone 2, no shell chrome)
// 4-step stepper: Companion → Compose → Context → Plan
//
// Companion: PersonaPicker — choose companion with portrait previews; calls setPersona on continue.
// Compose: live sentence-builder (action dropdown, deliverable input, deadline picker).
//          Creates a real commitment via POST /api/commitments. Zero AI calls (TR-10).
// Context: clearly-labelled stub — AI intake chat is deferred (Lane C absent, Open Q1).
//          Seam comment below marks where Lane C drops in.
// Plan:    shows locked hard fields (identity: action/deliverable/deadline) and lets the
//          user GUI-edit safe hard fields (cadence/evidence/skip) via PATCH /api/commitments/{id}.
//          AI roadmap stays a labelled placeholder (no POST .../plan call — Open Q1).
//          "Start commitment" → POST /api/commitments/{id}/start → /home.

import { Check, Clock, Lock, X } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { MOCK_AUTH } from '../auth/api'
import { createCommitment, patchCommitment, startCommitment } from '../commitments/api'
import type { EvidenceType, Persona } from '../types/api'
import { Button } from '../ui/Button'
import { DatePicker } from '../ui/DatePicker'
import type { SelectOption } from '../ui/Select'
import { Select } from '../ui/Select'
import { Tooltip } from '../ui/Tooltip'
import { PersonaPicker } from './PersonaPicker'

type Step = 0 | 1 | 2 | 3
const STEP_LABELS = ['Companion', 'Compose', 'Context', 'Plan']

// Hard-coded action enum (Q4 recommended set, matches mockActiveCommitment.action default).
const ACTION_OPTIONS = ['complete', 'finish', 'ship', 'write', 'build', 'submit'] as const
type Action = (typeof ACTION_OPTIONS)[number]
const ACTION_SELECT_OPTIONS: SelectOption[] = ACTION_OPTIONS.map((a) => ({ value: a, label: a }))

// Cadence options (Q6).
const CADENCE_OPTIONS: SelectOption[] = [
  { value: 'daily_evening', label: 'Daily (evening)' },
  { value: 'daily', label: 'Daily' },
  { value: 'every_2_days', label: 'Every 2 days' },
  { value: 'weekly', label: 'Weekly' }
]

// Evidence options (Q7 — include github with repo field).
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

// ── ComposeStep ───────────────────────────────────────────────────────────────

interface ComposeProps {
  action: Action
  setAction: (a: Action) => void
  deliverable: string
  setDeliverable: (d: string) => void
  deadlineLocal: string // "YYYY-MM-DDTHH:MM" local string
  setDeadlineLocal: (d: string) => void
  error: string | null
  creating: boolean
}

function ComposeStep({
  action,
  setAction,
  deliverable,
  setDeliverable,
  deadlineLocal,
  setDeadlineLocal,
  error,
  creating
}: ComposeProps) {
  return (
    <div className="compose-step">
      <h2 className="compose-heading">Make your commitment</h2>
      <div className="compose-commitment-card">
        {/* "I will [action] [deliverable] by [date]" sentence */}
        <div className="compose-sentence">
          <span className="compose-prefix">I will</span>
          {/* Action — themed Select */}
          <Select
            className="compose-chip compose-chip-action"
            aria-label="Choose action"
            value={action}
            onChange={(v) => setAction(v as Action)}
            options={ACTION_SELECT_OPTIONS}
            disabled={creating}
          />
          {/* Deliverable */}
          <label className="compose-chip-deliverable-wrap">
            <span className="compose-field-label">what</span>
            <input
              className="compose-chip compose-chip-deliverable"
              type="text"
              placeholder="the deliverable"
              aria-label="Describe what you will deliver"
              value={deliverable}
              onChange={(e) => setDeliverable(e.target.value)}
              disabled={creating}
            />
          </label>
          <span className="compose-infix">by</span>
          {/* Deadline — themed DatePicker (label via aria-label on trigger; no native input to bind to) */}
          <div className="compose-chip-deadline-wrap">
            <span className="compose-field-label" aria-hidden="true">
              when
            </span>
            <DatePicker
              value={deadlineLocal}
              onChange={setDeadlineLocal}
              disabled={creating}
              aria-label="Choose deadline"
            />
          </div>
        </div>
        <p className="compose-hint">Evidence will be verified. Self-report is not accepted.</p>
      </div>
      {error && <p className="compose-error">{error}</p>}
    </div>
  )
}

// ── ContextStep (stub — AI intake deferred, Open Q1) ─────────────────────────
// LANE C SEAM: replace this component body with the real intake chat when
// POST /api/commitments/{id}/context/turn and its response schema land.

function ContextStep() {
  return (
    <div className="context-step">
      <h2 className="context-heading">Tell Kawan more</h2>
      {/* AI intake chat — STUBBED (Lane C absent, Open Q1). No POST .../context/turn call. */}
      <div className="context-stub-notice">
        <div className="context-stub-icon" aria-hidden="true">
          <Clock size={24} color="var(--ink-faint)" aria-hidden="true" />
        </div>
        <p className="context-stub-label">A few questions about your goal (coming soon)</p>
        <p className="context-stub-sub">
          Kawan will ask up to 3 questions here to understand your context. For now, click Continue to set your plan
          details.
        </p>
      </div>
    </div>
  )
}

// ── PlanStep ──────────────────────────────────────────────────────────────────
// Purely local-state — NO API calls here. All changes are held in draft until
// handleStart fires. Cancel at any point writes nothing to the server.

interface PlanProps {
  draft: DraftPlan
  onDraftChange: (d: DraftPlan) => void
  action: string
  deliverable: string
  deadlineLocal: string
  starting: boolean
  startError: string | null
}

// Local draft shape for plan-step fields (kept separately from Commitment to avoid server writes)
interface DraftPlan {
  cadence: string
  evidence_type: EvidenceType
  evidence_config: Record<string, unknown> | null
  skip_days_total: number
}

const DEFAULT_DRAFT_PLAN: DraftPlan = {
  cadence: 'daily_evening',
  evidence_type: 'screenshot',
  evidence_config: null,
  skip_days_total: 0
}

function PlanStep({ draft, onDraftChange, action, deliverable, deadlineLocal, starting, startError }: PlanProps) {
  const evidenceType = draft.evidence_type
  const repo =
    draft.evidence_config !== null && typeof draft.evidence_config?.repo === 'string'
      ? (draft.evidence_config.repo as string)
      : ''

  function handleCadenceChange(value: string) {
    onDraftChange({ ...draft, cadence: value })
  }

  function handleEvidenceTypeChange(value: EvidenceType) {
    const evidence_config = value === 'github' ? (draft.evidence_config ?? {}) : null
    onDraftChange({ ...draft, evidence_type: value, evidence_config })
  }

  function handleRepoChange(value: string) {
    onDraftChange({ ...draft, evidence_config: { repo: value } })
  }

  function handleSkipDaysChange(value: number) {
    onDraftChange({ ...draft, skip_days_total: value })
  }

  const trustLabel = EVIDENCE_OPTIONS_FULL.find((o) => o.value === evidenceType)?.trust ?? ''
  // Format deadline for display
  const deadlineDisplay = deadlineLocal ? new Date(deadlineLocal).toLocaleString('en-MY') : ''

  return (
    <div className="plan-step">
      <h2 className="plan-heading">Your plan</h2>

      {/* Locked identity fields (hard fields set in Compose — AI-read-only, TR-25/26) */}
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

      {/* AI roadmap — STUBBED (no POST .../plan call — Lane C absent, Open Q1) */}
      {/* LANE C SEAM: replace this placeholder with the real roadmap renderer when
          POST /api/commitments/{id}/plan and its roadmap schema land. */}
      <div className="plan-roadmap-placeholder">
        <p className="plan-placeholder-text">
          Your plan shows up here after we talk it through (coming with the AI layer)
        </p>
      </div>

      {startError && <p className="compose-error">{startError}</p>}

      {/* Safe hard-field GUI controls (GUI-set, user session, never AI — TR-25/26) */}
      <div className="plan-settings">
        {/* Cadence */}
        <div className="plan-setting-row">
          <span className="plan-setting-label">
            Cadence
            <Tooltip text="How often Kawan checks in on your progress." />
          </span>
          <Select
            className="plan-setting-select"
            aria-label="Check-in cadence"
            value={draft.cadence}
            onChange={handleCadenceChange}
            options={CADENCE_OPTIONS}
            disabled={starting}
          />
        </div>

        {/* Evidence type */}
        <div className="plan-setting-row">
          <span className="plan-setting-label">
            Evidence
            <Tooltip text="How you will prove progress. Screenshot requires you to upload proof. GitHub checks your commits automatically." />
          </span>
          <Select
            className="plan-setting-select"
            aria-label="Evidence type"
            value={evidenceType}
            onChange={(v) => handleEvidenceTypeChange(v as EvidenceType)}
            options={EVIDENCE_SELECT_OPTIONS}
            disabled={starting}
          />
        </div>

        {/* GitHub repo field — shown when evidence_type = github (Q7) */}
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
                if (e.target.value !== repo) handleRepoChange(e.target.value)
              }}
              disabled={starting}
            />
          </div>
        )}

        {/* Skip days */}
        <div className="plan-setting-row">
          <span className="plan-setting-label">
            Skip days
            <Tooltip text="The number of check-ins you can skip without penalty. 0 means every check-in counts." />
          </span>
          <Select
            className="plan-setting-select"
            aria-label="Allowed skip days"
            value={String(draft.skip_days_total)}
            onChange={(v) => handleSkipDaysChange(Number(v))}
            options={SKIP_DAYS_OPTIONS}
            disabled={starting}
          />
        </div>
      </div>
    </div>
  )
}

// ── NewCommitment (shell + state) ─────────────────────────────────────────────

export function NewCommitment() {
  const navigate = useNavigate()
  const { me, setPersona } = useAuth()
  const [step, setStep] = useState<Step>(0)

  // Companion step state — seeded from current persona
  const [selectedPersona, setSelectedPersona] = useState<Persona>(me?.persona ?? 'kawan')

  // Compose state — lifted so it survives step navigation and feeds handleStart.
  // NO API calls until the final "Start commitment" — Cancel at any prior step is inert.
  const [action, setAction] = useState<Action>('complete')
  const [deliverable, setDeliverable] = useState('')
  const [deadlineLocal, setDeadlineLocal] = useState('')
  const [composeError, setComposeError] = useState<string | null>(null)

  // Plan step draft — held locally; NO API writes until handleStart.
  const [draftPlan, setDraftPlan] = useState<DraftPlan>({ ...DEFAULT_DRAFT_PLAN })
  const [starting, setStarting] = useState(false)
  const [startError, setStartError] = useState<string | null>(null)

  // ── Companion → Continue ──────────────────────────────────────────────────
  // NO setPersona call here. The persona choice is committed ONLY in handleStart,
  // so Cancel at any step leaves the existing persona untouched.
  function handleCompanionContinue() {
    setStep(1)
  }

  // ── Compose → Continue ────────────────────────────────────────────────────
  // Validates the compose fields locally; NO API call yet.
  // createCommitment is deferred to handleStart so Cancel writes nothing.

  function handleComposeContinue() {
    if (!deliverable.trim()) {
      setComposeError('Please describe what you will deliver.')
      return
    }
    if (!deadlineLocal) {
      setComposeError('Please pick a deadline.')
      return
    }

    const deadlineDate = new Date(deadlineLocal)
    const now = new Date()

    if (deadlineDate <= now) {
      setComposeError('Deadline must be in the future.')
      return
    }

    const diffMs = deadlineDate.getTime() - now.getTime()
    if (diffMs < 60 * 60 * 1000) {
      if (!window.confirm("That's under an hour. Are you sure?")) return
    }

    setComposeError(null)
    setStep(2)
  }

  // ── Plan → Start ──────────────────────────────────────────────────────────
  // First API write in the entire flow: create → patch plan fields → start → set persona.
  // Cancel before this point leaves the server byte-for-byte unchanged.

  async function handleStart() {
    if (starting) return

    if (MOCK_AUTH) {
      await setPersona(selectedPersona)
      navigate('/home')
      return
    }

    setStarting(true)
    setStartError(null)
    const deadlineISO = new Date(deadlineLocal).toISOString()
    try {
      // 1. Create the commitment (first write)
      const created = await createCommitment({ action, deliverable, deadline: deadlineISO })
      // 2. Apply plan-step settings (cadence / evidence / skip) if they differ from server defaults
      const needsPatch =
        draftPlan.cadence !== created.cadence ||
        draftPlan.evidence_type !== created.evidence_type ||
        draftPlan.skip_days_total !== created.skip_days_total
      if (needsPatch) {
        await patchCommitment(created.id, {
          cadence: draftPlan.cadence,
          evidence_type: draftPlan.evidence_type,
          evidence_config: draftPlan.evidence_config as Record<string, unknown> | undefined,
          skip_days_total: draftPlan.skip_days_total
        })
      }
      // 3. Start the commitment (draft → active)
      await startCommitment(created.id)
      // 4. Persist persona selection ONLY on full success
      await setPersona(selectedPersona)
      navigate('/home')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to start commitment. Please try again.'
      setStartError(msg)
    } finally {
      setStarting(false)
    }
  }

  // ── Cancel — fully inert: NO API calls, NO persona writes ────────────────
  // Because createCommitment is deferred to handleStart, Cancel at any step
  // leaves the server and localStorage byte-for-byte unchanged.

  function handleCancel() {
    navigate('/home')
  }

  // ── Continue handler for each step ────────────────────────────────────────

  function handleContinue() {
    if (step === 0) {
      handleCompanionContinue() // sync now — persona not persisted until handleStart
    } else if (step === 1) {
      handleComposeContinue()
    } else {
      setStep((s) => (s + 1) as Step)
    }
  }

  // ── Render step ────────────────────────────────────────────────────────────

  function renderStep() {
    if (step === 0) {
      return <PersonaPicker selected={selectedPersona} onSelect={setSelectedPersona} />
    }
    if (step === 1) {
      return (
        <ComposeStep
          action={action}
          setAction={setAction}
          deliverable={deliverable}
          setDeliverable={setDeliverable}
          deadlineLocal={deadlineLocal}
          setDeadlineLocal={setDeadlineLocal}
          error={composeError}
          creating={false}
        />
      )
    }
    if (step === 2) {
      return <ContextStep />
    }
    // step === 3
    return (
      <PlanStep
        draft={draftPlan}
        onDraftChange={setDraftPlan}
        action={action}
        deliverable={deliverable}
        deadlineLocal={deadlineLocal}
        starting={starting}
        startError={startError}
      />
    )
  }

  // Disable "Continue" on Compose (step 1) while required fields are empty.
  const continueDisabled = (step === 1 && (!deliverable.trim() || !deadlineLocal)) || starting

  return (
    <div className="workspace-root new-commitment-root">
      {/* Header */}
      <div className="workspace-topbar">
        <button type="button" className="workspace-back-btn" aria-label="Cancel and go back" onClick={handleCancel}>
          <X size={14} aria-hidden="true" /> Cancel
        </button>
        {/* Progress indicator — connected track stepper */}
        <nav className="new-commitment-stepper-wrap" aria-label="Commitment setup steps">
          <div className="stepper-v2">
            {STEP_LABELS.map((label, i) => {
              const isDone = i < step
              const isCurrent = i === step
              const nodeClass = `stepper-v2-node${isDone ? ' stepper-v2-done' : isCurrent ? ' stepper-v2-current' : ' stepper-v2-upcoming'}`
              return (
                <div key={label} className="stepper-v2-step">
                  {i > 0 && <div className={`stepper-v2-track${isDone ? ' stepper-v2-track-done' : ''}`} />}
                  <div className={nodeClass} aria-current={isCurrent ? 'step' : undefined}>
                    <div className="stepper-v2-circle" aria-hidden="true">
                      {isDone ? <Check size={12} /> : i + 1}
                    </div>
                    <span className="stepper-v2-label">{label}</span>
                  </div>
                </div>
              )
            })}
          </div>
          <span className="stepper-v2-counter" aria-live="polite" aria-atomic="true">
            {step + 1} / {STEP_LABELS.length}
          </span>
        </nav>
        <div className="workspace-spacer" aria-hidden="true" />
      </div>

      {/* Step content — centered vertically; long steps scroll naturally */}
      <div className="new-commitment-content">
        <div className="new-commitment-step-center">{renderStep()}</div>
      </div>

      {/* Step navigation */}
      <div className="new-commitment-footer">
        {step > 0 && (
          <Button variant="secondary" onClick={() => setStep((s) => (s - 1) as Step)} disabled={starting}>
            Back
          </Button>
        )}
        {step < 3 ? (
          <Button variant="primary" onClick={handleContinue} disabled={continueDisabled}>
            Continue
          </Button>
        ) : (
          <Button variant="accent" onClick={handleStart} disabled={starting}>
            {starting ? 'Starting...' : 'Start commitment'}
          </Button>
        )}
      </div>
    </div>
  )
}
