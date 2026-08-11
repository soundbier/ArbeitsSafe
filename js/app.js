import { state, parseCSV } from './data.js';
import { DOM, updateDropdowns, renderResults, renderDocumentView, copyComposedSchreiben, copyTextToClipboard, switchTab } from './ui.js';

// --- Haupt-Logik ---
function initData(csvString, fileName = null) {
    state.lastLoadedFileText = csvString; 
    state.lastLoadedFileName = fileName;
    state.gesetzeData = parseCSV(csvString);
    
    if (fileName) {
    DOM.statusBadge.className = 'status-mini';
    DOM.statusBadge.innerHTML = '<span>🟢</span>';
    DOM.statusBadge.title = `${fileName} (${state.gesetzeData.length} Einträge)`;
} else {
    DOM.statusBadge.className = 'status-mini';
    DOM.statusBadge.innerHTML = '<span>🟡</span>';
    DOM.statusBadge.title = `Demo-Modus (${state.gesetzeData.length} Einträge)`;
}
    updateDropdowns(); 
    renderResults();
}

function toggleToSchreiben(itemId) {
    const item = state.gesetzeData.find(i => i.id === itemId); 
    if (!item) return;
    const idx = state.revisionsSchreibenListe.findIndex(i => i.id === itemId);
    const btn = document.getElementById(`add-btn-${itemId}`);

    if (idx > -1) { 
        state.revisionsSchreibenListe.splice(idx, 1); 
        if(btn){ btn.classList.remove('added'); btn.innerHTML='➕ Zum Schreiben'; }
    } else {
        let newItem = { ...item };
        newItem.editedText = [item.mangelVorgefunden, item.rechtsgrundlage, item.handlungsaufforderung].filter(Boolean).join("\n\n");
        state.revisionsSchreibenListe.push(newItem); 
        if(btn){ btn.classList.add('added'); btn.innerHTML='✓ Im Schreiben'; }
    }
    renderDocumentView();
}

function updateItemTitle(id, v) { const i = state.revisionsSchreibenListe.find(x => x.id === id); if(i) i.titel = v; }
function updateItemText(id, v) { const i = state.revisionsSchreibenListe.find(x => x.id === id); if(i) i.editedText = v; }
function moveItem(idx, dir) {
    const n = idx + dir; 
    if(n >= 0 && n < state.revisionsSchreibenListe.length){ 
        state.revisionsSchreibenListe.splice(n, 0, state.revisionsSchreibenListe.splice(idx, 1)[0]); 
        renderDocumentView(); 
    }
}
function removeFromSchreiben(id) { toggleToSchreiben(id); }
function clearSchreiben() { state.revisionsSchreibenListe = []; renderResults(); renderDocumentView(); }


// --- Exponieren an window (Wichtig für Inline-onclick im HTML) ---
window.toggleToSchreiben = toggleToSchreiben;
window.updateItemTitle = updateItemTitle;
window.updateItemText = updateItemText;
window.moveItem = moveItem;
window.removeFromSchreiben = removeFromSchreiben;
window.clearSchreiben = clearSchreiben;
window.copyComposedSchreiben = copyComposedSchreiben;
window.copyTextToClipboard = copyTextToClipboard;


// --- Event Listeners ---
DOM.csvFileInput.addEventListener('change', e => { 
    const f = e.target.files[0]; 
    if(f){ 
        const r = new FileReader(); 
        r.onload = ev => initData(new TextDecoder('utf-8', {fatal:false}).decode(ev.target.result), f.name); 
        r.readAsArrayBuffer(f); 
    } 
});
DOM.reloadBtn.addEventListener('click', () => initData(state.lastLoadedFileText, state.lastLoadedFileName));
DOM.lawFilter.addEventListener('change', () => { updateDropdowns(); renderResults(); });
DOM.paragraphFilter.addEventListener('change', () => { updateDropdowns(); renderResults(); });
DOM.absatzFilter.addEventListener('change', renderResults); 
DOM.hasBausteinFilter.addEventListener('change', () => { updateDropdowns(); renderResults(); });

// NEU: Debouncing für die Suchleiste (verhindert Ruckeln auf Mobile)
let searchTimeout;
DOM.searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(renderResults, 500);
});

// --- Tab Navigation ---
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        switchTab(e.currentTarget.dataset.tab);
    });
});

// --- App Start ---
window.addEventListener('DOMContentLoaded', () => {
    fetch('gesetze.csv')
        .then(r => { if(!r.ok) throw new Error(r.status); return r.text(); })
        .then(t => initData(t, "Datenbank geladen"))
        .catch(e => { 
            DOM.errorContainer.innerHTML=`<div class="error-alert"><strong>Hinweis:</strong> gesetze.csv nicht gefunden. Nutze Fallback-Daten.</div>`; 
            initData(state.rawCsvData); 
        });
});

// --- Service Worker Registrierung (PWA) ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw2.js')
            .then(registration => {
                console.log('[PWA] Service Worker erfolgreich registriert:', registration.scope);
            })
            .catch(error => {
                console.error('[PWA] Service Worker Registrierung fehlgeschlagen:', error);
            });
    });
}
