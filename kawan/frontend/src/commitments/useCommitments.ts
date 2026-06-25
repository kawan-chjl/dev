// useCommitments — list-shaped seam over the single active commitment.
// Today: returns [active] or [] (backend has no list endpoint, only GET /active).
// Future: swap in a real GET /api/commitments here without touching any page.

import type { Commitment } from '../types/api'
import { useActiveCommitment } from './useActiveCommitment'

type LoadState = 'loading' | 'ready' | 'idle'

interface CommitmentsResult {
  state: LoadState
  commitments: Commitment[]
  refresh: () => Promise<void>
}

export function useCommitments(): CommitmentsResult {
  const { state, commitment, refresh } = useActiveCommitment()
  const commitments = commitment !== null ? [commitment] : []
  return { state, commitments, refresh }
}
