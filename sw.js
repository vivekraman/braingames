const CACHE = 'wordsearch-v2';

// Assets to pre-cache on install (for offline support)
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './words.js',
  './fractions.js',
  './fractions-style.css',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-180.png',
  './favicon.ico',
];

// These rarely change — serve from cache, update in background
const CACHE_FIRST = [
  'icon-', 'favicon'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(PRECACHE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Cache-first for icons (static, never change)
  if (CACHE_FIRST.some(p => url.includes(p))) {
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request))
    );
    return;
  }

  // Network-first for everything else (HTML, JS, CSS, JSON)
  // Always tries the network; falls back to cache when offline
  e.respondWith(
    fetch(e.request)
      .then(response => {
        // Update the cache with the fresh response
        const clone = response.clone();
        caches.open(CACHE).then(cache => cache.put(e.request, clone));
        return response;
      })
      .catch(() => caches.match(e.request))
  );
});
