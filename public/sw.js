const CACHE = 'cea-shell-v6';
const SHELL = [
  '/',
  '/style.css?v=7',
  '/dashboard-theme.css?v=10',
  '/mobile-reference.css?v=4',
  '/advanced-premium-v2.css?v=2',
  '/full-site-premium.css?v=2',
  '/mobile-bottom-clearance.css?v=3',
  '/dark-mode-contrast.css?v=2',
  '/app2.js?v=8',
  '/app.js?v=17',
  '/icon.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
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
    event.respondWith(fetch(request).then(response => {
      if (response.ok) caches.open(CACHE).then(cache => cache.put('/', response.clone()));
      return response;
    }).catch(() => caches.match('/')));
    return;
  }
  if (['.js', '.css', '.svg'].some(ext => url.pathname.endsWith(ext))) {
    event.respondWith(fetch(request).then(response => {
      if (response.ok) caches.open(CACHE).then(cache => cache.put(request, response.clone()));
      return response;
    }).catch(() => caches.match(request)));
  }
});
