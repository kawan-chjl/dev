// Auth API client — typed, no deps, no tokens in the browser.
// All calls use credentials:'include' so the HttpOnly session cookie rides along.

import type { Me, Persona } from '../types/api'

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

// ── Persona persistence (Open Q2) ─────────────────────────────────────────────
// Only the non-sensitive persona preference key lives in localStorage — never tokens.

const PERSONA_KEY = 'kawan.persona'
const VALID_PERSONAS: Persona[] = ['kawan', 'adik', 'cik_maid']

/** Read the stored persona preference. Returns null if absent or invalid. */
export function readStoredPersona(): Persona | null {
  try {
    const v = localStorage.getItem(PERSONA_KEY)
    if (v !== null && (VALID_PERSONAS as string[]).includes(v)) return v as Persona
  } catch {
    // localStorage may be blocked (private-browsing, security policy) — treat as absent.
  }
  return null
}

/** Persist a persona preference locally. */
export function writeStoredPersona(p: Persona): void {
  try {
    localStorage.setItem(PERSONA_KEY, p)
  } catch {
    // Blocked localStorage — persona just won't survive reload. Non-fatal.
  }
}

/**
 * Best-effort PATCH /api/me { persona }.
 * Gracefully swallows all errors: the endpoint does not exist yet (Open Q2 — Lane B
 * should add PATCH /api/me { "persona": Persona } → 200 /api/me body so persona
 * persists server-side). Until then, local persistence is the source of truth.
 */
export async function setPersonaRemote(persona: Persona): Promise<void> {
  try {
    await fetch('/api/me', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ persona })
    })
    // Non-2xx (404/405 while endpoint is absent) is deliberately ignored.
  } catch {
    // Network errors are swallowed — local persistence is sufficient until Lane B ships.
  }
}
