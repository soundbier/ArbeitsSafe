/**
 * Revisionsbogen — Auswertung (Phase 2)
 *
 * Ermittelt auffällige Items und verwaltet die daraus übernommenen Feststellungen.
 * Schnittstelle zur Revisionsschreiben-Funktion: getFeststellungen().
 *
 * Feststellung (gespeichert in revision.feststellungen[itemId]) = {
 *   uebernehmen:     boolean,
 *   sachverhalt:     string,     // vorbelegt aus der Bemerkung
 *   feststellung:    string,
 *   rechtsgrundlage: string[],   // vorbelegt aus item.rechtsgrundlagen
 *   massnahme:       string,
 *   frist:           string      // ISO-Datum (YYYY-MM-DD) oder ''
 * }
 */

import { allItems, bemerkungId } from './schema.js';
import { abschnittEntfaellt } from './progress.js';

export const GRUND_LABEL = { nein: 'Nein', gelb: 'Ampel gelb', rot: 'Ampel rot', bemerkung: 'Bemerkung' };

/**
 * Auffällige Items: Antwort „Nein“, Ampel gelb/rot oder vorhandene Bemerkung.
 * In der Gruppe „rundgang“ bedeutet „Nein“ = nicht vorhanden; diese Fälle sind
 * nur enthalten, wenn opts.rundgangNein gesetzt ist.
 */
export function befunde(def, rev, opts = {}) {
    const out = [];
    for (const { abschnitt, item } of allItems(def)) {
        if (abschnittEntfaellt(abschnitt, rev)) continue;
        const antwort = rev.antworten[item.id];
        const bemerkung = (rev.antworten[bemerkungId(item.id)] || '').trim();
        const gruende = [];

        if (antwort === 'nein' && ['jn', 'jne'].includes(item.antwort)
            && (abschnitt.gruppe !== 'rundgang' || opts.rundgangNein)) gruende.push('nein');
        if (item.antwort === 'ampel' && (antwort === 'gelb' || antwort === 'rot')) gruende.push(antwort);
        if (bemerkung) gruende.push('bemerkung');

        if (gruende.length) out.push({ abschnitt, item, antwort, bemerkung, gruende });
    }
    return out;
}

/** Legt eine Feststellung mit Vorbelegung an (falls noch nicht vorhanden). */
export function ensureFeststellung(rev, item) {
    if (!rev.feststellungen[item.id]) {
        rev.feststellungen[item.id] = {
            uebernehmen: false,
            sachverhalt: (rev.antworten[bemerkungId(item.id)] || '').trim(),
            feststellung: '',
            rechtsgrundlage: [...(item.rechtsgrundlagen || [])],
            massnahme: '',
            frist: ''
        };
    }
    return rev.feststellungen[item.id];
}

/**
 * Schnittstelle zum Revisionsschreiben-Generator:
 * alle zur Übernahme markierten Feststellungen in Bogenreihenfolge.
 * Abgewählte Abschnitte werden ausgeschlossen.
 */
export function getFeststellungen(def, rev) {
    const out = [];
    for (const { abschnitt, item } of allItems(def)) {
        const fs = rev.feststellungen[item.id];
        if (!fs?.uebernehmen || abschnittEntfaellt(abschnitt, rev)) continue;
        out.push({
            revisionId: rev.id,
            itemId: item.id,
            nr: item.nr || '',
            titel: item.titel || item.frage || item.id,
            abschnitt: abschnitt.titel,
            gruppe: abschnitt.gruppe,
            antwort: rev.antworten[item.id] ?? null,
            bemerkung: (rev.antworten[bemerkungId(item.id)] || '').trim(),
            sachverhalt: fs.sachverhalt,
            feststellung: fs.feststellung,
            rechtsgrundlage: [...fs.rechtsgrundlage],
            massnahme: fs.massnahme,
            frist: fs.frist
        });
    }
    return out;
}
