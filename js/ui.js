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
    
    const laws = [...new Set(data.map(d => d.gesetzKuerzel || d.Gesetz))].filter(Boolean);
    const currentLaw = DOM.lawFilter.value;
    
    populateFilter(DOM.lawFilter, laws, "-- Alle Gesetze --");
    DOM.lawFilter.value = currentLaw || "";

    const filteredByLaw = currentLaw ? data.filter(d => (d.gesetzKuerzel || d.Gesetz) === currentLaw) : data;
        
    const paragraphs = [...new Set(filteredByLaw.map(d => d.paragraf || d.Paragraf))].filter(Boolean);
    const currentPara = DOM.paragraphFilter.value;
    
    populateFilter(DOM.paragraphFilter, paragraphs, "-- Alle Paragrafen --");
    DOM.paragraphFilter.value = paragraphs.includes(currentPara) ? currentPara : "";

    const currentParaValue = DOM.paragraphFilter.value;
    const filteredByPara = currentParaValue ? filteredByLaw.filter(d => (d.paragraf || d.Paragraf) === currentParaValue) : filteredByLaw;
        
    const absaetze = [...new Set(filteredByPara.map(d => d.absatz || d.Absatz))].filter(Boolean);
    const currentAbs = DOM.absatzFilter.value;
    
    populateFilter(DOM.absatzFilter, absaetze, "-- Alle Absätze --");
    DOM.absatzFilter.value = absaetze.includes(currentAbs) ? currentAbs : "";
}

export function renderResults() {
    const lawVal = DOM.lawFilter.value;
    const paraVal = DOM.paragraphFilter.value;
    const absVal = DOM.absatzFilter.value;
    const searchVal = DOM.searchInput.value.trim().toLowerCase();

    // --- LOGIK-STOPPER 1: Gar keine Auswahl getroffen ---
    if (!lawVal && !searchVal) {
        DOM.resultsContainer.innerHTML = `
            <div class="empty-state card-base">
                <p class="bold-text">Datenbank durchsuchen</p>
                <p>Wählen Sie oben ein Gesetz und einen Paragrafen aus oder nutzen Sie die Suchleiste, um Vorschriften anzuzeigen.</p>
            </div>
        `;
        return;
    }

    // --- LOGIK-STOPPER 2: Nur Gesetz gewählt, aber kein Paragraf ---
    if (lawVal && !paraVal && !searchVal) {
        DOM.resultsContainer.innerHTML = `
            <div class="empty-state card-base">
                <p class="bold-text">Bitte Paragrafen wählen</p>
                <p>Sie haben ein Gesetz gewählt. Wählen Sie nun den Paragrafen aus dem Dropdown-Menü, um die Ergebnisse anzuzeigen.</p>
            </div>
        `;
        return;
    }

    let results = state.gesetzeData;
    
    // Filter strikt anwenden
    if (lawVal) results = results.filter(r => (r.gesetzKuerzel || r.Gesetz) === lawVal);
    if (paraVal) results = results.filter(r => (r.paragraf || r.Paragraf) === paraVal);
    if (absVal) results = results.filter(r => (r.absatz || r.Absatz) === absVal);
    
    // Suche anwenden
    if (searchVal) {
        results = results.filter(r => {
            const text = (r.inhalt || r.Rechtstext || '').toLowerCase();
            const titel = (r.titel || '').toLowerCase();
            const mangel = (r.mangelVorgefunden || '').toLowerCase();
            return text.includes(searchVal) || titel.includes(searchVal) || mangel.includes(searchVal);
        });
    }
    
    // Baustein-Filter anwenden
    if (DOM.hasBausteinFilter.checked) {
        results = results.filter(r => r.Textbaustein || r.mangelVorgefunden || r.rechtsgrundlage || r.handlungsaufforderung);
    }

    // Falls die Filterkombination keine Treffer hat
    if (results.length === 0) {
        DOM.resultsContainer.innerHTML = `
            <div class="empty-state card-base">
                <p class="bold-text">Keine Ergebnisse gefunden</p>
                <p>Es gibt keine Einträge, die zu dieser exakten Auswahl passen.</p>
            </div>
        `;
        return;
    }

    // Ergebnisse rendern
    DOM.resultsContainer.innerHTML = '';
    
    results.forEach(row => {
        let pGesetz = row.gesetzKuerzel || row.Gesetz;
        let pPara = row.paragraf || row.Paragraf;
        let pAbsatz = row.absatz || row.Absatz;
        let pSatz = row.satz || row.Satz;
        let pNummer = row.nummer || row.Nummer;
        let pBuchstabe = row.buchstabe || row.Buchstabe;

        let titleParts = [];
        if(pGesetz) titleParts.push(pGesetz);
        if(pPara) titleParts.push(pPara.includes('§') ? pPara : `§ ${pPara}`);
        if(pAbsatz) titleParts.push(pAbsatz.includes('Abs') ? pAbsatz : `Abs. ${pAbsatz}`);
        if(pSatz) titleParts.push(`Satz ${pSatz}`);
        if(pNummer) titleParts.push(`Nr. ${pNummer}`);
        if(pBuchstabe) titleParts.push(`lit. ${pBuchstabe}`);
        
        const title = titleParts.join(' ') || 'Ohne Zuordnung';

        let textbaustein = row.Textbaustein || [row.mangelVorgefunden, row.rechtsgrundlage, row.handlungsaufforderung].filter(Boolean).join("\n");
        const hasBaustein = textbaustein && textbaustein.trim() !== '';
        
        const card = document.createElement('div');
        card.className = `card-base result-card ${hasBaustein ? 'has-textbaustein' : ''}`;
        
        let badgesHtml = '';
        if (row.Kategorie) { badgesHtml += `<span class="badge" style="background:var(--secondary-bg); color:var(--text-dark);">${row.Kategorie}</span>`; }
        if (row.Art) { badgesHtml += `<span class="badge" style="background:var(--bg-gradient-start); color:var(--primary); border: 1px solid var(--border-color);">${row.Art}</span>`; }

        let innerHtml = `
            <div class="result-header">
                <div class="result-title">${title} ${row.titel ? '- ' + escapeHtml(row.titel) : ''}</div>
                <div class="result-badges">${badgesHtml}</div>
            </div>
            
            <div class="result-section">
                <div class="result-label">Rechtstext</div>
                <div class="result-content">${escapeHtml(row.Rechtstext || row.inhalt || 'Kein Text vorhanden')}</div>
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
        } else {
             innerHtml += `
                <div class="result-section" style="opacity: 0.6;">
                    <div class="result-label">Textbaustein</div>
                    <div class="result-content"><em>Kein vorgefertigter Textbaustein für diese Vorschrift hinterlegt.</em></div>
                </div>
            `;
        }

        const isAdded = state.revisionsSchreibenListe.some(item => (item.id || item._internalId) === (row.id || row._internalId));
        innerHtml += `
            <div class="result-actions">
                ${hasBaustein ? `
                    <button class="action-icon-btn ${isAdded ? 'added' : ''}" data-id="${row.id || row._internalId}">
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
            window.toggleToSchreiben(id); 
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
        let pGesetz = item.gesetzKuerzel || item.Gesetz;
        let pPara = item.paragraf || item.Paragraf;
        let pAbsatz = item.absatz || item.Absatz;
        let pSatz = item.satz || item.Satz;
        let pNummer = item.nummer || item.Nummer;
        let pBuchstabe = item.buchstabe || item.Buchstabe;

        let titleParts = [];
        if(pGesetz) titleParts.push(pGesetz);
        if(pPara) titleParts.push(pPara.includes('§') ? pPara : `§ ${pPara}`);
        if(pAbsatz) titleParts.push(pAbsatz.includes('Abs') ? pAbsatz : `Abs. ${pAbsatz}`);
        if(pSatz) titleParts.push(`Satz ${pSatz}`);
        if(pNummer) titleParts.push(`Nr. ${pNummer}`);
        if(pBuchstabe) titleParts.push(`lit. ${pBuchstabe}`);
        
        const title = titleParts.join(' ');
        
        const div = document.createElement('div');
        div.className = 'schreiben-item card-base';
        
        div.innerHTML = `
            <div class="item-header" style="display:flex; justify-content:space-between; margin-bottom: 10px;">
                <div>
                    <span class="item-index" style="font-weight:bold;">${index + 1}.</span>
                    <span class="item-title" style="font-weight:bold;">${title}</span>
                </div>
                <button class="remove-btn btn-mini" onclick="window.removeFromSchreiben('${item.id || item._internalId}')" title="Entfernen" style="border:none; background:transparent; cursor:pointer; color:var(--text-muted);">
                    <span aria-hidden="true">✕</span>
                </button>
            </div>
            
            <div class="item-content">
                <textarea class="edit-textarea" data-id="${item.id || item._internalId}" rows="4" style="width:100%; border:1px solid var(--border-color); border-radius:6px; padding:10px; font-family:inherit; margin-bottom: 10px;">${item.editedText || item._editedText}</textarea>
            </div>
            
            <button class="toggle-more-btn" onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'block' : 'none'; this.innerHTML = this.nextElementSibling.style.display === 'none' ? '<span>👁️</span> Originaltext anzeigen' : '<span>👁️</span> Originaltext ausblenden'">
                <span>👁️</span> Originaltext anzeigen
            </button>
            <div class="original-text" style="display: none; background:var(--bg-gradient-start); padding:10px; border-radius:6px; margin-top:5px;">
                <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 5px; text-transform: uppercase; font-weight: 700;">Originaler Rechtstext</p>
                ${escapeHtml(item.inhalt || item.Rechtstext)}
            </div>
        `;
        
        DOM.schreibenList.appendChild(div);
    });

    document.querySelectorAll('.edit-textarea').forEach(textarea => {
        textarea.addEventListener('input', (e) => {
            const id = e.target.getAttribute('data-id');
            const item = state.revisionsSchreibenListe.find(d => (d.id || d._internalId) === id);
            if (item) {
                item.editedText = e.target.value;
                item._editedText = e.target.value;
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
