// NewCommitment — /new (Zone 2, no shell chrome)
// 3-step stepper: Compose → Context → Plan
//
// Compose: live sentence-builder (action dropdown, deliverable input, deadline picker).
//          Creates a real commitment via POST /api/commitments. Zero AI calls (TR-10).
// Context: clearly-labelled stub — AI intake chat is deferred (Lane C absent, Open Q1).
//          Seam comment below marks where Lane C drops in.
// Plan:    shows locked hard fields (identity: action/deliverable/deadline) and lets the
//          user GUI-edit safe hard fields (cadence/evidence/skip) via PATCH /api/commitments/{id}.
//          AI roadmap stays a labelled placeholder (no POST .../plan call — Open Q1).
//          "Start commitment" → POST /api/commitments/{id}/start → /home.

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MOCK_AUTH } from '../auth/api'
import { createCommitment, patchCommitment, startCommitment } from '../commitments/api'
import { mockActiveCommitment } from '../mock/fixtures'
import type { Commitment, EvidenceType } from '../types/api'
import { Button } from '../ui/Button'

type Step = 0 | 1 | 2
const STEP_LABELS = ['Compose', 'Context', 'Plan']

// Hard-coded action enum (Q4 recommended set, matches mockActiveCommitment.action default).
const ACTION_OPTIONS = ['complete', 'finish', 'ship', 'write', 'build', 'submit'] as const
type Action = (typeof ACTION_OPTIONS)[number]

// Cadence options (Q6).
const CADENCE_OPTIONS: { value: string; label: string }[] = [
  { value: 'daily_evening', label: 'Daily (evening)' },
  { value: 'daily', label: 'Daily' },
  { value: 'every_2_days', label: 'Every 2 days' },
  { value: 'weekly', label: 'Weekly' }
]

// Evidence options (Q7 — include github with repo field).
const EVIDENCE_OPTIONS: { value: EvidenceType; label: string; trust: string }[] = [
  { value: 'github', label: 'GitHub commits', trust: 'high trust' },
  { value: 'screenshot', label: 'Screenshot', trust: 'medium trust' }
]

// Skip-days options (0–2).
const SKIP_DAYS_OPTIONS = [0, 1, 2]

// ── ComposeStep ───────────────────────────────────────────────────────────────

interface ComposeProps {
  action: Action
  setAction: (a: Action) => void
  deliverable: string
  setDeliverable: (d: string) => void
  deadlineLocal: string // datetime-local string value
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
      <div className="compose-sentence">
        <span className="compose-prefix">I will</span>
        {/* Action dropdown — replaces the disabled chip */}
        <select
          className="compose-chip compose-chip-action"
          aria-label="Choose action"
          value={action}
          onChange={(e) => setAction(e.target.value as Action)}
          disabled={creating}
        >
          {ACTION_OPTIONS.map((a) => (
            <option key={a} value={a}>
              {a} ▾
            </option>
          ))}
        </select>
        {/* Deliverable text input */}
        <input
          className="compose-chip compose-chip-deliverable"
          type="text"
          placeholder="the deliverable ✎"
          aria-label="Describe what you will deliver"
          value={deliverable}
          onChange={(e) => setDeliverable(e.target.value)}
          disabled={creating}
        />
        <span className="compose-infix">by</span>
        {/* Deadline — native datetime-local input */}
        <input
          className="compose-chip compose-chip-deadline"
          type="datetime-local"
          aria-label="Choose deadline"
          value={deadlineLocal}
          onChange={(e) => setDeadlineLocal(e.target.value)}
          disabled={creating}
        />
      </div>
      {error && <p className="compose-error">{error}</p>}
      <p className="compose-hint">Evidence will be verified — self-report is not accepted.</p>
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
        <p className="context-stub-label">⏳ AI context intake — coming with the AI layer (Lane C)</p>
        <p className="context-stub-sub">
          Kawan will ask up to 3 questions here to understand your context. For now, click Continue to set your plan
          details.
        </p>
      </div>
    </div>
  )
}

// ── PlanStep ──────────────────────────────────────────────────────────────────

interface PlanProps {
  commitment: Commitment
  onCommitmentChange: (c: Commitment) => void
  starting: boolean
  startError: string | null
}

function PlanStep({ commitment, onCommitmentChange, starting, startError }: PlanProps) {
  const evidenceType = commitment.evidence_type as EvidenceType
  const repo =
    commitment.evidence_config !== null && typeof commitment.evidence_config.repo === 'string'
      ? commitment.evidence_config.repo
      : ''

  async function handleCadenceChange(value: string) {
    if (MOCK_AUTH) {
      // Mock mode: no network call — update local state only.
      onCommitmentChange({ ...commitment, cadence: value })
      return
    }
    try {
      const updated = await patchCommitment(commitment.id, { cadence: value })
      onCommitmentChange(updated)
    } catch {
      // Patch failed — keep current value; silent for now (no error state added per plan scope)
    }
  }

  async function handleEvidenceTypeChange(value: EvidenceType) {
    if (MOCK_AUTH) {
      // Mock mode: no network call — update local state only.
      const evidence_config = value === 'github' ? (commitment.evidence_config ?? {}) : null
      onCommitmentChange({ ...commitment, evidence_type: value, evidence_config })
      return
    }
    try {
      // Clear repo when switching away from github
      const evidence_config = value === 'github' ? (commitment.evidence_config ?? {}) : null
      const updated = await patchCommitment(commitment.id, {
        evidence_type: value,
        evidence_config: evidence_config as Record<string, unknown> | undefined
      })
      onCommitmentChange(updated)
    } catch {
      // Patch failed — keep current value
    }
  }

  async function handleRepoChange(value: string) {
    if (MOCK_AUTH) {
      // Mock mode: no network call — update local state only.
      onCommitmentChange({ ...commitment, evidence_config: { repo: value } })
      return
    }
    try {
      const updated = await patchCommitment(commitment.id, {
        evidence_config: { repo: value }
      })
      onCommitmentChange(updated)
    } catch {
      // Patch failed — keep current value
    }
  }

  async function handleSkipDaysChange(value: number) {
    if (MOCK_AUTH) {
      // Mock mode: no network call — update local state only.
      onCommitmentChange({ ...commitment, skip_days_total: value })
      return
    }
    try {
      const updated = await patchCommitment(commitment.id, { skip_days_total: value })
      onCommitmentChange(updated)
    } catch {
      // Patch failed — keep current value
    }
  }

  const trustLabel = EVIDENCE_OPTIONS.find((o) => o.value === evidenceType)?.trust ?? ''

  return (
    <div className="plan-step">
      <h2 className="plan-heading">Your plan</h2>

      {/* Locked identity fields (hard fields set in Compose — AI-read-only, TR-25/26) */}
      <div className="plan-locked-fields">
        <p className="plan-locked-note">🔒 Hard fields are locked — only you change them here, never Kawan.</p>
        <div className="plan-locked-row">
          <span className="plan-locked-label">Action 🔒</span>
          <span className="plan-locked-value">{commitment.action}</span>
        </div>
        <div className="plan-locked-row">
          <span className="plan-locked-label">Deliverable 🔒</span>
          <span className="plan-locked-value">{commitment.deliverable}</span>
        </div>
        <div className="plan-locked-row">
          <span className="plan-locked-label">Deadline 🔒</span>
          <span className="plan-locked-value">{new Date(commitment.deadline).toLocaleString('en-MY')}</span>
        </div>
      </div>

      {/* AI roadmap — STUBBED (no POST .../plan call — Lane C absent, Open Q1) */}
      {/* LANE C SEAM: replace this placeholder with the real roadmap renderer when
          POST /api/commitments/{id}/plan and its roadmap schema land. */}
      <div className="plan-roadmap-placeholder">
        <p className="plan-placeholder-text">
          Roadmap appears here once Kawan reviews your context — coming with the AI layer (Lane C)
        </p>
      </div>

      {startError && <p className="compose-error">{startError}</p>}

      {/* Safe hard-field GUI controls (GUI-set, user session, never AI — TR-25/26) */}
      <div className="plan-settings">
        {/* Cadence */}
        <div className="plan-setting-row">
          <span className="plan-setting-label">Cadence</span>
          <select
            className="plan-setting-select"
            aria-label="Check-in cadence"
            value={commitment.cadence}
            onChange={(e) => handleCadenceChange(e.target.value)}
            disabled={starting}
          >
            {CADENCE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {/* Evidence type */}
        <div className="plan-setting-row">
          <span className="plan-setting-label">Evidence</span>
          <select
            className="plan-setting-select"
            aria-label="Evidence type"
            value={evidenceType}
            onChange={(e) => handleEvidenceTypeChange(e.target.value as EvidenceType)}
            disabled={starting}
          >
            {EVIDENCE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label} ({o.trust})
              </option>
            ))}
          </select>
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
          <span className="plan-setting-label">Skip days</span>
          <select
            className="plan-setting-select"
            aria-label="Allowed skip days"
            value={commitment.skip_days_total}
            onChange={(e) => handleSkipDaysChange(Number(e.target.value))}
            disabled={starting}
          >
            {SKIP_DAYS_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}

// ── NewCommitment (shell + state) ─────────────────────────────────────────────

export function NewCommitment() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>(0)

  // Compose state — lifted so it survives step navigation and feeds create.
  const [action, setAction] = useState<Action>('complete')
  const [deliverable, setDeliverable] = useState('')
  const [deadlineLocal, setDeadlineLocal] = useState('')
  const [composeError, setComposeError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  // Created commitment (holds id + server defaults for Plan step).
  const [commitment, setCommitment] = useState<Commitment | null>(null)
  const [starting, setStarting] = useState(false)
  const [startError, setStartError] = useState<string | null>(null)

  // ── Compose → Continue ────────────────────────────────────────────────────

  async function handleComposeContinue() {
    // Client-side validation
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

    // Warn for <1 h deadlines (Q5 — window.confirm, no new modal)
    const diffMs = deadlineDate.getTime() - now.getTime()
    if (diffMs < 60 * 60 * 1000) {
      if (!window.confirm("That's under an hour — are you sure?")) return
    }

    const deadlineISO = deadlineDate.toISOString()

    if (MOCK_AUTH) {
      // Mock mode: skip the network, advance with a synthetic local draft.
      setCommitment({ ...mockActiveCommitment, action, deliverable, deadline: deadlineISO, status: 'draft' })
      setComposeError(null)
      setStep(1)
      return
    }

    setCreating(true)
    setComposeError(null)
    try {
      const created = await createCommitment({ action, deliverable, deadline: deadlineISO })
      setCommitment(created)
      setStep(1)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create commitment.'
      setComposeError(msg)
    } finally {
      setCreating(false)
    }
  }

  // ── Plan → Start ──────────────────────────────────────────────────────────

  async function handleStart() {
    if (starting) return

    if (MOCK_AUTH || commitment === null) {
      navigate('/home')
      return
    }

    setStarting(true)
    setStartError(null)
    try {
      await startCommitment(commitment.id)
      navigate('/home')
    } catch (err) {
      // Start failed — stay on the Plan step and surface the error so it isn't silently hidden.
      const msg = err instanceof Error ? err.message : 'Failed to start commitment. Please try again.'
      setStartError(msg)
    } finally {
      setStarting(false)
    }
  }

  // ── Continue handler for each step ────────────────────────────────────────

  function handleContinue() {
    if (step === 0) {
      handleComposeContinue()
    } else {
      setStep((s) => (s + 1) as Step)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  function renderStep() {
    if (step === 0) {
      return (
        <ComposeStep
          action={action}
          setAction={setAction}
          deliverable={deliverable}
          setDeliverable={setDeliverable}
          deadlineLocal={deadlineLocal}
          setDeadlineLocal={setDeadlineLocal}
          error={composeError}
          creating={creating}
        />
      )
    }
    if (step === 1) {
      return <ContextStep />
    }
    // step === 2
    return commitment !== null ? (
      <PlanStep
        commitment={commitment}
        onCommitmentChange={setCommitment}
        starting={starting}
        startError={startError}
      />
    ) : (
      // Fallback: commitment missing (shouldn't happen; user can't skip Compose).
      <div className="plan-step">
        <p>No commitment found. Please go back and compose one.</p>
      </div>
    )
  }

  // Disable "Continue" on Compose while fields are incomplete or request is in-flight.
  const continueDisabled = (step === 0 && (!deliverable.trim() || !deadlineLocal)) || creating || starting

  return (
    <div className="workspace-root new-commitment-root">
      {/* Header */}
      <div className="workspace-topbar">
        <button
          type="button"
          className="workspace-back-btn"
          aria-label="Cancel and go back"
          onClick={() => navigate('/home')}
        >
          ✕ Cancel
        </button>
        {/* Progress indicator */}
        <nav className="stepper" aria-label="Commitment setup steps">
          {STEP_LABELS.map((label, i) => (
            <div
              key={label}
              className={`stepper-step ${i === step ? 'stepper-step-active' : ''} ${i < step ? 'stepper-step-done' : ''}`}
              aria-current={i === step ? 'step' : undefined}
            >
              <div className="stepper-dot" />
              <span className="stepper-label">{label}</span>
            </div>
          ))}
        </nav>
        <div className="workspace-spacer" aria-hidden="true" />
      </div>

      {/* Step content */}
      <div className="new-commitment-content">{renderStep()}</div>

      {/* Step navigation */}
      <div className="new-commitment-footer">
        {step > 0 && (
          <Button variant="secondary" onClick={() => setStep((s) => (s - 1) as Step)} disabled={starting}>
            Back
          </Button>
        )}
        {step < 2 ? (
          <Button variant="primary" onClick={handleContinue} disabled={continueDisabled}>
            {creating ? 'Creating…' : 'Continue'}
          </Button>
        ) : (
          <Button variant="accent" onClick={handleStart} disabled={starting}>
            {starting ? 'Starting…' : 'Start commitment'}
          </Button>
        )}
      </div>
    </div>
  )
}
