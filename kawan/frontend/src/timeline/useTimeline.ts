// useTimeline — page-local hook for GET /api/commitments/:id/timeline.
// Falls back to the mock fixture when mock-mode is on or the backend is unreachable,
// mirroring the useActiveCommitment fallback discipline.
//
// The mock getter (getTimeline) in src/mock/provider.ts is retained as the mock source —
// this hook delegates to it in mock/fallback mode. Do not delete it.

import { useCallback, useEffect, useRef, useState } from 'react'
import { MOCK_AUTH } from '../auth/api'
import { getTimeline } from '../mock/provider'
import type { Timeline } from '../types/api'
import { fetchTimeline } from './api'

type LoadState = 'loading' | 'ready' | 'empty'

interface TimelineResult {
  state: LoadState
  timeline: Timeline | null
  refresh: () => Promise<void>
}

export function useTimeline(commitmentId: string | null): TimelineResult {
  const [state, setState] = useState<LoadState>('loading')
  const [timeline, setTimeline] = useState<Timeline | null>(null)
  const mountedRef = useRef(true)

  const load = useCallback(async () => {
    if (commitmentId === null) {
      if (mountedRef.current) {
        setTimeline(null)
        setState('empty')
      }
      return
    }

    if (MOCK_AUTH) {
      // Mock mode: resolve from the mock getter (no network).
      const t = getTimeline(commitmentId)
      if (mountedRef.current) {
        setTimeline(t)
        setState('ready')
      }
      return
    }

    try {
      const t = await fetchTimeline(commitmentId)
      if (!mountedRef.current) return
      if (t !== null) {
        setTimeline(t)
        setState('ready')
      } else {
        setTimeline(null)
        setState('empty')
      }
    } catch {
      // Backend unreachable — fall back to the mock getter so the app renders headless.
      if (!mountedRef.current) return
      const t = getTimeline(commitmentId)
      setTimeline(t)
      setState('ready')
    }
  }, [commitmentId])

  useEffect(() => {
    mountedRef.current = true
    setState('loading')
    load()
    return () => {
      mountedRef.current = false
    }
  }, [load])

  return { state, timeline, refresh: load }
}
