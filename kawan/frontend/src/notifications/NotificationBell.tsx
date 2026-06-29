// NotificationBell — topbar bell icon with unread badge + popover stash.
// Opens a popover listing stored notifications (newest first).
// Outside-click and Escape close the popover; opening it calls markAllRead.

import { Bell, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotifications } from './NotificationProvider'

function relativeTime(date: Date): string {
  const now = Date.now()
  const diff = now - date.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function NotificationBell() {
  const { notifications, unreadCount, markAllRead, dismiss, clearAll } = useNotifications()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  // Outside-click + Escape close
  useEffect(() => {
    if (!open) return
    function onPointerDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  function handleOpen() {
    if (!open) markAllRead()
    setOpen((prev) => !prev)
  }

  const badgeDisplay = unreadCount > 9 ? '9+' : String(unreadCount)

  return (
    <div className="notif-bell-wrap" ref={wrapRef}>
      <button
        type="button"
        className="notif-bell-btn"
        aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
        aria-expanded={open}
        onClick={handleOpen}
      >
        <Bell size={18} aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="notif-badge" aria-hidden="true">
            {badgeDisplay}
          </span>
        )}
      </button>

      {open && (
        <div className="notif-popover" role="dialog" aria-label="Notifications">
          <div className="notif-popover-header">
            <span className="notif-popover-title">Notifications</span>
            {notifications.length > 0 && (
              <button type="button" className="notif-clear-btn" onClick={clearAll}>
                Clear all
              </button>
            )}
          </div>

          <div className="notif-popover-body">
            {notifications.length === 0 ? (
              <div className="notif-empty">
                <Bell size={24} color="var(--ink-faint)" aria-hidden="true" />
                <p className="notif-empty-text">No notifications yet</p>
              </div>
            ) : (
              <ul className="notif-list">
                {notifications.map((n) => (
                  <li key={n.id} className="notif-item">
                    {n.href ? (
                      <button
                        type="button"
                        className="notif-item-link"
                        onClick={() => {
                          const href = n.href
                          if (!href) return
                          navigate(href)
                          setOpen(false)
                        }}
                      >
                        <div className="notif-item-body">
                          <p className="notif-item-title">{n.title}</p>
                          {n.detail && <p className="notif-item-detail">{n.detail}</p>}
                          <p className="notif-item-time">{relativeTime(n.at)}</p>
                        </div>
                      </button>
                    ) : (
                      <div className="notif-item-body">
                        <p className="notif-item-title">{n.title}</p>
                        {n.detail && <p className="notif-item-detail">{n.detail}</p>}
                        <p className="notif-item-time">{relativeTime(n.at)}</p>
                      </div>
                    )}
                    <button
                      type="button"
                      className="notif-item-dismiss"
                      aria-label="Dismiss notification"
                      onClick={(e) => {
                        e.stopPropagation()
                        dismiss(n.id)
                      }}
                    >
                      <X size={14} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
