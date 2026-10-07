/**
 * Revisionsbogen — Fortschritt je Abschnitt
 * Items vom Typ "keine" sind reine Eingabeblöcke und zählen nicht mit.
 */

export const zaehlt = item => item.antwort !== 'keine';

export function istBeantwortet(item, antworten) {
    const v = antworten[item.id];
    if (item.antwort === 'text') return typeof v === 'string' && v.trim() !== '';
    return v !== undefined && v !== null && v !== '';
}

export const abschnittEntfaellt = (abschnitt, rev) => !!(abschnitt.entfaellt && rev.abschnitteEntfallen[abschnitt.id]);

export function abschnittFortschritt(abschnitt, rev) {
    const items = abschnitt.items.filter(zaehlt);
    const done = items.filter(it => istBeantwortet(it, rev.antworten)).length;
    return { done, total: items.length, entfallen: abschnittEntfaellt(abschnitt, rev) };
}

/** Gesamtfortschritt ohne abgewählte Abschnitte. */
export function gesamtFortschritt(def, rev) {
    return def.abschnitte.reduce((acc, a) => {
        const p = abschnittFortschritt(a, rev);
        if (!p.entfallen) { acc.done += p.done; acc.total += p.total; }
        return acc;
    }, { done: 0, total: 0 });
}
