/**
 * Revisionsbogen — Laden & Validieren der Bogendefinition
 * Rein funktional (kein DOM), damit die Prüfung auch im Build-Check läuft.
 */

export const BOGEN_URL = 'src/data/revisionsbogen.json';

export const FELD_TYPEN = ['text', 'datum', 'zeit', 'zahl', 'jn', 'auswahl', 'mehrfach'];
export const ANTWORT_TYPEN = ['jn', 'jne', 'ampel', 'auswahl', 'text', 'keine'];
export const GRUPPEN = ['arbeitsschutz', 'umweltschutz', 'rundgang'];

/** Stabile ID eines Prüfpunkts (1-basiert, siehe meta.hinweise_schema). */
export const pruefpunktId = (itemId, index) => `${itemId}_p${index + 1}`;
export const bemerkungId = itemId => `${itemId}_bemerkung`;

const isStrArray = v => Array.isArray(v) && v.every(s => typeof s === 'string');

/**
 * Prüft die Bogendefinition.
 * @returns {{ errors: string[], warnings: string[] }}
 */
export function validateBogen(def) {
    const errors = [];
    const warnings = [];

    if (!def || typeof def !== 'object') return { errors: ['Bogendefinition fehlt oder ist kein Objekt.'], warnings };
    if (!def.meta?.id) errors.push('meta.id fehlt.');
    if (!Array.isArray(def.kopfdaten)) errors.push('kopfdaten ist kein Array.');
    if (!Array.isArray(def.abschnitte)) errors.push('abschnitte ist kein Array.');
    if (errors.length) return { errors, warnings };

    // Alle Schlüssel teilen sich einen Namensraum (Antworten werden per ID gespeichert).
    const seen = new Map();
    const claim = (id, where) => {
        if (typeof id !== 'string' || !id) { errors.push(`${where}: ID fehlt.`); return; }
        if (seen.has(id)) errors.push(`Doppelte ID "${id}" (${where}, bereits in ${seen.get(id)}).`);
        else seen.set(id, where);
    };

    const checkFeld = (f, where) => {
        claim(f.id, where);
        if (!FELD_TYPEN.includes(f.typ)) errors.push(`${where}: ungültiger Feldtyp "${f.typ}".`);
        if ((f.typ === 'auswahl' || f.typ === 'mehrfach') && !(isStrArray(f.optionen) && f.optionen.length)) {
            errors.push(`${where}: Typ "${f.typ}" benötigt nicht-leere "optionen".`);
        }
        if (!f.label) warnings.push(`${where}: label fehlt.`);
    };

    def.kopfdaten.forEach((f, i) => checkFeld(f, `kopfdaten[${i}] "${f.id}"`));

    const referenzdaten = def.referenzdaten || {};
    Object.entries(referenzdaten).forEach(([key, list]) => {
        if (!Array.isArray(list)) { errors.push(`referenzdaten.${key} ist kein Array.`); return; }
        list.forEach((r, i) => claim(r.id, `referenzdaten.${key}[${i}]`));
    });

    def.abschnitte.forEach((a, ai) => {
        const aw = `abschnitte[${ai}] "${a.id}"`;
        claim(a.id, aw);
        if (!GRUPPEN.includes(a.gruppe)) errors.push(`${aw}: ungültige Gruppe "${a.gruppe}".`);
        if (typeof a.entfaellt !== 'boolean') warnings.push(`${aw}: "entfaellt" ist nicht boolesch.`);
        if (!Array.isArray(a.items)) { errors.push(`${aw}: items ist kein Array.`); return; }

        a.items.forEach((it, ii) => {
            const iw = `${a.id}.items[${ii}] "${it.id}"`;
            claim(it.id, iw);
            if (it.id) claim(bemerkungId(it.id), `${iw} (Bemerkung)`);
            if (!ANTWORT_TYPEN.includes(it.antwort)) errors.push(`${iw}: ungültiger Antworttyp "${it.antwort}".`);
            if (it.antwort === 'auswahl' && !(isStrArray(it.optionen) && it.optionen.length)) {
                errors.push(`${iw}: Antworttyp "auswahl" benötigt nicht-leere "optionen".`);
            }
            if (!it.frage && !it.titel) warnings.push(`${iw}: weder "frage" noch "titel" vorhanden.`);
            ['hinweise', 'rechtsgrundlagen', 'pruefpunkte'].forEach(k => {
                if (it[k] !== undefined && !isStrArray(it[k])) errors.push(`${iw}: "${k}" muss ein Array von Strings sein.`);
            });
            (it.pruefpunkte || []).forEach((_, pi) => claim(pruefpunktId(it.id, pi), `${iw} Prüfpunkt ${pi + 1}`));
            if (it.felder !== undefined && !Array.isArray(it.felder)) errors.push(`${iw}: "felder" ist kein Array.`);
            (it.felder || []).forEach((f, fi) => checkFeld(f, `${iw} felder[${fi}] "${f.id}"`));
            if (it.referenz !== undefined && !Array.isArray(referenzdaten[it.referenz])) {
                errors.push(`${iw}: referenz "${it.referenz}" nicht in referenzdaten auflösbar.`);
            }
        });
    });

    return { errors, warnings };
}

/** Lädt die Bogendefinition (offline über den Service Worker vorgehalten) und validiert sie. */
export async function loadBogen(url = BOGEN_URL) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Revisionsbogen konnte nicht geladen werden (HTTP ${res.status}).`);
    const def = await res.json();
    const result = validateBogen(def);
    result.errors.forEach(e => console.error('[Revisionsbogen]', e));
    result.warnings.forEach(w => console.warn('[Revisionsbogen]', w));
    return { def, ...result };
}

/** Flache Liste aller Items mit Abschnittsbezug. */
export function allItems(def) {
    return def.abschnitte.flatMap(a => a.items.map(item => ({ abschnitt: a, item })));
}
