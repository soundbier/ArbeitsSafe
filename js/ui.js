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
    const toast = document.getElementById('toastMessage') || document.getElementById('toast');
    // FIX: Nur den Text im Span ändern, damit der Undo-Button aus der Checkliste nicht überschrieben wird
    if(document.getElementById('toastText')) { document.getElementById('toastText').textContent = message; } else { toast.textContent = message; }
    
    // Undo-Button ausblenden, falls er von der Checkliste noch sichtbar wäre
    const undoBtn = document.getElementById('toastUndoBtn');
    if(undoBtn) undoBtn.style.display = 'none';

    if(toast) toast.classList.add('show');
    
    setTimeout(() => {
        if(toast) toast.classList.remove('show');
    }, 3000);
}

export function showError(message) {
    DOM.errorContainer.textContent = message;
    DOM.errorContainer.style.display = 'block';
    setTimeout(() => { DOM.errorContainer.style.display = 'none'; }, 5000);
}

export function updateCounters() {
    DOM.schreibenCounter.textContent = state.schreibenData.length;
    DOM.tabCounter.textContent = state.schreibenData.length;
    
    if (state.schreibenData.length > 0) {
        DOM.tabCounter.style.backgroundColor = 'var(--primary)';
        DOM.tabCounter.style.color = 'white';
    } else {
        DOM.tabCounter.style.backgroundColor = 'var(--text-muted)';
        DOM.tabCounter.style.color = 'white';
    }
}

/* ==========================================
   FILTER & DROPDOWNS
   ========================================== */

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
    const data = state.parsedData;
    
    // Alle verfügbaren Gesetze, die auch in den aktuellen Daten vorkommen
    const laws = [...new Set(data.map(d => d.Gesetz))].filter(Boolean);
    const currentLaw = DOM.lawFilter.value;
    
    populateFilter(DOM.lawFilter, laws, "-- Alle Gesetze --");
    DOM.lawFilter.value = currentLaw || "";

    // Paragrafen filtern basierend auf Gesetz
    const filteredByLaw = currentLaw 
        ? data.filter(d => d.Gesetz === currentLaw)
        : data;
        
    const paragraphs = [...new Set(filteredByLaw.map(d => d.Paragraf))].filter(Boolean);
    const currentPara = DOM.paragraphFilter.value;
    
    populateFilter(DOM.paragraphFilter, paragraphs, "-- Alle Paragrafen --");
    // Paragraf beibehalten, falls er im neuen Gesetz existiert
    if (paragraphs.includes(currentPara)) {
        DOM.paragraphFilter.value = currentPara;
    } else {
        DOM.paragraphFilter.value = "";
    }

    // Absätze filtern basierend auf Gesetz UND Paragraf
    const currentParaValue = DOM.paragraphFilter.value;
    const filteredByPara = currentParaValue
        ? filteredByLaw.filter(d => d.Paragraf === currentParaValue)
        : filteredByLaw;
        
    const absaetze = [...new Set(filteredByPara.map(d => d.Absatz))].filter(Boolean);
    const currentAbs = DOM.absatzFilter.value;
    
    populateFilter(DOM.absatzFilter, absaetze, "-- Alle Absätze --");
    if (absaetze.includes(currentAbs)) {
        DOM.absatzFilter.value = currentAbs;
    } else {
        DOM.absatzFilter.value = "";
    }
}

/* ==========================================
   RENDERING SUCHE & DATENBANK
   ========================================== */

export function renderResults(results) {
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
        const hasBaustein = row.Textbaustein && row.Textbaustein.trim() !== '';
        
        const card = document.createElement('div');
        card.className = `card-base result-card ${hasBaustein ? 'has-textbaustein' : ''}`;
        
        // Titel generieren
        let titleParts = [];
        if(row.Gesetz) titleParts.push(row.Gesetz);
        if(row.Paragraf) titleParts.push(`§ ${row.Paragraf}`);
        if(row.Absatz) titleParts.push(`Abs. ${row.Absatz}`);
        if(row.Satz) titleParts.push(`Satz ${row.Satz}`);
        if(row.Nummer) titleParts.push(`Nr. ${row.Nummer}`);
        if(row.Buchstabe) titleParts.push(`lit. ${row.Buchstabe}`);
        
        const title = titleParts.join(' ') || 'Ohne Zuordnung';

        // Badges generieren
        let badgesHtml = '';
        if (row.Kategorie) {
            badgesHtml += `<span class="badge" style="background:var(--secondary-bg); color:var(--text-dark);">${row.Kategorie}</span>`;
        }
        if (row.Art) {
            badgesHtml += `<span class="badge" style="background:var(--bg-gradient-start); color:var(--primary); border: 1px solid var(--border-color);">${row.Art}</span>`;
        }

        // HTML aufbauen
        let innerHtml = `
            <div class="result-header">
                <div class="result-title">${title}</div>
                <div class="result-badges">${badgesHtml}</div>
            </div>
            
            <div class="result-section">
                <div class="result-label">Rechtstext</div>
                <div class="result-content">${escapeHtml(row.Rechtstext || 'Kein Text vorhanden')}</div>
            </div>
        `;

        if (hasBaustein) {
            innerHtml += `
                <div class="result-section baustein-section">
                    <div class="result-label">
                        Textbaustein für Schreiben
                        <button class="btn btn-tool btn-mini" title="Kopieren" data-copy-text="${escapeQuotes(row.Textbaustein)}">
                            <span aria-hidden="true">📋</span>
                        </button>
                    </div>
                    <div class="result-content highlight-text">${escapeHtml(row.Textbaustein)}</div>
                </div>
            `;
        } else {
             innerHtml += `
                <div class="result-section" style="opacity: 0.6;">
                    <div class="result-label">Textbaustein</div>
                    <div class="result-content"><em>Kein vorgefertigter Textbaustein für diese Vorschrift hinterlegt.</em></div>
                </div>
            `;
        }

        // Action Buttons
        const isAdded = state.schreibenData.some(item => item.id === row._internalId);
        innerHtml += `
            <div class="result-actions">
                ${hasBaustein ? `
                    <button class="action-icon-btn ${isAdded ? 'added' : ''}" data-id="${row._internalId}">
                        ${isAdded ? '<span>✓</span> Im Entwurf' : '<span>+</span> Zum Entwurf'}
                    </button>
                ` : `<button class="action-icon-btn" disabled style="opacity:0.4; cursor:not-allowed;">Kein Baustein verfügbar</button>`}
            </div>
        `;

        card.innerHTML = innerHtml;
        DOM.resultsContainer.appendChild(card);
    });

    // Event Listener für "Zum Schreiben" Buttons hinzufügen
    document.querySelectorAll('.action-icon-btn[data-id]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            window.toggleSchreibenItem(id);
        });
    });

    // Event Listener für kleine Copy-Buttons an den Bausteinen
    document.querySelectorAll('[data-copy-text]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const text = e.currentTarget.getAttribute('data-copy-text');
            navigator.clipboard.writeText(text).then(() => {
                showToast('Baustein kopiert!');
            });
        });
    });
}


/* ==========================================
   RENDERING SCHREIBEN (ENTWURF)
   ========================================== */

export function renderSchreiben() {
    if (state.schreibenData.length === 0) {
        DOM.schreibenList.innerHTML = `
            <div class="empty-state">
                <p class="bold-text">Noch keine Bausteine</p>
                <p>Suchen Sie in der Datenbank und fügen Sie Textbausteine zum Entwurf hinzu.</p>
            </div>
        `;
        return;
    }

    DOM.schreibenList.innerHTML = '';
    
    state.schreibenData.forEach((item, index) => {
        let titleParts = [];
        if(item.Gesetz) titleParts.push(item.Gesetz);
        if(item.Paragraf) titleParts.push(`§ ${item.Paragraf}`);
        if(item.Absatz) titleParts.push(`Abs. ${item.Absatz}`);
        if(item.Satz) titleParts.push(`Satz ${item.Satz}`);
        if(item.Nummer) titleParts.push(`Nr. ${item.Nummer}`);
        if(item.Buchstabe) titleParts.push(`lit. ${item.Buchstabe}`);
        
        const title = titleParts.join(' ');
        
        const div = document.createElement('div');
        div.className = 'schreiben-item card-base';
        
        div.innerHTML = `
            <div class="item-header">
                <div>
                    <span class="item-index">${index + 1}.</span>
                    <span class="item-title">${title}</span>
                </div>
                <button class="remove-btn" onclick="window.removeSchreibenItem('${item._internalId}')" title="Entfernen">
                    <span aria-hidden="true">✕</span>
                </button>
            </div>
            
            <div class="item-content">
                <textarea class="edit-textarea" data-id="${item._internalId}" rows="3">${item._editedText || item.Textbaustein}</textarea>
            </div>
            
            <button class="toggle-more-btn" onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'block' : 'none'; this.innerHTML = this.nextElementSibling.style.display === 'none' ? '<span>👁️</span> Originaltext anzeigen' : '<span>👁️</span> Originaltext ausblenden'">
                <span>👁️</span> Originaltext anzeigen
            </button>
            <div class="original-text" style="display: none;">
                <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 5px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700;">Originaler Rechtstext</p>
                ${escapeHtml(item.Rechtstext)}
            </div>
        `;
        
        DOM.schreibenList.appendChild(div);
    });

    // Auto-Save für Textareas
    document.querySelectorAll('.edit-textarea').forEach(textarea => {
        textarea.addEventListener('input', (e) => {
            const id = e.target.getAttribute('data-id');
            const item = state.schreibenData.find(d => d._internalId === id);
            if (item) {
                item._editedText = e.target.value;
                window.saveToLocalStorage(); // Speichert direkt während des Tippens
            }
        });
    });
}

/* ==========================================
   HILFSFUNKTIONEN (HTML ESCAPING)
   ========================================== */

function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
         .toString()
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

function escapeQuotes(unsafe) {
    if (!unsafe) return '';
    return unsafe
         .toString()
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}
