const WELCOME_DISMISSED_KEY = 'kawan_welcome_dismissed'

export function isWelcomeDismissed(): boolean {
  try {
    return localStorage.getItem(WELCOME_DISMISSED_KEY) === 'true'
  } catch {
    return false
  }
}

export function setWelcomeDismissed(): void {
  try {
    localStorage.setItem(WELCOME_DISMISSED_KEY, 'true')
  } catch {
    // localStorage may be unavailable; dismissal just will not persist.
  }
}

export function clearWelcomeDismissed(): void {
  try {
    localStorage.removeItem(WELCOME_DISMISSED_KEY)
  } catch {
    // localStorage may be unavailable; nothing to clear.
  }
}
