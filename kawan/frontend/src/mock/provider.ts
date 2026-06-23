// Mock data provider — swap this for real /api calls when backend is ready.
// MOCK: Replace each getter body with fetch('/api/...') to wire live data.

import type { AuditRow, Commitment, Me, PersonaPreset, Timeline } from '../types/api'
import type { ConversationTurn } from './fixtures'
import { mockActiveCommitment, mockAuditRows, mockConversation, mockMe, mockPersonas, mockTimeline } from './fixtures'

// Toggle between idle (no active commitment) and active state.
// Flip this flag to test both Home layouts (TR-13).
let _mockActiveState = true

export function setMockActive(active: boolean): void {
  _mockActiveState = active
}

export function getMockActive(): boolean {
  return _mockActiveState
}

// MOCK: GET /api/me
export function getMe(): Me {
  return mockMe
}

// MOCK: GET /api/commitments/active — returns null in idle state (TR-13)
export function getActiveCommitment(): Commitment | null {
  return _mockActiveState ? mockActiveCommitment : null
}

// MOCK: GET /api/commitments/:id/timeline
export function getTimeline(_id: string): Timeline {
  // MOCK: ignores id, always returns the same fixture
  return mockTimeline
}

// MOCK: GET /api/personas (not a real endpoint — personas.json in backend)
export function listPersonas(): PersonaPreset[] {
  return mockPersonas
}

// MOCK: GET /api/commitments/:id/audit
export function getAuditLog(_id: string): AuditRow[] {
  return mockAuditRows
}

// MOCK: local conversation state for Zone 2 workspace
export function getMockConversation(): ConversationTurn[] {
  return mockConversation
}
