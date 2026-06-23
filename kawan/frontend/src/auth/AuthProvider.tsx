// AuthProvider — single source of truth for session state.
// Probes GET /api/me on mount; falls back to mockMe when the backend is unreachable
// so the app runs headless. A clean 401 is genuinely unauthenticated (no fallback).
//
// Post-login: the backend redirects the browser back to / with a full page reload,
// which re-mounts this provider and re-runs the /api/me probe automatically.

import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from 'react'
import { mockMe } from '../mock/fixtures'
import type { Me, Persona } from '../types/api'
import { fetchMe, logout, MOCK_AUTH, readStoredPersona, setPersonaRemote, writeStoredPersona } from './api'

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

interface AuthValue {
  status: AuthStatus
  me: Me | null
  signOut: () => Promise<void>
  refresh: () => Promise<void>
  setPersona: (p: Persona) => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [me, setMe] = useState<Me | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true

    async function probe() {
      if (MOCK_AUTH) {
        // Mock mode: skip network, always resolve to the mock fixture.
        if (mountedRef.current) {
          // Overlay stored persona preference on the mock fixture.
          const stored = readStoredPersona()
          setMe(stored ? { ...mockMe, persona: stored } : mockMe)
          setStatus('authenticated')
        }
        return
      }
      try {
        const result = await fetchMe()
        if (!mountedRef.current) return
        if (result !== null) {
          // Overlay the stored persona preference (local wins over the server value on fresh load).
          const stored = readStoredPersona()
          setMe(stored && stored !== result.persona ? { ...result, persona: stored } : result)
          setStatus('authenticated')
        } else {
          // Clean 401 — genuinely unauthenticated; do NOT fall back to mockMe.
          setMe(null)
          setStatus('unauthenticated')
        }
      } catch {
        // Network/5xx — backend unreachable; fall back to mockMe so the app renders headless.
        if (!mountedRef.current) return
        const stored = readStoredPersona()
        setMe(stored ? { ...mockMe, persona: stored } : mockMe)
        setStatus('authenticated')
      }
    }

    probe()
    return () => {
      mountedRef.current = false
    }
  }, [])

  async function signOut() {
    await logout()
    setMe(null)
    setStatus('unauthenticated')
    // Navigation to Landing is the caller's responsibility (keeps provider router-agnostic).
  }

  async function refresh() {
    if (MOCK_AUTH) return
    try {
      const result = await fetchMe()
      if (result !== null) {
        const stored = readStoredPersona()
        setMe(stored && stored !== result.persona ? { ...result, persona: stored } : result)
        setStatus('authenticated')
      } else {
        setMe(null)
        setStatus('unauthenticated')
      }
    } catch {
      const stored = readStoredPersona()
      setMe(stored ? { ...mockMe, persona: stored } : mockMe)
      setStatus('authenticated')
    }
  }

  /**
   * Optimistically update me.persona and persist locally, then call PATCH /api/me.
   * On failure: revert the optimistic persona to the prior value and console.error.
   * Never throws — a Settings click must not crash the tree.
   * Skips the network in MOCK_AUTH mode.
   */
  async function setPersona(p: Persona) {
    const prior = me?.persona ?? null
    setMe((prev) => (prev ? { ...prev, persona: p } : prev))
    writeStoredPersona(p)
    if (MOCK_AUTH) return
    try {
      await setPersonaRemote(p)
    } catch (err) {
      // Revert the optimistic persona — the server write failed.
      console.error('setPersona: PATCH /api/me failed, reverting', err)
      if (prior !== null) {
        setMe((prev) => (prev ? { ...prev, persona: prior as Persona } : prev))
        writeStoredPersona(prior as Persona)
      }
    }
  }

  return <AuthContext.Provider value={{ status, me, signOut, refresh, setPersona }}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (ctx === null) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
