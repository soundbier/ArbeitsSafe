/**
 * Revisionsbogen — manuelle Zuordnung von Textbausteinen (gesetze.csv) zu Fragen
 *
 * Gespeichert in localStorage als { [itemId]: bausteinKey[] }.
 * Der Schlüssel ist inhaltlich (Gesetz|Paragraf|Absatz|Titel), damit die
 * Zuordnung auch nach Änderungen an der Reihenfolge der CSV bestehen bleibt.
 */

import { parseCSV } from '../data.js';

const LS_KEY = 'arbeitsSafe_bogen_bausteine';

export const bausteinKey = e => [e.gesetzKuerzel, e.paragraf, e.absatz, e.titel].join('|');
const hatBaustein = e => !!(e.mangelVorgefunden || e.rechtsgrundlage || e.handlungsaufforderung);

let bausteine = null;

/** Lädt alle Einträge der Standard-Datenbank, die einen Textbaustein besitzen. */
export async function loadBausteine() {
    if (bausteine) return bausteine;
    const res = await fetch('gesetze.csv');
    if (!res.ok) throw new Error(`gesetze.csv konnte nicht geladen werden (HTTP ${res.status}).`);
    bausteine = parseCSV(await res.text()).filter(hatBaustein).map(e => ({ ...e, key: bausteinKey(e) }));
    return bausteine;
}

export const findBaustein = key => bausteine?.find(b => b.key === key) || null;

export function getZuordnung() {
    try {
        const parsed = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        return {};
    }
}

function saveZuordnung(map) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(map)); } catch (e) { console.error('Zuordnung nicht gespeichert:', e); }
}

export const zugeordnet = itemId => getZuordnung()[itemId] || [];

export function zuordnen(itemId, key) {
    const map = getZuordnung();
    const list = map[itemId] || [];
    if (!list.includes(key)) map[itemId] = [...list, key];
    saveZuordnung(map);
}

export function entfernen(itemId, key) {
    const map = getZuordnung();
    map[itemId] = (map[itemId] || []).filter(k => k !== key);
    if (!map[itemId].length) delete map[itemId];
    saveZuordnung(map);
}

/**
 * Vorbelegung einer Feststellung aus den zugeordneten Bausteinen.
 * Nur leere Felder werden gefüllt; Zuordnungen auf nicht mehr vorhandene Bausteine werden ignoriert.
 */
export function vorbelegen(fs, itemId) {
    const list = zugeordnet(itemId).map(findBaustein).filter(Boolean);
    if (!list.length) return false;
    const join = k => list.map(b => b[k]).filter(Boolean).join('\n\n');
    if (!fs.feststellung) fs.feststellung = join('mangelVorgefunden');
    if (!fs.rechtsgrundlageText) fs.rechtsgrundlageText = join('rechtsgrundlage');
    if (!fs.massnahme) fs.massnahme = join('handlungsaufforderung');
    return true;
}
