// useCommitments — drives GET /api/commitments (paginated list, newest-first).
// Returns the current page's items alongside pagination controls.
// Current call sites (Commitments.tsx, Home.tsx) destructure { state, commitments, refresh }
// — those fields are preserved; pagination fields are additive.
//
// Mock/fallback: if MOCK_AUTH is on or the backend is unreachable, falls back to the
// mock getter (getActiveCommitment) so the app renders headlessly on a single page.

import { useCallback, useEffect, useRef, useState } from 'react'
import { MOCK_AUTH } from '../auth/api'
import { getActiveCommitment } from '../mock/provider'
import type { Commitment } from '../types/api'
import { fetchCommitments } from './api'

const PAGE_SIZE = 10

type LoadState = 'loading' | 'ready' | 'idle'

interface CommitmentsResult {
  state: LoadState
  commitments: Commitment[]
  refresh: () => Promise<void>
  total: number
  page: number
  pageSize: number
  setPage: (n: number) => void
  hasPrev: boolean
  hasNext: boolean
}

export function useCommitments(): CommitmentsResult {
  const [state, setState] = useState<LoadState>('loading')
  const [commitments, setCommitments] = useState<Commitment[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const mountedRef = useRef(true)
  // Keep a ref so refresh() can read the current page without a stale closure.
  const pageRef = useRef(page)
  pageRef.current = page

  const loadPage = useCallback(async (targetPage: number) => {
    if (MOCK_AUTH) {
      const c = getActiveCommitment()
      const list = c !== null ? [c] : []
      if (mountedRef.current) {
        setCommitments(list)
        setTotal(list.length)
        setState(list.length > 0 ? 'ready' : 'idle')
      }
      return
    }

    setState('loading')
    try {
      const envelope = await fetchCommitments(PAGE_SIZE, targetPage * PAGE_SIZE)
      if (!mountedRef.current) return
      setCommitments(envelope.items)
      setTotal(envelope.total)
      setState(envelope.total === 0 ? 'idle' : 'ready')
    } catch {
      // Backend unreachable — fall back to mock so the app renders headless.
      if (!mountedRef.current) return
      const c = getActiveCommitment()
      const list = c !== null ? [c] : []
      setCommitments(list)
      setTotal(list.length)
      setState(list.length > 0 ? 'ready' : 'idle')
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    loadPage(page)
    return () => {
      mountedRef.current = false
    }
  }, [loadPage, page])

  const refresh = useCallback(async () => {
    const currentPage = pageRef.current
    if (MOCK_AUTH) {
      await loadPage(currentPage)
      return
    }

    setState('loading')
    try {
      const envelope = await fetchCommitments(PAGE_SIZE, currentPage * PAGE_SIZE)
      if (!mountedRef.current) return

      // If we wiped the last item(s) on a non-first page, step back.
      if (envelope.items.length === 0 && envelope.total > 0 && currentPage > 0) {
        const prevPage = currentPage - 1
        setPage(prevPage)
        // loadPage will re-fire via the useEffect when page changes.
        return
      }

      setCommitments(envelope.items)
      setTotal(envelope.total)
      setState(envelope.total === 0 ? 'idle' : 'ready')
    } catch {
      if (!mountedRef.current) return
      const c = getActiveCommitment()
      const list = c !== null ? [c] : []
      setCommitments(list)
      setTotal(list.length)
      setState(list.length > 0 ? 'ready' : 'idle')
    }
  }, [loadPage])

  const hasPrev = page > 0
  const hasNext = page * PAGE_SIZE + commitments.length < total

  return { state, commitments, refresh, total, page, pageSize: PAGE_SIZE, setPage, hasPrev, hasNext }
}
