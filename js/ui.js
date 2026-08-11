import { state } from './data.js';
import { icons } from './icons.js';

/* ==========================================
   DOM ELEMENTE
   ========================================== */
export const DOM = {
    // Filter & Suche
    lawFilter: document.getElementById('lawFilter'), 
    paragraphFilter: document.getElementById('paragraphFilter'),
    absatzFilter: document.getElementById('absatzFilter'), 
    searchInput: document.getElementById('searchInput'),
    hasBausteinFilter: document.getElementById('hasBausteinFilter'), 
    
    // Container
    resultsContainer: document.getElementById('results'),
    schreibenList: document.getElementById('schreibenList'), 
    errorContainer: document.getElementById('errorContainer'), 
    
    // UI-Elemente & Buttons
    schreibenCounter: document.getElementById('schreibenCounter'),
    tabCounter: document.getElementById('tabCounter'),
    copySchreibenBtn: document.getElementById('copySchreibenBtn'), 
    clearSchreibenBtn: document.getElementById('clearSchreibenBtn'),
    statusBadge: document.getElementById('statusBadge'),
    csvFileInput: document.getElementById('csvFileInput'),
    reloadBtn: document.getElementById('reloadBtn'),
    settingsBtn: document.getElementById('settingsBtn'),
    compactModeToggle: document.getElementById('compactModeToggle')
};

/* ==========================================
   STATE FÜR ROUTING & UX
   ========================================== */
const screenScrollPositions = {};

/* ==========================================
   UI INITIALISIERUNG (ICONS)
   ========================================== */

export function injectStaticIcons() {
    console.log("Injected static icons start...");
    const iconMap = {
        'icon-status': icons.database,
        'icon-reload': icons.refresh,
        'icon-upload': icons.folder,
        'icon-copy-doc': icons.clipboard,
        'icon-clear-doc': icons.trash,
        'icon-settings': icons.settings,
        'icon-clear-all': icons.trash,
        'icon-app-info': icons.info,
        'icon-filter-toggle': icons.filter,
        'icon-update': icons.refresh,
        'icon-theme-toggle': document.body.classList.contains('dark-mode') ? icons.sun : icons.moon,
        'icon-nav-search': icons.home,
        'icon-nav-document': icons.fileText
    };

    Object.entries(iconMap).forEach(([id, svg]) => {
        const el = document.getElementById(id);
        if (el) {
            el.innerHTML = svg;
        } else {
            console.warn(`Icon element not found: ${id}`);
        }
    });
    console.log("Injected static icons end.");
}

/* ==========================================
   ROUTING & SCREEN NAVIGATION
   ========================================== */

/**
 * Wechselt den Screen basierend auf dem Hash.
 */
export function navigateTo(hash) {
    const route = hash || '#search';
    const screens = document.querySelectorAll('.app-screen');
    const navItems = document.querySelectorAll('.nav-item');
    
    // 1. Vorherige Position speichern (falls vorhanden)
    const activeScreen = document.querySelector('.app-screen.active');
    if (activeScreen) {
        screenScrollPositions[activeScreen.id] = activeScreen.scrollTop;
    }

    // 2. Screens umschalten
    screens.forEach(screen => {
        const isActive = screen.getAttribute('data-route') === route;
        screen.classList.toggle('active', isActive);

        // Position wiederherstellen
        if (isActive && screenScrollPositions[screen.id]) {
            requestAnimationFrame(() => {
                screen.scrollTop = screenScrollPositions[screen.id];
            });
        }
    });

    // 3. Nav-Items aktualisieren
    navItems.forEach(item => {
        const isActive = item.getAttribute('href') === route;
        item.classList.toggle('active', isActive);
    });

    // 4. Update Body Route Attribute for CSS logic
    document.body.setAttribute('data-active-route', route);

    // 5. Mobile Toolbar Verhalten
    if (route !== '#search') {
        const overlay = document.getElementById('filterOverlay');
        if (overlay) overlay.classList.add('hidden');
    }
}

/* ==========================================
   UI HELPER FUNKTIONEN
   ========================================== */

export function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2500);
}

// Text-Toggle für "Mehr lesen"
export function toggleText(btn) {
    const target = btn.previousElementSibling;
    if (!target) return;
    target.classList.toggle('text-clamp');
    
    const isClamped = target.classList.contains('text-clamp');
    btn.innerHTML = isClamped
        ? `Mehr anzeigen ${icons.chevronDown}`
        : `Weniger anzeigen ${icons.chevronUp}`;
}

/* ==========================================
   TEXT & CLIPBOARD HELPER
   ========================================== */

export function escapeHTML(text) { 
    if (!text) return "";
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;"); 
}

function highlightSearchTerm(text, regex) {
    if (!text || !regex) return escapeHTML(text);
    const escapedText = escapeHTML(text);
    return escapedText.replace(regex, (match) => `<mark class="search-highlight">${match}</mark>`);
}

export function containsExactWord(text, regex) {
    if (!text || !regex) return false;
    return regex.test(text);
}

export function copyTextToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('Text erfolgreich kopiert');
    });
}

function onCopySuccess() { 
    showToast('Gesamtes Schreiben erfolgreich kopiert!');
}

/* ==========================================
   FILTER & DATENVERARBEITUNG
   ========================================== */

let lastSearchRegex = null;

function getFilteredData() {
    if (!DOM.lawFilter || !DOM.paragraphFilter || !DOM.absatzFilter || !DOM.searchInput || !DOM.hasBausteinFilter) return [];

    const selectedLaw = DOM.lawFilter.value;
    const selectedParagraf = DOM.paragraphFilter.value;
    const selectedAbsatz = DOM.absatzFilter.value;
    const searchQuery = DOM.searchInput.value.trim();
    const requireBaustein = DOM.hasBausteinFilter.checked;

    lastSearchRegex = null;
    if (searchQuery) {
        const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        lastSearchRegex = new RegExp(`(${escapedQuery})`, 'gi');
    }

    let filterRegex = null;
    if (searchQuery) {
        const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        filterRegex = new RegExp(`(^|[^\\p{L}\\p{N}])(${escapedQuery})([^\\p{L}\\p{N}]|$)`, 'iu');
    }

    return state.gesetzeData.filter(item => {
        const hasBausteinData = item.mangelVorgefunden || item.rechtsgrundlage || item.handlungsaufforderung;
        
        if (requireBaustein && !hasBausteinData) return false;
        if (selectedLaw && item.gesetzKuerzel !== selectedLaw) return false;
        if (selectedParagraf && item.paragraf !== selectedParagraf) return false;
        if (selectedAbsatz && item.absatz !== selectedAbsatz) return false; 
        
        if (filterRegex) {
            const searchableText = `${item.paragraf} ${item.absatz} ${item.titel} ${item.inhalt} ${item.mangelVorgefunden} ${item.rechtsgrundlage} ${item.handlungsaufforderung}`;
            if (!containsExactWord(searchableText, filterRegex)) return false;
        }
        
        return true;
    });
}

export function updateDropdowns() {
    if (!DOM.lawFilter || !DOM.paragraphFilter || !DOM.absatzFilter) return;

    const currentLaw = DOM.lawFilter.value;
    const currentParagraf = DOM.paragraphFilter.value;
    const currentAbsatz = DOM.absatzFilter.value;
    const requireBaustein = DOM.hasBausteinFilter?.checked || false;
    
    const lawsMap = new Map();
    const paragrafenMap = new Map();
    const absatzeSet = new Set();
    
    state.gesetzeData.forEach(item => {
        const hasBausteinData = item.mangelVorgefunden || item.rechtsgrundlage || item.handlungsaufforderung;
        if (!requireBaustein || hasBausteinData) {
            lawsMap.set(item.gesetzKuerzel, item.gesetzName || item.gesetzKuerzel); 
        }
    });
    
    let lawOptions = '<option value="">-- Alle Gesetze --</option>';
    Array.from(lawsMap).forEach(([kuerzel, name]) => {
        lawOptions += `<option value="${escapeHTML(kuerzel)}">${escapeHTML(kuerzel)} - ${escapeHTML(name)}</option>`;
    });
    DOM.lawFilter.innerHTML = lawOptions;
    if (lawsMap.has(currentLaw)) DOM.lawFilter.value = currentLaw;

    state.gesetzeData.forEach(item => {
        const lawMatches = !DOM.lawFilter.value || item.gesetzKuerzel === DOM.lawFilter.value;
        const hasBausteinData = item.mangelVorgefunden || item.rechtsgrundlage || item.handlungsaufforderung;
        
        if (lawMatches && (!requireBaustein || hasBausteinData) && item.paragraf) {
            paragrafenMap.set(item.paragraf, item.titel); 
        }
    });
    
    let paragrafOptions = '<option value="">-- Alle Paragrafen --</option>';
    Array.from(paragrafenMap).forEach(([paragraf, titel]) => {
        const displayTitel = titel ? ` — ${escapeHTML(titel)}` : '';
        paragrafOptions += `<option value="${escapeHTML(paragraf)}">${escapeHTML(paragraf)}${displayTitel}</option>`;
    });
    DOM.paragraphFilter.innerHTML = paragrafOptions;
    if (paragrafenMap.has(currentParagraf)) DOM.paragraphFilter.value = currentParagraf;

    if (DOM.paragraphFilter.value) {
        state.gesetzeData.forEach(item => { 
            const hasBausteinData = item.mangelVorgefunden || item.rechtsgrundlage || item.handlungsaufforderung;
            if (item.paragraf === DOM.paragraphFilter.value && (!requireBaustein || hasBausteinData) && item.absatz) {
                absatzeSet.add(item.absatz); 
            }
        }); 
    }
    
    let absatzOptions = '<option value="">-- Alle Absätze --</option>';
    Array.from(absatzeSet)
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
        .forEach(absatz => {
            absatzOptions += `<option value="${escapeHTML(absatz)}">${escapeHTML(absatz)}</option>`;
        });
        
    DOM.absatzFilter.innerHTML = absatzOptions;
    if (absatzeSet.has(currentAbsatz)) DOM.absatzFilter.value = currentAbsatz;
    DOM.absatzFilter.disabled = absatzeSet.size === 0;
}

/* ==========================================
   RENDER FUNKTIONEN (DOM Updates)
   ========================================== */

let currentRenderItems = [];
let renderChunkSize = 30;

export function renderResults() {
    if (!DOM.resultsContainer) return;
    const data = getFilteredData();
    updateFilterSummary(data.length);

    if (data.length === 0) { 
        DOM.resultsContainer.innerHTML = `<div class="card-base no-results">Keine passenden Einträge gefunden.</div>`; 
        return; 
    }
    if (!DOM.searchInput?.value && !DOM.paragraphFilter?.value && !DOM.lawFilter?.value) {
        DOM.resultsContainer.innerHTML = `<div class="card-base no-results">Wählen Sie Filter oder nutzen Sie die Suche.</div>`; 
        return; 
    }

    const groupMap = new Map();
    data.forEach(item => { 
        const key = `${item.gesetzKuerzel}_${item.paragraf}`; 
        if (!groupMap.has(key)) {
            groupMap.set(key, { ...item, entries: [] }); 
        }
        groupMap.get(key).entries.push(item); 
    });

    currentRenderItems = Array.from(groupMap.values());
    renderChunks(true);
}

function updateFilterSummary(count) {
    const bar = document.getElementById('activeFilterBar');
    const text = document.getElementById('filterSummaryText');
    if (!bar || !text) return;

    const isFiltered = DOM.lawFilter?.value || DOM.paragraphFilter?.value || DOM.searchInput?.value || DOM.hasBausteinFilter?.checked;

    if (isFiltered) {
        bar.classList.remove('hidden');
        let summary = `${count} Treffer gefunden`;
        if (DOM.lawFilter?.value) summary += ` in ${DOM.lawFilter.value}`;
        text.textContent = summary;
    } else {
        bar.classList.add('hidden');
    }
}

function renderChunks(isInitial = false) {
    if (!DOM.resultsContainer) return;
    if (isInitial) DOM.resultsContainer.innerHTML = '';

    const itemsToRender = currentRenderItems.splice(0, renderChunkSize);
    if (itemsToRender.length === 0) return;

    const html = itemsToRender.map(group => {
        const displayTitel = group.titel && !group.titel.startsWith(group.paragraf) ? group.titel : '';
        const highlightedTitle = highlightSearchTerm(displayTitel, lastSearchRegex);
        const titelErgaenzung = highlightedTitle ? ` — ${highlightedTitle}` : '';
        
        return `
        <article class="card-base law-card">
            <header class="card-top">
                <div>
                    <span class="badge">${escapeHTML(group.gesetzKuerzel)}</span>
                    <span class="law-title-meta">${escapeHTML(group.gesetzName)}</span>
                </div>
            </header>
            
            <h2 class="paragraph-heading">${escapeHTML(group.paragraf)}${titelErgaenzung}</h2>
            
            ${group.entries.map(item => {
                const hasBaustein = item.mangelVorgefunden || item.rechtsgrundlage || item.handlungsaufforderung;
                const bausteinText = [item.mangelVorgefunden, item.rechtsgrundlage, item.handlungsaufforderung].filter(Boolean).join("\n\n");
                const isInDocument = state.revisionsSchreibenListe.some(docItem => docItem.id === item.id);
                
                return `
                <section class="paragraph-box" id="item-card-${item.id}">
                    <header class="paragraph-box-header">
                        <span class="absatz-tag">${escapeHTML(item.absatz || 'Norm')}</span>
                        <div class="action-buttons-group">
                            <button type="button" class="action-icon-btn js-copy-item-btn" data-text="${escapeHTML(item.inhalt)}" aria-label="Gesetzestext kopieren">
                                ${icons.clipboard} Gesetz
                            </button>
                            ${hasBaustein ? `
                            <button type="button" class="action-icon-btn primary-action js-toggle-item-btn ${isInDocument ? 'added' : ''}" data-id="${item.id}" aria-label="${isInDocument ? 'Aus dem Schreiben entfernen' : 'Zum Schreiben hinzufügen'}">
                                ${isInDocument ? icons.check + ' Im Schreiben' : icons.plus + ' Zum Schreiben'}
                            </button>` : ''}
                        </div>
                    </header>
                    
                    <div class="text-content-wrapper">
                        <div class="paragraph-text text-clamp">${highlightSearchTerm(item.inhalt, lastSearchRegex)}</div>
                        <button type="button" class="toggle-more-btn js-toggle-more-btn" aria-label="Text ein/ausklappen">Mehr anzeigen ${icons.chevronDown}</button>
                    </div>

                    ${hasBaustein ? `
                    <div class="revision-preview-box">
                        <div class="preview-label">Vorschau Textbaustein</div>
                        <div class="text-clamp">${highlightSearchTerm(bausteinText, lastSearchRegex)}</div>
                        <button type="button" class="toggle-more-btn js-toggle-more-btn" aria-label="Vorschautext ein/ausklappen">Mehr anzeigen ${icons.chevronDown}</button>
                    </div>` : ''}
                </section>`;
            }).join('')}
        </article>`;
    }).join('');

    DOM.resultsContainer.insertAdjacentHTML('beforeend', html);

    if (currentRenderItems.length > 0) {
        requestAnimationFrame(() => renderChunks());
    }
}

export function renderDocumentView() {
    if (!DOM.schreibenCounter || !DOM.schreibenList) return;
    const count = state.revisionsSchreibenListe.length;
    
    DOM.schreibenCounter.textContent = `${count} Punkt${count !== 1 ? 'e' : ''}`;
    const tabCounter = document.getElementById('tabCounter');
    if(tabCounter) tabCounter.textContent = count;
    
    if (count === 0) {
        DOM.schreibenList.innerHTML = `
            <div class="doc-empty">
                Das Schreiben ist noch leer.<br><br>
                Wechseln Sie in die <strong>"Datenbank"</strong> und klicken Sie auf den Button zum Hinzufügen.
            </div>`;
        if (DOM.copySchreibenBtn) DOM.copySchreibenBtn.disabled = true;
        if (DOM.clearSchreibenBtn) DOM.clearSchreibenBtn.style.display = 'none';
        return;
    }

    if (DOM.copySchreibenBtn) DOM.copySchreibenBtn.disabled = false;
    if (DOM.clearSchreibenBtn) DOM.clearSchreibenBtn.style.display = 'flex';

    DOM.schreibenList.innerHTML = state.revisionsSchreibenListe.map((item, idx) => {
        return `
        <div class="doc-item">
            <header class="doc-item-title-row">
                <span class="doc-item-num">${idx + 1}.</span>
                <input type="text" class="doc-title-input js-item-title-input" data-id="${item.id}" value="${escapeHTML(item.titel)}" aria-label="Titel bearbeiten">
            </header>
            
            <div class="doc-editable-text js-item-text-editable" contenteditable="true"
                 data-id="${item.id}"
                 title="Klicken, um den Text zu bearbeiten"
                 aria-label="Inhalt bearbeiten">${escapeHTML(item.editedText)}</div>
                 
            <div class="doc-item-actions">
                ${idx > 0 ? `
                <button type="button" class="action-icon-btn js-move-item-btn" data-idx="${idx}" data-dir="-1" title="Nach oben" aria-label="Punkt nach oben verschieben">
                    ${icons.chevronUp}
                </button>` : ''}
                
                ${idx < count - 1 ? `
                <button type="button" class="action-icon-btn js-move-item-btn" data-idx="${idx}" data-dir="1" title="Nach unten" aria-label="Punkt nach unten verschieben">
                    ${icons.chevronDown}
                </button>` : ''}
                
                <button type="button" class="action-icon-btn js-remove-item-btn" data-id="${item.id}" style="color: #dc2626;" title="Punkt entfernen" aria-label="Punkt entfernen">
                    ${icons.trash}
                </button>
            </div>
        </div>`;
    }).join('');
}

/* ==========================================
   EXPORT / CLIPBOARD
   ========================================== */

export function copyComposedSchreiben() {
    if (state.revisionsSchreibenListe.length === 0) return;
    
    const plainText = state.revisionsSchreibenListe.map((item, idx) => {
        return `${idx + 1}. ${item.titel}\r\n\r\n${item.editedText}`;
    }).join("\r\n\r\n\r\n");
    
    const htmlContent = state.revisionsSchreibenListe.map((item, idx) => {
        const paragraphs = item.editedText.split(/(?:\r?\n){2,}/).map(block => {
            const htmlBlock = escapeHTML(block).replace(/\r?\n/g, '<br>');
            return `<p style="margin-top:0; margin-bottom:12pt; text-align:justify;">${htmlBlock}</p>`;
        }).join('');
        
        return `
            <p style="margin-top:0; margin-bottom:12pt; text-align:justify;">
                <strong>${idx + 1}. ${escapeHTML(item.titel)}</strong>
            </p>
            ${paragraphs}`;
    }).join(`<p style="margin-top:0; margin-bottom:24pt;">&nbsp;</p>`);

    const clipboardHtmlText = `<html><head><meta charset="utf-8"></head><body>${htmlContent}</body></html>`;
    const fallbackCopy = () => {
        navigator.clipboard.writeText(plainText).then(onCopySuccess);
    };
    
    if (navigator.clipboard && window.ClipboardItem) {
        navigator.clipboard.write([
            new ClipboardItem({
                "text/plain": new Blob([plainText], { type: "text/plain" }), 
                "text/html": new Blob([clipboardHtmlText], { type: "text/html" })
            })
        ]).then(onCopySuccess).catch(fallbackCopy);
    } else {
        fallbackCopy();
    }
}
