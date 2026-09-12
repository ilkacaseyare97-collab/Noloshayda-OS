/* ══════════════════════════════════════════════════════════════
   HIGSAD — Service Worker (single-file build)
   100% client-side: wax backend/cloud-server ah looma isticmaalo.
   Waxa uu qabtaa:
     1) Offline caching — bogga (document-ka) qudhiisa oo la kaydiyo
        markii ugu horeysay ee la booqdo iyada oo online ah, si loo
        heli karo mar dambe offline (network-first + cache fallback).
     2) Xasuusino/Local notifications (showNotification) — ka yimaada
        page-ka, waxayna u shaqeeyaan xitaa marka app-ku background-ka
        ku jiro/PWA installed.
     3) notificationclick → app-ka soo furan/focus-garee.
   MUHIIM: Halkan lama isticmaalin Push API dhab ah (VAPID/backend) —
   waxaa la go'aamiyay in aan la isticmaalin cloud/backend server.
   "Reminders"-ku waxay u shaqeeyaan intii app-ku furan yahay ama SW-gu
   socdo (background tab/PWA) — ma aha "wake fully-killed app" oo dhab
   ah, taasi backend push server ayay u baahan tahay.
═══════════════════════════════════════════════════════════════ */

const CACHE_VERSION = 'v2.0.0';
const APP_CACHE = `higsad-singlefile-${CACHE_VERSION}`;
const RUNTIME_CACHE = `higsad-runtime-${CACHE_VERSION}`;

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== APP_CACHE && k !== RUNTIME_CACHE).map((k) => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return; // POST/PUT (Supabase writes) — never intercept

  const url = new URL(req.url);

  // Ha faragelin Supabase — xogtu horeba localStorage ayay ku kaydsan tahay
  // marka offline la yahay (offline-first), online-na si toos ah loo dirayaa.
  if (url.hostname.endsWith('.supabase.co')) return;

  // Navigation requests (bogga qudhiisa) — network-first, cache fallback.
  // Faylkan single-file ahaan, kaydintan waa waxa u ogolaanaysa offline mode.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const clone = res.clone();
          caches.open(APP_CACHE).then((cache) => cache.put(req, clone));
          return res;
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match(self.registration.scope)))
    );
    return;
  }

  // Wax kale (Google Fonts, supabase-js/pdf.js CDN) — stale-while-revalidate
  // best-effort, si offline-na loo heli karo haddii hore loo soo qaaday.
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req).then((res) => {
        if (res && (res.ok || res.type === 'opaque')) {
          const clone = res.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(req, clone));
        }
        return res;
      }).catch(() => cached);
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

// Mustaqbal-hawl — inert ilaa backend/VAPID la daro.
// Push dhab ah (VAPID/backend) — Supabase Edge Function (send-reminders) +
// pg_cron ayaa dirta xasuusinta xitaa marka app-ku xidhan yahay gebi ahaanba.
self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const payload = event.data.json();
    event.waitUntil(
      self.registration.showNotification(payload.title || '🕌 HIGSAD', {
        body: payload.body || '',
        tag: payload.tag || undefined,
        vibrate: [200, 100, 200]
      })
    );
  } catch (e) { /* payload aan JSON ahayn — iska bood */ }
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
