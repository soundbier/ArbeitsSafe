/**
 * Revisionsbogen — generischer Renderer
 * Erzeugt sämtliche Eingabemasken ausschließlich aus der Bogendefinition.
 * Jedes Eingabeelement trägt data-scope ("kopf" | "antwort") und data-key (ID).
 */

import { escapeHTML as esc } from '../ui.js';
import { icon } from '../icons.js';
import { pruefpunktId, bemerkungId } from './schema.js';
import { istBeantwortet, zaehlt } from './progress.js';

const GRUPPEN_LABEL = { arbeitsschutz: 'Arbeitsschutz', umweltschutz: 'Umweltschutz', rundgang: 'Rundgang' };
export const gruppeLabel = g => GRUPPEN_LABEL[g] || g;

export const ANTWORT_LABEL = {
    ja: 'Ja', nein: 'Nein', entfaellt: 'entfällt', gruen: 'grün', gelb: 'gelb', rot: 'rot'
};

const OPT = {
    ja: { val: 'ja', label: 'Ja', tone: 'ok' },
    nein: { val: 'nein', label: 'Nein', tone: 'bad' },
    entfaellt: { val: 'entfaellt', label: 'entfällt', tone: 'na' },
    gruen: { val: 'gruen', label: 'grün', tone: 'ok' },
    gelb: { val: 'gelb', label: 'gelb', tone: 'warn' },
    rot: { val: 'rot', label: 'rot', tone: 'bad' }
};

let uid = 0;
const nextUid = () => `bgf${++uid}`;

/** Segmentierte Auswahl (große Touch-Ziele). Erneutes Antippen hebt die Auswahl auf. */
function choiceGroup(scope, key, options, current, ariaLabel) {
    return `
    <div class="choice-group" role="group" aria-label="${esc(ariaLabel)}" data-cols="${options.length}">
        ${options.map(o => `
        <button type="button" class="choice" data-tone="${o.tone || ''}" data-scope="${scope}" data-key="${esc(key)}"
                data-val="${esc(o.val)}" aria-pressed="${current === o.val}">${esc(o.label)}</button>`).join('')}
    </div>`;
}

const textOpts = optionen => optionen.map(o => ({ val: o, label: o, tone: o === 'entfällt' ? 'na' : '' }));

/** Einzelnes Feld (Kopfdaten oder Zusatzfeld eines Items). */
export function feldTemplate(f, value, scope) {
    const id = nextUid();
    const label = `${esc(f.label || f.id)}${f.einheit ? ` <span class="bg-unit">(${esc(f.einheit)})</span>` : ''}`;
    const v = value ?? '';
    let control;

    switch (f.typ) {
        case 'jn':
            control = choiceGroup(scope, f.id, [OPT.ja, OPT.nein], v, f.label);
            break;
        case 'auswahl':
            control = f.optionen.length <= 4
                ? choiceGroup(scope, f.id, textOpts(f.optionen), v, f.label)
                : `<select class="select" id="${id}" data-scope="${scope}" data-key="${esc(f.id)}">
                       <option value="">– bitte wählen –</option>
                       ${f.optionen.map(o => `<option${o === v ? ' selected' : ''}>${esc(o)}</option>`).join('')}
                   </select>`;
            break;
        case 'mehrfach': {
            const sel = Array.isArray(value) ? value : [];
            control = `<div class="bg-checks">${f.optionen.map(o => `
                <label class="bg-check">
                    <input type="checkbox" data-scope="${scope}" data-key="${esc(f.id)}" data-multi="${esc(o)}"${sel.includes(o) ? ' checked' : ''}>
                    <span>${esc(o)}</span>
                </label>`).join('')}</div>`;
            break;
        }
        default: {
            const type = { datum: 'date', zeit: 'time', zahl: 'number' }[f.typ] || 'text';
            const extra = f.typ === 'zahl' ? ' inputmode="decimal" step="any"' : '';
            control = `<input class="input" id="${id}" type="${type}"${extra} data-scope="${scope}" data-key="${esc(f.id)}" value="${esc(v)}" autocomplete="off">`;
        }
    }

    const isGroup = ['jn', 'mehrfach'].includes(f.typ) || (f.typ === 'auswahl' && f.optionen.length <= 4);
    const labelTag = isGroup ? `<span class="field-label">${label}</span>` : `<label class="field-label" for="${id}">${label}</label>`;
    return `
    <div class="field bg-field" data-typ="${esc(f.typ)}">
        ${labelTag}
        ${control}
        ${f.hinweis ? `<p class="bg-hint">${esc(f.hinweis)}</p>` : ''}
        ${bogenHinweis(f)}
    </div>`;
}

/** Auffälligkeiten aus der Digitalisierung (_pruefhinweis, _anmerkung) unverändert als Hinweis. */
function bogenHinweis(obj) {
    return ['_pruefhinweis', '_anmerkung'].filter(k => obj[k]).map(k => `
        <p class="bg-note">${icon('info', 14)}<span><strong>Hinweis zum Bogen:</strong> ${esc(obj[k])}</span></p>`).join('');
}

function listDetails(title, entries, cls = '') {
    if (!entries?.length) return '';
    return `
    <details class="bg-details ${cls}">
        <summary>${esc(title)} <span class="chip">${entries.length}</span></summary>
        <ul>${entries.map(e => `<li>${esc(e)}</li>`).join('')}</ul>
    </details>`;
}

function referenzTemplate(def, key) {
    const list = def.referenzdaten?.[key];
    if (!list?.length) return '';
    const titel = key === 'pruefungen' ? 'Übersicht Prüfungen' : `Referenz: ${key}`;
    return `
    <details class="bg-details bg-ref">
        <summary>${esc(titel)} <span class="chip">${list.length}</span></summary>
        <div class="bg-ref-list">
            ${list.map(r => `
            <div class="bg-ref-row">
                <strong>${esc(r.objekt)}</strong>
                <dl>
                    ${r.intervall ? `<dt>Intervall</dt><dd>${esc(r.intervall)}</dd>` : ''}
                    ${r.rechtsgrundlage?.length ? `<dt>Rechtsgrundlage</dt><dd>${r.rechtsgrundlage.map(esc).join('; ')}</dd>` : ''}
                    ${r.pruefer ? `<dt>Prüfer</dt><dd>${esc(r.pruefer)}</dd>` : ''}
                    ${r.felder?.length ? `<dt>Angaben</dt><dd>${r.felder.map(esc).join(', ')}</dd>` : ''}
                    ${r.hinweis ? `<dt>Hinweis</dt><dd>${esc(r.hinweis)}</dd>` : ''}
                </dl>
            </div>`).join('')}
        </div>
    </details>`;
}

function antwortTemplate(item, antworten) {
    const v = antworten[item.id];
    const withNA = opts => (item.entfaelltMoeglich ? [...opts, OPT.entfaellt] : opts);
    switch (item.antwort) {
        case 'jn': return choiceGroup('antwort', item.id, withNA([OPT.ja, OPT.nein]), v, 'Antwort');
        case 'jne': return choiceGroup('antwort', item.id, [OPT.ja, OPT.nein, OPT.entfaellt], v, 'Antwort');
        case 'ampel': return choiceGroup('antwort', item.id, withNA([OPT.gruen, OPT.gelb, OPT.rot]), v, 'Bewertung');
        case 'auswahl': return choiceGroup('antwort', item.id, withNA(textOpts(item.optionen)), v, 'Antwort');
        case 'text': return `<textarea class="input bg-textarea" rows="3" data-scope="antwort" data-key="${esc(item.id)}"
                                aria-label="Antwort">${esc(v ?? '')}</textarea>`;
        default: return '';
    }
}

export const itemTitel = item => item.titel || item.frage || item.id;

export function itemTemplate(def, abschnitt, item, antworten) {
    const answered = zaehlt(item) && istBeantwortet(item, antworten);
    const heading = item.titel || item.frage;
    const sub = item.titel && item.frage ? item.frage : '';

    return `
    <article class="bg-item${answered ? ' is-answered' : ''}" id="item-${esc(item.id)}" data-item="${esc(item.id)}">
        <header class="bg-item-head">
            ${item.nr ? `<span class="chip chip--accent">${esc(item.nr)}</span>` : ''}
            <h3>${esc(heading)}</h3>
            <span class="bg-item-state" aria-hidden="true">${icon('check', 14)}</span>
        </header>
        ${sub ? `<p class="bg-frage">${esc(sub)}</p>` : ''}
        ${bogenHinweis(item)}

        ${antwortTemplate(item, antworten)}

        ${item.pruefpunkte?.length ? `
        <div class="bg-checks">
            ${item.pruefpunkte.map((p, i) => {
                const key = pruefpunktId(item.id, i);
                return `
                <label class="bg-check">
                    <input type="checkbox" data-scope="antwort" data-key="${esc(key)}"${antworten[key] ? ' checked' : ''}>
                    <span>${esc(p)}</span>
                </label>`;
            }).join('')}
        </div>` : ''}

        ${item.felder?.length ? `<div class="bg-fields">${item.felder.map(f => feldTemplate(f, antworten[f.id], 'antwort')).join('')}</div>` : ''}

        ${listDetails('Hinweise', item.hinweise)}
        ${listDetails('Rechtsgrundlagen', item.rechtsgrundlagen, 'bg-rg')}
        ${item.referenz ? referenzTemplate(def, item.referenz) : ''}

        <details class="bg-bemerkung"${antworten[bemerkungId(item.id)] ? ' open' : ''}>
            <summary>${icon('plus', 14)} Bemerkung / Stichprobe</summary>
            <textarea class="input bg-textarea" rows="2" id="${esc(bemerkungId(item.id))}" data-scope="antwort"
                      data-key="${esc(bemerkungId(item.id))}" aria-label="Bemerkung / Stichprobe">${esc(antworten[bemerkungId(item.id)] ?? '')}</textarea>
        </details>
    </article>`;
}

export function abschnittTemplate(def, abschnitt, rev, entfallen) {
    return `
    <section class="bg-section" data-abschnitt="${esc(abschnitt.id)}">
        <header class="bg-section-head">
            <div class="bg-section-tags">
                <span class="chip">${esc(gruppeLabel(abschnitt.gruppe))}</span>
                ${abschnitt.gdaRelevant ? '<span class="chip chip--accent">GDA-relevant</span>' : ''}
            </div>
            <h2>${esc(abschnitt.titel)}</h2>
            ${bogenHinweis(abschnitt)}
            ${abschnitt.gruppe === 'rundgang' ? '<p class="bg-hint">In diesem Abschnitt bedeutet Ja/Nein: im Betrieb vorhanden.</p>' : ''}
            ${abschnitt.entfaellt ? `
            <label class="switch-row">
                <span class="switch-text">
                    <span class="switch-title">Abschnitt entfällt</span>
                    <span class="switch-hint">Wird bei Fortschritt und Auswertung nicht berücksichtigt</span>
                </span>
                <span class="switch">
                    <input type="checkbox" data-entfaellt="${esc(abschnitt.id)}"${entfallen ? ' checked' : ''}>
                    <span class="track" aria-hidden="true"></span>
                </span>
            </label>` : ''}
        </header>
        ${entfallen
            ? '<p class="bg-empty">Dieser Abschnitt ist als „entfällt“ markiert.</p>'
            : abschnitt.items.map(it => itemTemplate(def, abschnitt, it, rev.antworten)).join('')}
    </section>`;
}

export function kopfdatenTemplate(def, rev) {
    const blocks = [];
    let current = null;
    for (const f of def.kopfdaten) {
        const g = f.gruppe || '';
        if (!current || current.gruppe !== g) { current = { gruppe: g, felder: [] }; blocks.push(current); }
        current.felder.push(f);
    }
    return `
    <section class="bg-section">
        <header class="bg-section-head">
            <h2>Kopfdaten</h2>
            <p class="bg-hint">Bitte nur die für die Revision erforderlichen Angaben erfassen. Alle Daten bleiben lokal auf diesem Gerät.</p>
        </header>
        ${blocks.map(b => `
        <div class="bg-item">
            ${b.gruppe ? `<header class="bg-item-head"><h3>${esc(b.gruppe)}</h3></header>` : ''}
            <div class="bg-fields">${b.felder.map(f => feldTemplate(f, rev.kopfdaten[f.id], 'kopf')).join('')}</div>
        </div>`).join('')}
    </section>`;
}
