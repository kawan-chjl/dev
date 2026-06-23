// NewCommitment — /new (Zone 2, no shell chrome)
// 3-step stepper shell: Compose → Context → Plan
// Compose = sentence layout (I will [action] [deliverable] by [deadline])
// Context = chat placeholder (MessagesMode styling)
// Plan = roadmap + settings panel placeholder
// All steps visual-only per Q7 (no validation, no AI calls).

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../ui/Button'

type Step = 0 | 1 | 2
const STEP_LABELS = ['Compose', 'Context', 'Plan']

function ComposeStep() {
  return (
    <div className="compose-step">
      <h2 className="compose-heading">Make your commitment</h2>
      <div className="compose-sentence">
        <span className="compose-prefix">I will</span>
        <button type="button" className="compose-chip compose-chip-action" disabled aria-label="Choose action">
          complete ▾
        </button>
        <input
          className="compose-chip compose-chip-deliverable"
          type="text"
          placeholder="the deliverable ✎"
          aria-label="Describe what you will deliver"
          disabled
        />
        <span className="compose-infix">by</span>
        <button type="button" className="compose-chip compose-chip-deadline" disabled aria-label="Choose deadline">
          pick date 📅
        </button>
      </div>
      <p className="compose-hint">Evidence will be verified — self-report is not accepted.</p>
    </div>
  )
}

function ContextStep() {
  return (
    <div className="context-step">
      <h2 className="context-heading">Tell Kawan more</h2>
      <p className="context-sub">Kawan asks up to 3 questions to understand your context.</p>
      <div className="context-chat-placeholder">
        <div className="context-message context-message-kawan">
          <div className="message-avatar" aria-hidden="true">
            ◉
          </div>
          <div className="bubble-kawan message-bubble">
            <p className="message-text">Why does this matter to you right now?</p>
          </div>
        </div>
        <div className="context-input-bar">
          <input
            className="messages-input"
            type="text"
            placeholder="Your answer…"
            aria-label="Context answer"
            disabled
          />
        </div>
      </div>
    </div>
  )
}

function PlanStep() {
  return (
    <div className="plan-step">
      <h2 className="plan-heading">Your plan</h2>
      <div className="plan-roadmap-placeholder">
        <p className="plan-placeholder-text">Roadmap will appear here after Kawan reviews your context.</p>
        <ol className="plan-roadmap-list">
          <li className="plan-roadmap-item plan-roadmap-placeholder-item">Step 1 · Est. — min</li>
          <li className="plan-roadmap-item plan-roadmap-placeholder-item">Step 2 · Est. — min</li>
          <li className="plan-roadmap-item plan-roadmap-placeholder-item">Step 3 · Est. — min</li>
        </ol>
      </div>
      <div className="plan-settings">
        <div className="plan-setting-row">
          <span className="plan-setting-label">Cadence</span>
          <span className="plan-setting-value">daily (suggested)</span>
        </div>
        <div className="plan-setting-row">
          <span className="plan-setting-label">Evidence</span>
          <span className="plan-setting-value">GitHub commits (high trust)</span>
        </div>
        <div className="plan-setting-row">
          <span className="plan-setting-label">Skip days</span>
          <span className="plan-setting-value">1</span>
        </div>
      </div>
    </div>
  )
}

const STEPS = [ComposeStep, ContextStep, PlanStep]

export function NewCommitment() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>(0)

  const StepComponent = STEPS[step]

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
      <div className="new-commitment-content">
        <StepComponent />
      </div>

      {/* Step navigation */}
      <div className="new-commitment-footer">
        {step > 0 && (
          <Button variant="secondary" onClick={() => setStep((s) => (s - 1) as Step)}>
            Back
          </Button>
        )}
        {step < 2 ? (
          <Button variant="primary" onClick={() => setStep((s) => (s + 1) as Step)}>
            Continue
          </Button>
        ) : (
          <Button variant="accent" onClick={() => navigate('/home')}>
            Start commitment
          </Button>
        )}
      </div>
    </div>
  )
}
