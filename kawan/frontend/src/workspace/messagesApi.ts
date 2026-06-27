// messagesApi.ts — fetch persisted chat history for a commitment.
// Maps backend MessageOut shape (role, content) to WorkspaceMessage (from, text).

import type { Emotion } from '../types/api'
import type { WorkspaceMessage } from './api'

interface MessageOut {
  id: string
  role: 'user' | 'assistant'
  content: string
  emotion: Emotion | null
  response_type: string | null
  created_at: string
}

/**
 * GET /api/commitments/{id}/messages
 * Returns chat history newest-last, mapped to WorkspaceMessage[].
 * 401/404 → []. Other non-OK → throws.
 */
export async function fetchMessages(commitmentId: string): Promise<WorkspaceMessage[]> {
  const res = await fetch(`/api/commitments/${commitmentId}/messages`, {
    credentials: 'include'
  })
  if (res.status === 401 || res.status === 404) return []
  if (!res.ok) throw new Error(`GET /api/commitments/${commitmentId}/messages returned ${res.status}`)
  const rows = (await res.json()) as MessageOut[]
  return rows.map((row) => ({
    id: row.id,
    from: row.role === 'user' ? 'user' : 'kawan',
    text: row.content,
    emotion: row.emotion ?? undefined,
    responseType: (row.response_type as WorkspaceMessage['responseType']) ?? undefined
  }))
}
