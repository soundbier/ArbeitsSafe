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
 *   rechtsgrundlageText: string, // Wortlaut, vorbelegt aus zugeordneten Textbausteinen
 *   massnahme:       string,
 *   frist:           string      // ISO-Datum (YYYY-MM-DD) oder ''
 * }
 */

import { allItems, bemerkungId } from './schema.js';
import { abschnittEntfaellt } from './progress.js';
import { vorbelegen } from './bausteine.js';

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

/**
 * Legt eine Feststellung mit Vorbelegung an (falls noch nicht vorhanden).
 * Feststellung, Rechtsgrundlage (Wortlaut) und Maßnahme kommen aus den
 * zugeordneten Textbausteinen, sofern diese geladen sind.
 */
export function ensureFeststellung(rev, item) {
    if (!rev.feststellungen[item.id]) {
        rev.feststellungen[item.id] = {
            uebernehmen: false,
            sachverhalt: (rev.antworten[bemerkungId(item.id)] || '').trim(),
            feststellung: '',
            rechtsgrundlage: [...(item.rechtsgrundlagen || [])],
            rechtsgrundlageText: '',
            massnahme: '',
            frist: ''
        };
        vorbelegen(rev.feststellungen[item.id], item.id);
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
            rechtsgrundlageText: fs.rechtsgrundlageText || '',
            massnahme: fs.massnahme,
            frist: fs.frist
        });
    }
    return out;
}

/* =========================================================================
   ÜBERNAHME IN DEN ENTWURF (Revisionsschreiben)
   ========================================================================= */

const LS_ENTWURF = 'arbeitsSafe_revisionsSchreiben';

const fmtFrist = iso => new Date(`${iso}T00:00:00`).toLocaleDateString('de-DE');

/** Wandelt eine Feststellung in einen Punkt des bestehenden Entwurfs um. */
export function entwurfsPunkt(f) {
    return {
        id: `bogen_${f.revisionId}_${f.itemId}`,
        quelle: 'revisionsbogen',
        titel: f.titel,
        editedText: [
            f.sachverhalt && `Mangel: ${f.sachverhalt}`,
            f.feststellung,
            f.rechtsgrundlageText,
            f.rechtsgrundlage.length && `Rechtsgrundlage: ${f.rechtsgrundlage.join('; ')}`,
            f.massnahme && `Handlungsaufforderung: ${f.massnahme}`,
            f.frist && `Frist: ${fmtFrist(f.frist)}`
        ].filter(Boolean).join('\n\n')
    };
}

function entwurfLesen() {
    try {
        const liste = JSON.parse(localStorage.getItem(LS_ENTWURF) || '[]');
        return Array.isArray(liste) ? liste : [];
    } catch {
        return [];
    }
}

const stammtAus = (punkt, revisionIds) => revisionIds.some(id => String(punkt?.id).startsWith(`bogen_${id}_`));

/** Anzahl der Entwurfspunkte, die aus diesen Revisionen übernommen wurden. */
export const entwurfsPunkteZaehlen = revisionIds => entwurfLesen().filter(p => stammtAus(p, revisionIds)).length;

/**
 * Entfernt die aus diesen Revisionen übernommenen Punkte aus dem Entwurf
 * (Löschen einer Revision soll keine Kopien ihrer Daten zurücklassen).
 * @returns {number} Anzahl entfernter Punkte
 */
export function entwurfsPunkteEntfernen(revisionIds) {
    const liste = entwurfLesen();
    const rest = liste.filter(p => !stammtAus(p, revisionIds));
    if (rest.length !== liste.length) localStorage.setItem(LS_ENTWURF, JSON.stringify(rest));
    return liste.length - rest.length;
}

/**
 * Hängt die Feststellungen an den gespeicherten Entwurf an.
 * Bereits übernommene Punkte (gleiche ID) werden nicht doppelt eingefügt.
 * @returns {{ neu: number, vorhanden: number }}
 */
export function inEntwurfUebernehmen(feststellungen) {
    const liste = entwurfLesen();
    const ids = new Set(liste.map(p => p.id));
    let neu = 0;
    for (const f of feststellungen) {
        const punkt = entwurfsPunkt(f);
        if (ids.has(punkt.id)) continue;
        liste.push(punkt);
        neu++;
    }
    localStorage.setItem(LS_ENTWURF, JSON.stringify(liste));
    return { neu, vorhanden: feststellungen.length - neu };
}
