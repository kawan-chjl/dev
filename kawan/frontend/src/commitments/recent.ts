// recent.ts — small localStorage helper tracking recently opened commitments.
// Written on detail/workspace open; read by the Recent Activity widget on /home.

const STORAGE_KEY = 'kawan.recentCommitments'
const MAX_RECENT = 5

export function recordRecentCommitment(id: string): void {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    const existing: string[] = stored ? (JSON.parse(stored) as string[]) : []
    // Remove if already present, prepend, cap at MAX_RECENT
    const updated = [id, ...existing.filter((x) => x !== id)].slice(0, MAX_RECENT)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch {
    // localStorage may be unavailable in private browsing — silently skip
  }
}

export function getRecentCommitmentIds(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? (JSON.parse(stored) as string[]) : []
  } catch {
    return []
  }
}
