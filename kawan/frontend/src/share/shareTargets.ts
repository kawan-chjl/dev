// shareTargets.ts: pure share-target helpers (no React).
// X-intent and WhatsApp links carry the text receipt; they cannot attach a client-only file.
// The PNG blob goes via Web Share API (mobile) or direct download (desktop).
// All share actions are user-triggered only, never called on mount (TR-75).

/** Build the plain-text receipt used in X and WhatsApp intent links. Zero em-dashes. */
export function buildShareText(deliverable: string, appUrl: string): string {
  return `Verified: ${deliverable} ✓. Witnessed by Kawan.\n${appUrl}`
}

/** X (Twitter) intent URL. Opens a prefilled compose dialog in a new tab. */
export function xIntentUrl(text: string): string {
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`
}

/** WhatsApp intent URL. Opens a prefilled message in a new tab. */
export function whatsappUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`
}

/**
 * Attempt Web Share with the PNG file attached.
 * Returns true if the share sheet was shown, false if the API is unavailable or declined.
 * Caller is responsible for having obtained an explicit user gesture before calling.
 */
export async function webShareFile(blob: Blob, text: string, filename: string): Promise<boolean> {
  if (typeof navigator.share !== 'function') return false
  const file = new File([blob], filename, { type: 'image/png' })
  const shareData: ShareData = { files: [file], text }
  if (typeof navigator.canShare === 'function' && !navigator.canShare(shareData)) {
    // Files not supported: fall back to sharing text only.
    try {
      await navigator.share({ text })
      return true
    } catch {
      return false
    }
  }
  try {
    await navigator.share(shareData)
    return true
  } catch {
    // User cancelled or share failed.
    return false
  }
}
