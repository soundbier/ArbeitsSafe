// =========================================================================
// UPDATE-STEUERUNG: 
// Wenn du etwas an der App oder der gesetze.csv änderst, erhöhe diese 
// Versionsnummer (z.B. auf 'revisions-tool-v8'). Der Browser weiß dann 
// automatisch, dass er den alten Cache löschen und alles neu laden muss.
// =========================================================================
const CACHE_NAME = 'revisions-tool-v7';

// Diese Dateien werden beim ersten Aufruf für die Offline-Nutzung gespeichert.
// HINWEIS: Der fehleranfällige Eintrag './' wurde hier entfernt.
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
            // skipWaiting zwingt den Service Worker, sofort aktiv zu werden, 
            // ohne darauf zu warten, dass der Nutzer alle Tabs der App schließt.
            .then(() => self.skipWaiting()) 
    );
});

// 2. AKTIVIERUNG: Alte Caches restlos löschen
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    // Lösche alle Caches, die nicht der aktuellen CACHE_NAME entsprechen
                    if (cache !== CACHE_NAME) {
                        console.log('[Service Worker] Lösche alten Cache:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        })
        // clients.claim sorgt dafür, dass der neue Service Worker sofort 
        // die Kontrolle über die aktuell geöffnete Seite übernimmt.
        .then(() => self.clients.claim()) 
    );
});

// 3. DATEN ABRUFEN: Cache-First Strategie mit Navigation-Fix
self.addEventListener('fetch', event => {
    // FIX: Wenn es sich um einen Seitenaufruf der App (Navigation) handelt,
    // zwingen wir den SW, direkt die saubere index.html auszuliefern.
    if (event.request.mode === 'navigate') {
        event.respondWith(
            caches.match('./index.html')
                .then(cachedResponse => {
                    return cachedResponse || fetch(event.request);
                })
        );
        return; 
    }

    // Bisherige Logik für alle anderen Ressourcen (CSS, JS, Bilder, CSV)
    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                // Wenn die Datei im Cache liegt, gib sie sofort zurück. 
                // Wenn nicht, lade sie ganz normal aus dem Netzwerk.
                return cachedResponse || fetch(event.request);
            })
    );
});
