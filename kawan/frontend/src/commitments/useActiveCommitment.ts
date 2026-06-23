// useActiveCommitment — page-local hook for GET /api/commitments/active.
// Falls back to the mock fixture when mock-mode is on or the backend is unreachable,
// mirroring the AuthProvider fallback discipline.
//
// Mock getters (getActiveCommitment / getMockActive / setMockActive) in src/mock/provider.ts
// are retained — this hook delegates to them in mock/fallback mode.

import { useCallback, useEffect, useRef, useState } from 'react'
import { MOCK_AUTH } from '../auth/api'
import { getActiveCommitment } from '../mock/provider'
import type { Commitment } from '../types/api'
import { fetchActiveCommitment } from './api'

type LoadState = 'loading' | 'ready' | 'idle'

interface ActiveCommitmentResult {
  state: LoadState
  commitment: Commitment | null
  refresh: () => Promise<void>
}

export function useActiveCommitment(): ActiveCommitmentResult {
  const [state, setState] = useState<LoadState>('loading')
  const [commitment, setCommitment] = useState<Commitment | null>(null)
  const mountedRef = useRef(true)

  const load = useCallback(async () => {
    if (MOCK_AUTH) {
      // Mock mode: resolve from the mock getter (respects the dev active/idle toggle).
      const c = getActiveCommitment()
      if (mountedRef.current) {
        setCommitment(c)
        setState(c !== null ? 'ready' : 'idle')
      }
      return
    }

    try {
      const c = await fetchActiveCommitment()
      if (!mountedRef.current) return
      setCommitment(c)
      setState(c !== null ? 'ready' : 'idle')
    } catch {
      // Backend unreachable — fall back to the mock getter so the app renders headless.
      if (!mountedRef.current) return
      const c = getActiveCommitment()
      setCommitment(c)
      setState(c !== null ? 'ready' : 'idle')
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    setState('loading')
    load()
    return () => {
      mountedRef.current = false
    }
  }, [load])

  return { state, commitment, refresh: load }
}
