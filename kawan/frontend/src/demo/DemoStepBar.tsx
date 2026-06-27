// DemoStepBar — floating top-center bar rendered at app level while the tour is active.
// Shows the 5 labelled steps with the current one highlighted, plus a Skip button.

import { useDemoTour } from './DemoTour'

export function DemoStepBar() {
  const { active, currentStep, steps, skip } = useDemoTour()

  if (!active) return null

  return (
    <nav className="demo-step-bar" aria-label="Walkthrough progress">
      <ol className="demo-step-list" aria-label="Steps">
        {steps.map((step, index) => {
          const isCurrent = index === currentStep
          const isDone = index < currentStep
          return (
            <li
              key={step.label}
              className={[
                'demo-step-item',
                isCurrent ? 'demo-step-item-current' : '',
                isDone ? 'demo-step-item-done' : ''
              ]
                .filter(Boolean)
                .join(' ')}
              aria-current={isCurrent ? 'step' : undefined}
            >
              <span className="demo-step-dot" aria-hidden="true">
                {isDone ? (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                    <path
                      d="M2 5l2 2 4-4"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  index + 1
                )}
              </span>
              <span className="demo-step-label">{step.label}</span>
            </li>
          )
        })}
      </ol>
      <button type="button" className="demo-step-skip" onClick={skip} aria-label="Skip walkthrough and go to home">
        Skip
      </button>
    </nav>
  )
}
