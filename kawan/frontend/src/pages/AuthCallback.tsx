// AuthCallback — /auth/callback (stub — no real token exchange)
// Shows a spinner and mock-redirects to /welcome after a short delay.

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    // MOCK: In production, exchange PKCE code + state here via POST /api/auth/siwc/callback.
    const timer = setTimeout(() => navigate('/welcome'), 1500)
    return () => clearTimeout(timer)
  }, [navigate])

  return (
    <div className="auth-callback-root">
      <div className="auth-callback-spinner" aria-busy="true" role="status">
        <div className="spinner" aria-hidden="true" />
        <p className="auth-callback-message">Signing you in…</p>
      </div>
    </div>
  )
}
