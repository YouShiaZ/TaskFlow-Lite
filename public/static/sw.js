// TaskFlow Lite - Service Worker for PWA
// Cache-first strategy with network fallback

const CACHE_NAME = 'taskflow-lite-v1';
const STATIC_CACHE = 'taskflow-static-v1';
const DYNAMIC_CACHE = 'taskflow-dynamic-v1';

// Files to cache on install
const STATIC_FILES = [
  '/',
  '/static/app.js',
  '/static/manifest.json',
  '/static/icon-192.png',
  '/static/icon-512.png',
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css',
  'https://unpkg.com/react@18/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
  'https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js',
];

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Caching static files');
      return cache.addAll(STATIC_FILES.map(url => new Request(url, { cache: 'reload' })));
    }).catch(err => {
      console.log('[SW] Cache install failed:', err);
      // Don't fail installation if some resources fail to cache
      return Promise.resolve();
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE && name !== DYNAMIC_CACHE)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  return self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // API requests - network first, cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone response before caching
          const responseClone = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // If network fails, try cache
          return caches.match(request).then((response) => {
            return response || new Response(
              JSON.stringify({ success: false, error: 'Offline - cached data not available' }),
              { status: 503, headers: { 'Content-Type': 'application/json' } }
            );
          });
        })
    );
    return;
  }

  // Static assets and pages - cache first, network fallback
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached response and update cache in background
        fetch(request).then((response) => {
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, response);
          });
        }).catch(() => {
          // Ignore network errors in background update
        });
        return cachedResponse;
      }

      // Not in cache, fetch from network
      return fetch(request)
        .then((response) => {
          // Don't cache non-successful responses
          if (!response || response.status !== 200 || response.type === 'error') {
            return response;
          }

          // Clone response before caching
          const responseClone = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });

          return response;
        })
        .catch(() => {
          // Network failed and not in cache
          // Return offline page for navigations
          if (request.mode === 'navigate') {
            return caches.match('/').then((response) => {
              return response || new Response('Offline', { status: 503 });
            });
          }
          return new Response('Offline', { status: 503 });
        });
    })
  );
});

// Background sync for offline task creation
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  if (event.tag === 'sync-tasks') {
    event.waitUntil(syncTasks());
  }
});

async function syncTasks() {
  try {
    // Get pending tasks from IndexedDB or localStorage
    const pendingTasks = JSON.parse(localStorage.getItem('pendingTasks') || '[]');
    
    for (const task of pendingTasks) {
      try {
        const response = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(task),
        });
        
        if (response.ok) {
          // Remove from pending tasks
          const index = pendingTasks.indexOf(task);
          pendingTasks.splice(index, 1);
        }
      } catch (error) {
        console.error('[SW] Sync task failed:', error);
      }
    }
    
    localStorage.setItem('pendingTasks', JSON.stringify(pendingTasks));
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

// Push notification event
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  const data = event.data ? event.data.json() : {};
  
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/static/icon-192.png',
    badge: '/static/icon-192.png',
    vibrate: [200, 100, 200],
    data: data,
    actions: [
      { action: 'open', title: 'Open App' },
      { action: 'close', title: 'Close' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'TaskFlow Lite', options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  event.notification.close();

  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow(event.notification.data?.url || '/')
    );
  }
});

// Message event - handle messages from app
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => caches.delete(name))
        );
      })
    );
  }
});
