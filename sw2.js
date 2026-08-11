// =========================================================================
// UPDATE-STEUERUNG: v1.2.0.1
// =========================================================================
const CACHE_NAME = 'revisions-tool-v1.2.0.1';

const ASSETS_TO_CACHE = [
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
    self.skipWaiting(); // Sofort übernehmen
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            // Wir fügen einen Zeitstempel hinzu, um den Browser-Cache zu umgehen
            const versionedAssets = ASSETS_TO_CACHE.map(asset => {
                return `${asset}?v=${Date.now()}`;
            });
            return cache.addAll(versionedAssets);
        })
    );
});

// 2. AKTIVIERUNG: Alte Caches sofort löschen
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

// 3. FETCH: Netzwerk-Priorität für Navigation, Cache für Assets
self.addEventListener('fetch', event => {
    // Verhindere Caching von Browser-Extensions etc.
    if (!event.request.url.startsWith(self.location.origin)) return;

    event.respondWith(
        fetch(event.request).then(response => {
            // Wenn Netzwerk da ist, Cache aktualisieren (Stale-While-Revalidate Prinzip)
            if (response.status === 200) {
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, responseClone);
                });
            }
            return response;
        }).catch(() => {
            // Offline: Aus dem Cache laden
            return caches.match(event.request);
        })
    );
});

self.addEventListener('message', event => {
    if (event.data === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
