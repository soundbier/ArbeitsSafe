import { state } from './data.js';

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
    statusText: document.getElementById('statusText'), 
    csvFileInput: document.getElementById('csvFileInput'),
    reloadBtn: document.getElementById('reloadBtn')
};

/* ==========================================
   UI HELPER FUNKTIONEN
   ========================================== */

export function switchTab(tabId) {
    // Alle aktiven States entfernen
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Neuen Tab aktivieren
    document.getElementById(tabId).classList.add('active');
    document.querySelector(`.tab-btn[data-tab="${tabId}"]`).classList.add('active');
    
    // Auf Mobile sanft nach oben scrollen beim Tab-Wechsel
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Mobile-freundliches Toast-Feedback
export function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2500);
}

// Globale Text-Toggle Funktion für "Mehr lesen"
// Wird global an window gebunden, da es über Inline-HTML (onclick) aufgerufen wird
window.toggleText = function(btn) {
    const target = btn.previousElementSibling;
    target.classList.toggle('text-clamp');
    
    const isClamped = target.classList.contains('text-clamp');
    btn.innerHTML = isClamped ? 'Mehr anzeigen ⬇' : 'Weniger anzeigen ⬆';
};

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

export function escapeJS(str) { 
    if (!str) return "";
    return str
        .replace(/\\/g, '\\\\')
        .replace(/`/g, '\\`')
        .replace(/\n/g, '\\n'); 
}

export function containsExactWord(text, query) { 
    if (!text || !query) return false; 
    
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); 
    const regex = new RegExp(`(^|[^\\p{L}\\p{N}])(${escapedQuery})([^\\p{L}\\p{N}]|$)`, 'iu');
    
    return regex.test(text); 
}

export function copyTextToClipboard(btn, text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('✓ Text erfolgreich kopiert');
    });
}

function onCopySuccess() { 
    showToast('✓ Gesamtes Schreiben erfolgreich kopiert!');
}

/* ==========================================
   FILTER & DATENVERARBEITUNG
   ========================================== */

function getFilteredData() {
    const selectedLaw = DOM.lawFilter.value;
    const selectedParagraf = DOM.paragraphFilter.value;
    const selectedAbsatz = DOM.absatzFilter.value;
    const searchQuery = DOM.searchInput.value.trim();
    const requireBaustein = DOM.hasBausteinFilter.checked;

    return state.gesetzeData.filter(item => {
        const hasBausteinData = item.mangelVorgefunden || item.rechtsgrundlage || item.handlungsaufforderung;
        
        if (requireBaustein && !hasBausteinData) return false;
        if (selectedLaw && item.gesetzKuerzel !== selectedLaw) return false;
        if (selectedParagraf && item.paragraf !== selectedParagraf) return false;
        if (selectedAbsatz && item.absatz !== selectedAbsatz) return false; 
        
        if (searchQuery) {
            const searchableText = `${item.paragraf} ${item.absatz} ${item.titel} ${item.inhalt} ${item.mangelVorgefunden} ${item.rechtsgrundlage} ${item.handlungsaufforderung}`;
            if (!containsExactWord(searchableText, searchQuery)) return false;
        }
        
        return true;
    });
}

export function updateDropdowns() {
    const currentLaw = DOM.lawFilter.value;
    const currentParagraf = DOM.paragraphFilter.value;
    const currentAbsatz = DOM.absatzFilter.value;
    const requireBaustein = DOM.hasBausteinFilter.checked;
    
    const lawsMap = new Map();
    const paragrafenMap = new Map();
    const absatzeSet = new Set();
    
    // 1. Gesetze füllen
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

    // 2. Paragrafen füllen (abhängig vom Gesetz)
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

    // 3. Absätze füllen (abhängig vom Paragraf)
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

export function renderResults() {
    const data = getFilteredData();
    
    if (data.length === 0) { 
        DOM.resultsContainer.innerHTML = `<div class="card-base no-results">Keine passenden Einträge gefunden.</div>`; 
        return; 
    }
    if (!DOM.searchInput.value && !DOM.paragraphFilter.value && !DOM.lawFilter.value) { 
        DOM.resultsContainer.innerHTML = `<div class="card-base no-results">Wählen Sie Filter oder nutzen Sie die Suche.</div>`; 
        return; 
    }

    // Gruppieren nach Gesetz und Paragraf
    const groupMap = new Map();
    data.forEach(item => { 
        const key = `${item.gesetzKuerzel}_${item.paragraf}`; 
        if (!groupMap.has(key)) {
            groupMap.set(key, { ...item, entries: [] }); 
        }
        groupMap.get(key).entries.push(item); 
    });

    // HTML generieren
    DOM.resultsContainer.innerHTML = Array.from(groupMap.values()).map(group => {
        const titelErgaenzung = group.titel && !group.titel.startsWith(group.paragraf) ? ` — ${escapeHTML(group.titel)}` : '';
        
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
                <section class="paragraph-box">
                    <header class="paragraph-box-header">
                        <span class="absatz-tag">${escapeHTML(item.absatz || 'Norm')}</span>
                        <div class="action-buttons-group">
                            <button type="button" class="action-icon-btn" onclick="copyTextToClipboard(this, \`${escapeJS(item.inhalt)}\`)">
                                <span aria-hidden="true">📋</span> Gesetz
                            </button>
                            ${hasBaustein ? `
                            <button type="button" class="action-icon-btn ${isInDocument ? 'added' : ''}" id="add-btn-${item.id}" onclick="toggleToSchreiben('${item.id}')">
                                ${isInDocument ? '<span aria-hidden="true">✓</span> Im Schreiben' : '<span aria-hidden="true">➕</span> Zum Schreiben'}
                            </button>` : ''}
                        </div>
                    </header>
                    
                    <div class="text-content-wrapper">
                        <div class="paragraph-text text-clamp">${escapeHTML(item.inhalt)}</div>
                        <button type="button" class="toggle-more-btn" onclick="window.toggleText(this)">Mehr anzeigen ⬇</button>
                    </div>

                    ${hasBaustein ? `
                    <div class="revision-preview-box">
                        <div style="font-size:0.75rem;font-weight:700;color:var(--primary);margin-bottom:0.35rem;">
                            Vorschau Textbaustein
                        </div>
                        <div class="text-clamp">${escapeHTML(bausteinText)}</div>
                        <button type="button" class="toggle-more-btn" onclick="window.toggleText(this)">Mehr anzeigen ⬇</button>
                    </div>` : ''}
                </section>`;
            }).join('')}
        </article>`;
    }).join('');
}

export function renderDocumentView() {
    const count = state.revisionsSchreibenListe.length;
    
    DOM.schreibenCounter.textContent = `${count} Punkt${count !== 1 ? 'e' : ''}`;
    DOM.tabCounter.textContent = count; 
    
    // Leerer Zustand
    if (count === 0) {
        DOM.schreibenList.innerHTML = `
            <div class="doc-empty">
                Das Schreiben ist noch leer.<br><br>
                Wechseln Sie in den Reiter <strong>"Datenbank & Suche"</strong> und klicken Sie auf <strong>„➕ Zum Schreiben“</strong>.
            </div>`;
        DOM.copySchreibenBtn.disabled = true; 
        DOM.clearSchreibenBtn.style.display = 'none'; 
        return;
    }

    // Gefüllter Zustand
    DOM.copySchreibenBtn.disabled = false; 
    DOM.clearSchreibenBtn.style.display = 'flex';

    DOM.schreibenList.innerHTML = state.revisionsSchreibenListe.map((item, idx) => {
        return `
        <div class="doc-item">
            <header class="doc-item-title-row">
                <span class="doc-item-num">${idx + 1}.</span>
                <input type="text" class="doc-title-input" value="${escapeHTML(item.titel)}" oninput="updateItemTitle('${item.id}', this.value)">
            </header>
            
            <div class="doc-editable-text" contenteditable="true" 
                 oninput="updateItemText('${item.id}', this.innerText)" 
                 title="Klicken, um den Text zu bearbeiten">${escapeHTML(item.editedText)}</div>
                 
            <div class="doc-item-actions">
                ${idx > 0 ? `
                <button type="button" class="action-icon-btn" title="Nach oben" onclick="moveItem(${idx}, -1)">
                    <span aria-hidden="true">▲</span>
                </button>` : ''}
                
                ${idx < count - 1 ? `
                <button type="button" class="action-icon-btn" title="Nach unten" onclick="moveItem(${idx}, 1)">
                    <span aria-hidden="true">▼</span>
                </button>` : ''}
                
                <button type="button" class="action-icon-btn" style="color: #dc2626;" title="Punkt entfernen" onclick="removeFromSchreiben('${item.id}')">
                    <span aria-hidden="true">🗑️</span>
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
    
    // 1. Plain Text generieren
    const plainText = state.revisionsSchreibenListe.map((item, idx) => {
        return `${idx + 1}. ${item.titel}\r\n\r\n${item.editedText}`;
    }).join("\r\n\r\n\r\n");
    
    // 2. Formatiertes HTML generieren
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
    
    // 3. In Zwischenablage schreiben (Rich Text bevorzugt)
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
