// Kawan service worker — push-only. No offline caching (demo-day safe).
// push: show an OS notification with the backend headline payload.
// notificationclick: deep-link to data.url (workspace/:id) if provided, else /home.

self.addEventListener('push', (e) => {
  const data = (e.data && e.data.json()) || {}
  const headline = data.headline || 'Time to check in.'
  const url = data.url || null
  e.waitUntil(
    self.registration.showNotification('Kawan', {
      body: headline,
      icon: '/kawan-logo.png',
      tag: 'kawan-checkin',
      data: { url },
    })
  )
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const target = (e.notification.data && e.notification.data.url) || '/home'
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((c) => c.url.includes(target))
      if (existing) return existing.focus()
      return self.clients.openWindow(target)
    })
  )
})
