// ShareWinDialog: win-receipt share card dialog (spec §11.4, TR-75).
// Generates the PNG once on open, shows a live preview, and exposes four share actions.
// User-triggered only, never auto-posts (TR-75 iron rule).

import { Download, MessageCircle, RefreshCw, Send, Share2, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Persona } from '../types/api'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { PERSONA_PORTRAITS } from '../zone2/personaPortraits'
import { renderWinCardPng } from './buildShareCard'
import { buildShareText, webShareFile, whatsappUrl, xIntentUrl } from './shareTargets'

// Persona display names (matches mockPersonas and the real listPersonas() presets).
const PERSONA_NAMES: Record<Persona, string> = {
  kawan: 'Kawan',
  adik: 'Adik',
  cik_maid: 'Cik Maid'
}

export interface ShareWinDialogProps {
  open: boolean
  onClose: () => void
  commitment: {
    action: string
    deliverable: string
    deadline: string // ISO 8601
  }
  winDateIso: string // ISO 8601 of the latest pass evidence
  persona: Persona
}

type GenState = 'generating' | 'ready' | 'error'

export function ShareWinDialog({ open, onClose, commitment, winDateIso, persona }: ShareWinDialogProps) {
  const [genState, setGenState] = useState<GenState>('generating')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const blobRef = useRef<Blob | null>(null)

  const personaName = PERSONA_NAMES[persona]
  const portraitSrc = PERSONA_PORTRAITS[persona]

  const deadlineLabel = new Date(commitment.deadline).toLocaleDateString('en-MY', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kuala_Lumpur'
  })
  const dateLabel = new Date(winDateIso).toLocaleDateString('en-MY', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kuala_Lumpur'
  })

  const revokePreview = useCallback(() => {
    setPreviewUrl((url) => {
      if (url) URL.revokeObjectURL(url)
      return null
    })
    blobRef.current = null
  }, [])

  const generate = useCallback(async () => {
    setGenState('generating')
    try {
      const blob = await renderWinCardPng({
        personaName,
        portraitSrc,
        sentence: { action: commitment.action, deliverable: commitment.deliverable, deadlineLabel },
        dateLabel
      })
      blobRef.current = blob
      const url = URL.createObjectURL(blob)
      setPreviewUrl(url)
      setGenState('ready')
    } catch {
      setGenState('error')
    }
  }, [personaName, portraitSrc, commitment.action, commitment.deliverable, deadlineLabel, dateLabel])

  // Generate once when the dialog opens; revoke object URL on close.
  useEffect(() => {
    if (!open) {
      revokePreview()
      setGenState('generating')
      return
    }
    generate()
  }, [open, generate, revokePreview])

  function handleClose() {
    revokePreview()
    onClose()
  }

  function handleDownload() {
    if (!blobRef.current || !previewUrl) return
    const a = document.createElement('a')
    a.href = previewUrl
    a.download = `kawan-win-${Date.now()}.png`
    a.click()
  }

  function handleX() {
    const text = buildShareText(commitment.deliverable, window.location.origin)
    window.open(xIntentUrl(text), '_blank', 'noopener,noreferrer')
  }

  function handleWhatsApp() {
    const text = buildShareText(commitment.deliverable, window.location.origin)
    window.open(whatsappUrl(text), '_blank', 'noopener,noreferrer')
  }

  async function handleShare() {
    if (!blobRef.current) return
    const text = buildShareText(commitment.deliverable, window.location.origin)
    await webShareFile(blobRef.current, text, `kawan-win-${Date.now()}.png`)
  }

  const canWebShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  return (
    <Modal open={open} onClose={handleClose} label="Share your win" panelClassName="share-win-panel">
      <div className="share-win-dialog">
        <div className="share-win-dialog-header">
          <h2 className="share-win-dialog-title">Share your win</h2>
          <button type="button" className="share-win-close" onClick={handleClose} aria-label="Close">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Preview area */}
        <div className="share-win-preview">
          {genState === 'generating' && (
            <p className="share-win-status" role="status" aria-live="polite">
              Preparing your card...
            </p>
          )}
          {genState === 'error' && (
            <div className="share-win-error">
              <p>Could not generate the card. Check your connection and try again.</p>
              <Button variant="primary" onClick={generate}>
                <RefreshCw size={16} aria-hidden="true" />
                Retry
              </Button>
            </div>
          )}
          {genState === 'ready' && previewUrl !== null && (
            <img className="share-win-preview-img" src={previewUrl} alt="Win receipt preview" />
          )}
        </div>

        {/* Action row */}
        {genState === 'ready' && (
          <div className="share-win-actions">
            {canWebShare && (
              <Button variant="accent" onClick={handleShare}>
                <Share2 size={16} aria-hidden="true" />
                Share
              </Button>
            )}
            <Button variant="primary" onClick={handleX}>
              <Send size={16} aria-hidden="true" />
              Post to X
            </Button>
            <Button variant="primary" onClick={handleWhatsApp}>
              <MessageCircle size={16} aria-hidden="true" />
              WhatsApp
            </Button>
            <Button variant="primary" onClick={handleDownload}>
              <Download size={16} aria-hidden="true" />
              Download PNG
            </Button>
          </div>
        )}
      </div>
    </Modal>
  )
}
