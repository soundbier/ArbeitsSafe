/**
 * Revisionsbogen — Persistenz (offline-first, localStorage wie im übrigen Projekt)
 *
 * Revision = {
 *   id, bogenId, bogenVersion, erstellt, geaendert,   // ISO-Zeitstempel
 *   kopfdaten:  { [kopfdatenId]: Wert },
 *   antworten:  { [itemId | feldId | <item>_pN | <item>_bemerkung]: Wert },
 *   abschnitteEntfallen: { [abschnittId]: true },
 *   feststellungen: { [itemId]: Feststellung }        // siehe auswertung.js
 * }
 */

const LS_KEY = 'arbeitsSafe_revisionen';
const LS_ACTIVE = 'arbeitsSafe_revision_aktiv';

/* --- Aufbewahrungsfrist (Einstellung in der Haupt-App) --- */

export const RETENTION_KEY = 'arbeitsSafe_aufbewahrung';
export const RETENTION_OPTIONS = [30, 90, 180, 365];
const RETENTION_DEFAULT = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

export function retentionDays() {
    const days = Number(localStorage.getItem(RETENTION_KEY));
    return RETENTION_OPTIONS.includes(days) ? days : RETENTION_DEFAULT;
}

/** Länger als die Aufbewahrungsfrist nicht geändert? */
export function istAbgelaufen(rev, days = retentionDays(), now = Date.now()) {
    const stand = Date.parse(rev.geaendert || rev.erstellt);
    return Number.isFinite(stand) && now - stand > days * DAY_MS;
}

let cache = null;

function readAll() {
    if (cache) return cache;
    try {
        const parsed = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
        cache = Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        console.error('Revisionen konnten nicht gelesen werden:', e);
        cache = [];
    }
    return cache;
}

function writeAll() {
    try {
        localStorage.setItem(LS_KEY, JSON.stringify(readAll()));
        return true;
    } catch (e) {
        console.error('Revisionen konnten nicht gespeichert werden:', e);
        return false;
    }
}

const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `rev_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
const now = () => new Date().toISOString();

export function listRevisionen() {
    return [...readAll()].sort((a, b) => (b.geaendert || '').localeCompare(a.geaendert || ''));
}

export function getRevision(id) {
    return readAll().find(r => r.id === id) || null;
}

export function createRevision(def) {
    const rev = {
        id: newId(),
        bogenId: def.meta.id,
        bogenVersion: def.meta.version,
        erstellt: now(),
        geaendert: now(),
        kopfdaten: { datum: now().slice(0, 10) },
        antworten: {},
        abschnitteEntfallen: {},
        feststellungen: {}
    };
    readAll().push(rev);
    writeAll();
    return rev;
}

export function duplicateRevision(id) {
    const src = getRevision(id);
    if (!src) return null;
    const copy = { ...structuredClone(src), id: newId(), erstellt: now(), geaendert: now() };
    readAll().push(copy);
    writeAll();
    return copy;
}

export function deleteRevisions(ids) {
    const drop = new Set(ids);
    const list = readAll();
    const rest = list.filter(r => !drop.has(r.id));
    if (rest.length === list.length) return false;
    list.splice(0, list.length, ...rest);
    if (drop.has(getActiveId())) setActiveId(null);
    return writeAll();
}

export const deleteRevision = id => deleteRevisions([id]);

/* --- Autosave (entprellt) --- */

let timer = null;
let onSaved = null;

export function setSaveListener(fn) { onSaved = fn; }

export function touch(rev) {
    rev.geaendert = now();
    clearTimeout(timer);
    timer = setTimeout(flush, 500);
}

export function flush() {
    clearTimeout(timer);
    timer = null;
    const ok = writeAll();
    onSaved?.(ok);
    return ok;
}

export const hasPendingSave = () => timer !== null;

/* --- zuletzt geöffnete Revision --- */

export function getActiveId() {
    try { return localStorage.getItem(LS_ACTIVE); } catch { return null; }
}

export function setActiveId(id) {
    try {
        if (id) localStorage.setItem(LS_ACTIVE, id);
        else localStorage.removeItem(LS_ACTIVE);
    } catch { /* ignorieren */ }
}
