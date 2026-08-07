import { state, parseCSV, saveToLocalStorage, loadFromLocalStorage } from './data.js';
import { DOM, updateDropdowns, renderResults, renderSchreiben, switchTab, showToast } from './ui.js';

// --- Haupt-Logik ---
function initData(csvString, fileName = null) {
    state.lastLoadedFileText = csvString; 
    state.lastLoadedFileName = fileName;
    
    // Vermeide Überschreiben beim Reload, falls schon CSV-Daten da sind
    if(csvString) {
        state.gesetzeData = parseCSV(csvString);
    }
    
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
    renderSchreiben();
}

function toggleToSchreiben(itemId) {
    const item = state.gesetzeData.find(i => i.id === itemId); 
    if (!item) return;
    
    const idx = state.revisionsSchreibenListe.findIndex(i => i.id === itemId);
    
    if (idx > -1) { 
        state.revisionsSchreibenListe.splice(idx, 1); 
    } else { 
        let newItem = { ...item };
        newItem.editedText = [item.mangelVorgefunden, item.rechtsgrundlage, item.handlungsaufforderung].filter(Boolean).join("\n");
        state.revisionsSchreibenListe.push(newItem); 
    }
    
    saveToLocalStorage();
    renderResults();
    renderSchreiben();
}

function removeFromSchreiben(id) { 
    toggleToSchreiben(id); 
}

function clearSchreiben() { 
    if(confirm("Möchten Sie den aktuellen Entwurf wirklich komplett leeren?")) {
        state.revisionsSchreibenListe = []; 
        saveToLocalStorage();
        renderResults(); 
        renderSchreiben(); 
    }
}

function copyComposedSchreiben() {
    if(state.revisionsSchreibenListe.length === 0) {
        showToast("Der Entwurf ist leer.");
        return;
    }
    
    const text = state.revisionsSchreibenListe.map((item, idx) => {
        let titleParts = [];
        if(item.gesetzKuerzel) titleParts.push(item.gesetzKuerzel);
        if(item.paragraf) titleParts.push(item.paragraf);
        if(item.absatz) titleParts.push(item.absatz);
        
        return `${idx + 1}. ${titleParts.join(' ')}\n${item.editedText}`;
    }).join('\n\n---\n\n');
    
    navigator.clipboard.writeText(text).then(() => {
        showToast("Gesamter Entwurf kopiert!");
    });
}


// --- Exponieren an window für Inline-onclick im HTML ---
window.toggleToSchreiben = toggleToSchreiben;
window.removeFromSchreiben = removeFromSchreiben;
window.clearSchreiben = clearSchreiben;
window.copyComposedSchreiben = copyComposedSchreiben;
window.saveToLocalStorage = saveToLocalStorage;


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

// Buttons im "Entwurf"-Tab
if(DOM.clearSchreibenBtn) DOM.clearSchreibenBtn.addEventListener('click', clearSchreiben);
if(DOM.copySchreibenBtn) DOM.copySchreibenBtn.addEventListener('click', copyComposedSchreiben);

// Debouncing für die Suchleiste (verhindert Ruckeln auf Mobile)
let searchTimeout;
DOM.searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(renderResults, 400);
});

// --- Tab Navigation ---
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        switchTab(e.currentTarget.dataset.tab);
    });
});

// --- App Start ---
window.addEventListener('DOMContentLoaded', () => {
    // Gespeicherte Daten laden
    loadFromLocalStorage();
    
    // CSV laden
    fetch('gesetze.csv')
        .then(r => { if(!r.ok) throw new Error(r.status); return r.text(); })
        .then(t => initData(t, "Datenbank geladen"))
        .catch(e => { 
            if(DOM.errorContainer) {
                DOM.errorContainer.innerHTML=`<div class="error-alert"><strong>Hinweis:</strong> gesetze.csv nicht gefunden. Nutze Fallback-Daten.</div>`; 
                DOM.errorContainer.style.display = 'block';
                setTimeout(() => DOM.errorContainer.style.display = 'none', 5000);
            }
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
