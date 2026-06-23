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

/**
 * POST /api/auth/guest — create or reuse the guest session (TR-53 cpk_ fallback).
 * Same-origin (via Vite proxy), so a fetch with credentials:include is correct.
 * Throws on non-OK so the caller can surface an inline error.
 */
export async function guestLogin(): Promise<void> {
  const res = await fetch('/api/auth/guest', { method: 'POST', credentials: 'include' })
  if (!res.ok) throw new Error(`POST /api/auth/guest returned ${res.status}`)
}

/**
 * POST /api/auth/register — create an email/password user and set the session.
 * Throws a typed error so callers can distinguish 409 (duplicate) from other failures.
 */
export async function register(email: string, password: string): Promise<void> {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })
  if (res.ok) return
  if (res.status === 409) throw new EmailAlreadyRegisteredError()
  throw new Error(`POST /api/auth/register returned ${res.status}`)
}

/**
 * POST /api/auth/login — verify email/password and set the session.
 * Throws a typed error so callers can distinguish 401 (bad creds) from other failures.
 */
export async function login(email: string, password: string): Promise<void> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })
  if (res.ok) return
  if (res.status === 401) throw new BadCredentialsError()
  throw new Error(`POST /api/auth/login returned ${res.status}`)
}

/** Thrown by register() when the email is already taken (HTTP 409). */
export class EmailAlreadyRegisteredError extends Error {
  constructor() {
    super('email already registered')
  }
}

/** Thrown by login() when credentials are wrong (HTTP 401). */
export class BadCredentialsError extends Error {
  constructor() {
    super('wrong email or password')
  }
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
 * PATCH /api/me { persona } — persist the user's persona server-side.
 * Throws on non-2xx so the caller can revert an optimistic update.
 */
export async function setPersonaRemote(persona: Persona): Promise<void> {
  const res = await fetch('/api/me', {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ persona })
  })
  if (!res.ok) throw new Error(`PATCH /api/me returned ${res.status}`)
}
