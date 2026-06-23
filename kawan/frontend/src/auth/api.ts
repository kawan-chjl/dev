// Auth API client — typed, no deps, no tokens in the browser.
// All calls use credentials:'include' so the HttpOnly session cookie rides along.

import type { Me } from '../types/api'

/** Force mock auth regardless of backend state. Set VITE_USE_MOCK_AUTH=true in .env to enable. */
export const MOCK_AUTH = import.meta.env.VITE_USE_MOCK_AUTH === 'true'

/**
 * Probe GET /api/me.
 * Returns Me on 200, null on 401 (genuinely unauthenticated), throws on network/5xx
 * so the caller can distinguish "not logged in" from "backend down".
 */
export async function fetchMe(): Promise<Me | null> {
  const res = await fetch('/api/me', { credentials: 'include' })
  if (res.ok) return (await res.json()) as Me
  if (res.status === 401) return null
  throw new Error(`/api/me returned ${res.status}`)
}

/**
 * POST /api/auth/logout — clears the server session.
 * Swallows all errors: sign-out must always proceed to Landing locally.
 */
export async function logout(): Promise<void> {
  try {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
  } catch {
    // Network errors are swallowed — local state is cleared by the caller regardless.
  }
}

/**
 * Navigate the browser (full-page) to the backend login entry point.
 * MUST be a navigation, NOT a fetch — the backend 303s to the Chutes IdP (a cross-origin
 * URL), which the browser follows natively; a fetch would hit CORS and fail.
 */
export function loginRedirect(): void {
  window.location.assign('/api/auth/siwc/login')
}
