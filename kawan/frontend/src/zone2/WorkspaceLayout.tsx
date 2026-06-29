// WorkspaceLayout — Zone 2 full-screen workspace for /workspace/:id
// No shell chrome. Local viewMode: 'stage' | 'messages'. Shared conversation state.
// T4: phased VN-intake (phase:'intake') → open chat (phase:'chat').
// Phase lives here; stage NEVER remounts (A3 design §4, PO decision 6).
// Phase 3: Context/Plan/Check-In/Finish islands + Activity card overlaid as DOM siblings.

import { ArrowLeft } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { MOCK_AUTH } from '../auth/api'
import type { ContextTurnResponse } from '../commitments/api'
import { contextTurn, fetchCommitmentById } from '../commitments/api'
import { type TourOverride, useDemoTour } from '../demo/DemoTour'
import { mockConversation } from '../mock/fixtures'
import { TopbarControls } from '../shell/TopbarControls'
import type { Commitment, Emotion } from '../types/api'
import type { WorkspaceMessage } from '../workspace/api'
import { workspaceTurn } from '../workspace/api'
import { fetchMessages } from '../workspace/messagesApi'
import { Confetti } from './Confetti'
import { EndingSequence } from './EndingSequence'
import { ActivityCard, type ActivityMilestone } from './islands/ActivityCard'
import { CheckinIsland } from './islands/CheckinIsland'
import { ContextIsland } from './islands/ContextIsland'
import { DetailsIsland } from './islands/DetailsIsland'
import { FinishIsland } from './islands/FinishIsland'
import { PlanIsland } from './islands/PlanIsland'
import {
  type CheckinStatus,
  countFilledSlots,
  detectKeyEvent,
  fetchCheckinStatus,
  fetchSoftContext,
  type KeyEventKind
} from './keyEvents'
import { MessagesMode } from './MessagesMode'
import { generatePlan, type PlanResult } from './planApi'
import { StageMode } from './StageMode'
import { WorkspaceDrawer } from './WorkspaceDrawer'

type ViewMode = 'stage' | 'messages'
export type WorkspacePhase = 'intake' | 'chat'

// Workspace coachmark sub-tour steps (only meaningful while the demo tour is on the workspace step).
type SubStep =
  | 'intake'
  | 'leftTab'
  | 'leftContext'
  | 'leftPlan'
  | 'leftActivity'
  | 'rightTab'
  | 'rightDetails'
  | 'rightCheckin'
  | 'rightFinish'
  | 'share'
  | 'analytics'

// Slot progress: how many of the 4 soft-context slots are filled.
export interface SlotProgress {
  total: number
  filled: number
}

// The 4 intake slots in order — each answer advances the counter.
export type IntakeSlotName = 'why' | 'obstacles' | 'time_constraints' | 'skill'

function slotCount(slots: ContextTurnResponse['slots']): number {
  return [slots.why, slots.obstacles, slots.time_constraints, slots.skill].filter((v) => v !== null).length
}

function makeMockIntakeMessage(text: string, emotion: Emotion = 'curious'): WorkspaceMessage {
  return {
    id: crypto.randomUUID(),
    from: 'kawan',
    text,
    emotion,
    responseType: 'coaching'
  }
}

// Static canned mock intake — 4 turns then chat, zero network.
const MOCK_INTAKE_TURNS = [
  {
    say: "Before we dive in, I have 4 quick questions to get the full picture. First: what's the deeper reason this matters to you?",
    emotion: 'curious' as Emotion
  },
  { say: "And what's the main obstacle you're already expecting?", emotion: 'skeptical' as Emotion },
  { say: 'How tight is your timeline for this?', emotion: 'curious' as Emotion },
  { say: 'How confident are you in your skills for this task?', emotion: 'curious' as Emotion }
]

function mockChatReply(userText: string): WorkspaceMessage {
  const kawanTurns = mockConversation.filter((t) => t.speaker === 'kawan')
  const pick = kawanTurns[Math.floor(Math.random() * kawanTurns.length)]
  return {
    id: crypto.randomUUID(),
    from: 'kawan',
    text: pick?.text ?? `You said: ${userText}. (mock reply)`,
    emotion: pick?.emotion ?? 'neutral',
    responseType: 'coaching'
  }
}

// Minor words stay lowercase in title case unless first/last (e.g. "I Will Write an Essay").
const TITLE_MINOR_WORDS = new Set([
  'a',
  'an',
  'the',
  'and',
  'but',
  'or',
  'nor',
  'for',
  'so',
  'yet',
  'at',
  'by',
  'in',
  'of',
  'on',
  'to',
  'up',
  'as',
  'off',
  'per',
  'via',
  'with'
])

function titleCase(s: string): string {
  const words = s.trim().split(/\s+/)
  return words
    .map((w, i) => {
      const lower = w.toLowerCase()
      if (i !== 0 && i !== words.length - 1 && TITLE_MINOR_WORDS.has(lower)) return lower
      return lower.charAt(0).toUpperCase() + lower.slice(1)
    })
    .join(' ')
}

export function WorkspaceLayout() {
  const navigate = useNavigate()
  const { id: commitmentId } = useParams<{ id: string }>()
  const { active: tourActive, currentStep: tourStep, setOverride } = useDemoTour()
  const [viewMode, setViewMode] = useState<ViewMode>('stage')
  const [viewSwitching, setViewSwitching] = useState(false)
  // False until the Live2D model has settled in the stage. Switching to Messages unmounts the
  // stage, so re-entering Stage reloads it; hold the loader until onStageReady fires again.
  const [stageReady, setStageReady] = useState(false)
  // Side-drawer open state. `pinned` is the click-to-pin latch; `hovered` is the transient peek
  // (the cursor is only ever over one drawer). The demo tour can also force a side open.
  const [drawerPinned, setDrawerPinned] = useState<{ left: boolean; right: boolean }>({ left: false, right: false })
  const [drawerHovered, setDrawerHovered] = useState<'left' | 'right' | null>(null)
  const [messages, setMessages] = useState<WorkspaceMessage[]>([])
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [phase, setPhase] = useState<WorkspacePhase>('intake')
  const [slotProgress, setSlotProgress] = useState<SlotProgress>({ total: 4, filled: 0 })
  // Current intake slot index (0–3); 4 means all done.
  const [intakeStep, setIntakeStep] = useState(0)
  // Commitment fetched on mount for intake options + starters
  const [commitment, setCommitment] = useState<Commitment | null>(null)
  // Plan result — generated once after intake completes
  const [plan, setPlan] = useState<PlanResult | null>(null)

  // Plan generating flag — true while /plan is in-flight
  const [planGenerating, setPlanGenerating] = useState(false)
  // Checkin status from GET /{id}/checkin-status — drives key-event detection
  const [checkinStatus, setCheckinStatus] = useState<CheckinStatus | null>(null)
  // Key event kind derived from commitment state + checkin status
  const [keyEvent, setKeyEvent] = useState<KeyEventKind>(null)
  // 2.1: whole-workspace init overlay — true from mount until commitment + history + opener resolve.
  const [initializing, setInitializing] = useState(true)
  // 3.x: Activity card refresh signal + client-side milestones (e.g. context captured).
  const [activitySignal, setActivitySignal] = useState(0)
  const [milestones, setMilestones] = useState<ActivityMilestone[]>([])
  // 3.5: win overlay — set when a Finish-Now submission completes the commitment.
  const [winDateIso, setWinDateIso] = useState<string | null>(null)
  // 4.x: workspace coachmark sub-tour — islands -> check-in -> finish -> share -> analytics.
  const [subStep, setSubStep] = useState<SubStep>('intake')
  // True once a Finish-Now submission was evaluated but didn't complete (denied/unclear) — the
  // walkthrough then offers a Skip so a denied demo submission can't dead-end the tour.
  const [finishEvaluated, setFinishEvaluated] = useState(false)
  const shareOpenedRef = useRef(false)

  // Mock intake turn tracker (MOCK_AUTH only)
  const mockIntakeTurnRef = useRef(0)
  // Guard: fire the intake opener only once on mount
  const intakeOpenerFired = useRef(false)
  // Guard: generatePlan fires only once after intake completes
  const planFiredRef = useRef(false)
  // Last failed turn — used by handleRetry to re-fire.
  const lastFailedTurnRef = useRef<{ endpoint: 'intake' | 'chat'; text: string } | null>(null)

  // On mount: fetch the commitment + load persisted history, then decide phase.
  // 1.3: hydrate messages from backend; if non-empty + intake done → chat; else opener.
  // 2.4: fetch commitment for intakeOptions/starters.
  useEffect(() => {
    if (intakeOpenerFired.current) return
    intakeOpenerFired.current = true

    if (MOCK_AUTH) {
      // MOCK path: canned 4-question intake then flip to chat
      const opener = MOCK_INTAKE_TURNS[0]
      if (opener) {
        setMessages([makeMockIntakeMessage(opener.say, opener.emotion)])
      }
      mockIntakeTurnRef.current = 1
      setInitializing(false)
      return
    }

    if (!commitmentId) {
      setInitializing(false)
      return
    }

    async function init() {
      if (!commitmentId) return

      // Fetch the commitment for intakeOptions + starters (2.4)
      try {
        const c = await fetchCommitmentById(commitmentId)
        setCommitment(c)
      } catch {
        // Non-fatal — starters + options fall back gracefully
      }

      // 1.3: load persisted history
      let history: WorkspaceMessage[] = []
      try {
        history = await fetchMessages(commitmentId)
      } catch {
        // Non-fatal — treat as empty history, run opener
      }

      if (history.length > 0) {
        // Fix B: use real slot count from GET /{id}/soft-context, not userTurns heuristic.
        // intake complete = all 4 slots non-null; otherwise resume at the filled-slot index.
        const slots = await fetchSoftContext(commitmentId)
        const filledCount = slots ? countFilledSlots(slots) : 0
        setMessages(history)
        if (filledCount >= 4) {
          setPhase('chat')
          setSlotProgress({ total: 4, filled: 4 })
          setIntakeStep(4)
        } else {
          // Partial intake — resume from the real filled-slot index
          setPhase('intake')
          setSlotProgress({ total: 4, filled: filledCount })
          setIntakeStep(filledCount)
        }
        // Don't re-fire the opener when history exists
        setInitializing(false)
        return
      }

      // No history — fire opener turn
      setSending(true)
      contextTurn(commitmentId, '')
        .then((resp) => {
          const msg: WorkspaceMessage = {
            id: crypto.randomUUID(),
            from: 'kawan',
            text: resp.say,
            emotion: resp.emotion,
            responseType: 'coaching'
          }
          setMessages([msg])
          setSlotProgress({ total: 4, filled: slotCount(resp.slots) })
          if (resp.intake_complete) {
            setPhase('chat')
            setIntakeStep(4)
          }
        })
        .catch(() => {
          setMessages([
            {
              id: crypto.randomUUID(),
              from: 'kawan',
              text: 'So — what are we actually doing here?',
              emotion: 'neutral',
              responseType: 'coaching'
            }
          ])
          setPhase('chat')
        })
        .finally(() => {
          setSending(false)
          setInitializing(false)
        })
    }

    void init()
  }, [commitmentId])

  // 1.6: fire generatePlan ONCE when phase flips to 'chat'
  useEffect(() => {
    if (phase !== 'chat') return
    if (planFiredRef.current) return
    if (!commitmentId || MOCK_AUTH) return
    planFiredRef.current = true

    setPlanGenerating(true)
    generatePlan(commitmentId)
      .then((result) => {
        if (result) setPlan(result)
      })
      .catch(() => {
        // Non-fatal — no plan, no crash
      })
      .finally(() => setPlanGenerating(false))
  }, [phase, commitmentId])

  // 3.6: load checkin status and derive key event when in chat phase
  useEffect(() => {
    if (phase !== 'chat') return
    if (!commitmentId || MOCK_AUTH || !commitment) return

    fetchCheckinStatus(commitmentId).then((status) => {
      setCheckinStatus(status)
      const kind = detectKeyEvent(commitment.status, commitment.deadline, status)
      setKeyEvent(kind)
    })
  }, [phase, commitmentId, commitment])

  // Append a Kawan line to the shared conversation (used by check-in / finish islands to "reply").
  const sayAsKawan = useCallback((text: string, emotion: Emotion = 'neutral') => {
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), from: 'kawan', text, emotion, responseType: 'coaching' }
    ])
  }, [])

  // Bump the Activity card so it re-fetches the timeline after a check-in / finish.
  const bumpActivity = useCallback(() => setActivitySignal((n) => n + 1), [])

  // Add a client-side milestone (e.g. "Context captured") and refresh the Activity card.
  const addMilestone = useCallback((label: string) => {
    setMilestones((prev) => [...prev, { at: new Date().toISOString(), label }])
    setActivitySignal((n) => n + 1)
  }, [])

  // Finish-Now completed the commitment — roll the full-screen win overlay.
  const handleFinishComplete = useCallback((iso: string) => setWinDateIso(iso), [])

  // Handle an intake answer — calls context/turn, updates slots, flips phase when complete.
  const handleIntakeAnswer = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || sending) return

      const userMsg: WorkspaceMessage = { id: crypto.randomUUID(), from: 'user', text: trimmed }
      setMessages((prev) => [...prev, userMsg])
      setSending(true)
      setError(null)

      if (MOCK_AUTH) {
        await new Promise<void>((r) => setTimeout(r, 350))
        const nextIdx = mockIntakeTurnRef.current
        const next = MOCK_INTAKE_TURNS[nextIdx]
        if (next) {
          mockIntakeTurnRef.current = nextIdx + 1
          setMessages((prev) => [...prev, makeMockIntakeMessage(next.say, next.emotion)])
          setIntakeStep(nextIdx + 1)
          setSlotProgress({ total: 4, filled: nextIdx + 1 })
        } else {
          setMessages((prev) => [
            ...prev,
            makeMockIntakeMessage("Got it — let's work through this together.", 'pleased')
          ])
          setPhase('chat')
          setIntakeStep(4)
          setSlotProgress({ total: 4, filled: 4 })
          addMilestone('Context captured')
        }
        setSending(false)
        return
      }

      if (!commitmentId) {
        setError('No commitment ID — cannot reach Kawan.')
        setSending(false)
        return
      }

      try {
        const resp = await contextTurn(commitmentId, trimmed)
        const kawanMsg: WorkspaceMessage = {
          id: crypto.randomUUID(),
          from: 'kawan',
          text: resp.say,
          emotion: resp.emotion,
          responseType: 'coaching'
        }
        setMessages((prev) => [...prev, kawanMsg])
        const filled = slotCount(resp.slots)
        setSlotProgress({ total: 4, filled })
        setIntakeStep(filled)
        if (resp.intake_complete) {
          setPhase('chat')
          setIntakeStep(4)
          addMilestone('Context captured')
        }
      } catch (err) {
        lastFailedTurnRef.current = { endpoint: 'intake', text: trimmed }
        setError(err instanceof Error ? err.message : "Kawan couldn't reply just now — tap to retry")
      } finally {
        setSending(false)
      }
    },
    [commitmentId, sending, addMilestone]
  )

  // Handle open-chat send — workspace/turn endpoint.
  const handleSend = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || sending) return

      const userMsg: WorkspaceMessage = { id: crypto.randomUUID(), from: 'user', text: trimmed }
      setMessages((prev) => [...prev, userMsg])
      setSending(true)
      setError(null)

      if (MOCK_AUTH) {
        await new Promise<void>((r) => setTimeout(r, 400))
        setMessages((prev) => [...prev, mockChatReply(trimmed)])
        setSending(false)
        return
      }

      if (!commitmentId) {
        setError('No commitment ID in URL — cannot reach Kawan.')
        setSending(false)
        return
      }

      try {
        const recentTurns = messages.map((m) => ({
          role: m.from === 'user' ? ('user' as const) : ('assistant' as const),
          content: m.text
        }))
        const reply = await workspaceTurn(commitmentId, trimmed, recentTurns)
        const kawanMsg: WorkspaceMessage = {
          id: crypto.randomUUID(),
          from: 'kawan',
          text: reply.say,
          emotion: reply.emotion,
          responseType: reply.response_type,
          proposal: reply.response_type === 'proposal' && reply.proposal_id ? reply.proposal : null,
          proposalId: reply.response_type === 'proposal' ? reply.proposal_id : undefined,
          proposalState: reply.response_type === 'proposal' && reply.proposal_id ? 'open' : undefined
        }
        setMessages((prev) => [...prev, kawanMsg])
      } catch (err) {
        lastFailedTurnRef.current = { endpoint: 'chat', text: trimmed }
        setError(err instanceof Error ? err.message : "Kawan couldn't reply just now — tap to retry")
      } finally {
        setSending(false)
      }
    },
    [commitmentId, sending, messages]
  )

  function handleRetry() {
    const failed = lastFailedTurnRef.current
    if (!failed) {
      setError(null)
      return
    }
    setError(null)
    lastFailedTurnRef.current = null
    setSending(true)
    if (failed.endpoint === 'intake' && commitmentId) {
      contextTurn(commitmentId, failed.text)
        .then((resp) => {
          const kawanMsg: WorkspaceMessage = {
            id: crypto.randomUUID(),
            from: 'kawan',
            text: resp.say,
            emotion: resp.emotion,
            responseType: 'coaching'
          }
          setMessages((prev) => [...prev, kawanMsg])
          const filled = slotCount(resp.slots)
          setSlotProgress({ total: 4, filled })
          setIntakeStep(filled)
          if (resp.intake_complete) {
            setPhase('chat')
            setIntakeStep(4)
          }
        })
        .catch((err) => {
          lastFailedTurnRef.current = failed
          setError(err instanceof Error ? err.message : "Kawan couldn't reply just now — tap to retry")
        })
        .finally(() => setSending(false))
    } else if (failed.endpoint === 'chat' && commitmentId) {
      workspaceTurn(commitmentId, failed.text)
        .then((reply) => {
          const kawanMsg: WorkspaceMessage = {
            id: crypto.randomUUID(),
            from: 'kawan',
            text: reply.say,
            emotion: reply.emotion,
            responseType: reply.response_type,
            proposal: reply.response_type === 'proposal' && reply.proposal_id ? reply.proposal : null,
            proposalId: reply.response_type === 'proposal' ? reply.proposal_id : undefined,
            proposalState: reply.response_type === 'proposal' && reply.proposal_id ? 'open' : undefined
          }
          setMessages((prev) => [...prev, kawanMsg])
        })
        .catch((err) => {
          lastFailedTurnRef.current = failed
          setError(err instanceof Error ? err.message : "Kawan couldn't reply just now — tap to retry")
        })
        .finally(() => setSending(false))
    } else {
      setSending(false)
    }
  }

  function handleProposalApplied(messageId: string) {
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, proposalState: 'applied' } : m)))
  }

  function handleProposalDismissed(messageId: string) {
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, proposalState: 'dismissed' } : m)))
  }

  // ── Demo sub-tour (workspace step): event-driven coachmark flow ──────────────────────────
  // intake done -> islands intro (Next) -> check-in upload -> finish upload -> share -> analytics.
  const handleCheckinVerdict = useCallback(() => {
    setSubStep((s) => (s === 'rightCheckin' ? 'rightFinish' : s))
  }, [])

  // A denied/unclear Finish verdict won't roll the win, so surface a Skip in the finish coachmark.
  const handleFinishVerdict = useCallback(() => {
    setFinishEvaluated(true)
  }, [])

  const handleShareStateChange = useCallback((open: boolean) => {
    if (open) {
      shareOpenedRef.current = true
    } else if (shareOpenedRef.current) {
      setSubStep((s) => (s === 'share' ? 'analytics' : s))
    }
  }, [])

  // Intake complete -> prompt opening the left drawer.
  useEffect(() => {
    if (phase === 'chat') setSubStep((s) => (s === 'intake' ? 'leftTab' : s))
  }, [phase])

  // Detect the user opening a drawer at a "tab" step, then advance into that drawer's islands
  // (which force it open via tourDrawer, holding it for the per-island walkthrough).
  useEffect(() => {
    if (!(tourActive && tourStep === 2)) return
    const leftOpen = drawerPinned.left || drawerHovered === 'left'
    const rightOpen = drawerPinned.right || drawerHovered === 'right'
    if (subStep === 'leftTab' && leftOpen) setSubStep('leftContext')
    else if (subStep === 'rightTab' && rightOpen) setSubStep('rightDetails')
  }, [tourActive, tourStep, subStep, drawerPinned, drawerHovered])

  // Finish completed (win overlay shown) -> guide the share step.
  useEffect(() => {
    if (winDateIso) setSubStep((s) => (s === 'share' || s === 'analytics' ? s : 'share'))
  }, [winDateIso])

  // Drive the shared Spotlight via the tour override while the tour is on the workspace step.
  useEffect(() => {
    if (!(tourActive && tourStep === 2)) {
      setOverride(null)
      return
    }
    const overrides: Record<SubStep, TourOverride> = {
      intake: { hintText: "Answer Kawan's 4 questions to unlock your workspace tools." },
      leftTab: {
        target: '.ws-drawer--left .ws-drawer-tab',
        hintText: 'Hover the Plan tab on the left to open your drawer.',
        placement: 'right'
      },
      leftContext: {
        target: '.ws-drawer--left .context-island',
        hintText: 'Context is what Kawan learned about you during intake.',
        placement: 'right',
        showNext: true,
        onNext: () => setSubStep('leftPlan')
      },
      leftPlan: {
        target: '.ws-drawer--left .plan-island',
        hintText: 'Plan is your roadmap from here to the deadline.',
        placement: 'right',
        showNext: true,
        onNext: () => setSubStep('leftActivity')
      },
      leftActivity: {
        target: '.ws-drawer--left .activity-card',
        hintText: 'Activity logs every check-in and milestone.',
        placement: 'right',
        showNext: true,
        onNext: () => {
          setDrawerPinned({ left: false, right: false })
          setSubStep('rightTab')
        }
      },
      rightTab: {
        target: '.ws-drawer--right .ws-drawer-tab',
        hintText: 'Now hover the Check-ins tab on the right.',
        placement: 'left'
      },
      rightDetails: {
        target: '.ws-drawer--right .details-island',
        hintText: 'Details holds your commitment terms: deadline, cadence, evidence.',
        placement: 'left',
        showNext: true,
        onNext: () => setSubStep('rightCheckin')
      },
      rightCheckin: {
        target: '.ws-drawer--right .checkin-island',
        hintText: 'Open Check-In and upload a file to log your progress, or continue.',
        placement: 'left',
        showNext: true,
        onNext: () => setSubStep('rightFinish')
      },
      rightFinish: {
        target: '.ws-drawer--right .finish-island',
        hintText: finishEvaluated
          ? "If Kawan won't pass your evidence, tap Skip to wrap up the walkthrough."
          : 'Now open Finish Now and upload your final evidence to complete the commitment.',
        placement: 'left',
        showNext: finishEvaluated,
        nextLabel: 'Skip',
        onNext: () => setSubStep('analytics')
      },
      share: { target: '.ending-btn--share', hintText: 'You did it. Open "Share your win" to celebrate.' },
      analytics: { target: '.workspace-back-btn', hintText: 'Head to Analytics to see what you achieved.' }
    }
    setOverride(overrides[subStep])
    return () => setOverride(null)
  }, [tourActive, tourStep, subStep, finishEvaluated, setOverride])

  // 2.1: openerLoading — true while the very first Kawan message is fetching.
  // Once messages.length > 0 it clears (catch path always sets a message too).
  const openerLoading = phase === 'intake' && messages.length === 0 && sending

  // 2.1: brief loading state on viewMode switch — clears on next paint via requestAnimationFrame.
  function handleViewModeSwitch(next: ViewMode) {
    if (next === viewMode) return
    // Re-entering Stage remounts the Live2D model; gate the loader until it reports ready again.
    if (next === 'stage') setStageReady(false)
    setViewSwitching(true)
    setViewMode(next)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setViewSwitching(false))
    })
  }

  const handleStageReady = useCallback(() => setStageReady(true), [])

  // The Stage/Messages toggle is rendered inside each view (in the dialogue box for stage,
  // at the top for messages) rather than floated over the stage, so it never overlaps content.
  const modeToggle = (
    <div className="workspace-mode-toggle" role="toolbar" aria-label="View mode">
      <button
        type="button"
        className={`workspace-mode-btn ${viewMode === 'stage' ? 'workspace-mode-btn-active' : ''}`}
        aria-pressed={viewMode === 'stage'}
        onClick={() => handleViewModeSwitch('stage')}
      >
        Stage
      </button>
      <button
        type="button"
        className={`workspace-mode-btn ${viewMode === 'messages' ? 'workspace-mode-btn-active' : ''}`}
        aria-pressed={viewMode === 'messages'}
        onClick={() => handleViewModeSwitch('messages')}
      >
        Messages
      </button>
    </div>
  )

  const sharedProps = {
    modeToggle,
    messages,
    // 2.1: suppress typing-dots in views while openerLoading is true
    sending: openerLoading ? false : sending,
    error,
    commitmentId: commitmentId ?? '',
    phase,
    slotProgress,
    commitment,
    intakeStep,
    openerLoading,
    keyEvent,
    checkinStatus,
    onSend: handleSend,
    onIntakeAnswer: handleIntakeAnswer,
    onRetry: handleRetry,
    onProposalApplied: handleProposalApplied,
    onProposalDismissed: handleProposalDismissed
  }

  // 3.6: commitment failure — overlay the ending sequence instead of the normal workspace
  const isFailure = keyEvent === 'failure' && commitment !== null

  const isLoading = initializing || openerLoading || viewSwitching || (viewMode === 'stage' && !stageReady)

  // Side-drawer open state. During the per-island tour steps, force (and hold) the matching drawer
  // open so its spotlight lands on the island inside; the "tab" steps leave it to the user.
  const onWorkspaceTour = tourActive && tourStep === 2
  const tourDrawer: 'left' | 'right' | null = !onWorkspaceTour
    ? null
    : subStep === 'leftContext' || subStep === 'leftPlan' || subStep === 'leftActivity'
      ? 'left'
      : subStep === 'rightDetails' || subStep === 'rightCheckin' || subStep === 'rightFinish'
        ? 'right'
        : null
  const leftDrawerOpen = drawerPinned.left || drawerHovered === 'left' || tourDrawer === 'left'
  const rightDrawerOpen = drawerPinned.right || drawerHovered === 'right' || tourDrawer === 'right'
  // Both drawers show from intake on: the left holds Context (which fills during intake), the right
  // holds Details. Plan/Activity and Check-In/Finish only populate once chat starts.
  const showLeftDrawer = !isFailure && !winDateIso
  const showRightDrawer = !isFailure && !winDateIso
  const anyDrawerOpen =
    commitmentId != null && ((showLeftDrawer && leftDrawerOpen) || (showRightDrawer && rightDrawerOpen))

  function setHovered(side: 'left' | 'right', hovered: boolean) {
    setDrawerHovered((cur) => (hovered ? side : cur === side ? null : cur))
  }

  // Commitment sentence minus the deadline, Title Cased (e.g. "I Will Write an Essay").
  const workspaceTitle = commitment ? titleCase(`I will ${commitment.action} ${commitment.deliverable}`) : ''

  return (
    <div className={`workspace-root${tourActive ? ' workspace-root--tour' : ''}`}>
      {/* Header bar */}
      <div className="workspace-topbar">
        <button
          type="button"
          className="workspace-back-btn"
          aria-label={tourActive && tourStep === 2 ? 'Continue to analytics' : 'Back to commitment'}
          onClick={() =>
            tourActive && tourStep === 2 ? navigate('/welcome/analytics') : navigate(`/commitments/${commitmentId}`)
          }
        >
          <ArrowLeft size={16} aria-hidden="true" />
          <span>{tourActive && tourStep === 2 ? 'Analytics' : 'Back'}</span>
        </button>
        {workspaceTitle && (
          <h1 className="workspace-title" title={workspaceTitle}>
            {workspaceTitle}
          </h1>
        )}
        <TopbarControls />
      </div>

      {/* Main stage area — wrapper gets blur class while loading; stage never remounts */}
      <div className={`workspace-stage${isLoading ? ' workspace-loading' : ''}`} aria-busy={isLoading}>
        {viewMode === 'stage' ? (
          <StageMode {...sharedProps} onStageReady={handleStageReady} />
        ) : (
          <MessagesMode {...sharedProps} />
        )}

        {/* 3.6: Commitment failure overlay — replaces normal workspace interaction */}
        {isFailure && (
          <div className="workspace-failure-overlay">
            <EndingSequence variant="failure" commitment={commitment} />
          </div>
        )}

        {/* 3.5: Win overlay — full-screen celebration + confetti after a Finish-Now completion */}
        {winDateIso && commitment && (
          <div className="workspace-win-overlay">
            <Confetti />
            <EndingSequence
              variant="win"
              commitment={commitment}
              winDateIso={winDateIso}
              onShareStateChange={handleShareStateChange}
            />
          </div>
        )}
      </div>

      {/* Side drawers hold the islands so the stage stays uninterrupted. The backdrop blurs and
          dims everything beneath the open drawer(s); clicking it unpins them. */}
      {anyDrawerOpen && (
        <div
          className="ws-drawer-backdrop"
          aria-hidden="true"
          onClick={() => setDrawerPinned({ left: false, right: false })}
        />
      )}

      {commitmentId && showRightDrawer && (
        <WorkspaceDrawer
          side="right"
          label="Check-ins"
          open={rightDrawerOpen}
          instant={tourDrawer === 'right'}
          onHoverChange={(h) => setHovered('right', h)}
          onToggle={() => setDrawerPinned((p) => ({ ...p, right: !p.right }))}
        >
          {commitment && <DetailsIsland commitment={commitment} />}
          {phase === 'chat' && (
            <>
              <CheckinIsland
                commitmentId={commitmentId}
                checkinStatus={checkinStatus}
                cadence={commitment?.cadence}
                variant={keyEvent === 'late-checkin' ? 'late-checkin' : keyEvent === 'checkin' ? 'checkin' : null}
                onKawanSay={sayAsKawan}
                onActivity={bumpActivity}
                onVerdict={handleCheckinVerdict}
              />
              {commitment && (
                <FinishIsland
                  commitmentId={commitmentId}
                  onKawanSay={sayAsKawan}
                  onActivity={bumpActivity}
                  onComplete={handleFinishComplete}
                  onVerdict={handleFinishVerdict}
                />
              )}
            </>
          )}
        </WorkspaceDrawer>
      )}

      {commitmentId && showLeftDrawer && (
        <WorkspaceDrawer
          side="left"
          label="Plan"
          open={leftDrawerOpen}
          instant={tourDrawer === 'left'}
          onHoverChange={(h) => setHovered('left', h)}
          onToggle={() => setDrawerPinned((p) => ({ ...p, left: !p.left }))}
        >
          <ContextIsland commitmentId={commitmentId} slotProgress={slotProgress} />
          {phase === 'chat' && (
            <>
              <PlanIsland plan={plan} commitment={commitment} generating={planGenerating} />
              <ActivityCard commitmentId={commitmentId} milestones={milestones} refreshSignal={activitySignal} />
            </>
          )}
        </WorkspaceDrawer>
      )}

      {/* 2.1: single labeled spinner sits outside the blurred stage */}
      {isLoading && (
        <div className="workspace-loading-spinner" role="status" aria-label="Loading">
          <span className="workspace-spinner-ring" aria-hidden="true" />
          <span className="workspace-spinner-label">Loading...</span>
        </div>
      )}
    </div>
  )
}
