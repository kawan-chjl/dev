// DemoTour — app-level context provider for the guided walkthrough.
// Holds active state + current step; drives navigation via hook consumers.
// The step bar (DemoStepBar) reads this context and renders while active.

import { createContext, type ReactNode, useCallback, useContext, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { deleteCommitment } from '../commitments/api'

export interface TourStep {
  label: string
  // The route to navigate to when this step becomes current.
  route: string
  target?: string
  hintText?: string
}

// A workspace-driven coachmark override. While the tour is on the workspace step, the workspace
// advances an event-based sub-tour by setting this override (which element to highlight, the hint,
// and an optional "Next" button). When set, the Spotlight renders it instead of the step default.
export interface TourOverride {
  target?: string
  hintText: string
  showNext?: boolean
  onNext?: () => void
  // 'left' floats the tooltip to the left of the target (for right-edge island targets whose
  // own buttons a below-placed tooltip would cover). Default places it below/above the target.
  placement?: 'left'
}

const TOUR_STEPS: TourStep[] = [
  {
    label: 'Commitments',
    route: '/welcome/commitments',
    target: '.page-header-card-actions .btn-accent',
    hintText: 'Start by creating one guided demo commitment.'
  },
  {
    label: 'Create',
    route: '/welcome/commitments/new',
    target: '[data-tour="commitment-deliverable"]',
    hintText: 'Fill in the commitment sentence, then continue through the setup.'
  },
  {
    label: 'Workspace',
    route: ''
    // No default highlight here: the workspace drives an event-based sub-tour via the override.
  }, // route is set dynamically after commitment created
  {
    label: 'Analytics',
    route: '/welcome/analytics',
    target: '.tour-analytics-finish-btn',
    hintText: 'Review the analytics preview, then finish the walkthrough.'
  },
  {
    label: 'Done',
    route: '/welcome/finished',
    target: '[data-tour="finished-home"]',
    hintText: 'Return home when you are ready.'
  }
]

export const TOUR_STEP_COUNT = TOUR_STEPS.length

interface DemoTourValue {
  active: boolean
  // 0-indexed; -1 when not active
  currentStep: number
  steps: TourStep[]
  demoCommitmentId: string | null
  setDemoCommitmentId: (id: string | null) => void
  start: () => void
  // Advance to next step, optionally overriding the route (used for workspace step).
  next: (overrideRoute?: string) => void
  skip: () => void
  finish: () => void
  // Workspace-driven coachmark override (event-based sub-tour); null = use the step default.
  override: TourOverride | null
  setOverride: (o: TourOverride | null) => void
}

const DemoTourContext = createContext<DemoTourValue | null>(null)

export function DemoTourProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const [active, setActive] = useState(false)
  const [currentStep, setCurrentStep] = useState(-1)
  const [demoCommitmentId, setDemoCommitmentId] = useState<string | null>(null)
  const [override, setOverride] = useState<TourOverride | null>(null)

  const cleanupDemoCommitment = useCallback(() => {
    if (demoCommitmentId) {
      deleteCommitment(demoCommitmentId).catch(() => {})
      setDemoCommitmentId(null)
    }
  }, [demoCommitmentId])

  const start = useCallback(() => {
    setActive(true)
    setCurrentStep(0)
    navigate(TOUR_STEPS[0].route)
  }, [navigate])

  const next = useCallback(
    (overrideRoute?: string) => {
      setCurrentStep((prev) => {
        const nextStep = prev + 1
        if (nextStep >= TOUR_STEPS.length) return prev
        const route = overrideRoute ?? TOUR_STEPS[nextStep].route
        if (route) navigate(route)
        return nextStep
      })
    },
    [navigate]
  )

  const skip = useCallback(() => {
    cleanupDemoCommitment()
    setOverride(null)
    setActive(false)
    setCurrentStep(-1)
    navigate('/home')
  }, [cleanupDemoCommitment, navigate])

  const finish = useCallback(() => {
    cleanupDemoCommitment()
    setOverride(null)
    setActive(false)
    setCurrentStep(-1)
  }, [cleanupDemoCommitment])

  return (
    <DemoTourContext.Provider
      value={{
        active,
        currentStep,
        steps: TOUR_STEPS,
        demoCommitmentId,
        setDemoCommitmentId,
        start,
        next,
        skip,
        finish,
        override,
        setOverride
      }}
    >
      {children}
    </DemoTourContext.Provider>
  )
}

export function useDemoTour(): DemoTourValue {
  const ctx = useContext(DemoTourContext)
  if (ctx === null) throw new Error('useDemoTour must be used inside DemoTourProvider')
  return ctx
}
