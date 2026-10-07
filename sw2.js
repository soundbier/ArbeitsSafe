// =========================================================================
// ArbeitsSafe Service Worker — v2.0.9
// -------------------------------------------------------------------------
// Jede Version liefert ausschließlich aus ihrem eigenen, vollständig geladenen
// Cache aus (Cache-First, kein Nachschreiben aus dem Netz). Eine neue Version
// wird erst nach Zustimmung im Update-Dialog heruntergeladen. Bis dahin bleibt
// die zuletzt vollständig geladene Version im Einsatz – auch wenn der neue
// Service Worker beim Schließen der App schon aktiv wird –, damit die App
// jederzeit offline startet.
// =========================================================================
const CACHE_NAME = 'arbeitssafe-v2.0.9';

const ASSETS_TO_CACHE = [
    './',
    'index.html',
    'css/style.css',
    'js/app.js',
    'js/data.js',
    'js/ui.js',
    'js/icons.js',
    'bogen.html',
    'datenschutz.html',
    'impressum.html',
    'js/appearance.js',
    'js/legal.js',
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
// Wird erst geschrieben, wenn alle Dateien im Cache liegen.
const COMPLETE_MARKER = '__precache_complete__';
// Caches bis einschließlich dieser Version kennen die Markierung noch nicht.
// Sie wurden mit der damaligen Dateiliste befüllt und taugen als Rückfallebene,
// sobald die Startseite darin liegt.
const LEGACY_UNTIL = [2, 0, 8];
// ignoreSearch: Assets werden mit Cache-Busting-Query (?v=…) angefragt.
const MATCH = { ignoreSearch: true, ignoreVary: true };

/* =========================================================================
   CACHES & VERSIONEN
   ========================================================================= */

function parseVersion(name) {
    const m = /^arbeitssafe-v(\d+(?:\.\d+)*)$/.exec(name);
    return m ? m[1].split('.').map(Number) : null;
}

function compareVersions(a, b) {
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
        const diff = (a[i] || 0) - (b[i] || 0);
        if (diff) return diff;
    }
    return 0;
}

const OWN_VERSION = parseVersion(CACHE_NAME);

/** Caches älterer Versionen, neueste zuerst. */
async function olderCaches() {
    return (await caches.keys())
        .map(name => ({ name, version: parseVersion(name) }))
        .filter(c => c.version && compareVersions(c.version, OWN_VERSION) < 0)
        .sort((a, b) => compareVersions(b.version, a.version))
        .map(c => c.name);
}

async function isComplete(name) {
    if (!(await caches.has(name))) return false;
    const cache = await caches.open(name);
    if (await cache.match(COMPLETE_MARKER)) return true;
    if (compareVersions(parseVersion(name), LEGACY_UNTIL) > 0) return false;
    return !!(await cache.match('index.html', MATCH));
}

/**
 * Eigener Cache, sobald vollständig. Sonst der neueste vollständige ältere:
 * Das Update ist dann aktiv, aber noch nicht bestätigt und heruntergeladen.
 */
async function servingCacheName() {
    for (const name of [CACHE_NAME, ...(await olderCaches())]) {
        if (await isComplete(name)) return name;
    }
    return null;
}

// Nur der aktive SW (activate/fetch) liefert aus und räumt auf, nie ein wartender.
let serving = null;

function servingCache() {
    if (!serving) {
        serving = (async () => {
            const name = await servingCacheName();
            const obsolete = (await olderCaches()).filter(n => n !== name);
            await Promise.all(obsolete.map(n => caches.delete(n)));
            return name ? caches.open(name) : null;
        })().catch(() => {
            serving = null;
            return null;
        });
    }
    return serving;
}

// Alle Dateien am HTTP-Cache vorbei laden; erst danach gilt der Cache als vollständig.
async function precache() {
    const responses = await Promise.all(ASSETS_TO_CACHE.map(async url => {
        const response = await fetch(new Request(url, { cache: 'reload' }));
        if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
        return [url, withoutRedirect(response)];
    }));
    const cache = await caches.open(CACHE_NAME);
    await cache.delete(COMPLETE_MARKER);
    await Promise.all(responses.map(([url, response]) => cache.put(url, response)));
    await cache.put(COMPLETE_MARKER, new Response(SW_VERSION));
}

// Redirected Responses (z. B. "./" -> "index.html") verweigert Safari bei der
// Auslieferung an Navigations-Requests ("Response served by service worker has
// redirections"). Deshalb ohne redirected-Flag speichern.
function withoutRedirect(response) {
    if (!response.redirected) return response;
    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
    });
}

async function fromCache(request) {
    try {
        return await (await servingCache())?.match(request, MATCH);
    } catch {
        return undefined;
    }
}

// Kein vollständiger Cache vorhanden (z. B. vom Browser geräumt): aktuelle Version
// erneut vorhalten. Ausgeliefert wird in diesem Fall ohnehin schon aus dem Netz.
let repairing = null;
let lastRepairFailure = 0;

async function repairIfEmpty() {
    if (!navigator.onLine || Date.now() - lastRepairFailure < 60 * 1000) return;
    if (await servingCache()) return;
    if (!repairing) {
        repairing = precache()
            .then(() => { serving = null; }, () => { lastRepairFailure = Date.now(); })
            .finally(() => { repairing = null; });
    }
    return repairing;
}

/* =========================================================================
   LEBENSZYKLUS
   ========================================================================= */

// 1. INSTALLATION
// Erstinstallation: sofort vorhalten (Offline-Fähigkeit).
// Update: nichts herunterladen – erst nach Zustimmung (Nachricht 'INSTALL_UPDATE').
self.addEventListener('install', event => {
    if (!self.registration.active) event.waitUntil(precache());
});

// 2. AKTIVIERUNG
// Auch ohne Zustimmung möglich (App geschlossen, während das Update wartete).
// Ältere Caches werden erst gelöscht, wenn ein neuerer vollständig ist.
self.addEventListener('activate', event => {
    serving = null;
    event.waitUntil(servingCache().then(() => self.clients.claim()));
});

// 3. FETCH — Cache-First aus dem Cache genau einer Version
self.addEventListener('fetch', event => {
    const { request } = event;
    if (request.method !== 'GET') return;
    if (!request.url.startsWith(`${self.location.origin}/`)) return;

    // Zwischenspeicher komplett umgehen, wenn explizit angefordert
    // (Einstellung "Automatisch aktualisieren").
    if (request.cache === 'no-store') {
        event.respondWith(fetch(request).catch(() => fromCache(request)));
        return;
    }

    // Netz-Antworten werden nie nachträglich in den Cache geschrieben,
    // sonst mischen sich Dateien alter und neuer Versionen.
    event.respondWith(fromCache(request).then(cached => cached || fetch(request)));
    event.waitUntil(repairIfEmpty());
});

// 4. UPDATE auf Nutzerwunsch: herunterladen, dann aktivieren
self.addEventListener('message', event => {
    // Antwort über den mitgeschickten Kanal; ältere Seitenversionen lauschen am Client.
    const reply = msg => (event.ports[0] || event.source)?.postMessage(msg);
    switch (event.data) {
        case 'GET_VERSION':
            event.waitUntil(servingCacheName().then(name => reply({
                type: 'VERSION',
                version: SW_VERSION,
                // false: Update aktiv, aber noch nicht heruntergeladen – es läuft die alte Version.
                ready: name === CACHE_NAME || name === null
            })));
            break;
        case 'INSTALL_UPDATE':
        case 'SKIP_WAITING': // ältere Seitenversionen
            event.waitUntil(installUpdate().then(
                () => reply({ type: 'UPDATE_READY' }),
                () => reply({ type: 'UPDATE_FAILED' })
            ));
            break;
    }
});

async function installUpdate() {
    await precache();
    serving = null;
    // Eigene Fenster hat nur ein bereits aktiver SW; sie laufen noch mit der alten
    // Version und bekommen einen Hinweis (bei einem wartenden SW: controllerchange).
    const ownWindows = await self.clients.matchAll({ type: 'window' });
    // Wartender SW: jetzt aktivieren (Seite lädt bei controllerchange neu).
    // Bereits aktiver SW: ohne Wirkung (Seite lädt nach UPDATE_READY neu).
    await self.skipWaiting();
    ownWindows.forEach(client => client.postMessage({ type: 'UPDATE_INSTALLED' }));
}
