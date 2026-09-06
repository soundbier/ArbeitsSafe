import { state, parseCSV, saveState, loadState } from './data.js';
import {
    DOM, initIcons, setThemeIcon, showToast, navigateTo,
    openFilterPanel, closeFilterPanel, isFilterPanelOpen, toggleDraftPanel,
    openModal, closeModal, closeTopMostOverlay,
    updateDropdowns, renderResults, renderSkeletons, renderDraft, refreshNormCard,
    toggleClamp, autoSizeTextarea, copyText, copyDraft, downloadDraft,
    setDataStatus, syncSearchFieldState, isDesktop, isSplitView, DESKTOP_QUERY
} from './ui.js';

const APP_VERSION = '2.0.2';
const LS = {
    theme: 'arbeitsSafe_theme',
    density: 'arbeitsSafe_compact',
    legal: 'arbeitsSafe_legal_accepted',
    fontsize: 'arbeitsSafe_fontsize',
    exportFormat: 'arbeitsSafe_exportformat',
    autoReload: 'arbeitsSafe_autoreload',
    confirmDelete: 'arbeitsSafe_confirmdelete'
};

/* =========================================================================
   DESIGN & DARSTELLUNG
   ========================================================================= */

const systemDark = window.matchMedia('(prefers-color-scheme: dark)');

function resolveTheme(pref) {
    return pref === 'system' ? (systemDark.matches ? 'dark' : 'light') : pref;
}

function applyTheme(pref) {
    const theme = resolveTheme(pref);
    document.documentElement.dataset.theme = theme;
    setThemeIcon(theme);
    document.querySelectorAll('[data-theme-choice]').forEach(btn => {
        btn.setAttribute('aria-pressed', String(btn.dataset.themeChoice === pref));
    });
}

function setTheme(pref) {
    localStorage.setItem(LS.theme, pref);
    applyTheme(pref);
}

function getThemePref() {
    return localStorage.getItem(LS.theme) || 'system';
}

systemDark.addEventListener('change', () => {
    if (getThemePref() === 'system') applyTheme('system');
});

function applyDensity(compact) {
    document.documentElement.dataset.density = compact ? 'compact' : 'normal';
    if (DOM.compactModeToggle) DOM.compactModeToggle.checked = compact;
}

function applyFontSize(pref) {
    document.documentElement.dataset.fontsize = pref;
    document.querySelectorAll('[data-fontsize-choice]').forEach(btn => {
        btn.setAttribute('aria-pressed', String(btn.dataset.fontsizeChoice === pref));
    });
}

function setFontSize(pref) {
    localStorage.setItem(LS.fontsize, pref);
    applyFontSize(pref);
}

function getFontSizePref() {
    return localStorage.getItem(LS.fontsize) || 'normal';
}

function applyExportFormat(pref) {
    document.querySelectorAll('[data-exportformat-choice]').forEach(btn => {
        btn.setAttribute('aria-pressed', String(btn.dataset.exportformatChoice === pref));
    });
}

function setExportFormat(pref) {
    localStorage.setItem(LS.exportFormat, pref);
    applyExportFormat(pref);
}

function getExportFormatPref() {
    return localStorage.getItem(LS.exportFormat) || 'doc';
}

function getAutoReloadPref() {
    return localStorage.getItem(LS.autoReload) === 'true';
}

function getConfirmDeletePref() {
    return localStorage.getItem(LS.confirmDelete) !== 'false';
}

/* =========================================================================
   DATEN
   ========================================================================= */

function initData(csvString, sourceLabel, status = 'ok') {
    state.lastLoadedFileText = csvString;
    state.lastLoadedFileName = sourceLabel;
    state.gesetzeData = parseCSV(csvString);

    setDataStatus(status, sourceLabel, state.gesetzeData.length);
    updateDropdowns();
    renderResults();
}

function loadDatabase() {
    renderSkeletons();
    const opts = getAutoReloadPref() ? { cache: 'no-store' } : {};
    return fetch('gesetze.csv', opts)
        .then(r => { if (!r.ok) throw new Error(r.status); return r.text(); })
        .then(text => initData(text, 'Standard-Datenbank', 'ok'))
        .catch(() => {
            initData(state.rawCsvData, 'Demo-Daten', 'demo');
            showToast('Datenbank nicht erreichbar – Demo-Daten aktiv', 'error');
        });
}

/* =========================================================================
   ENTWURF
   ========================================================================= */

function toggleInDraft(itemId) {
    const item = state.gesetzeData.find(i => i.id === itemId);
    if (!item) return;

    const idx = state.revisionsSchreibenListe.findIndex(i => i.id === itemId);
    if (idx > -1) {
        state.revisionsSchreibenListe.splice(idx, 1);
        showToast('Aus dem Entwurf entfernt');
    } else {
        state.revisionsSchreibenListe.push({
            ...item,
            editedText: [item.mangelVorgefunden, item.rechtsgrundlage, item.handlungsaufforderung]
                .filter(Boolean).join('\n\n')
        });
        showToast('Zum Entwurf hinzugefügt', 'success');
    }

    refreshNormCard(itemId);
    renderDraft();
    saveState(true);
}

function removeFromDraft(itemId) {
    const idx = state.revisionsSchreibenListe.findIndex(i => i.id === itemId);
    if (idx === -1) return;
    state.revisionsSchreibenListe.splice(idx, 1);
    refreshNormCard(itemId);
    renderDraft();
    saveState(true);
}

function moveDraftItem(idx, dir) {
    const target = idx + dir;
    const list = state.revisionsSchreibenListe;
    if (target < 0 || target >= list.length) return;
    list.splice(target, 0, list.splice(idx, 1)[0]);
    renderDraft();
    saveState(true);
}

function clearDraft() {
    if (!state.revisionsSchreibenListe.length) return;
    if (getConfirmDeletePref() && !confirm('Möchten Sie den gesamten Entwurf wirklich leeren?')) return;
    const ids = state.revisionsSchreibenListe.map(i => i.id);
    state.revisionsSchreibenListe = [];
    ids.forEach(refreshNormCard);
    renderDraft();
    saveState(true);
    showToast('Entwurf geleert');
}

function updateDraftField(id, key, value) {
    const item = state.revisionsSchreibenListe.find(i => i.id === id);
    if (!item) return;
    item[key] = value;
    saveState();
}

/* =========================================================================
   FILTER-INTERAKTION
   ========================================================================= */

function onFilterChange(rebuildDropdowns = true) {
    if (rebuildDropdowns) updateDropdowns();
    renderResults();
}

function resetFilters() {
    DOM.lawFilter.value = '';
    DOM.paragraphFilter.value = '';
    DOM.absatzFilter.value = '';
    DOM.hasBausteinFilter.checked = false;
    DOM.searchInput.value = '';
    syncSearchFieldState();
    onFilterChange();
}

/* =========================================================================
   EVENT-WIRING
   ========================================================================= */

function wireEvents() {
    // --- Globale Delegation (Klick) ---
    document.addEventListener('click', e => {
        const t = e.target;

        if (t.closest('[data-close-filter]')) { closeFilterPanel(); return; }

        const closeModalBtn = t.closest('[data-close-modal]');
        if (closeModalBtn) { closeModal(closeModalBtn.closest('.modal')); return; }

        // Modal-Hintergrund schließt (nur Settings, nicht das Legal-Gate)
        if (t.classList.contains('modal') && t.id !== 'legalModal') { closeModal(t); return; }

        // Ergebnisliste
        const moreBtn = t.closest('.js-toggle-more');
        if (moreBtn) { toggleClamp(moreBtn); return; }

        const copyNorm = t.closest('.js-copy-norm');
        if (copyNorm) {
            const item = state.gesetzeData.find(i => i.id === copyNorm.dataset.id);
            if (item) copyText(item.inhalt, 'Gesetzestext kopiert');
            return;
        }

        const toggleNorm = t.closest('.js-toggle-norm');
        if (toggleNorm) { toggleInDraft(toggleNorm.dataset.id); return; }

        // Entwurf
        const removeBtn = t.closest('.js-draft-remove');
        if (removeBtn) { removeFromDraft(removeBtn.dataset.id); return; }

        const moveBtn = t.closest('.js-draft-move');
        if (moveBtn) { moveDraftItem(Number(moveBtn.dataset.idx), Number(moveBtn.dataset.dir)); return; }

        // Theme-Auswahl
        const themeChoice = t.closest('[data-theme-choice]');
        if (themeChoice) { setTheme(themeChoice.dataset.themeChoice); return; }

        // Schriftgröße
        const fontSizeChoice = t.closest('[data-fontsize-choice]');
        if (fontSizeChoice) { setFontSize(fontSizeChoice.dataset.fontsizeChoice); return; }

        // Exportformat
        const exportFormatChoice = t.closest('[data-exportformat-choice]');
        if (exportFormatChoice) { setExportFormat(exportFormatChoice.dataset.exportformatChoice); return; }
    });

    // --- Header ---
    DOM.themeBtn?.addEventListener('click', () => {
        const next = resolveTheme(getThemePref()) === 'dark' ? 'light' : 'dark';
        setTheme(next);
    });

    DOM.settingsBtn?.addEventListener('click', () => openModal(DOM.settingsModal));
    DOM.statusBtn?.addEventListener('click', () => {
        showToast(`${state.lastLoadedFileName || 'Datenbank'} · ${state.gesetzeData.length} Einträge`);
    });

    DOM.uploadBtn?.addEventListener('click', () => DOM.csvFileInput.click());
    document.getElementById('settingsUploadBtn')?.addEventListener('click', () => {
        closeModal(DOM.settingsModal);
        DOM.csvFileInput.click();
    });
    document.getElementById('settingsReloadBtn')?.addEventListener('click', () => {
        closeModal(DOM.settingsModal);
        loadDatabase().then(() => showToast('Datenbank neu geladen', 'success'));
    });

    DOM.csvFileInput?.addEventListener('change', e => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            initData(new TextDecoder('utf-8', { fatal: false }).decode(ev.target.result), file.name, 'ok');
            showToast(`${file.name} geladen`, 'success');
        };
        reader.onerror = () => showToast('Datei konnte nicht gelesen werden', 'error');
        reader.readAsArrayBuffer(file);
        e.target.value = '';
    });

    DOM.draftToggle?.addEventListener('click', () => {
        if (isSplitView()) { showToast('Der Entwurf ist bereits sichtbar'); return; }
        if (isDesktop()) toggleDraftPanel();
        else location.hash = '#document';
    });
    DOM.draftCloseBtn?.addEventListener('click', () => toggleDraftPanel(false));

    // --- Filter ---
    DOM.filterTrigger?.addEventListener('click', () => isFilterPanelOpen() ? closeFilterPanel() : openFilterPanel());
    document.getElementById('navFilter')?.addEventListener('click', () => {
        if (location.hash === '#document') location.hash = '#search';
        isFilterPanelOpen() ? closeFilterPanel() : openFilterPanel();
    });
    DOM.filterCloseBtn?.addEventListener('click', closeFilterPanel);
    DOM.applyFilterBtn?.addEventListener('click', closeFilterPanel);
    DOM.resetFilterBtn?.addEventListener('click', resetFilters);
    DOM.metaResetBtn?.addEventListener('click', resetFilters);

    DOM.lawFilter?.addEventListener('change', () => onFilterChange());
    DOM.paragraphFilter?.addEventListener('change', () => onFilterChange());
    DOM.absatzFilter?.addEventListener('change', () => onFilterChange(false));
    DOM.hasBausteinFilter?.addEventListener('change', () => onFilterChange());

    // --- Suche (debounced) ---
    let searchTimer;
    DOM.searchInput?.addEventListener('input', () => {
        syncSearchFieldState();
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => renderResults(), 220);
    });
    DOM.searchInput?.addEventListener('search', () => { syncSearchFieldState(); renderResults(); });
    DOM.searchClearBtn?.addEventListener('click', () => {
        DOM.searchInput.value = '';
        syncSearchFieldState();
        renderResults();
        DOM.searchInput.focus();
    });

    // --- Entwurfs-Eingaben ---
    DOM.draftList?.addEventListener('input', e => {
        const t = e.target;
        if (t.classList.contains('js-draft-title')) updateDraftField(t.dataset.id, 'titel', t.value);
        if (t.classList.contains('js-draft-text')) {
            updateDraftField(t.dataset.id, 'editedText', t.value);
            autoSizeTextarea(t);
        }
    });

    DOM.copyDraftBtn?.addEventListener('click', copyDraft);
    DOM.downloadDraftBtn?.addEventListener('click', () => downloadDraft(getExportFormatPref()));
    DOM.clearDraftBtn?.addEventListener('click', clearDraft);

    // --- Einstellungen ---
    DOM.compactModeToggle?.addEventListener('change', e => {
        localStorage.setItem(LS.density, String(e.target.checked));
        applyDensity(e.target.checked);
    });

    DOM.autoReloadToggle?.addEventListener('change', e => {
        localStorage.setItem(LS.autoReload, String(e.target.checked));
    });

    DOM.confirmDeleteToggle?.addEventListener('change', e => {
        localStorage.setItem(LS.confirmDelete, String(e.target.checked));
    });

    document.getElementById('showLegalBtn')?.addEventListener('click', () => {
        closeModal(DOM.settingsModal);
        document.getElementById('legalCloseBtn').hidden = false;
        openModal(DOM.legalModal);
    });

    document.getElementById('acceptLegalBtn')?.addEventListener('click', () => {
        localStorage.setItem(LS.legal, 'true');
        closeModal(DOM.legalModal);
    });

    document.getElementById('clearAllBtn')?.addEventListener('click', () => {
        if (getConfirmDeletePref() && !confirm('ACHTUNG: Alle lokal gespeicherten Daten werden unwiderruflich gelöscht. Fortfahren?')) return;
        localStorage.clear();
        location.reload();
    });

    // --- Tastatur ---
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') { if (closeTopMostOverlay()) e.preventDefault(); return; }

        const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable;
        if (typing) return;

        if (e.key === '/' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) {
            e.preventDefault();
            if (!isDesktop() && location.hash === '#document') location.hash = '#search';
            DOM.searchInput?.focus();
            DOM.searchInput?.select();
        }
    });

    // --- Routing ---
    window.addEventListener('hashchange', () => navigateTo(location.hash));

    // Beim Wechsel auf Desktop offene Mobile-Overlays aufräumen
    DESKTOP_QUERY.addEventListener('change', () => {
        closeFilterPanel();
        if (isSplitView()) toggleDraftPanel(false);
        if (isDesktop()) navigateTo('#search');
        else navigateTo(location.hash);
    });
}

/* =========================================================================
   START
   ========================================================================= */

function boot() {
    initIcons();
    applyTheme(getThemePref());
    applyDensity(localStorage.getItem(LS.density) === 'true');
    applyFontSize(getFontSizePref());
    applyExportFormat(getExportFormatPref());
    if (DOM.autoReloadToggle) DOM.autoReloadToggle.checked = getAutoReloadPref();
    if (DOM.confirmDeleteToggle) DOM.confirmDeleteToggle.checked = getConfirmDeletePref();

    loadState();
    renderDraft();
    navigateTo(isDesktop() ? '#search' : location.hash);
    syncSearchFieldState();
    wireEvents();

    if (!localStorage.getItem(LS.legal)) {
        document.getElementById('legalCloseBtn').hidden = true;
        openModal(DOM.legalModal);
    }

    loadDatabase();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
    boot();
}

/* =========================================================================
   SERVICE WORKER
   ========================================================================= */

let waitingWorker = null;
let refreshing = false;

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw2.js').then(reg => {
            if (reg.waiting && navigator.serviceWorker.controller) showUpdateBanner(reg.waiting);
            reg.addEventListener('updatefound', () => {
                const installing = reg.installing;
                installing?.addEventListener('statechange', () => {
                    if (installing.state === 'installed' && navigator.serviceWorker.controller) {
                        showUpdateBanner(installing);
                    }
                });
            });
        }).catch(() => { /* SW optional */ });
    });

    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        location.reload();
    });
}

function showUpdateBanner(worker) {
    waitingWorker = worker;
    DOM.updateBanner.hidden = false;
}

document.getElementById('reloadUpdateBtn')?.addEventListener('click', () => {
    waitingWorker?.postMessage('SKIP_WAITING');
    DOM.updateBanner.hidden = true;
});

export { APP_VERSION };
