const CACHE = 'cea-shell-v11';
const SHELL = [
  '/',
  '/style.css?v=11',
  '/dashboard-theme.css?v=10',
  '/mobile-reference.css?v=4',
  '/advanced-premium-v2.css?v=2',
  '/full-site-premium.css?v=2',
  '/mobile-bottom-clearance.css?v=3',
  '/dark-mode-contrast.css?v=4',
  '/quality-pass.css?v=1',
  '/distinct-identity.css?v=1',
  '/mobile-drawer-fix.css?v=3',
  '/mock-test-responsive.css?v=1',
  '/study-command-center.css?v=1',
  '/app2.js?v=11',
  '/app.js?v=20',
  '/icon.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then(response => {
        if (response.ok) {
          const copy = response.clone();
          event.waitUntil(caches.open(CACHE).then(cache => cache.put('/', copy)));
        }
        return response;
      }).catch(async () => (await caches.match(request)) || (await caches.match('/')))
    );
    return;
  }

  if (['.js', '.css', '.svg', '.webmanifest'].some(ext => url.pathname.endsWith(ext))) {
    event.respondWith(
      fetch(request).then(response => {
        if (response.ok) {
          const copy = response.clone();
          event.waitUntil(caches.open(CACHE).then(cache => cache.put(request, copy)));
        }
        return response;
      }).catch(async () => (await caches.match(request)) || (await caches.match(url.pathname)))
    );
  }
});
