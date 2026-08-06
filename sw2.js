// =========================================================================
// UPDATE-STEUERUNG: 
// Wenn du etwas an der App oder der gesetze.csv änderst, erhöhe diese 
// Versionsnummer (z.B. auf 'revisions-tool-v1.1.1.2 [Major.Minor.Patch.Build]'). Der Browser weiß dann 
// automatisch, dass er den alten Cache löschen und alles neu laden muss.
// =========================================================================
const CACHE_NAME = 'revisions-tool-v1.1.2.3';

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

// 3. DATEN ABRUFEN: Der Cloudflare Pages & iOS Fix
self.addEventListener('fetch', event => {
    // WICHTIG: Bei Seitenaufrufen (Navigation) greift der SW NICHT ein. 
    // Cloudflare Pages darf den Routing-Redirect ungestört machen.
    if (event.request.mode === 'navigate') {
        return; 
    }

    if (event.request.method !== 'GET') return;

    // Nur für statische Assets (CSS, JS, CSV, Bilder) greift der Cache
    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                return cachedResponse || fetch(event.request);
            })
    );
});
