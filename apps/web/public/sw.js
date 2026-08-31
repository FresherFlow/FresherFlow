const SW_VERSION = '2.1.0';
const STATIC_CACHE = `fresherflow-static-${SW_VERSION}`;
const CDN_CACHE = `fresherflow-cdn-${SW_VERSION}`;
const OFFLINE_URL = '/offline.html';
const OFFLINE_FALLBACK_HTML = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>FresherFlow - Offline</title>
    <style>
      body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#0b1220;color:#e5e7eb;margin:0;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:24px}
      .card{max-width:420px;border:1px solid #273247;background:#111a2b;border-radius:14px;padding:20px}
      h1{font-size:20px;margin:0 0 8px}
      p{margin:0;color:#b8c2d6;line-height:1.5}
    </style>
  </head>
  <body>
    <div class="card">
      <h1>You are offline</h1>
      <p>Connect to the internet to load fresh listings. Cached pages and feed will be shown when available.</p>
    </div>
  </body>
</html>`;

// Pages to cache on install — these load from CDN/static, zero compute
const PRECACHE_ASSETS = [
  OFFLINE_URL,
  '/',
  '/dashboard',
  '/jobs',
  '/jobs/internships',
  '/jobs/remote',
  '/jobs/walkins',
  '/deadlines',
  '/account',
  '/login',
  '/favicon.ico',
  '/manifest.webmanifest',
];

// CDN domains to cache (feed JSON lives here)
const CDN_DOMAINS = [
  'cdn.fresherflow.in',
  'cdn.fresherflow.com',
];

function isCDNRequest(url) {
  return CDN_DOMAINS.some(domain => url.hostname === domain || url.hostname.endsWith('.' + domain));
}

async function cleanupOldCaches() {
  const valid = new Set([STATIC_CACHE, CDN_CACHE]);
  const keys = await caches.keys();
  await Promise.all(
    keys.map((key) => (valid.has(key) ? Promise.resolve() : caches.delete(key)))
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      await Promise.allSettled(
        PRECACHE_ASSETS.map(async (url) => {
          const response = await fetch(url, { redirect: 'follow', cache: 'reload' });
          if (response.ok && response.type !== 'opaqueredirect') {
            await cache.put(url, response.clone());
          }
        })
      );
    })()
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(cleanupOldCaches());
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Skip non-GET requests and browser extensions
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) return;

  const url = new URL(event.request.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isNavigation = event.request.mode === 'navigate';

  // ── CDN: stale-while-revalidate for feed JSON ──────────────────────────────
  if (isCDNRequest(url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CDN_CACHE);
        const cached = await cache.match(event.request);
        const networkFetch = fetch(event.request)
          .then((res) => {
            if (res && res.ok) cache.put(event.request, res.clone());
            return res;
          })
          .catch(() => null);

        if (cached) {
          event.waitUntil(networkFetch);
          return cached;
        }
        return (await networkFetch) || new Response(JSON.stringify({ error: 'offline' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        });
      })()
    );
    return;
  }

  // ── Navigation: network-first, cache fallback ──────────────────────────────
  if (isNavigation) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(STATIC_CACHE);
        const navigationKey = new Request(url.pathname || '/', { method: 'GET' });
        try {
          const networkResponse = await fetch(event.request);
          if (networkResponse && networkResponse.ok) {
            cache.put(navigationKey, networkResponse.clone());
          }
          return networkResponse;
        } catch {
          const cachedExact = await cache.match(navigationKey);
          if (cachedExact) return cachedExact;

          // Try root shell (Next.js will rehydrate to correct route)
          const appShell = await cache.match(new Request('/', { method: 'GET' }));
          if (appShell) return appShell;

          const offlinePage = await caches.match(OFFLINE_URL);
          if (offlinePage) return offlinePage;

          return new Response(OFFLINE_FALLBACK_HTML, {
            status: 200,
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          });
        }
      })()
    );
    return;
  }

  // ── Public API: network-first, 10-minute stale fallback ────────────────────
  const isPublicApi = isSameOrigin && url.pathname.startsWith('/api/public/');
  if (isPublicApi) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CDN_CACHE);
        try {
          const res = await fetch(event.request);
          if (res && res.ok) cache.put(event.request, res.clone());
          return res;
        } catch {
          const cached = await cache.match(event.request);
          return cached || new Response(JSON.stringify({ error: 'offline' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      })()
    );
    return;
  }

  // Normalize cache keys (strip UTM + tracking params)
  const normalizedUrl = new URL(url.pathname + url.search, self.location.origin);
  ['utm_source','utm_medium','utm_campaign','utm_term','utm_content','ref'].forEach(p => {
    normalizedUrl.searchParams.delete(p);
  });
  const cacheKey = new Request(normalizedUrl.toString(), { method: 'GET' });

  // ── Static assets: cache-first for images/fonts, network-first for JS/CSS ──
  const dest = event.request.destination;
  const isStaticAsset = isSameOrigin && ['style', 'script', 'image', 'font'].includes(dest);

  if (isStaticAsset) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(STATIC_CACHE);
        const isCritical = dest === 'style' || dest === 'script';

        if (isCritical) {
          // JS/CSS: network-first to avoid stale UI after deploy
          try {
            const res = await fetch(event.request);
            if (res && res.status === 200) cache.put(cacheKey, res.clone());
            return res;
          } catch {
            const cached = await cache.match(cacheKey);
            if (cached) return cached;
            throw new Error('critical_asset_unavailable_offline');
          }
        }

        // Images/fonts: stale-while-revalidate
        const cached = await cache.match(cacheKey);
        const fetchPromise = fetch(event.request).then((res) => {
          if (res && res.status === 200) cache.put(cacheKey, res.clone());
          return res;
        });
        return cached || fetchPromise;
      })()
    );
  }
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload = null;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'FresherFlow Update', body: event.data.text(), url: '/' };
  }

  const title = payload?.title || 'FresherFlow';
  const body = payload?.body || 'You have a new alert.';
  const url = payload?.url || '/account/notifications';

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      data: { url },
      badge: '/icon-192x192.png',
      icon: '/icon-192x192.png',
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || '/account/notifications';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
      return undefined;
    })
  );
});
