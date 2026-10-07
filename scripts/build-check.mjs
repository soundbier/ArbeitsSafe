#!/usr/bin/env node
// =========================================================================
// Build-Prüfung für ArbeitsSafe (ohne Abhängigkeiten, kein Bundling)
// -------------------------------------------------------------------------
// 1. Syntaxprüfung aller ES-Module unter js/ und des Service Workers
// 2. Validierung der Revisionsbogen-Definition
// 3. Existenz aller im Service Worker vorgehaltenen Dateien
// Aufruf: npm run build
// =========================================================================
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let failed = false;
const fail = msg => { console.error(`✗ ${msg}`); failed = true; };

// --- 1. Syntax ---
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
});

for (const file of walk(path.join(ROOT, 'js')).filter(p => p.endsWith('.js'))) {
    try {
        new vm.SourceTextModule(fs.readFileSync(file, 'utf8'), { identifier: file });
    } catch (e) {
        fail(`${path.relative(ROOT, file)}: ${e.message}`);
    }
}
try {
    new vm.Script(fs.readFileSync(path.join(ROOT, 'sw2.js'), 'utf8'), { filename: 'sw2.js' });
} catch (e) {
    fail(`sw2.js: ${e.message}`);
}

// --- 2. Revisionsbogen ---
const { validateBogen } = await import(pathToFileURL(path.join(ROOT, 'js/bogen/schema.js')));
try {
    const def = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/revisionsbogen.json'), 'utf8'));
    const { errors, warnings } = validateBogen(def);
    warnings.forEach(w => console.warn(`! Revisionsbogen: ${w}`));
    errors.forEach(e => fail(`Revisionsbogen: ${e}`));
} catch (e) {
    fail(`Revisionsbogen: ${e.message}`);
}

// --- 3. Precache-Liste ---
const sw = fs.readFileSync(path.join(ROOT, 'sw2.js'), 'utf8');
const list = sw.match(/ASSETS_TO_CACHE\s*=\s*\[([\s\S]*?)\]/)?.[1] || '';
const precached = new Set([...list.matchAll(/'([^']+)'/g)].map(m => m[1]));
for (const asset of precached) {
    if (asset === './') continue;
    if (!fs.existsSync(path.join(ROOT, asset))) fail(`sw2.js: Precache-Datei fehlt: ${asset}`);
}
// Der Service Worker liefert nur aus dem Precache aus: Jede App-Datei muss in der Liste stehen.
const appFiles = [
    'index.html', 'bogen.html', 'manifest.json', 'gesetze.csv',
    ...['css', 'js', 'icons', 'src/data'].flatMap(dir => walk(path.join(ROOT, dir)))
        .filter(p => !path.basename(p).startsWith('.'))
        .map(p => path.relative(ROOT, p).split(path.sep).join('/'))
];
for (const file of appFiles) {
    if (!precached.has(file)) fail(`sw2.js: ${file} fehlt in ASSETS_TO_CACHE (offline nicht verfügbar)`);
}

if (failed) process.exit(1);
console.log('✓ Build-Prüfung erfolgreich');
