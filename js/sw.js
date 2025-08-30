// sw.js - tiny offline caching for static site and API fallback
const STATIC_CACHE = 'techcare-static-v1';
const DYN_CACHE = 'techcare-dyn-v1';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/css/styles.css',
    '/js/scripts.js',
    '/img/TestLogo.svg',
    '/img/doctorimg.png',
    'https://cdn.jsdelivr.net/npm/remixicon@4.2.0/fonts/remixicon.css',
    // Chart.js is loaded from CDN and we avoid caching it here to reduce CORS issues.
];

self.addEventListener('install', evt => {
    evt.waitUntil(
        caches.open(STATIC_CACHE).then(cache => cache.addAll(STATIC_ASSETS)).catch(() => { })
    );
    self.skipWaiting();
});

self.addEventListener('activate', evt => {
    evt.waitUntil(
        caches.keys().then(keys => Promise.all(keys.map(k => {
            if (k !== STATIC_CACHE && k !== DYN_CACHE) return caches.delete(k);
        })))
    );
    self.clients.claim();
});

self.addEventListener('fetch', evt => {
    const req = evt.request;
    const url = new URL(req.url);

    // For the API call, use network-first then cache as fallback
    if (url.origin !== location.origin && url.href.includes('fedskillstest.coalitiontechnologies.workers.dev')) {
        evt.respondWith(
            fetch(req).then(res => {
                const cloned = res.clone();
                caches.open(DYN_CACHE).then(c => c.put(req, cloned)).catch(() => { });
                return res;
            }).catch(() => caches.match(req).then(r => r || new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } })))
        );
        return;
    }

    // For app shell: cache-first
    evt.respondWith(
        caches.match(req).then(cached => {
            if (cached) return cached;
            return fetch(req).then(networkRes => {
                // dynamic cache for same-origin requests
                if (req.method === 'GET' && req.url.startsWith(location.origin)) {
                    const copy = networkRes.clone();
                    caches.open(DYN_CACHE).then(cache => cache.put(req, copy)).catch(() => { });
                }
                return networkRes;
            }).catch(() => {
                // fallback for navigation requests
                if (req.mode === 'navigate') {
                    return caches.match('/index.html');
                }
            });
        })
    );
});
