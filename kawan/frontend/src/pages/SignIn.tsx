// SignIn — split-partition auth page. design-system.md §5.
// Left: warm brand panel (lg+ only). Right: form panel (all sizes).
// Preserves SIWC + guest auth wiring unchanged.

import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { useTheme } from '../hooks/useTheme'
import { ThemeToggle } from '../ui/ThemeToggle'
import { AuthMethods } from './auth/AuthMethods'

export function SignIn() {
  const { status } = useAuth()
  const { theme, toggle } = useTheme()

  if (status === 'authenticated') return <Navigate to="/home" replace />

  return (
    <div className="sign-in-root">
      {/* Left — warm brand panel (desktop only) */}
      <div className="sign-in-brand" aria-hidden="true">
        <div className="sign-in-brand-blob-1" />
        <div className="sign-in-brand-blob-2" />
        <img src="/kawan-logo.png" alt="" className="sign-in-brand-logo" width={48} height={48} />
        <h1 className="sign-in-brand-heading">
          Your one
          <br />
          <span style={{ fontStyle: 'italic' }}>commitment.</span>
        </h1>
        <p className="sign-in-brand-tagline">Kawan holds you to what you said. Honestly, firmly, with care.</p>
      </div>

      {/* Right — form panel */}
      <div className="sign-in-form-panel">
        <div className="sign-in-theme-toggle">
          <ThemeToggle theme={theme} onToggle={toggle} />
        </div>

        <div className="sign-in-form-inner">
          <h2 className="sign-in-heading">Welcome to Kawan.</h2>

          <AuthMethods />

          <p className="sign-in-explainer">
            Sign in with Chutes to use your own compute budget. Guest mode lets you try Kawan without an account.
          </p>
        </div>
      </div>
    </div>
  )
}
