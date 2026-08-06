// =========================================================================
// UPDATE-STEUERUNG: 
// Wenn du etwas an der App oder der gesetze.csv änderst, erhöhe diese 
// Versionsnummer (z.B. auf 'revisions-tool-v11'). Der Browser weiß dann 
// automatisch, dass er den alten Cache löschen und alles neu laden muss.
// =========================================================================
const CACHE_NAME = 'revisions-tool-v10';

const ASSETS_TO_CACHE = [
    './index.html',
    './css/style.css',
    './js/app.js',
    './js/data.js',
    './js/ui.js',
    './gesetze.csv',
    './manifest.json',
    './icons/img-192x192.png',  
    './icons/img-512x512.png'   
];

// 1. INSTALLATION: Dateien in den Cache laden
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[Service Worker] Caching App Shell');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => self.skipWaiting()) 
    );
});

// 2. AKTIVIERUNG: Alte Caches restlos löschen
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        console.log('[Service Worker] Lösche alten Cache:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        })
        .then(() => self.clients.claim()) 
    );
});

// 3. DATEN ABRUFEN: Absolut sichere Strategie gegen Redirect-Fehler
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                if (cachedResponse) {
                    return cachedResponse;
                }

                return fetch(event.request).then(networkResponse => {
                    // Wenn es keine valide Antwort oder ein Redirect ist, 
                    // reichen wir sie direkt durch, ohne sie fehlerhaft zu verarbeiten.
                    if (!networkResponse || networkResponse.status !== 200 || networkResponse.type === 'error' || networkResponse.type === 'opaqueredirect') {
                        return networkResponse;
                    }

                    return networkResponse;
                }).catch(() => {
                    // Fallback für Offline-Navigation (lädt die App statt abzustürzen)
                    if (event.request.mode === 'navigate') {
                        return caches.match('./index.html');
                    }
                });
            })
    );
});
