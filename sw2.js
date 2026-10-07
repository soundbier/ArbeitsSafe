// =========================================================================
// ArbeitsSafe Service Worker — v2.0.8
// =========================================================================
const CACHE_NAME = 'arbeitssafe-v2.0.8';

const ASSETS_TO_CACHE = [
    './',
    'index.html',
    'css/style.css',
    'js/app.js',
    'js/data.js',
    'js/ui.js',
    'js/icons.js',
    'bogen.html',
    'css/bogen.css',
    'js/bogen/main.js',
    'js/bogen/render.js',
    'js/bogen/schema.js',
    'js/bogen/store.js',
    'js/bogen/progress.js',
    'js/bogen/auswertung.js',
    'js/bogen/bausteine.js',
    'src/data/revisionsbogen.json',
    'gesetze.csv',
    'manifest.json',
    'icons/img-192x192.png',
    'icons/img-512x512.png'
];

const SW_VERSION = CACHE_NAME.replace('arbeitssafe-v', '');

// Assets am HTTP-Cache vorbei laden, damit wirklich die neue Version im Cache landet.
function precache() {
    return caches.open(CACHE_NAME).then(cache =>
        cache.addAll(ASSETS_TO_CACHE.map(url => new Request(url, { cache: 'reload' })))
    );
}

// 1. INSTALLATION
// Erstinstallation: sofort precachen (Offline-Fähigkeit).
// Update: nichts herunterladen — erst nach Zustimmung im Update-Dialog
// (Nachricht 'INSTALL_UPDATE'). Kein skipWaiting().
self.addEventListener('install', event => {
    if (!self.registration.active) event.waitUntil(precache());
});

// 2. AKTIVIERUNG — alte Caches entfernen
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

// 3. FETCH — Stale-While-Revalidate
self.addEventListener('fetch', event => {
    const { request } = event;
    if (request.method !== 'GET') return;
    if (!request.url.startsWith(self.location.origin)) return;

    // Zwischenspeicher komplett umgehen, wenn explizit angefordert
    // (Einstellung "Automatisch aktualisieren").
    if (request.cache === 'no-store') {
        event.respondWith(fetch(request).catch(() => caches.match(request, { ignoreSearch: true })));
        return;
    }

    event.respondWith(
        // ignoreSearch: Assets werden mit Cache-Busting-Query (?v=…) angefragt,
        // liegen im Precache aber ohne Query.
        caches.match(request, { ignoreSearch: true }).then(cached => {
            const network = fetch(request).then(response => {
                if (response && response.status === 200 && response.type === 'basic') {
                    // Redirected Responses (z.B. "./" -> "index.html") dürfen nicht
                    // 1:1 gecacht werden: Safari verweigert sie bei erneuter Auslieferung
                    // an Navigations-Requests ("Response served by service worker has
                    // redirections"). Deshalb den redirected-Flag entfernen.
                    const toCache = response.redirected
                        ? new Response(response.clone().body, {
                            status: response.status,
                            statusText: response.statusText,
                            headers: response.headers
                        })
                        : response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(request, toCache));
                }
                return response;
            }).catch(() => cached);

            return cached || network;
        })
    );
});

// 4. UPDATE auf Nutzerwunsch: herunterladen, dann aktivieren
self.addEventListener('message', event => {
    const reply = msg => event.source?.postMessage(msg);
    switch (event.data) {
        case 'GET_VERSION':
            reply({ type: 'VERSION', version: SW_VERSION });
            break;
        case 'INSTALL_UPDATE':
            event.waitUntil(
                precache()
                    .then(() => self.skipWaiting())
                    .catch(() => reply({ type: 'UPDATE_FAILED' }))
            );
            break;
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;
    }
});
