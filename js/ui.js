import { state } from './data.js';

/* ==========================================
   DOM ELEMENTE
   ========================================== */
export const DOM = {
    lawFilter: document.getElementById('lawFilter'), 
    paragraphFilter: document.getElementById('paragraphFilter'),
    absatzFilter: document.getElementById('absatzFilter'), 
    searchInput: document.getElementById('searchInput'),
    hasBausteinFilter: document.getElementById('hasBausteinFilter'), 
    
    resultsContainer: document.getElementById('results'),
    schreibenList: document.getElementById('schreibenList'), 
    errorContainer: document.getElementById('errorContainer'), 
    
    schreibenCounter: document.getElementById('schreibenCounter'),
    tabCounter: document.getElementById('tabCounter'),
    copySchreibenBtn: document.getElementById('copySchreibenBtn'), 
    clearSchreibenBtn: document.getElementById('clearSchreibenBtn'),
    statusBadge: document.getElementById('statusBadge'),
    csvFileInput: document.getElementById('csvFileInput'),
    reloadBtn: document.getElementById('reloadBtn')
};

export function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    
    document.getElementById(tabId).classList.add('active');
    document.querySelector(`.tab-btn[data-tab="${tabId}"]`).classList.add('active');
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

export function showToast(message) {
    const toast = document.getElementById('toastMessage');
    const toastText = document.getElementById('toastText');
    if(toastText) { toastText.textContent = message; } else { toast.textContent = message; }
    
    const undoBtn = document.getElementById('toastUndoBtn');
    if(undoBtn) undoBtn.style.display = 'none';

    if(toast) toast.classList.add('show');
    setTimeout(() => { if(toast) toast.classList.remove('show'); }, 3000);
}

export function showError(message) {
    DOM.errorContainer.textContent = message;
    DOM.errorContainer.style.display = 'block';
    setTimeout(() => { DOM.errorContainer.style.display = 'none'; }, 5000);
}

export function updateCounters() {
    const count = state.revisionsSchreibenListe.length;
    DOM.schreibenCounter.textContent = count;
    DOM.tabCounter.textContent = count;
    
    if (count > 0) {
        DOM.tabCounter.style.backgroundColor = 'var(--primary)';
        DOM.tabCounter.style.color = 'white';
    } else {
        DOM.tabCounter.style.backgroundColor = 'var(--text-muted)';
        DOM.tabCounter.style.color = 'white';
    }
}

export function populateFilter(selectElement, items, defaultText = "-- Alle --") {
    selectElement.innerHTML = `<option value="">${defaultText}</option>`;
    items.sort().forEach(item => {
        if (!item) return;
        const opt = document.createElement('option');
        opt.value = item;
        opt.textContent = item;
        selectElement.appendChild(opt);
    });
}

export function updateDropdowns() {
    const data = state.gesetzeData;
    
    const laws = [...new Set(data.map(d => d.gesetzKuerzel))].filter(Boolean);
    const currentLaw = DOM.lawFilter.value;
    
    populateFilter(DOM.lawFilter, laws, "-- Alle Gesetze --");
    DOM.lawFilter.value = currentLaw || "";

    const filteredByLaw = currentLaw ? data.filter(d => d.gesetzKuerzel === currentLaw) : data;
        
    const paragraphs = [...new Set(filteredByLaw.map(d => d.paragraf))].filter(Boolean);
    const currentPara = DOM.paragraphFilter.value;
    
    populateFilter(DOM.paragraphFilter, paragraphs, "-- Alle Paragrafen --");
    DOM.paragraphFilter.value = paragraphs.includes(currentPara) ? currentPara : "";

    const currentParaValue = DOM.paragraphFilter.value;
    const filteredByPara = currentParaValue ? filteredByLaw.filter(d => d.paragraf === currentParaValue) : filteredByLaw;
        
    const absaetze = [...new Set(filteredByPara.map(d => d.absatz))].filter(Boolean);
    const currentAbs = DOM.absatzFilter.value;
    
    populateFilter(DOM.absatzFilter, absaetze, "-- Alle Absätze --");
    DOM.absatzFilter.value = absaetze.includes(currentAbs) ? currentAbs : "";
}

export function renderResults() {
    let results = state.gesetzeData;
    
    // Filter anwenden
    if (DOM.lawFilter.value) results = results.filter(r => r.gesetzKuerzel === DOM.lawFilter.value);
    if (DOM.paragraphFilter.value) results = results.filter(r => r.paragraf === DOM.paragraphFilter.value);
    if (DOM.absatzFilter.value) results = results.filter(r => r.absatz === DOM.absatzFilter.value);
    
    const searchVal = DOM.searchInput.value.toLowerCase();
    if (searchVal) {
        results = results.filter(r => 
            (r.inhalt && r.inhalt.toLowerCase().includes(searchVal)) ||
            (r.titel && r.titel.toLowerCase().includes(searchVal)) ||
            (r.mangelVorgefunden && r.mangelVorgefunden.toLowerCase().includes(searchVal))
        );
    }
    
    if (DOM.hasBausteinFilter.checked) {
        results = results.filter(r => r.mangelVorgefunden || r.rechtsgrundlage || r.handlungsaufforderung);
    }

    if (results.length === 0) {
        DOM.resultsContainer.innerHTML = `
            <div class="empty-state card-base">
                <p class="bold-text">Keine Ergebnisse gefunden</p>
                <p>Bitte passen Sie Ihre Filter an oder ändern Sie den Suchbegriff.</p>
            </div>
        `;
        return;
    }

    DOM.resultsContainer.innerHTML = '';
    
    results.forEach(row => {
        const hasBaustein = (row.mangelVorgefunden || row.rechtsgrundlage || row.handlungsaufforderung);
        const textbaustein = [row.mangelVorgefunden, row.rechtsgrundlage, row.handlungsaufforderung].filter(Boolean).join("\n\n");
        
        const card = document.createElement('div');
        card.className = `card-base result-card ${hasBaustein ? 'has-textbaustein' : ''}`;
        
        let titleParts = [];
        if(row.gesetzKuerzel) titleParts.push(row.gesetzKuerzel);
        if(row.paragraf) titleParts.push(row.paragraf);
        if(row.absatz) titleParts.push(row.absatz);
        const title = titleParts.join(' ') || 'Ohne Zuordnung';

        let innerHtml = `
            <div class="result-header">
                <div class="result-title">${title} - ${escapeHtml(row.titel)}</div>
            </div>
            
            <div class="result-section">
                <div class="result-label">Rechtstext</div>
                <div class="result-content">${escapeHtml(row.inhalt || 'Kein Text vorhanden')}</div>
            </div>
        `;

        if (hasBaustein) {
            innerHtml += `
                <div class="result-section baustein-section">
                    <div class="result-label">
                        Textbaustein für Schreiben
                        <button class="btn btn-tool btn-mini" title="Kopieren" data-copy-text="${escapeQuotes(textbaustein)}">
                            <span aria-hidden="true">📋</span>
                        </button>
                    </div>
                    <div class="result-content highlight-text">${escapeHtml(textbaustein)}</div>
                </div>
            `;
        }

        const isAdded = state.revisionsSchreibenListe.some(item => item.id === row.id);
        innerHtml += `
            <div class="result-actions">
                ${hasBaustein ? `
                    <button class="action-icon-btn ${isAdded ? 'added' : ''}" data-id="${row.id}">
                        ${isAdded ? '<span>✓</span> Im Entwurf' : '<span>+</span> Zum Entwurf'}
                    </button>
                ` : `<button class="action-icon-btn" disabled style="opacity:0.4; cursor:not-allowed;">Kein Baustein verfügbar</button>`}
            </div>
        `;

        card.innerHTML = innerHtml;
        DOM.resultsContainer.appendChild(card);
    });

    document.querySelectorAll('.action-icon-btn[data-id]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            window.toggleToSchreiben(id); // Gefixed!
        });
    });

    document.querySelectorAll('[data-copy-text]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const text = e.currentTarget.getAttribute('data-copy-text');
            navigator.clipboard.writeText(text).then(() => showToast('Baustein kopiert!'));
        });
    });
}

export function renderSchreiben() {
    updateCounters();
    
    if (state.revisionsSchreibenListe.length === 0) {
        DOM.schreibenList.innerHTML = `
            <div class="empty-state">
                <p class="bold-text">Noch keine Bausteine</p>
                <p>Suchen Sie in der Datenbank und fügen Sie Textbausteine zum Entwurf hinzu.</p>
            </div>
        `;
        return;
    }

    DOM.schreibenList.innerHTML = '';
    
    state.revisionsSchreibenListe.forEach((item, index) => {
        let titleParts = [];
        if(item.gesetzKuerzel) titleParts.push(item.gesetzKuerzel);
        if(item.paragraf) titleParts.push(item.paragraf);
        if(item.absatz) titleParts.push(item.absatz);
        const title = titleParts.join(' ');
        
        const div = document.createElement('div');
        div.className = 'schreiben-item card-base';
        
        div.innerHTML = `
            <div class="item-header" style="display:flex; justify-content:space-between; margin-bottom: 10px;">
                <div>
                    <span class="item-index" style="font-weight:bold;">${index + 1}.</span>
                    <span class="item-title" style="font-weight:bold;">${title}</span>
                </div>
                <button class="remove-btn btn-mini" onclick="window.removeFromSchreiben('${item.id}')" title="Entfernen" style="border:none; background:transparent; cursor:pointer; color:var(--text-muted);">
                    <span aria-hidden="true">✕</span>
                </button>
            </div>
            
            <div class="item-content">
                <textarea class="edit-textarea" data-id="${item.id}" rows="4" style="width:100%; border:1px solid var(--border-color); border-radius:6px; padding:10px; font-family:inherit; margin-bottom: 10px;">${item.editedText}</textarea>
            </div>
            
            <button class="toggle-more-btn" onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'block' : 'none'; this.innerHTML = this.nextElementSibling.style.display === 'none' ? '<span>👁️</span> Originaltext anzeigen' : '<span>👁️</span> Originaltext ausblenden'">
                <span>👁️</span> Originaltext anzeigen
            </button>
            <div class="original-text" style="display: none; background:var(--bg-gradient-start); padding:10px; border-radius:6px; margin-top:5px;">
                <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 5px; text-transform: uppercase; font-weight: 700;">Originaler Rechtstext</p>
                ${escapeHtml(item.inhalt)}
            </div>
        `;
        
        DOM.schreibenList.appendChild(div);
    });

    document.querySelectorAll('.edit-textarea').forEach(textarea => {
        textarea.addEventListener('input', (e) => {
            const id = e.target.getAttribute('data-id');
            const item = state.revisionsSchreibenListe.find(d => d.id === id);
            if (item) {
                item.editedText = e.target.value;
                if(window.saveToLocalStorage) window.saveToLocalStorage();
            }
        });
    });
}

function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe.toString()
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

function escapeQuotes(unsafe) {
    if (!unsafe) return '';
    return unsafe.toString().replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
