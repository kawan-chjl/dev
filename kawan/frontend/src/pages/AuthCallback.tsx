// AuthCallback — /auth/callback
// Resilience shim: if the Chutes IdP redirected here (i.e. the .env KAWAN_SIWC_REDIRECT_URI
// points at /auth/callback instead of /api/auth/siwc/callback), forward the OAuth params to
// the backend so it can complete the exchange natively.
// If there are no OAuth params (stale bookmark, direct visit), go straight to /.

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    const search = window.location.search
    const params = new URLSearchParams(search)
    if (params.has('code') || params.has('state')) {
      // Forward to the backend callback; it sets the session cookie and 303s back to /.
      window.location.replace(`/api/auth/siwc/callback${search}`)
    } else {
      navigate('/', { replace: true })
    }
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
