import { state, parseCSV, saveState, loadState } from './data.js';
import { DOM, updateDropdowns, renderResults, renderDocumentView, copyComposedSchreiben, copyTextToClipboard, switchTab, toggleText, injectStaticIcons } from './ui.js';

// --- Haupt-Logik ---
function initData(csvString, fileName = null) {
    state.lastLoadedFileText = csvString; 
    state.lastLoadedFileName = fileName;
    state.gesetzeData = parseCSV(csvString);
    
    if (fileName) {
        DOM.statusBadge.className = 'status-mini';
        DOM.statusBadge.title = `${fileName} (${state.gesetzeData.length} Einträge)`;
        DOM.statusBadge.style.color = 'var(--success-text)';
    } else {
        DOM.statusBadge.className = 'status-mini';
        DOM.statusBadge.title = `Demo-Modus (${state.gesetzeData.length} Einträge)`;
        DOM.statusBadge.style.color = '#eab308';
    }
    updateDropdowns(); 
    renderResults();
}

function toggleToSchreiben(itemId) {
    const item = state.gesetzeData.find(i => i.id === itemId); 
    if (!item) return;
    const idx = state.revisionsSchreibenListe.findIndex(i => i.id === itemId);

    if (idx > -1) { 
        state.revisionsSchreibenListe.splice(idx, 1); 
    } else {
        let newItem = { ...item };
        newItem.editedText = [item.mangelVorgefunden, item.rechtsgrundlage, item.handlungsaufforderung].filter(Boolean).join("\n\n");
        state.revisionsSchreibenListe.push(newItem); 
    }
    renderResults();
    renderDocumentView();
    saveState();
}

function updateItemTitle(id, v) {
    const i = state.revisionsSchreibenListe.find(x => x.id === id);
    if(i) {
        i.titel = v;
        saveState();
    }
}

function updateItemText(id, v) {
    const i = state.revisionsSchreibenListe.find(x => x.id === id);
    if(i) {
        i.editedText = v;
        saveState();
    }
}

function moveItem(idx, dir) {
    const n = idx + dir; 
    if(n >= 0 && n < state.revisionsSchreibenListe.length){ 
        state.revisionsSchreibenListe.splice(n, 0, state.revisionsSchreibenListe.splice(idx, 1)[0]); 
        renderDocumentView();
        saveState();
    }
}

function clearSchreiben() {
    if(confirm('Möchten Sie den gesamten Entwurf wirklich leeren?')) {
        state.revisionsSchreibenListe = [];
        renderResults();
        renderDocumentView();
        saveState();
    }
}

// --- Event Delegation ---

document.addEventListener('click', e => {
    // Tab Navigation
    const tabBtn = e.target.closest('.tab-btn');
    if (tabBtn) switchTab(tabBtn.dataset.tab);

    // "Mehr anzeigen" Toggles
    const toggleBtn = e.target.closest('.js-toggle-more-btn');
    if (toggleBtn) toggleText(toggleBtn);

    // Datenbank-Aktionen: Kopieren
    const copyItemBtn = e.target.closest('.js-copy-item-btn');
    if (copyItemBtn) copyTextToClipboard(copyItemBtn.dataset.text);

    // Datenbank-Aktionen: Zum Schreiben hinzufügen/entfernen
    const toggleItemBtn = e.target.closest('.js-toggle-item-btn');
    if (toggleItemBtn) toggleToSchreiben(toggleItemBtn.dataset.id);

    // Entwurf-Aktionen: Entfernen
    const removeItemBtn = e.target.closest('.js-remove-item-btn');
    if (removeItemBtn) toggleToSchreiben(removeItemBtn.dataset.id);

    // Entwurf-Aktionen: Verschieben
    const moveItemBtn = e.target.closest('.js-move-item-btn');
    if (moveItemBtn) moveItem(parseInt(moveItemBtn.dataset.idx), parseInt(moveItemBtn.dataset.dir));

    // Entwurf-Aktionen: Kopieren & Leeren
    if (e.target.closest('#copySchreibenBtn')) copyComposedSchreiben();
    if (e.target.closest('#clearSchreibenBtn')) clearSchreiben();
    if (e.target.closest('#reloadBtn')) initData(state.lastLoadedFileText, state.lastLoadedFileName);

    // Settings Toggle
    const settingsBtn = e.target.closest('#settingsBtn');
    if (settingsBtn) {
        const menu = document.getElementById('settingsMenu');
        menu.classList.toggle('hidden');
        menu.setAttribute('aria-hidden', menu.classList.contains('hidden'));
    }

    // Settings Actions
    if (e.target.closest('#btn-clear-all')) {
        if (confirm('ACHTUNG: Dies löscht ALLE gespeicherten Daten (Entwurf und CSV-Status) unwiderruflich. Fortfahren?')) {
            localStorage.clear();
            location.reload();
        }
    }

    if (e.target.closest('#btn-app-info')) {
        alert('ArbeitsSafe v1.1.5.1\n\nEin smarter Generator für Revisionsschreiben.\nEntwickelt für Arbeitsschutz-Experten.\n\nStatus: Vollständig offline-fähig.');
    }

    // Close settings menu when clicking outside
    const menu = document.getElementById('settingsMenu');
    if (menu && !menu.classList.contains('hidden') && !e.target.closest('.settings-menu-content') && !e.target.closest('#settingsBtn')) {
        menu.classList.add('hidden');
        menu.setAttribute('aria-hidden', 'true');
    }
});

document.addEventListener('input', e => {
    if (e.target.classList.contains('js-item-title-input')) {
        updateItemTitle(e.target.dataset.id, e.target.value);
    }
    if (e.target.classList.contains('js-item-text-editable')) {
        updateItemText(e.target.dataset.id, e.target.innerText);
    }
});

// --- File Upload ---
DOM.csvFileInput.addEventListener('change', e => { 
    const f = e.target.files[0]; 
    if(f){ 
        const r = new FileReader(); 
        r.onload = ev => initData(new TextDecoder('utf-8', {fatal:false}).decode(ev.target.result), f.name); 
        r.readAsArrayBuffer(f); 
    } 
});

// --- Filter Listeners ---
DOM.lawFilter.addEventListener('change', () => { updateDropdowns(); renderResults(); });
DOM.paragraphFilter.addEventListener('change', () => { updateDropdowns(); renderResults(); });
DOM.absatzFilter.addEventListener('change', renderResults); 
DOM.hasBausteinFilter.addEventListener('change', () => { updateDropdowns(); renderResults(); });

let searchTimeout;
DOM.searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(renderResults, 500);
});

// --- App Start ---
window.addEventListener('DOMContentLoaded', () => {
    injectStaticIcons();
    loadState();
    renderDocumentView();

    fetch('gesetze.csv')
        .then(r => { if(!r.ok) throw new Error(r.status); return r.text(); })
        .then(t => initData(t, "Datenbank geladen"))
        .catch(e => { 
            DOM.errorContainer.innerHTML=`<div class="error-alert"><strong>Hinweis:</strong> gesetze.csv nicht gefunden. Nutze Fallback-Daten.</div>`; 
            initData(state.rawCsvData); 
        });
});

// --- Service Worker ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw2.js')
            .then(reg => console.log('[PWA] Registered:', reg.scope))
            .catch(err => console.error('[PWA] Error:', err));
    });
}
