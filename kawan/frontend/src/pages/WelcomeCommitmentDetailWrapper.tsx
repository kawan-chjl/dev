// WelcomeCommitmentDetailWrapper - renders the real CommitmentDetail page during the guided tour
// and walks the user through its key sections, ending with a Next that advances to Analytics.

import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDemoTour } from '../demo/DemoTour'
import { CommitmentDetail } from '../shell/pages/CommitmentDetail'

// Key sections to spotlight, in page order. Any not rendered in the DOM are skipped (robustness).
const DETAIL_TOUR_SECTIONS: { target: string; hintText: string }[] = [
  {
    target: '#section-overview',
    hintText: 'Your commitment at a glance: the headline plus your verified count, check-ins, and rest days.'
  },
  {
    target: '#section-terms',
    hintText: 'The locked-in terms: deadline, cadence, and how Kawan checks your evidence.'
  },
  {
    target: '#section-timeline',
    hintText: "The full history: every check-in and Kawan's verdict, in order."
  }
]

// The Details step is index 3 in TOUR_STEPS.
const DETAILS_STEP_INDEX = 3

export function WelcomeCommitmentDetailWrapper() {
  const { active, currentStep, setOverride } = useDemoTour()
  const navigate = useNavigate()
  const goAnalytics = useCallback(() => navigate('/welcome/analytics'), [navigate])
  const [stepIndex, setStepIndex] = useState(0)
  // null = still resolving which sections exist; array = resolved (possibly empty).
  const [present, setPresent] = useState<{ target: string; hintText: string }[] | null>(null)

  const onDetailsStep = active && currentStep === DETAILS_STEP_INDEX

  // The detail sections render after an async fetch, so poll briefly until they appear, then lock.
  useEffect(() => {
    if (!onDetailsStep) {
      setPresent(null)
      setStepIndex(0)
      return
    }
    let cancelled = false
    let attempts = 0
    const check = () => {
      if (cancelled) return
      const found = DETAIL_TOUR_SECTIONS.filter((s) => document.querySelector(s.target))
      if (found.length > 0) {
        setPresent(found)
        return
      }
      if (++attempts > 25) {
        setPresent([]) // ~3s with nothing rendered -> offer a direct Next below
        return
      }
      window.setTimeout(check, 120)
    }
    check()
    return () => {
      cancelled = true
    }
  }, [onDetailsStep])

  // Drive the spotlight override once the sections are resolved.
  useEffect(() => {
    if (!onDetailsStep || present === null) return
    if (present.length === 0) {
      setOverride({
        hintText: "Here's your commitment summary. Take a look, then continue.",
        showNext: true,
        onNext: goAnalytics
      })
      return () => setOverride(null)
    }
    const idx = Math.min(stepIndex, present.length - 1)
    const isLast = idx === present.length - 1
    setOverride({
      target: present[idx].target,
      hintText: present[idx].hintText,
      showNext: true,
      onNext: isLast ? goAnalytics : () => setStepIndex(idx + 1)
    })
    return () => setOverride(null)
  }, [onDetailsStep, present, stepIndex, setOverride, goAnalytics])

  return <CommitmentDetail />
}
