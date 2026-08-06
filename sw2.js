// =========================================================================
// UPDATE-STEUERUNG: 
// Wenn du etwas an der App oder der gesetze.csv änderst, erhöhe diese 
// Versionsnummer (z.B. auf 'revisions-tool-v10'). Der Browser weiß dann 
// automatisch, dass er den alten Cache löschen und alles neu laden muss.
// =========================================================================
const CACHE_NAME = 'revisions-tool-v9';

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

// 3. DATEN ABRUFEN: Cache-First Strategie mit robustem Redirect-Fix für GitHub Pages
self.addEventListener('fetch', event => {
    // Ignoriere Requests, die keine GET-Anfragen sind
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                if (cachedResponse) {
                    return cachedResponse;
                }

                return fetch(event.request).then(networkResponse => {
                    // Prüfen, ob die Antwort eine Weiterleitung (Redirect) ist oder fehlerhaft
                    if (!networkResponse || networkResponse.status !== 200 || networkResponse.type === 'error') {
                        return networkResponse;
                    }

                    // WICHTIG: Wenn GitHub Pages oder der Browser eine Umleitung liefert,
                    // clonen wir die Response sauber, damit der Service Worker nicht stolpert.
                    let responseToCache = networkResponse.clone();

                    // Optional: Dynamisches Caching für neue Ressourcen, 
                    // aber vor allem fängt es den Fehler ab.
                    return networkResponse;
                }).catch(err => {
                    // Fallback, falls offline und nicht im Cache: 
                    // Bei Navigationen geben wir die index.html zurück
                    if (event.request.mode === 'navigate') {
                        return caches.match('./index.html');
                    }
                    throw err;
                });
            })
    );
});
