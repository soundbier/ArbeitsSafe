#!/usr/bin/env node
// =========================================================================
// Automatischer Versions-Bumper für ArbeitsSafe
// -------------------------------------------------------------------------
// Erhöht die Patch-Version an allen Stellen im Projekt konsistent, damit
// der Service-Worker-Cache (sw2.js) bei jeder Code-Änderung garantiert
// invalidiert wird. Wird von .github/workflows/auto-version-bump.yml bei
// jedem Push auf main automatisch ausgeführt.
//
// Manuell ausführen: node scripts/bump-version.js [--set X.Y.Z]
// =========================================================================
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const APP_JS = path.join(ROOT, 'js', 'app.js');
const INDEX_HTML = path.join(ROOT, 'index.html');
const SW_JS = path.join(ROOT, 'sw2.js');

function readCurrentVersion() {
    const content = fs.readFileSync(APP_JS, 'utf8');
    const match = content.match(/const APP_VERSION = '([\d.]+)';/);
    if (!match) throw new Error('APP_VERSION nicht in js/app.js gefunden.');
    return match[1];
}

function bumpPatch(version) {
    const parts = version.split('.').map(Number);
    parts[2] = (parts[2] || 0) + 1;
    return parts.join('.');
}

function updateAppJs(newVersion) {
    let content = fs.readFileSync(APP_JS, 'utf8');
    content = content.replace(
        /const APP_VERSION = '[\d.]+';/,
        `const APP_VERSION = '${newVersion}';`
    );
    fs.writeFileSync(APP_JS, content);
}

function updateIndexHtml(newVersion) {
    let content = fs.readFileSync(INDEX_HTML, 'utf8');
    // Cache-Busting-Query an allen lokalen Asset-Links (css/js).
    content = content.replace(/(href="css\/style\.css\?v=)[\d.]+(")/, `$1${newVersion}$2`);
    content = content.replace(/(src="js\/app\.js\?v=)[\d.]+(")/, `$1${newVersion}$2`);
    // Sichtbare Versionsanzeige im UI.
    content = content.replace(/(ArbeitsSafe · Version )[\d.]+/, `$1${newVersion}`);
    fs.writeFileSync(INDEX_HTML, content);
}

function updateServiceWorker(newVersion) {
    let content = fs.readFileSync(SW_JS, 'utf8');
    content = content.replace(
        /(ArbeitsSafe Service Worker — v)[\d.]+/,
        `$1${newVersion}`
    );
    content = content.replace(
        /(const CACHE_NAME = 'arbeitssafe-v)[\d.]+(';)/,
        `$1${newVersion}$2`
    );
    fs.writeFileSync(SW_JS, content);
}

function main() {
    const setArgIndex = process.argv.indexOf('--set');
    const current = readCurrentVersion();
    const next = setArgIndex !== -1 ? process.argv[setArgIndex + 1] : bumpPatch(current);

    updateAppJs(next);
    updateIndexHtml(next);
    updateServiceWorker(next);

    console.log(`Version aktualisiert: ${current} -> ${next}`);
}

main();
