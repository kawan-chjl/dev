// webPush.ts — Web Push subscribe flow. Never throws; degrades silently.
// Mirrors useVoice.ts's MOCK_AUTH-guarded, graceful style.
//
// subscribeToPush():
//   1. Guard: MOCK_AUTH / no serviceWorker / no PushManager / no Notification → return 'unsupported'
//   2. Register /sw.js lazily (on first subscribe, not at app boot)
//   3. Request Notification permission → 'denied' if not granted
//   4. Fetch VAPID public key from GET /api/push/vapid-public-key → 'noop' if absent
//   5. Reuse existing subscription or subscribe fresh
//   6. POST /api/push/subscribe { subscription } with credentials:'include'
//   7. Return 'subscribed' | 'denied' | 'unsupported' | 'noop'

import { MOCK_AUTH } from '../auth/api'

export type PushStatus = 'subscribed' | 'denied' | 'unsupported' | 'noop'

/** Convert a base64url string to a Uint8Array backed by a plain ArrayBuffer (required by PushManager.subscribe). */
function urlBase64ToUint8Array(base64url: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64url.length % 4)) % 4)
  const base64 = (base64url + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const buffer = new ArrayBuffer(raw.length)
  const output = new Uint8Array(buffer)
  for (let i = 0; i < raw.length; i++) {
    output[i] = raw.charCodeAt(i)
  }
  return output
}

/**
 * Register /sw.js and return the ServiceWorkerRegistration, or null if unsupported/failed.
 * Called lazily from subscribeToPush — not at app boot.
 */
async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  try {
    return await navigator.serviceWorker.register('/sw.js')
  } catch {
    return null
  }
}

/**
 * Wire up Web Push for this device. Returns a status string — never throws.
 *
 * 'subscribed'   — permission granted, subscription stored on the server.
 * 'denied'       — user denied the permission prompt (or it was already denied).
 * 'unsupported'  — browser does not support service workers, PushManager, or Notification.
 * 'noop'         — no VAPID key configured yet, or MOCK_AUTH is active.
 */
export async function subscribeToPush(): Promise<PushStatus> {
  if (MOCK_AUTH) return 'noop'

  // Browser support guard
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return 'unsupported'
  }

  try {
    // Step 1: register the service worker lazily
    const registration = await registerServiceWorker()
    if (!registration) return 'unsupported'

    // Step 2: request notification permission
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return 'denied'

    // Step 3: fetch VAPID public key from the backend (runtime, not build-time)
    let vapidPublicKey = ''
    try {
      const res = await fetch('/api/push/vapid-public-key')
      if (res.ok) {
        const data = (await res.json()) as { vapid_public_key?: string }
        vapidPublicKey = data.vapid_public_key ?? ''
      }
    } catch {
      // Backend unreachable — degrade silently
    }

    if (!vapidPublicKey) return 'noop'

    // Step 4: reuse existing subscription or create a fresh one (idempotent)
    const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey)
    let subscription = await registration.pushManager.getSubscription()
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey
      })
    }

    // Step 5: store the subscription on the backend
    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: subscription.toJSON() })
    })
    if (!res.ok) return 'noop'

    return 'subscribed'
  } catch {
    // Any unexpected error degrades silently
    return 'noop'
  }
}

/**
 * Unsubscribe this device from Web Push. Never throws.
 * Returns true if a subscription was found and unsubscribed.
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false
  try {
    const registration = await navigator.serviceWorker.getRegistration('/sw.js')
    if (!registration) return false
    const subscription = await registration.pushManager.getSubscription()
    if (!subscription) return false
    return await subscription.unsubscribe()
  } catch {
    return false
  }
}
