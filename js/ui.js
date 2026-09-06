import { state } from './data.js';
import { icon, hydrateIcons } from './icons.js';

/* =========================================================================
   DOM-REFERENZEN
   ========================================================================= */

const $ = id => document.getElementById(id);

export const DOM = {
    root: document.documentElement,

    // Header
    statusBtn: $('statusBtn'),
    statusDot: $('statusDot'),
    uploadBtn: $('uploadBtn'),
    csvFileInput: $('csvFileInput'),
    themeBtn: $('themeBtn'),
    themeIcon: $('themeIcon'),
    draftToggle: $('draftToggle'),
    settingsBtn: $('settingsBtn'),

    // Filter-Panel
    filterPanel: $('filterPanel'),
    filterTrigger: $('filterTrigger'),
    filterCloseBtn: $('filterCloseBtn'),
    applyFilterBtn: $('applyFilterBtn'),
    applyFilterLabel: $('applyFilterLabel'),
    resetFilterBtn: $('resetFilterBtn'),
    lawFilter: $('lawFilter'),
    paragraphFilter: $('paragraphFilter'),
    absatzFilter: $('absatzFilter'),
    hasBausteinFilter: $('hasBausteinFilter'),

    // Suche & Ergebnisse
    searchField: $('searchField'),
    searchInput: $('searchInput'),
    searchClearBtn: $('searchClearBtn'),
    resultsScroll: $('resultsScroll'),
    resultsList: $('resultsList'),
    resultsMeta: $('resultsMeta'),
    resultsMetaTags: $('resultsMetaTags'),
    metaResetBtn: $('metaResetBtn'),

    // Entwurf
    screenDocument: $('screen-document'),
    draftList: $('draftList'),
    draftCounter: $('draftCounter'),
    draftCloseBtn: $('draftCloseBtn'),
    copyDraftBtn: $('copyDraftBtn'),
    downloadDraftBtn: $('downloadDraftBtn'),
    clearDraftBtn: $('clearDraftBtn'),

    // Zähler
    draftCountHeader: $('draftCountHeader'),
    draftCountNav: $('draftCountNav'),
    filterCountBadge: $('filterCountBadge'),
    filterCountNav: $('filterCountNav'),

    // Overlays
    settingsModal: $('settingsModal'),
    legalModal: $('legalModal'),
    compactModeToggle: $('compactModeToggle'),
    dataSourceLabel: $('dataSourceLabel'),
    dataCountLabel: $('dataCountLabel'),
    toastStack: $('toastStack'),
    updateBanner: $('updateBanner')
};

const DESKTOP_QUERY = window.matchMedia('(min-width: 1024px)');
const SPLIT_QUERY = window.matchMedia('(min-width: 1280px)');

export const isDesktop = () => DESKTOP_QUERY.matches;
export const isSplitView = () => SPLIT_QUERY.matches;

/* =========================================================================
   HELFER
   ========================================================================= */

export function escapeHTML(text) {
    if (text === null || text === undefined) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

const escapeRegExp = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function highlight(text, regex) {
    const safe = escapeHTML(text);
    if (!regex) return safe;
    regex.lastIndex = 0;
    return safe.replace(regex, m => `<mark class="hl">${m}</mark>`);
}

function setCount(el, value) {
    if (!el) return;
    el.textContent = value;
    el.dataset.count = String(value);
}

/* =========================================================================
   TOASTS
   ========================================================================= */

export function showToast(message, type = 'default') {
    if (!DOM.toastStack) return;
    const el = document.createElement('div');
    el.className = `toast${type !== 'default' ? ` toast--${type}` : ''}`;
    el.innerHTML = `${icon(type === 'error' ? 'info' : 'check', 16)}<span>${escapeHTML(message)}</span>`;
    DOM.toastStack.appendChild(el);

    setTimeout(() => {
        el.classList.add('is-leaving');
        el.addEventListener('animationend', () => el.remove(), { once: true });
        setTimeout(() => el.remove(), 400);
    }, 2600);
}

/* =========================================================================
   NAVIGATION & PANELS
   ========================================================================= */

const scrollMemory = {};

export function navigateTo(hash) {
    const route = hash === '#document' ? '#document' : '#search';

    document.querySelectorAll('.app-screen').forEach(screen => {
        const active = screen.dataset.route === route;
        if (!active && screen.classList.contains('is-active')) {
            const scroller = screen.querySelector('.scroll-area');
            if (scroller) scrollMemory[screen.id] = scroller.scrollTop;
        }
        screen.classList.toggle('is-active', active);
        if (active) {
            const scroller = screen.querySelector('.scroll-area');
            if (scroller && scrollMemory[screen.id]) {
                requestAnimationFrame(() => { scroller.scrollTop = scrollMemory[screen.id]; });
            }
        }
    });

    document.querySelectorAll('.nav-item[data-route]').forEach(item => {
        item.classList.toggle('is-active', item.dataset.route === route);
    });

    document.body.dataset.route = route;
    if (route !== '#search') closeFilterPanel();
    if (route === '#document') refreshDraftSizes();
}

/* --- Filter-Panel (Bottom-Sheet auf Mobile) --- */

let scrimEl = null;

export function openFilterPanel() {
    if (isDesktop()) return;
    if (!scrimEl) {
        scrimEl = document.createElement('div');
        scrimEl.className = 'scrim';
        scrimEl.dataset.closeFilter = 'true';
        document.body.appendChild(scrimEl);
    }
    DOM.filterPanel.classList.add('is-open');
    DOM.filterTrigger?.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
}

export function closeFilterPanel() {
    DOM.filterPanel?.classList.remove('is-open');
    DOM.filterTrigger?.setAttribute('aria-expanded', 'false');
    scrimEl?.remove();
    scrimEl = null;
    document.body.style.overflow = '';
}

export function isFilterPanelOpen() {
    return !!DOM.filterPanel?.classList.contains('is-open');
}

/* --- Entwurfs-Panel (Slide-Over 1024–1279px) --- */

export function toggleDraftPanel(force) {
    const panel = DOM.screenDocument;
    if (!panel) return;
    const open = force !== undefined ? force : !panel.classList.contains('is-open');
    panel.classList.toggle('is-open', open);
    DOM.draftToggle?.setAttribute('aria-expanded', String(open));
    DOM.draftToggle?.classList.toggle('is-active', open);
    if (DOM.draftCloseBtn) DOM.draftCloseBtn.hidden = !open;
    if (open) refreshDraftSizes();
}

/* --- Modals --- */

let lastFocused = null;

export function openModal(modal) {
    if (!modal) return;
    lastFocused = document.activeElement;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    const focusable = modal.querySelector('button, [href], input, select, textarea');
    focusable?.focus({ preventScroll: true });
}

export function closeModal(modal) {
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    if (!document.querySelector('.modal:not([hidden])') && !isFilterPanelOpen()) {
        document.body.style.overflow = '';
    }
    lastFocused?.focus?.({ preventScroll: true });
}

export function closeTopMostOverlay() {
    const openModals = [...document.querySelectorAll('.modal:not([hidden])')];
    if (openModals.length) { closeModal(openModals[openModals.length - 1]); return true; }
    if (isFilterPanelOpen()) { closeFilterPanel(); return true; }
    if (DOM.screenDocument?.classList.contains('is-open')) { toggleDraftPanel(false); return true; }
    return false;
}

/* =========================================================================
   STATUS & META-ANZEIGEN
   ========================================================================= */

export function setDataStatus(status, sourceLabel, count) {
    if (DOM.statusDot) DOM.statusDot.dataset.status = status;
    const titles = {
        ok: `${sourceLabel} · ${count} Einträge`,
        demo: `Demo-Daten · ${count} Einträge`,
        error: 'Datenbank konnte nicht geladen werden',
        loading: 'Datenbank wird geladen …'
    };
    DOM.statusBtn?.setAttribute('title', titles[status] || '');
    DOM.statusBtn?.setAttribute('aria-label', titles[status] || 'Datenbank-Status');
    if (DOM.dataSourceLabel) DOM.dataSourceLabel.textContent = sourceLabel || 'Unbekannt';
    if (DOM.dataCountLabel) DOM.dataCountLabel.textContent = `${count} Einträge`;
}

function activeFilterCount() {
    let n = 0;
    if (DOM.lawFilter?.value) n++;
    if (DOM.paragraphFilter?.value) n++;
    if (DOM.absatzFilter?.value) n++;
    if (DOM.hasBausteinFilter?.checked) n++;
    return n;
}

/* =========================================================================
   FILTERUNG
   ========================================================================= */

let highlightRegex = null;

export function getFilterValues() {
    return {
        law: DOM.lawFilter?.value || '',
        paragraf: DOM.paragraphFilter?.value || '',
        absatz: DOM.absatzFilter?.value || '',
        query: (DOM.searchInput?.value || '').trim(),
        onlyBaustein: !!DOM.hasBausteinFilter?.checked
    };
}

const hasBaustein = item => !!(item.mangelVorgefunden || item.rechtsgrundlage || item.handlungsaufforderung);

function getFilteredData() {
    const f = getFilterValues();

    highlightRegex = null;
    let matchRegex = null;
    if (f.query) {
        const esc = escapeRegExp(f.query);
        highlightRegex = new RegExp(esc, 'gi');
        matchRegex = new RegExp(`(^|[^\\p{L}\\p{N}])${esc}([^\\p{L}\\p{N}]|$)`, 'iu');
    }

    return state.gesetzeData.filter(item => {
        if (f.onlyBaustein && !hasBaustein(item)) return false;
        if (f.law && item.gesetzKuerzel !== f.law) return false;
        if (f.paragraf && item.paragraf !== f.paragraf) return false;
        if (f.absatz && item.absatz !== f.absatz) return false;
        if (matchRegex) {
            const haystack = `${item.paragraf} ${item.absatz} ${item.titel} ${item.inhalt} ${item.mangelVorgefunden} ${item.rechtsgrundlage} ${item.handlungsaufforderung}`;
            if (!matchRegex.test(haystack)) return false;
        }
        return true;
    });
}

export function updateDropdowns() {
    if (!DOM.lawFilter) return;

    const currentLaw = DOM.lawFilter.value;
    const currentParagraf = DOM.paragraphFilter.value;
    const currentAbsatz = DOM.absatzFilter.value;
    const onlyBaustein = !!DOM.hasBausteinFilter?.checked;

    const passes = item => !onlyBaustein || hasBaustein(item);

    const laws = new Map();
    const paragrafen = new Map();
    const absaetze = new Set();

    // Ein einziger Durchlauf: Gesetzesliste immer, Paragrafen abhängig vom Gesetz,
    // Absätze abhängig vom Paragrafen.
    for (const item of state.gesetzeData) {
        if (!passes(item)) continue;
        if (item.gesetzKuerzel) laws.set(item.gesetzKuerzel, item.gesetzName || item.gesetzKuerzel);
        if ((!currentLaw || item.gesetzKuerzel === currentLaw) && item.paragraf) {
            if (!paragrafen.has(item.paragraf)) paragrafen.set(item.paragraf, item.titel);
        }
        if (currentParagraf && item.paragraf === currentParagraf && item.absatz &&
            (!currentLaw || item.gesetzKuerzel === currentLaw)) {
            absaetze.add(item.absatz);
        }
    }

    DOM.lawFilter.innerHTML = '<option value="">Alle Gesetze</option>' +
        [...laws].map(([k, n]) => `<option value="${escapeHTML(k)}">${escapeHTML(k)} — ${escapeHTML(n)}</option>`).join('');
    DOM.lawFilter.value = laws.has(currentLaw) ? currentLaw : '';

    DOM.paragraphFilter.innerHTML = '<option value="">Alle Paragrafen</option>' +
        [...paragrafen].map(([p, t]) => {
            const suffix = t && !t.startsWith(p) ? ` — ${escapeHTML(t)}` : '';
            return `<option value="${escapeHTML(p)}">${escapeHTML(p)}${suffix}</option>`;
        }).join('');
    DOM.paragraphFilter.value = paragrafen.has(currentParagraf) ? currentParagraf : '';

    const sortedAbsaetze = [...absaetze].sort((a, b) => a.localeCompare(b, 'de', { numeric: true }));
    DOM.absatzFilter.innerHTML = '<option value="">Alle Absätze</option>' +
        sortedAbsaetze.map(a => `<option value="${escapeHTML(a)}">${escapeHTML(a)}</option>`).join('');
    DOM.absatzFilter.value = absaetze.has(currentAbsatz) ? currentAbsatz : '';
    DOM.absatzFilter.disabled = sortedAbsaetze.length === 0;

    const n = activeFilterCount();
    setCount(DOM.filterCountBadge, n);
    setCount(DOM.filterCountNav, n);
    DOM.filterTrigger?.classList.toggle('is-active', n > 0);
}

/* =========================================================================
   ERGEBNIS-RENDERING
   ========================================================================= */

const CHUNK_SIZE = 15;
let pendingGroups = [];
let renderToken = 0;

function stateBox(iconName, title, text) {
    return `
        <div class="state-box">
            <div class="state-icon">${icon(iconName, 26)}</div>
            <p class="state-title">${escapeHTML(title)}</p>
            <p class="state-text">${text}</p>
        </div>`;
}

export function renderSkeletons() {
    if (!DOM.resultsList) return;
    DOM.resultsList.setAttribute('aria-busy', 'true');
    DOM.resultsList.innerHTML = '<div class="skeleton-card"></div>'.repeat(3);
}

export function renderResults() {
    if (!DOM.resultsList) return;

    const token = ++renderToken;
    pendingGroups = [];

    const f = getFilterValues();
    const hasCriteria = !!(f.law || f.paragraf || f.absatz || f.query || f.onlyBaustein);
    const data = hasCriteria ? getFilteredData() : [];

    updateResultsMeta(hasCriteria, data.length, f);
    DOM.resultsList.setAttribute('aria-busy', 'false');

    if (!state.gesetzeData.length) {
        DOM.resultsList.innerHTML = stateBox('database', 'Keine Datenbank geladen',
            'Laden Sie über das Upload-Symbol eine eigene CSV-Datei.');
        return;
    }

    if (!hasCriteria) {
        DOM.resultsList.innerHTML = stateBox('sparkles', 'Womit fangen wir an?',
            `Suchen Sie nach einem Begriff oder wählen Sie ein Gesetz${isDesktop() ? ' links' : ' über den Filter'} aus.<br><strong>${state.gesetzeData.length}</strong> Normen stehen bereit.`);
        return;
    }

    if (!data.length) {
        DOM.resultsList.innerHTML = stateBox('searchOff', 'Keine Treffer',
            'Passen Sie die Filter an oder verwenden Sie einen anderen Suchbegriff.');
        return;
    }

    // Gruppieren nach Gesetz + Paragraf
    const groups = new Map();
    for (const item of data) {
        const key = `${item.gesetzKuerzel}__${item.paragraf}`;
        let group = groups.get(key);
        if (!group) {
            group = { kuerzel: item.gesetzKuerzel, name: item.gesetzName, paragraf: item.paragraf, titel: item.titel, entries: [] };
            groups.set(key, group);
        }
        group.entries.push(item);
    }

    pendingGroups = [...groups.values()];
    DOM.resultsList.innerHTML = '';
    if (DOM.resultsScroll) DOM.resultsScroll.scrollTop = 0;
    renderChunk(token);
}

function renderChunk(token) {
    if (token !== renderToken || !pendingGroups.length) return;
    const chunk = pendingGroups.splice(0, CHUNK_SIZE);
    const firstNew = DOM.resultsList.lastElementChild;
    DOM.resultsList.insertAdjacentHTML('beforeend', chunk.map(groupTemplate).join(''));

    // Nur die frisch eingefügten Karten prüfen, nicht die komplette Liste.
    let node = firstNew ? firstNew.nextElementSibling : DOM.resultsList.firstElementChild;
    while (node) { refreshClampButtons(node); node = node.nextElementSibling; }

    if (pendingGroups.length) requestAnimationFrame(() => renderChunk(token));
}

function groupTemplate(group) {
    const showTitle = group.titel && !group.titel.startsWith(group.paragraf);
    const titleSuffix = showTitle ? ` — ${highlight(group.titel, highlightRegex)}` : '';

    return `
    <article class="law-card">
        <header class="law-card-head">
            <div class="law-card-tags">
                <span class="chip chip--accent">${escapeHTML(group.kuerzel)}</span>
                <span class="law-card-name">${escapeHTML(group.name || '')}</span>
            </div>
            <h3 class="law-card-title">${escapeHTML(group.paragraf)}${titleSuffix}</h3>
        </header>
        ${group.entries.map(normTemplate).join('')}
    </article>`;
}

function normTemplate(item) {
    const baustein = [item.mangelVorgefunden, item.rechtsgrundlage, item.handlungsaufforderung].filter(Boolean).join('\n\n');
    const added = state.revisionsSchreibenListe.some(d => d.id === item.id);

    return `
    <section class="norm-item${added ? ' is-added' : ''}" id="norm-${item.id}">
        <div class="norm-head">
            <span class="chip">${escapeHTML(item.absatz || 'Norm')}</span>
            <div class="norm-actions">
                <button type="button" class="btn btn--ghost btn--sm js-copy-norm" data-id="${item.id}">
                    ${icon('clipboard', 15)} Gesetzestext
                </button>
                ${baustein ? `
                <button type="button" class="btn btn--sm ${added ? 'btn--added' : 'btn--primary'} js-toggle-norm" data-id="${item.id}"
                        aria-pressed="${added}">
                    ${added ? `${icon('check', 15)} Im Entwurf` : `${icon('plus', 15)} Übernehmen`}
                </button>` : ''}
            </div>
        </div>

        <div class="norm-text clamp js-clampable">${highlight(item.inhalt, highlightRegex)}</div>
        <button type="button" class="toggle-more js-toggle-more">${icon('chevronDown', 14)} Mehr anzeigen</button>

        ${baustein ? `
        <div class="baustein-box">
            <div class="baustein-label">${icon('sparkles', 12)} Textbaustein</div>
            <div class="baustein-text clamp js-clampable">${highlight(baustein, highlightRegex)}</div>
            <button type="button" class="toggle-more js-toggle-more">${icon('chevronDown', 14)} Mehr anzeigen</button>
        </div>` : ''}
    </section>`;
}

function updateResultsMeta(hasCriteria, count, f) {
    if (!DOM.resultsMeta) return;
    if (!hasCriteria) {
        DOM.resultsMeta.classList.add('is-hidden');
        return;
    }
    DOM.resultsMeta.classList.remove('is-hidden');

    const tags = [`<span class="chip${count ? ' chip--accent' : ''}">${count} Treffer</span>`];
    if (f.law) tags.push(`<span class="chip">${escapeHTML(f.law)}</span>`);
    if (f.paragraf) tags.push(`<span class="chip">${escapeHTML(f.paragraf)}</span>`);
    if (f.absatz) tags.push(`<span class="chip">${escapeHTML(f.absatz)}</span>`);
    if (f.onlyBaustein) tags.push('<span class="chip">nur Bausteine</span>');
    if (f.query) tags.push(`<span class="chip">„${escapeHTML(f.query)}“</span>`);

    DOM.resultsMetaTags.innerHTML = tags.join('');
}

/** Blendet „Mehr anzeigen“ aus, wenn der Text ohnehin vollständig sichtbar ist. */
export function refreshClampButtons(root = DOM.resultsList) {
    root?.querySelectorAll('.js-clampable').forEach(el => {
        const btn = el.nextElementSibling;
        if (!btn?.classList.contains('js-toggle-more')) return;
        const clipped = el.scrollHeight > el.clientHeight + 2;
        btn.classList.toggle('is-hidden', !clipped && el.classList.contains('clamp'));
    });
}

export function toggleClamp(btn) {
    const target = btn.previousElementSibling;
    if (!target) return;
    const clamped = target.classList.toggle('clamp');
    btn.innerHTML = clamped
        ? `${icon('chevronDown', 14)} Mehr anzeigen`
        : `${icon('chevronUp', 14)} Weniger anzeigen`;
}

/** Aktualisiert nur die betroffene Norm-Karte statt der kompletten Liste. */
export function refreshNormCard(itemId) {
    const el = document.getElementById(`norm-${itemId}`);
    if (!el) return;
    const item = state.gesetzeData.find(i => i.id === itemId);
    if (!item) return;
    const wrapper = document.createElement('div');
    wrapper.innerHTML = normTemplate(item);
    const fresh = wrapper.firstElementChild;
    el.replaceWith(fresh);
    if (state.revisionsSchreibenListe.some(d => d.id === itemId)) {
        fresh.classList.add('pulse');
        setTimeout(() => fresh.classList.remove('pulse'), 700);
    }
    refreshClampButtons(fresh.parentElement);
}

/* =========================================================================
   ENTWURFS-RENDERING
   ========================================================================= */

function autoSize(el) {
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
}

export function autoSizeTextarea(el) { autoSize(el); }

/**
 * Textareas messen sich nur korrekt, wenn sie sichtbar sind.
 * Nach dem Einblenden des Entwurfs daher erneut anpassen.
 */
export function refreshDraftSizes() {
    if (!DOM.draftList) return;
    requestAnimationFrame(() => DOM.draftList.querySelectorAll('.draft-textarea').forEach(autoSize));
}

export function renderDraft() {
    const list = state.revisionsSchreibenListe;
    const count = list.length;

    if (DOM.draftCounter) DOM.draftCounter.textContent = `${count} Punkt${count === 1 ? '' : 'e'}`;
    setCount(DOM.draftCountHeader, count);
    setCount(DOM.draftCountNav, count);

    [DOM.copyDraftBtn, DOM.downloadDraftBtn, DOM.clearDraftBtn].forEach(btn => {
        if (btn) btn.disabled = count === 0;
    });

    if (!DOM.draftList) return;

    if (count === 0) {
        DOM.draftList.innerHTML = stateBox('inbox', 'Noch nichts übernommen',
            'Übernehmen Sie Normen aus der Datenbank, um Ihr Revisionsschreiben aufzubauen.');
        return;
    }

    DOM.draftList.innerHTML = list.map((item, idx) => `
        <article class="draft-item">
            <header class="draft-item-head">
                <span class="draft-num">${idx + 1}</span>
                <input type="text" class="draft-title-input js-draft-title" data-id="${item.id}"
                       value="${escapeHTML(item.titel)}" aria-label="Titel von Punkt ${idx + 1}">
                <div class="draft-item-tools">
                    <button type="button" class="tool-btn js-draft-move" data-idx="${idx}" data-dir="-1"
                            ${idx === 0 ? 'disabled' : ''} aria-label="Nach oben">${icon('arrowUp', 16)}</button>
                    <button type="button" class="tool-btn js-draft-move" data-idx="${idx}" data-dir="1"
                            ${idx === count - 1 ? 'disabled' : ''} aria-label="Nach unten">${icon('arrowDown', 16)}</button>
                    <button type="button" class="tool-btn is-danger js-draft-remove" data-id="${item.id}"
                            aria-label="Punkt entfernen">${icon('trash', 16)}</button>
                </div>
            </header>
            <textarea class="draft-textarea js-draft-text" data-id="${item.id}"
                      aria-label="Text von Punkt ${idx + 1}" rows="4">${escapeHTML(item.editedText)}</textarea>
        </article>`).join('');

    DOM.draftList.querySelectorAll('.draft-textarea').forEach(autoSize);
}

/* =========================================================================
   EXPORT (Zwischenablage / Datei)
   ========================================================================= */

function buildPlainText() {
    return state.revisionsSchreibenListe
        .map((item, idx) => `${idx + 1}. ${item.titel}\r\n\r\n${item.editedText}`)
        .join('\r\n\r\n\r\n');
}

function buildHTML() {
    const body = state.revisionsSchreibenListe.map((item, idx) => {
        const paras = item.editedText.split(/(?:\r?\n){2,}/).map(block =>
            `<p style="margin:0 0 12pt;text-align:justify;">${escapeHTML(block).replace(/\r?\n/g, '<br>')}</p>`
        ).join('');
        return `<p style="margin:0 0 12pt;"><strong>${idx + 1}. ${escapeHTML(item.titel)}</strong></p>${paras}`;
    }).join('<p style="margin:0 0 24pt;">&nbsp;</p>');

    return `<html><head><meta charset="utf-8"></head><body style="font-family:Calibri,Arial,sans-serif;font-size:11pt;">${body}</body></html>`;
}

export function copyText(text, message = 'In die Zwischenablage kopiert') {
    if (!navigator.clipboard) { showToast('Zwischenablage nicht verfügbar', 'error'); return; }
    navigator.clipboard.writeText(text)
        .then(() => showToast(message, 'success'))
        .catch(() => showToast('Kopieren fehlgeschlagen', 'error'));
}

export function copyDraft() {
    if (!state.revisionsSchreibenListe.length) return;
    const plain = buildPlainText();
    const fallback = () => copyText(plain, 'Entwurf kopiert');

    if (navigator.clipboard && window.ClipboardItem) {
        navigator.clipboard.write([new ClipboardItem({
            'text/plain': new Blob([plain], { type: 'text/plain' }),
            'text/html': new Blob([buildHTML()], { type: 'text/html' })
        })])
            .then(() => showToast('Entwurf mit Formatierung kopiert', 'success'))
            .catch(fallback);
    } else {
        fallback();
    }
}

export function downloadDraft() {
    if (!state.revisionsSchreibenListe.length) return;
    const blob = new Blob(['﻿', buildHTML()], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `Revisionsschreiben_${stamp}.doc`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('Datei wird gespeichert', 'success');
}

/* =========================================================================
   INITIALISIERUNG
   ========================================================================= */

export function initIcons() { hydrateIcons(); }

export function setThemeIcon(theme) {
    if (DOM.themeIcon) DOM.themeIcon.innerHTML = icon(theme === 'dark' ? 'sun' : 'moon', 18);
}

export function syncSearchFieldState() {
    DOM.searchField?.classList.toggle('has-value', !!DOM.searchInput?.value);
}

export { DESKTOP_QUERY, SPLIT_QUERY };
