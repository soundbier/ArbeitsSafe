// =========================================================================
// ArbeitsSafe Service Worker — v2.0.3
// =========================================================================
const CACHE_NAME = 'arbeitssafe-v2.0.3';

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

// 1. INSTALLATION — Precache
self.addEventListener('install', event => {
    // Kein skipWaiting(): Der Nutzer entscheidet über den Update-Banner.
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE))
    );
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

// 4. SKIP WAITING auf Nutzerwunsch
self.addEventListener('message', event => {
    if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
