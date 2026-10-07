/**
 * Revisionsbogen — App-Logik (Ansichten, Ereignisse, Autosave)
 */

import { showToast, escapeHTML as esc } from '../ui.js';
import { icon, hydrateIcons } from '../icons.js';
import { loadBogen } from './schema.js';
import * as store from './store.js';
import { abschnittFortschritt, gesamtFortschritt, abschnittEntfaellt, istBeantwortet, zaehlt } from './progress.js';
import { abschnittTemplate, kopfdatenTemplate, gruppeLabel, ANTWORT_LABEL } from './render.js';
import { befunde, ensureFeststellung, getFeststellungen, GRUND_LABEL } from './auswertung.js';

const $ = id => document.getElementById(id);
const DOM = {
    saveState: $('bgSaveState'),
    views: document.querySelectorAll('.bg-view'),
    navItems: document.querySelectorAll('.bg-nav-item'),
    revList: $('bgRevList'),
    newBtn: $('bgNewBtn'),
    sectionBar: $('bgSectionBar'),
    form: $('bgForm'),
    formScroll: $('bgFormScroll'),
    prevBtn: $('bgPrevBtn'),
    nextBtn: $('bgNextBtn'),
    pagerLabel: $('bgPagerLabel'),
    errorBanner: $('bgErrorBanner'),
    auswertung: $('bgAuswertung'),
    auswertungMeta: $('bgAuswertungMeta'),
    rundgangToggle: $('bgRundgangNein')
};

const ui = {
    def: null,
    rev: null,
    page: 'kopf',         // 'kopf' oder Abschnitts-ID
    rundgangNein: false   // Auswertung: „Nein“ im Rundgang (= nicht vorhanden) einbeziehen
};

/* =========================================================================
   DARSTELLUNG (Einstellungen der Haupt-App übernehmen)
   ========================================================================= */

function applyAppearance() {
    const pref = localStorage.getItem('arbeitsSafe_theme') || 'system';
    const dark = pref === 'dark' || (pref === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    document.documentElement.dataset.fontsize = localStorage.getItem('arbeitsSafe_fontsize') || 'normal';
}

const confirmDelete = () => localStorage.getItem('arbeitsSafe_confirmdelete') !== 'false';

/* =========================================================================
   ROUTING
   ========================================================================= */

const VIEWS = ['#revisionen', '#erfassen', '#auswertung'];

function navigate(hash) {
    let route = VIEWS.includes(hash) ? hash : '#revisionen';
    if (route !== '#revisionen' && !ui.rev) route = '#revisionen';

    DOM.views.forEach(v => v.classList.toggle('is-active', v.dataset.route === route));
    DOM.navItems.forEach(n => {
        n.classList.toggle('is-active', n.dataset.route === route);
        n.classList.toggle('is-disabled', n.dataset.route !== '#revisionen' && !ui.rev);
    });

    if (route === '#revisionen') renderRevList();
    if (route === '#erfassen') renderForm();
    if (route === '#auswertung') renderAuswertung();
    if (location.hash !== route) history.replaceState(null, '', route);
}

/* =========================================================================
   REVISIONEN (Liste)
   ========================================================================= */

const fmtDate = iso => (iso ? new Date(iso).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' }) : '');
const fmtDay = d => (d ? new Date(`${d}T00:00:00`).toLocaleDateString('de-DE') : '');
export const revTitel = rev => rev.kopfdaten.firma?.trim() || 'Ohne Firmenangabe';

function renderRevList() {
    const list = store.listRevisionen();
    if (!list.length) {
        DOM.revList.innerHTML = `
            <div class="state-box">
                <div class="state-icon">${icon('inbox', 26)}</div>
                <p class="state-title">Noch keine Revision angelegt</p>
                <p class="state-text">Legen Sie eine neue Revision an, um den Bogen während der Begehung auszufüllen.</p>
            </div>`;
        return;
    }
    DOM.revList.innerHTML = list.map(rev => {
        const p = ui.def ? gesamtFortschritt(ui.def, rev) : { done: 0, total: 0 };
        const pct = p.total ? Math.round((p.done / p.total) * 100) : 0;
        const fremd = ui.def && rev.bogenVersion !== ui.def.meta.version;
        return `
        <article class="bg-rev${ui.rev?.id === rev.id ? ' is-current' : ''}">
            <button type="button" class="bg-rev-main js-rev-open" data-id="${esc(rev.id)}">
                <span class="bg-rev-title">${esc(revTitel(rev))}</span>
                <span class="bg-rev-meta">
                    ${rev.kopfdaten.datum ? `Revision am ${esc(fmtDay(rev.kopfdaten.datum))} · ` : ''}geändert ${esc(fmtDate(rev.geaendert))}
                    ${fremd ? ` · Bogenversion ${esc(rev.bogenVersion)}` : ''}
                </span>
                <span class="bg-progress" role="progressbar" aria-valuemin="0" aria-valuemax="${p.total}" aria-valuenow="${p.done}"
                      aria-label="Fortschritt"><span style="width:${pct}%"></span></span>
                <span class="bg-rev-meta">${p.done} von ${p.total} Fragen beantwortet</span>
            </button>
            <div class="bg-rev-actions">
                <button type="button" class="btn btn--ghost btn--sm js-rev-dup" data-id="${esc(rev.id)}">${icon('clipboard', 15)} Duplizieren</button>
                <button type="button" class="btn btn--danger btn--sm js-rev-del" data-id="${esc(rev.id)}">${icon('trash', 15)} Löschen</button>
            </div>
        </article>`;
    }).join('');
}

function openRevision(id, route = '#erfassen') {
    const rev = store.getRevision(id);
    if (!rev) { showToast('Revision nicht gefunden', 'error'); return; }
    ui.rev = rev;
    ui.page = 'kopf';
    store.setActiveId(id);
    location.hash = route;
    navigate(route);
}

/* =========================================================================
   ERFASSEN
   ========================================================================= */

const pages = () => ['kopf', ...ui.def.abschnitte.map(a => a.id)];
const abschnittById = id => ui.def.abschnitte.find(a => a.id === id);

function sectionChip(id) {
    if (id === 'kopf') {
        return `<button type="button" class="bg-chip js-page" data-page="kopf" aria-current="${ui.page === 'kopf'}">
                    <span class="bg-chip-title">Kopfdaten</span></button>`;
    }
    const a = abschnittById(id);
    const p = abschnittFortschritt(a, ui.rev);
    const complete = !p.entfallen && p.total > 0 && p.done === p.total;
    return `
    <button type="button" class="bg-chip js-page${p.entfallen ? ' is-entfallen' : ''}${complete ? ' is-complete' : ''}"
            data-page="${esc(id)}" aria-current="${ui.page === id}" title="${esc(a.titel)}">
        <span class="bg-chip-title">${esc(a.titel)}</span>
        <span class="bg-chip-count">${p.entfallen ? 'entfällt' : `${p.done}/${p.total}`}</span>
    </button>`;
}

function renderSectionBar() {
    DOM.sectionBar.innerHTML = pages().map(sectionChip).join('');
    const cur = DOM.sectionBar.querySelector('[aria-current="true"]');
    if (cur) DOM.sectionBar.scrollLeft = cur.offsetLeft - (DOM.sectionBar.clientWidth - cur.offsetWidth) / 2;
}

function updateSectionChip(id) {
    const el = DOM.sectionBar.querySelector(`[data-page="${CSS.escape(id)}"]`);
    if (!el) return;
    const tmp = document.createElement('div');
    tmp.innerHTML = sectionChip(id);
    el.replaceWith(tmp.firstElementChild);
}

function renderForm() {
    if (!ui.def || !ui.rev) return;
    const list = pages();
    if (!list.includes(ui.page)) ui.page = 'kopf';
    renderSectionBar();

    if (ui.page === 'kopf') {
        DOM.form.innerHTML = kopfdatenTemplate(ui.def, ui.rev);
    } else {
        const a = abschnittById(ui.page);
        DOM.form.innerHTML = abschnittTemplate(ui.def, a, ui.rev, abschnittEntfaellt(a, ui.rev));
    }

    const idx = list.indexOf(ui.page);
    DOM.prevBtn.disabled = idx === 0;
    DOM.nextBtn.disabled = idx === list.length - 1;
    DOM.pagerLabel.textContent = `${idx + 1} / ${list.length}`;
    DOM.formScroll.scrollTop = 0;
}

function goToPage(page) {
    ui.page = page;
    renderForm();
}

function stepPage(dir) {
    const list = pages();
    const next = list[list.indexOf(ui.page) + dir];
    if (next) goToPage(next);
}

/* --- Werte schreiben --- */

function setValue(scope, key, value) {
    const target = scope === 'kopf' ? ui.rev.kopfdaten : ui.rev.antworten;
    const empty = value === undefined || value === null || value === '' || value === false || (Array.isArray(value) && !value.length);
    if (empty) delete target[key];
    else target[key] = value;
    afterChange();
}

function afterChange() {
    store.touch(ui.rev);
    setSaveState('pending');
    if (ui.page !== 'kopf') {
        updateSectionChip(ui.page);
        refreshItemStates();
    }
}

function refreshItemStates() {
    const a = abschnittById(ui.page);
    if (!a) return;
    a.items.forEach(it => {
        const el = document.getElementById(`item-${it.id}`);
        el?.classList.toggle('is-answered', zaehlt(it) && istBeantwortet(it, ui.rev.antworten));
    });
}

function onChoice(btn) {
    const { scope, key, val } = btn.dataset;
    const target = scope === 'kopf' ? ui.rev.kopfdaten : ui.rev.antworten;
    const next = target[key] === val ? '' : val;
    btn.parentElement.querySelectorAll('.choice').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.val === next)));
    setValue(scope, key, next);
}

function onInput(el) {
    const { scope, key } = el.dataset;
    if (!scope || !key) return;
    if (el.type === 'checkbox') {
        if (el.dataset.multi !== undefined) {
            const target = scope === 'kopf' ? ui.rev.kopfdaten : ui.rev.antworten;
            const set = new Set(Array.isArray(target[key]) ? target[key] : []);
            el.checked ? set.add(el.dataset.multi) : set.delete(el.dataset.multi);
            setValue(scope, key, [...set]);
        } else {
            setValue(scope, key, el.checked);
        }
        return;
    }
    setValue(scope, key, el.type === 'number' && el.value !== '' ? Number(el.value) : el.value);
}

function onEntfaellt(input) {
    const id = input.dataset.entfaellt;
    if (input.checked) ui.rev.abschnitteEntfallen[id] = true;
    else delete ui.rev.abschnitteEntfallen[id];
    afterChange();
    renderForm();
}

/* =========================================================================
   AUSWERTUNG
   ========================================================================= */

function feststellungEditor(item, fs) {
    const id = esc(item.id);
    const area = (key, label, value, rows = 3, hint = '') => `
        <div class="field bg-field">
            <label class="field-label" for="fs-${id}-${key}">${label}</label>
            <textarea class="input bg-textarea" id="fs-${id}-${key}" rows="${rows}" data-fs-item="${id}" data-fs-key="${key}">${esc(value)}</textarea>
            ${hint ? `<p class="bg-hint">${hint}</p>` : ''}
        </div>`;
    return `
    <div class="bg-fs-editor">
        ${area('sachverhalt', 'Sachverhalt', fs.sachverhalt)}
        ${area('feststellung', 'Feststellung', fs.feststellung)}
        ${area('rechtsgrundlage', 'Rechtsgrundlage', fs.rechtsgrundlage.join('\n'), 2, 'Eine Rechtsgrundlage je Zeile.')}
        ${area('massnahme', 'Maßnahme', fs.massnahme)}
        <div class="field bg-field">
            <label class="field-label" for="fs-${id}-frist">Frist</label>
            <input class="input" type="date" id="fs-${id}-frist" data-fs-item="${id}" data-fs-key="frist" value="${esc(fs.frist)}">
        </div>
    </div>`;
}

function befundTemplate(b) {
    const fs = ui.rev.feststellungen[b.item.id];
    const checked = !!fs?.uebernehmen;
    const rundgang = b.abschnitt.gruppe === 'rundgang' && b.gruende.includes('nein');
    return `
    <article class="bg-item bg-befund${checked ? ' is-selected' : ''}" data-befund="${esc(b.item.id)}">
        <header class="bg-item-head">
            ${b.item.nr ? `<span class="chip chip--accent">${esc(b.item.nr)}</span>` : ''}
            <h3>${esc(b.item.titel || b.item.frage)}</h3>
        </header>
        <p class="bg-hint">${esc(gruppeLabel(b.abschnitt.gruppe))} · ${esc(b.abschnitt.titel)}</p>
        <div class="bg-section-tags">
            ${b.gruende.map(g => `<span class="chip bg-grund" data-grund="${g}">${esc(GRUND_LABEL[g])}</span>`).join('')}
            ${b.antwort && !b.gruende.includes(b.antwort) ? `<span class="chip">Antwort: ${esc(ANTWORT_LABEL[b.antwort] || b.antwort)}</span>` : ''}
            ${rundgang ? '<span class="chip">Rundgang: nicht vorhanden</span>' : ''}
        </div>
        ${b.bemerkung ? `<blockquote class="bg-quote">${esc(b.bemerkung)}</blockquote>` : ''}
        <label class="bg-check bg-take">
            <input type="checkbox" data-take="${esc(b.item.id)}"${checked ? ' checked' : ''}>
            <span>Feststellung übernehmen</span>
        </label>
        ${checked ? feststellungEditor(b.item, fs) : ''}
        <button type="button" class="link-btn js-goto-item" data-abschnitt="${esc(b.abschnitt.id)}" data-item="${esc(b.item.id)}">Zur Frage im Bogen</button>
    </article>`;
}

function renderAuswertung() {
    if (!ui.def || !ui.rev) return;
    DOM.rundgangToggle.checked = ui.rundgangNein;
    const list = befunde(ui.def, ui.rev, { rundgangNein: ui.rundgangNein });
    updateAuswertungMeta(list.length);
    DOM.auswertung.innerHTML = list.length
        ? list.map(befundTemplate).join('')
        : `<div class="state-box">
               <div class="state-icon">${icon('check', 26)}</div>
               <p class="state-title">Keine Auffälligkeiten</p>
               <p class="state-text">Es gibt keine Antworten „Nein“, keine Ampel gelb/rot und keine Bemerkungen.</p>
           </div>`;
}

function updateAuswertungMeta(count) {
    const n = getFeststellungen(ui.def, ui.rev).length;
    DOM.auswertungMeta.innerHTML = `
        <span class="chip">${count} auffällige Punkte</span>
        <span class="chip${n ? ' chip--accent' : ''}">${n} Feststellung${n === 1 ? '' : 'en'} übernommen</span>`;
}

function onTake(input) {
    const item = ui.def.abschnitte.flatMap(a => a.items).find(i => i.id === input.dataset.take);
    if (!item) return;
    ensureFeststellung(ui.rev, item).uebernehmen = input.checked;
    afterChange();
    const card = input.closest('.bg-befund');
    const scroller = card.closest('.scroll-area');
    const top = scroller.scrollTop;
    renderAuswertung();
    scroller.scrollTop = top;
}

function onFeststellungInput(el) {
    const fs = ui.rev.feststellungen[el.dataset.fsItem];
    if (!fs) return;
    const key = el.dataset.fsKey;
    fs[key] = key === 'rechtsgrundlage' ? el.value.split('\n').map(s => s.trim()).filter(Boolean) : el.value;
    afterChange();
}

function gotoItem(abschnittId, itemId) {
    ui.page = abschnittId;
    location.hash = '#erfassen';
    navigate('#erfassen');
    requestAnimationFrame(() => document.getElementById(`item-${itemId}`)?.scrollIntoView({ block: 'start' }));
}

/* --- Speicheranzeige --- */

function setSaveState(s) {
    if (!DOM.saveState) return;
    DOM.saveState.dataset.state = s;
    DOM.saveState.textContent = { pending: 'Speichert …', ok: 'Gespeichert', error: 'Speichern fehlgeschlagen' }[s] || '';
}

/* =========================================================================
   EREIGNISSE
   ========================================================================= */

function wireEvents() {
    document.addEventListener('click', e => {
        const t = e.target;

        const nav = t.closest('.bg-nav-item');
        if (nav) {
            e.preventDefault();
            if (nav.classList.contains('is-disabled')) { showToast('Bitte zuerst eine Revision öffnen'); return; }
            location.hash = nav.dataset.route;
            return;
        }

        const choice = t.closest('.choice');
        if (choice) { onChoice(choice); return; }

        const goto = t.closest('.js-goto-item');
        if (goto) { gotoItem(goto.dataset.abschnitt, goto.dataset.item); return; }

        const page = t.closest('.js-page');
        if (page) { goToPage(page.dataset.page); return; }

        const open = t.closest('.js-rev-open');
        if (open) { openRevision(open.dataset.id); return; }

        const dup = t.closest('.js-rev-dup');
        if (dup) {
            store.flush();
            const copy = store.duplicateRevision(dup.dataset.id);
            if (copy) { showToast('Revision dupliziert', 'success'); renderRevList(); }
            return;
        }

        const del = t.closest('.js-rev-del');
        if (del) {
            const rev = store.getRevision(del.dataset.id);
            if (!rev) return;
            if (confirmDelete() && !confirm(`Revision „${revTitel(rev)}“ unwiderruflich löschen?`)) return;
            store.deleteRevision(rev.id);
            if (ui.rev?.id === rev.id) ui.rev = null;
            showToast('Revision gelöscht');
            navigate('#revisionen');
        }
    });

    DOM.form.addEventListener('input', e => {
        if (e.target.dataset.entfaellt) return;
        onInput(e.target);
    });
    DOM.form.addEventListener('change', e => {
        if (e.target.dataset.entfaellt) onEntfaellt(e.target);
    });

    DOM.auswertung.addEventListener('input', e => {
        if (e.target.dataset.fsItem) onFeststellungInput(e.target);
    });
    DOM.auswertung.addEventListener('change', e => {
        if (e.target.dataset.take) onTake(e.target);
    });
    DOM.rundgangToggle.addEventListener('change', e => {
        ui.rundgangNein = e.target.checked;
        renderAuswertung();
    });

    DOM.newBtn.addEventListener('click', () => {
        if (!ui.def) { showToast('Bogen nicht geladen', 'error'); return; }
        const rev = store.createRevision(ui.def);
        openRevision(rev.id);
    });

    DOM.prevBtn.addEventListener('click', () => stepPage(-1));
    DOM.nextBtn.addEventListener('click', () => stepPage(1));

    window.addEventListener('hashchange', () => navigate(location.hash));

    // Sicherstellen, dass beim Verlassen nichts verloren geht.
    const flushIfPending = () => { if (store.hasPendingSave()) store.flush(); };
    window.addEventListener('pagehide', flushIfPending);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushIfPending(); });

    store.setSaveListener(ok => setSaveState(ok ? 'ok' : 'error'));
}

/* =========================================================================
   START
   ========================================================================= */

async function boot() {
    // Nutzungshinweise müssen in der Haupt-App bestätigt sein.
    if (!localStorage.getItem('arbeitsSafe_legal_accepted')) { location.replace('index.html'); return; }

    applyAppearance();
    hydrateIcons();
    wireEvents();

    try {
        const { def, errors } = await loadBogen();
        ui.def = def;
        if (errors.length) {
            DOM.errorBanner.hidden = false;
            DOM.errorBanner.textContent = `Die Bogendefinition enthält ${errors.length} Fehler (Details in der Browser-Konsole).`;
        }
    } catch (e) {
        console.error(e);
        DOM.errorBanner.hidden = false;
        DOM.errorBanner.textContent = 'Der Revisionsbogen konnte nicht geladen werden.';
        DOM.newBtn.disabled = true;
    }

    const active = store.getActiveId();
    if (active && ui.def) ui.rev = store.getRevision(active);
    navigate(location.hash);
}

boot();
