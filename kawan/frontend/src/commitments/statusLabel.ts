import type { CommitmentStatus } from '../types/api'

const STATUS_LABELS: Record<CommitmentStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  lapsed: 'Behind',
  verifying: 'Checking',
  grace: 'Grace period',
  completed: 'Completed',
  missed: 'Missed'
}

export function statusLabel(status: CommitmentStatus): string {
  return STATUS_LABELS[status]
}
