// NewCommitment — /commitments/new (Zone 2, no shell chrome)
// Single scrolling page with 4 stacked full-ish-height sections + spy-scroll island.
//
// Section order: Compose -> Context -> Plan -> Companion
// Companion section holds the primary "Start commitment" CTA.
// Cancel is always inert (no persona PATCH, no create, no API call) until Start commitment.
//
// Spy-scroll island: pinned on the right, shows completion tick when required fields
// are satisfied, highlights the active section on scroll, smooth-scrolls on click.
//
// Motion: each section fades + rises 8px on viewport entry (IntersectionObserver).
// All motion gated by prefers-reduced-motion: reduce (no transforms when set).

import { Check, Clock, Lock, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
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

// Cadence options (Q6).
const CADENCE_OPTIONS: SelectOption[] = [
  { value: 'daily_evening', label: 'Daily (evening)' },
  { value: 'daily', label: 'Daily' },
  { value: 'every_2_days', label: 'Every 2 days' },
  { value: 'weekly', label: 'Weekly' }
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

// Section IDs (document order).
const SECTION_IDS = ['nc-compose', 'nc-context', 'nc-plan', 'nc-companion'] as const
type SectionId = (typeof SECTION_IDS)[number]

// Local draft shape for plan-step fields (held locally; NO API writes until handleStart).
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

// ── SectionReveal: fade+rise animation on viewport entry ─────────────────────

function SectionReveal({ children, id }: { children: React.ReactNode; id: SectionId }) {
  const ref = useRef<HTMLElement>(null)
  const [visible, setVisible] = useState(false)
  const prefersReduced = useRef(window.matchMedia('(prefers-reduced-motion: reduce)').matches)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          obs.disconnect()
        }
      },
      { threshold: 0.05 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const className = prefersReduced.current
    ? 'nc-section'
    : `nc-section nc-section-reveal${visible ? ' nc-section-visible' : ''}`

  return (
    <section ref={ref} id={id} className={className}>
      {children}
    </section>
  )
}

// ── SpyScrollIsland: on-this-page island with completion ticks ───────────────

interface IslandSection {
  id: SectionId
  label: string
  done: boolean
}

function SpyScrollIsland({ sections }: { sections: IslandSection[] }) {
  const [activeId, setActiveId] = useState<SectionId>('nc-compose')
  const prefersReduced = useRef(window.matchMedia('(prefers-reduced-motion: reduce)').matches)

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = new Map<string, boolean>()
        for (const e of entries) visible.set(e.target.id, e.isIntersecting)
        for (const s of sections) {
          if (visible.get(s.id) === true) {
            setActiveId(s.id as SectionId)
            break
          }
        }
      },
      { rootMargin: '-10% 0px -70% 0px', threshold: 0 }
    )
    for (const s of sections) {
      const el = document.getElementById(s.id)
      if (el) obs.observe(el)
    }
    return () => obs.disconnect()
  }, [sections])

  function scrollTo(id: string) {
    const el = document.getElementById(id)
    if (!el) return
    el.scrollIntoView({ behavior: prefersReduced.current ? 'instant' : 'smooth' })
  }

  return (
    <nav className="nc-island" aria-label="On this page">
      <p className="nc-island-heading">On this page</p>
      <ul className="nc-island-list">
        {sections.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              className={`nc-island-link${activeId === s.id ? ' nc-island-link-active' : ''}`}
              onClick={() => scrollTo(s.id)}
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

// ── ComposeSection ────────────────────────────────────────────────────────────

interface ComposeSectionProps {
  action: Action
  setAction: (a: Action) => void
  deliverable: string
  setDeliverable: (d: string) => void
  deadlineLocal: string
  setDeadlineLocal: (d: string) => void
  composeError: string | null
}

function ComposeSection({
  action,
  setAction,
  deliverable,
  setDeliverable,
  deadlineLocal,
  setDeadlineLocal,
  composeError
}: ComposeSectionProps) {
  return (
    <SectionReveal id="nc-compose">
      <div className="nc-section-inner">
        <h2 className="nc-section-heading">Make your commitment</h2>
        <div className="nc-compose-card">
          <div className="nc-compose-field-row">
            <span className="nc-compose-label">Action</span>
            <Select
              aria-label="Choose action"
              value={action}
              onChange={(v) => setAction(v as Action)}
              options={ACTION_SELECT_OPTIONS}
            />
          </div>
          <div className="nc-compose-field-row">
            <label className="nc-compose-label" htmlFor="nc-deliverable">
              Deliverable
            </label>
            <input
              id="nc-deliverable"
              className="nc-compose-input"
              type="text"
              placeholder="what you will deliver"
              value={deliverable}
              onChange={(e) => setDeliverable(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="nc-compose-field-row">
            <span className="nc-compose-label">Deadline</span>
            <DatePicker value={deadlineLocal} onChange={setDeadlineLocal} aria-label="Choose deadline" />
          </div>
          {composeError && <p className="compose-error">{composeError}</p>}
          <p className="nc-compose-hint">Evidence will be verified. Self-report is not accepted.</p>
        </div>
        <p className="nc-sentence-preview">
          I will <em>{action}</em> {deliverable || 'the deliverable'}{' '}
          {deadlineLocal
            ? `by ${new Date(deadlineLocal).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}`
            : 'by the deadline'}
        </p>
      </div>
    </SectionReveal>
  )
}

// ── ContextSection (stub - AI intake deferred, Open Q1) ──────────────────────
// LANE C SEAM: replace this component body with the real intake chat when
// POST /api/commitments/{id}/context/turn and its response schema land.

function ContextSection() {
  return (
    <SectionReveal id="nc-context">
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
    </SectionReveal>
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
}

function PlanSection({ draft, onDraftChange, action, deliverable, deadlineLocal }: PlanSectionProps) {
  const evidenceType = draft.evidence_type
  const repo =
    draft.evidence_config !== null && typeof draft.evidence_config?.repo === 'string'
      ? (draft.evidence_config.repo as string)
      : ''

  const trustLabel = EVIDENCE_OPTIONS_FULL.find((o) => o.value === evidenceType)?.trust ?? ''
  const deadlineDisplay = deadlineLocal ? new Date(deadlineLocal).toLocaleString('en-MY') : ''

  return (
    <SectionReveal id="nc-plan">
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
        <div className="plan-settings">
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
        </div>
      </div>
    </SectionReveal>
  )
}

// ── CompanionSection: horizontal cube-card grid ───────────────────────────────
// Always horizontal at every width - horizontal scroll + scroll-snap on narrow screens.
// portrait image + name + role + short description per card.
// "Start commitment" CTA lives here (companion section is LAST per spec).

interface CompanionSectionProps {
  selectedPersona: Persona
  onSelect: (p: Persona) => void
  starting: boolean
  startError: string | null
  onStart: () => void
  composeValid: boolean
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

function CompanionSection({
  selectedPersona,
  onSelect,
  starting,
  startError,
  onStart,
  composeValid
}: CompanionSectionProps) {
  const personas = listPersonas()

  return (
    <SectionReveal id="nc-companion">
      <div className="nc-section-inner">
        <h2 className="nc-section-heading">Choose your companion</h2>
        <p className="nc-companion-sub">
          Your companion checks in with you, reviews your evidence, and gives you a verdict. Pick the one that fits how
          you want to be held to account.
        </p>

        {/* Horizontal cube-card grid - always horizontal, scroll-snap on narrow */}
        <div className="nc-companion-grid">
          {personas.map((p) => {
            const isSelected = selectedPersona === p.id
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

        {!composeValid && <p className="nc-cta-hint">Fill in the Compose section above before starting.</p>}

        <div className="nc-cta-row">
          <Button variant="accent" onClick={onStart} disabled={starting || !composeValid}>
            {starting ? 'Starting...' : 'Start commitment'}
          </Button>
        </div>
      </div>
    </SectionReveal>
  )
}

// ── NewCommitment (root page) ─────────────────────────────────────────────────

export function NewCommitment() {
  const navigate = useNavigate()
  const { me, setPersona } = useAuth()

  // Companion selection - seeded from current persona.
  // NO setPersona call here; committed only in handleStart.
  const [selectedPersona, setSelectedPersona] = useState<Persona>(me?.persona ?? 'kawan')

  // Compose state - lifted so it survives scroll and feeds handleStart.
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

  // Compose validity for section tick + CTA guard.
  function isComposeValid(): boolean {
    if (!deliverable.trim()) return false
    if (!deadlineLocal) return false
    const dl = new Date(deadlineLocal)
    if (Number.isNaN(dl.getTime())) return false
    if (dl <= new Date()) return false
    return true
  }

  const composeValid = isComposeValid()

  // Island sections with completion state
  const islandSections: IslandSection[] = [
    { id: 'nc-compose', label: 'Compose', done: composeValid },
    { id: 'nc-context', label: 'Context', done: false },
    { id: 'nc-plan', label: 'Plan', done: false },
    { id: 'nc-companion', label: 'Companion', done: !!selectedPersona }
  ]

  // ── Cancel - fully inert: NO API calls, NO persona writes ────────────────
  // Because createCommitment is deferred to handleStart, Cancel at any point
  // leaves the server and localStorage byte-for-byte unchanged.
  function handleCancel() {
    navigate('/home')
  }

  // ── Start commitment - first and only API write in the entire flow ─────────
  async function handleStart() {
    if (starting) return

    // Validate compose before writing anything
    if (!deliverable.trim()) {
      setComposeError('Please describe what you will deliver.')
      document.getElementById('nc-compose')?.scrollIntoView({ behavior: 'smooth' })
      return
    }
    if (!deadlineLocal) {
      setComposeError('Please pick a deadline.')
      document.getElementById('nc-compose')?.scrollIntoView({ behavior: 'smooth' })
      return
    }
    const deadlineDate = new Date(deadlineLocal)
    if (deadlineDate <= new Date()) {
      setComposeError('Deadline must be in the future.')
      document.getElementById('nc-compose')?.scrollIntoView({ behavior: 'smooth' })
      return
    }
    const diffMs = deadlineDate.getTime() - Date.now()
    if (diffMs < 60 * 60 * 1000) {
      if (!window.confirm("That's under an hour. Are you sure?")) return
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
      // 3. Start the commitment (draft to active)
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

      {/* Page body: scrollable content + pinned island */}
      <div className="nc-body">
        {/* Scrollable sections column */}
        <div className="nc-scroll">
          <ComposeSection
            action={action}
            setAction={setAction}
            deliverable={deliverable}
            setDeliverable={setDeliverable}
            deadlineLocal={deadlineLocal}
            setDeadlineLocal={setDeadlineLocal}
            composeError={composeError}
          />
          <ContextSection />
          <PlanSection
            draft={draftPlan}
            onDraftChange={setDraftPlan}
            action={action}
            deliverable={deliverable}
            deadlineLocal={deadlineLocal}
          />
          <CompanionSection
            selectedPersona={selectedPersona}
            onSelect={setSelectedPersona}
            starting={starting}
            startError={startError}
            onStart={handleStart}
            composeValid={composeValid}
          />
        </div>

        {/* Spy-scroll island - pinned right rail (hidden under 900px) */}
        <div className="nc-island-col">
          <SpyScrollIsland sections={islandSections} />
        </div>
      </div>
    </div>
  )
}
