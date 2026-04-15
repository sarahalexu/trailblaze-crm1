// public/sw.js
// TrailBlaze CRM Service Worker — offline support

const CACHE_NAME = 'tb-crm-v1'
const OFFLINE_PAGE = '/offline'

// Cache shell assets on install
const SHELL_ASSETS = [
  '/',
  '/dashboard',
  '/offline',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(SHELL_ASSETS).catch(() => {
        // Some assets may fail — that's ok
      })
    })
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    })
  )
  self.clients.claim()
})

// Network-first strategy for API calls, cache-first for pages
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Skip non-GET and API requests
  if (event.request.method !== 'GET') {
    // Queue POST/PUT/DELETE for offline sync
    if (!navigator.onLine) {
      event.respondWith(queueOfflineAction(event.request))
      return
    }
    return
  }

  // API requests — network only, no cache
  if (url.pathname.startsWith('/api/')) {
    return
  }

  // Page requests — network first, fallback to cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful page loads
        if (response.ok) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone)
          })
        }
        return response
      })
      .catch(() => {
        // Offline — try cache
        return caches.match(event.request).then((cached) => {
          return cached || caches.match('/offline')
        })
      })
  )
})

// Queue offline actions in IndexedDB
async function queueOfflineAction(request) {
  try {
    const body = await request.clone().text()
    const action = {
      url: request.url,
      method: request.method,
      body,
      headers: Object.fromEntries(request.headers),
      timestamp: Date.now(),
    }

    // Store in IndexedDB
    const db = await openDB()
    const tx = db.transaction('offline_queue', 'readwrite')
    tx.objectStore('offline_queue').add(action)

    return new Response(JSON.stringify({
      queued: true,
      message: 'Action saved. Will sync when you reconnect.',
    }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Could not queue action' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

// Process queued actions when back online
self.addEventListener('message', (event) => {
  if (event.data === 'sync-offline') {
    processOfflineQueue()
  }
})

async function processOfflineQueue() {
  try {
    const db = await openDB()
    const tx = db.transaction('offline_queue', 'readonly')
    const store = tx.objectStore('offline_queue')
    const actions = await storeGetAll(store)

    for (const action of actions) {
      try {
        await fetch(action.url, {
          method: action.method,
          body: action.body,
          headers: action.headers,
        })

        // Remove from queue on success
        const deleteTx = db.transaction('offline_queue', 'readwrite')
        deleteTx.objectStore('offline_queue').delete(action.id)
      } catch (e) {
        // Leave in queue — will retry next sync
      }
    }

    // Notify the app
    const clients = await self.clients.matchAll()
    clients.forEach((client) => {
      client.postMessage({ type: 'sync-complete', count: actions.length })
    })
  } catch (e) {
    console.error('Offline sync error:', e)
  }
}

// IndexedDB helpers
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('tb_crm_offline', 1)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('offline_queue')) {
        db.createObjectStore('offline_queue', { keyPath: 'id', autoIncrement: true })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function storeGetAll(store) {
  return new Promise((resolve, reject) => {
    const request = store.getAll()
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}
