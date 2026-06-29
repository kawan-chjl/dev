// NotificationProvider - app-wide notification context.
// notify() pushes a stashed entry AND fires a react-hot-toast toast.
// In-memory only; no localStorage needed for the demo.

import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from 'react'
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

  // Ask once for OS notification permission so verdict/completion alerts can surface as real
  // browser notifications, not just an easily-missed in-app toast.
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      void Notification.requestPermission()
    }
  }, [])

  const notify = useCallback((title: string, opts: NotifyOpts = {}) => {
    const kind: NotifKind = opts.kind ?? 'info'
    const detail = opts.detail
    const entry: StoredNotification = {
      id: nextId(),
      title,
      detail,
      kind,
      at: new Date(),
      read: false
    }
    setNotifications((prev) => [entry, ...prev].slice(0, 20))

    // In-app toast: show the title and, when present, the AI evaluation detail, long enough to read.
    const message = detail ? (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <span style={{ fontWeight: 600 }}>{title}</span>
        <span style={{ opacity: 0.8, fontSize: '0.92em' }}>{detail}</span>
      </div>
    ) : (
      title
    )
    const toastOpts = { id: entry.id, duration: 6000 }
    if (kind === 'success') {
      toast.success(message, toastOpts)
    } else if (kind === 'error') {
      toast.error(message, toastOpts)
    } else {
      toast(message, toastOpts)
    }

    // Real browser/OS notification carrying the AI evaluation, when the user granted permission.
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        // eslint-disable-next-line no-new
        new Notification(title, detail ? { body: detail } : undefined)
      } catch {
        // Some environments (e.g. mobile browsers) require a service worker and throw on construction.
      }
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
