// DemoTour — app-level context provider for the guided walkthrough.
// Holds active state + current step; drives navigation via hook consumers.
// The step bar (DemoStepBar) reads this context and renders while active.

import { createContext, type ReactNode, useCallback, useContext, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export interface TourStep {
  label: string
  // The route to navigate to when this step becomes current.
  route: string
}

const TOUR_STEPS: TourStep[] = [
  { label: 'Commitments', route: '/welcome/commitments' },
  { label: 'Create', route: '/welcome/commitments/new' },
  { label: 'Workspace', route: '' }, // route is set dynamically after commitment created
  { label: 'Analytics', route: '/welcome/analytics' },
  { label: 'Done', route: '/welcome/finished' }
]

export const TOUR_STEP_COUNT = TOUR_STEPS.length

interface DemoTourValue {
  active: boolean
  // 0-indexed; -1 when not active
  currentStep: number
  steps: TourStep[]
  start: () => void
  // Advance to next step, optionally overriding the route (used for workspace step).
  next: (overrideRoute?: string) => void
  skip: () => void
  finish: () => void
}

const DemoTourContext = createContext<DemoTourValue | null>(null)

export function DemoTourProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const [active, setActive] = useState(false)
  const [currentStep, setCurrentStep] = useState(-1)

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
    setActive(false)
    setCurrentStep(-1)
    navigate('/home')
  }, [navigate])

  const finish = useCallback(() => {
    setActive(false)
    setCurrentStep(-1)
  }, [])

  return (
    <DemoTourContext.Provider value={{ active, currentStep, steps: TOUR_STEPS, start, next, skip, finish }}>
      {children}
    </DemoTourContext.Provider>
  )
}

export function useDemoTour(): DemoTourValue {
  const ctx = useContext(DemoTourContext)
  if (ctx === null) throw new Error('useDemoTour must be used inside DemoTourProvider')
  return ctx
}
