// =========================================================================
// UPDATE-STEUERUNG: v1.4.0.0
// =========================================================================
const CACHE_NAME = 'revisions-tool-v1.4.0.0';

const ASSETS_TO_CACHE = [
    './',
    'index.html',
    'css/style.css',
    'js/app.js',
    'js/data.js',
    'js/ui.js',
    'js/icons.js',
    'gesetze.csv',
    'manifest.json',
    'icons/img-192x192.png',
    'icons/img-512x512.png'
];

// 1. INSTALLATION: Dateien mit Cache-Busting laden
self.addEventListener('install', event => {
    // skipWaiting() wird hier bewusst NICHT gerufen,
    // damit der User über den Banner selbst entscheiden kann (bessere Stabilität)
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(ASSETS_TO_CACHE.map(asset => `${asset}?v=${CACHE_NAME}`));
        })
    );
});

// 2. AKTIVIERUNG: Alte Caches löschen
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// 3. FETCH: Stale-While-Revalidate Strategie
self.addEventListener('fetch', event => {
    if (!event.request.url.startsWith(self.location.origin)) return;

    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            const fetchPromise = fetch(event.request).then(networkResponse => {
                if (networkResponse.status === 200) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseClone);
                    });
                }
                return networkResponse;
            });
            // Gib den Cache zurück, falls vorhanden, sonst warte aufs Netzwerk
            return cachedResponse || fetchPromise;
        })
    );
});

// 4. SKIP WAITING
self.addEventListener('message', event => {
    if (event.data === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
