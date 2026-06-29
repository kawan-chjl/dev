// Shared time formatting for the workspace islands.

const MYT_FORMAT: Intl.DateTimeFormatOptions = {
  timeZone: 'Asia/Kuala_Lumpur',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true
}

// Format an ISO timestamp as a compact MYT wall-clock string (e.g. "Jun 30, 11:59 PM").
export function fmtMYT(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-MY', MYT_FORMAT)
  } catch {
    return iso
  }
}

// Compact duration from milliseconds: "2d 3h" / "3h 15m" / "45m" / "30s".
export function fmtDuration(ms: number): string {
  if (ms <= 0) return '0m'
  const totalMin = Math.floor(ms / 60000)
  const days = Math.floor(totalMin / 1440)
  const hours = Math.floor((totalMin % 1440) / 60)
  const mins = totalMin % 60
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${mins}m`
  if (mins > 0) return `${mins}m`
  return `${Math.floor(ms / 1000)}s`
}
