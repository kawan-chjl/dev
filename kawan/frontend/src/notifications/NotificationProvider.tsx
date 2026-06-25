// NotificationProvider — app-wide notification context.
// notify() pushes a stashed entry AND fires a react-hot-toast toast.
// In-memory only; no localStorage needed for the demo.

import { createContext, type ReactNode, useCallback, useContext, useState } from 'react'
import toast from 'react-hot-toast'

export type NotifKind = 'success' | 'error' | 'info'

export interface StoredNotification {
  id: string
  title: string
  detail?: string
  kind: NotifKind
  at: Date
  read: boolean
}

interface NotifyOpts {
  detail?: string
  kind?: NotifKind
}

interface NotificationValue {
  notifications: StoredNotification[]
  unreadCount: number
  notify: (title: string, opts?: NotifyOpts) => void
  markAllRead: () => void
  markRead: (id: string) => void
  dismiss: (id: string) => void
  clearAll: () => void
}

const NotificationContext = createContext<NotificationValue | null>(null)

let _idCounter = 0
function nextId(): string {
  _idCounter += 1
  return `notif_${_idCounter}`
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<StoredNotification[]>([])

  const notify = useCallback((title: string, opts: NotifyOpts = {}) => {
    const kind: NotifKind = opts.kind ?? 'info'
    const entry: StoredNotification = {
      id: nextId(),
      title,
      detail: opts.detail,
      kind,
      at: new Date(),
      read: false
    }
    setNotifications((prev) => [entry, ...prev].slice(0, 20))

    // Fire the toast
    if (kind === 'success') {
      toast.success(title, { id: entry.id })
    } else if (kind === 'error') {
      toast.error(title, { id: entry.id })
    } else {
      toast(title, { id: entry.id })
    }
  }, [])

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }, [])

  const markRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }, [])

  const dismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const clearAll = useCallback(() => {
    setNotifications([])
  }, [])

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, notify, markAllRead, markRead, dismiss, clearAll }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications(): NotificationValue {
  const ctx = useContext(NotificationContext)
  if (ctx === null) throw new Error('useNotifications must be used inside NotificationProvider')
  return ctx
}
