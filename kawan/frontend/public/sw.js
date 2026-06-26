// Kawan service worker — push-only. No offline caching (demo-day safe).
// push: show an OS notification with the backend headline payload.
// notificationclick: focus or open /home.

self.addEventListener('push', (e) => {
  const data = (e.data && e.data.json()) || {}
  const headline = data.headline || 'Time to check in.'
  e.waitUntil(
    self.registration.showNotification('Kawan', {
      body: headline,
      icon: '/kawan-logo.png',
      tag: 'kawan-checkin',
    })
  )
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((c) => c.url.includes('/home'))
      if (existing) return existing.focus()
      return self.clients.openWindow('/home')
    })
  )
})
