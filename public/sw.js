// public/sw.js
// Clears all cached pages and unregisters itself
// This fixes the stale cache issue permanently

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => caches.delete(key)))
    )
  )
  self.clients.claim()
  self.registration.unregister()
})