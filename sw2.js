// =========================================================================
// UPDATE-STEUERUNG: 
// Wenn du etwas an der App oder der gesetze.csv änderst, erhöhe diese 
// Versionsnummer.
// =========================================================================
const CACHE_NAME = 'revisions-tool-v1.1.5.5';

const ASSETS_TO_CACHE = [
    './index.html',
    './css/style.css',
    './js/app.js',
    './js/data.js',
    './js/ui.js',
    './js/icons.js',
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

// 3. DATEN ABRUFEN: Strategie für Offline-Support
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;

    // Spezielle Behandlung für Navigation (Seitenaufrufe)
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request).catch(() => {
                return caches.match('./index.html');
            })
        );
        return;
    }

    // Für alle anderen statischen Assets
    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            return cachedResponse || fetch(event.request);
        })
    );
});
