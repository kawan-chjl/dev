// Modal — shared portal primitive.
// Renders into document.body so it always stacks above sidebar (z-60) and topbar (z-50).
// z-index driven by --z-modal token (400) defined in tokens.css.
//
// Usage:
//   <Modal open={open} onClose={onClose} label="Dialog title">
//     <p>Content here</p>
//   </Modal>

import { type ReactNode, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

interface ModalProps {
  open: boolean
  onClose: () => void
  label: string
  children: ReactNode
  /** Extra className on the panel div (e.g. size variants). */
  panelClassName?: string
}

export function Modal({ open, onClose, label, children, panelClassName }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  // Escape closes
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Focus the panel on open so keyboard users land inside the dialog
  useEffect(() => {
    if (open) panelRef.current?.focus()
  }, [open])

  // Prevent body scroll while open
  useEffect(() => {
    if (!open) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div
      className="modal-backdrop"
      onClick={onClose}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
      aria-hidden="true"
    >
      <div
        ref={panelRef}
        className={`modal-panel${panelClassName ? ` ${panelClassName}` : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  )
}
