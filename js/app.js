import { state, parseCSV, saveToLocalStorage, loadFromLocalStorage } from './data.js';
import { DOM, updateDropdowns, renderResults, renderSchreiben, switchTab, showToast } from './ui.js';
import { 
    openNewSessionModal, createNewLocation, saveRemark, undoLastChange, 
    openConfirmDelete, executeConfirmDelete, closeOverlay, exportState, 
    importState, goToList, openManageQuestions, openExportModal 
} from './checklist.js';

// --- Haupt-Logik ---
export function initData(csvString, fileName = null) {
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

export function toggleToSchreiben(itemId) {
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

export function removeFromSchreiben(id) { 
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

// --- TEMPORÄR FÜR UI.JS (Wird im nächsten Schritt entfernt) ---
window.toggleToSchreiben = toggleToSchreiben;
window.removeFromSchreiben = removeFromSchreiben;
window.saveToLocalStorage = saveToLocalStorage;


// --- Event Listeners Setup ---
window.addEventListener('DOMContentLoaded', () => {
    // Gespeicherte Daten laden
    loadFromLocalStorage();
    
    // Fallback-Logik CSV laden
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

    // 1. HEADER & FILE UPLOAD
    DOM.csvFileInput.addEventListener('change', e => { 
        const f = e.target.files[0]; 
        if(f){ 
            const r = new FileReader(); 
            r.onload = ev => initData(new TextDecoder('utf-8', {fatal:false}).decode(ev.target.result), f.name); 
            r.readAsArrayBuffer(f); 
        } 
    });
    
    const triggerCsvBtn = document.getElementById('triggerCsvUploadBtn');
    if (triggerCsvBtn) triggerCsvBtn.addEventListener('click', () => DOM.csvFileInput.click());
    if (DOM.reloadBtn) DOM.reloadBtn.addEventListener('click', () => initData(state.lastLoadedFileText, state.lastLoadedFileName));

    // 2. TAB NAVIGATION
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => switchTab(e.currentTarget.dataset.tab));
    });

    // 3. TAB 2: DATENBANK & SUCHE
    if(DOM.lawFilter) DOM.lawFilter.addEventListener('change', () => { updateDropdowns(); renderResults(); });
    if(DOM.paragraphFilter) DOM.paragraphFilter.addEventListener('change', () => { updateDropdowns(); renderResults(); });
    if(DOM.absatzFilter) DOM.absatzFilter.addEventListener('change', renderResults); 
    if(DOM.hasBausteinFilter) DOM.hasBausteinFilter.addEventListener('change', () => { updateDropdowns(); renderResults(); });

    // Debouncing für die Suchleiste
    let searchTimeout;
    if (DOM.searchInput) {
        DOM.searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(renderResults, 400);
        });
    }

    // 4. TAB 3: ENTWURF
    if(DOM.clearSchreibenBtn) DOM.clearSchreibenBtn.addEventListener('click', clearSchreiben);
    if(DOM.copySchreibenBtn) DOM.copySchreibenBtn.addEventListener('click', copyComposedSchreiben);

    // 5. MODALS & CHECKLISTE (Zentrale Bindung der HTML IDs)
    document.getElementById('fabBtn')?.addEventListener('click', openNewSessionModal);
    document.getElementById('closeNewLocBtn')?.addEventListener('click', () => closeOverlay('newLocModal'));
    document.getElementById('createNewLocBtn')?.addEventListener('click', createNewLocation);
    
    document.getElementById('saveRemarkBtn')?.addEventListener('click', saveRemark);
    document.getElementById('closeRemarkBtn')?.addEventListener('click', () => closeOverlay('remarkModal'));
    
    document.getElementById('closeConfirmDeleteBtn')?.addEventListener('click', () => closeOverlay('confirmDeleteModal'));
    document.getElementById('executeConfirmDeleteBtn')?.addEventListener('click', executeConfirmDelete);
    
    document.getElementById('toastUndoBtn')?.addEventListener('click', undoLastChange);
    
    document.getElementById('saveStateBtn')?.addEventListener('click', exportState);
    document.getElementById('loadStateBtn')?.addEventListener('click', () => document.getElementById('auditFileInput').click());
    document.getElementById('auditFileInput')?.addEventListener('change', importState);
    
    document.getElementById('backBtn')?.addEventListener('click', goToList);
    document.getElementById('manageBtn')?.addEventListener('click', openManageQuestions);
    document.getElementById('menuBtn')?.addEventListener('click', () => openConfirmDelete('session', state.currentSessionId));
    
    document.getElementById('openExportBtn')?.addEventListener('click', openExportModal);
    document.getElementById('closeExportBtn')?.addEventListener('click', () => closeOverlay('exportModal'));
});
