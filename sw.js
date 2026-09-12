/* ══════════════════════════════════════════════════════════════
   HIGSAD — Service Worker (production build for GitHub Pages)
   - Precaches the app shell (index.html, manifest, icons) so the
     app opens even fully offline after the first successful visit.
   - Uses RELATIVE paths only (no leading "/"), so it works no matter
     which sub-path GitHub Pages serves the project from
     (e.g. https://user.github.io/HIGSAD-/).
   - Network-first for navigation (HTML) so users always get the
     latest deploy when online, falling back to cache when offline.
   - Stale-while-revalidate for everything else (fonts, CDN scripts).
   - Never intercepts Supabase requests (writes must always hit network,
     app already has its own offline-first handling for that data).
   - Bump CACHE_VERSION on every deploy that changes cached files so
     old caches are cleaned up automatically on activate.
═══════════════════════════════════════════════════════════════ */

const CACHE_VERSION = 'v3.0.0';
const APP_CACHE = `higsad-app-${CACHE_VERSION}`;
const RUNTIME_CACHE = `higsad-runtime-${CACHE_VERSION}`;

// App shell: the minimum set of files needed for HIGSAD to boot offline.
// Paths are relative to sw.js's own scope (./), which matches the
// GitHub Pages project sub-path automatically.
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch((err) => console.warn('HIGSAD SW: app shell precache failed (non-fatal):', err))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((k) => k !== APP_CACHE && k !== RUNTIME_CACHE)
          .map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return; // never intercept POST/PUT (Supabase writes, etc.)

  const url = new URL(req.url);

  // Never touch Supabase — data already has its own offline-first
  // handling in the app (localStorage), and online it must go straight
  // to the network so writes/reads are never served stale from cache.
  if (url.hostname.endsWith('.supabase.co')) return;

  // Navigation requests (the app shell / index.html) — network-first,
  // falling back to cache when offline. This is what makes "open the
  // installed app with no internet" work.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const clone = res.clone();
          caches.open(APP_CACHE).then((cache) => cache.put(req, clone));
          return res;
        })
        .catch(() =>
          caches.match(req).then(
            (cached) => cached || caches.match('./index.html') || caches.match(self.registration.scope)
          )
        )
    );
    return;
  }

  // Everything else (fonts, CDN scripts, icons) — stale-while-revalidate:
  // serve from cache instantly if available, refresh cache in background.
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req)
        .then((res) => {
          if (res && (res.ok || res.type === 'opaque')) {
            const clone = res.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(req, clone));
          }
          return res;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(self.registration.scope);
    })
  );
});

// Real push (VAPID/backend) — Supabase Edge Function + pg_cron send reminders
// even when the app is fully closed. Kept as-is from the existing HIGSAD design.
self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const payload = event.data.json();
    event.waitUntil(
      self.registration.showNotification(payload.title || '🕌 HIGSAD', {
        body: payload.body || '',
        tag: payload.tag || undefined,
        icon: './icons/icon-192.png',
        badge: './icons/icon-192.png',
        vibrate: [200, 100, 200]
      })
    );
  } catch (e) { /* payload wasn't JSON — ignore */ }
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
