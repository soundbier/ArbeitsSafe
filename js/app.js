import { state, parseCSV } from './data.js';
import { DOM, updateDropdowns, renderResults, renderDocumentView, copyComposedSchreiben, copyTextToClipboard } from './ui.js';

// --- Haupt-Logik ---
function initData(csvString, fileName = null) {
    state.lastLoadedFileText = csvString; 
    state.lastLoadedFileName = fileName;
    state.gesetzeData = parseCSV(csvString);
    
    if(fileName) { 
        DOM.statusBadge.className = 'status-badge loaded'; 
        DOM.statusText.innerHTML = `${fileName} (${state.gesetzeData.length})`; 
    } else { 
        DOM.statusBadge.className = 'status-badge'; 
        DOM.statusText.textContent = `Demo-Modus (${state.gesetzeData.length})`; 
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
DOM.searchInput.addEventListener('input', renderResults);
DOM.hasBausteinFilter.addEventListener('change', () => { updateDropdowns(); renderResults(); });

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
