// Telegram linking client (X-NOTIF, ADR-0006). The /start capture that binds the chat
// happens server-side in the long-poll loop; here we read status, mint a deep link, and
// unlink. "Linked" == the server has a telegram_chat_id for this user.

export interface TelegramStatus {
  linked: boolean
}

export async function getTelegramStatus(): Promise<TelegramStatus> {
  const res = await fetch('/api/telegram/status', { credentials: 'include' })
  if (!res.ok) throw new Error(`GET /api/telegram/status returned ${res.status}`)
  return (await res.json()) as TelegramStatus
}

export interface TelegramLink {
  configured: boolean
  url?: string
}

export async function linkTelegram(): Promise<TelegramLink> {
  const res = await fetch('/api/telegram/link', { method: 'POST', credentials: 'include' })
  if (!res.ok) throw new Error(`POST /api/telegram/link returned ${res.status}`)
  return (await res.json()) as TelegramLink
}

export async function unlinkTelegram(): Promise<void> {
  const res = await fetch('/api/telegram/unlink', { method: 'POST', credentials: 'include' })
  if (!res.ok) throw new Error(`POST /api/telegram/unlink returned ${res.status}`)
}
