const SW_VERSION = '1.7.0';
const STATIC_CACHE = `fresherflow-static-${SW_VERSION}`;
const API_CACHE = `fresherflow-api-${SW_VERSION}`;
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

// Assets that should be cached on install
const PRECACHE_ASSETS = [
  OFFLINE_URL,
  '/',
  '/dashboard',
  '/opportunities',
  '/jobs',
  '/internships',
  '/walk-ins',
  '/favicon.ico',
  '/manifest.webmanifest'
];

const API_CACHE_PREFIXES = [
  '/api/opportunities',
  '/api/dashboard/highlights',
  '/api/dashboard/deadlines',
  '/api/public',
  '/api/profile',
  '/api/auth/me',
  '/api/saved',
  '/api/actions',
  '/api/alerts',
];

function isCacheableApiRequest(url) {
  return API_CACHE_PREFIXES.some((prefix) => url.pathname.startsWith(prefix));
}

async function cleanupOldCaches() {
  const valid = new Set([STATIC_CACHE, API_CACHE]);
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
  const isApiRequest = url.pathname.startsWith('/api');
  const isNavigation = event.request.mode === 'navigate';
  // Handle navigation requests by serving cached offline page if network fails
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
          const cachedNavigation = await cache.match(navigationKey);
          if (cachedNavigation) return cachedNavigation;
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

  // Cache key ignores tracking params so the same feed/search request can be reused.
  const normalizedUrl = new URL(url.pathname + url.search, self.location.origin);
  normalizedUrl.searchParams.delete('utm_source');
  normalizedUrl.searchParams.delete('utm_medium');
  normalizedUrl.searchParams.delete('utm_campaign');
  normalizedUrl.searchParams.delete('utm_term');
  normalizedUrl.searchParams.delete('utm_content');
  normalizedUrl.searchParams.delete('ref');
  const cacheKey = new Request(normalizedUrl.toString(), { method: 'GET' });

  // Only cache same-origin static assets
  const dest = event.request.destination;
  const isStaticAsset = isSameOrigin && ['style', 'script', 'image', 'font'].includes(dest);

  if (isStaticAsset && !isApiRequest) {
    event.respondWith(
      caches.open(STATIC_CACHE).then((cache) =>
        cache.match(cacheKey).then((cachedResponse) => {
          const fetchPromise = fetch(event.request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(cacheKey, networkResponse.clone());
            }
            return networkResponse;
          });
          return cachedResponse || fetchPromise;
        })
      )
    );
    return;
  }

  // Deeper offline support for feed/search/deadline/profile APIs
  if (isSameOrigin && isApiRequest && isCacheableApiRequest(url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(API_CACHE);
        const cached = await cache.match(cacheKey);

        const networkFetch = fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.ok && networkResponse.type !== 'opaqueredirect') {
              cache.put(cacheKey, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => null);

        // Stale-while-revalidate: instant cached response, refresh in background.
        if (cached) {
          event.waitUntil(networkFetch);
          return cached;
        }

        const networkResponse = await networkFetch;
        if (networkResponse) return networkResponse;

        return new Response(
          JSON.stringify({
            error: 'Offline and no cached data available yet',
            offline: true,
          }),
          {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      })()
    );
  }
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
