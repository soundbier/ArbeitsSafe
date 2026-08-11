import { state, parseCSV, saveState, loadState } from './data.js';
import { DOM, updateDropdowns, renderResults, renderDocumentView, copyComposedSchreiben, copyTextToClipboard, navigateTo, toggleText, injectStaticIcons } from './ui.js';

// --- Haupt-Logik ---
function initTheme() {
    const savedTheme = localStorage.getItem('arbeitsSafe_theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        document.body.classList.add('dark-mode');
    }

    // Rechtliche Hinweise prüfen
    if (!localStorage.getItem('arbeitsSafe_legal_accepted')) {
        document.getElementById('legalModal').classList.remove('hidden');
    }

    // Kompakt-Modus laden
    const isCompact = localStorage.getItem('arbeitsSafe_compact') === 'true';
    if (DOM.compactModeToggle) {
        DOM.compactModeToggle.checked = isCompact;
        document.body.classList.toggle('compact-mode', isCompact);
    }

    injectStaticIcons(); // Update the theme icon
}

function toggleTheme() {
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem('arbeitsSafe_theme', isDark ? 'dark' : 'light');
    injectStaticIcons(); // Refresh icons to show sun/moon
}

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

        const card = document.getElementById(`item-card-${itemId}`);
        if (card) {
            card.classList.add('pulse-confirm');
            setTimeout(() => card.classList.remove('pulse-confirm'), 600);
        }
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
        saveState(true);
    }
}

function clearSchreiben() {
    if(confirm('Möchten Sie den gesamten Entwurf wirklich leeren?')) {
        state.revisionsSchreibenListe = [];
        renderResults();
        renderDocumentView();
        saveState(true);
    }
}

// --- Router ---
function handleRouting() {
    const hash = window.location.hash || '#search';
    navigateTo(hash);
}

// --- Event Delegation ---

document.addEventListener('click', e => {
    // Navigation (handled by hashchange, but we prevent default for smooth internal feeling)
    const navItem = e.target.closest('.nav-item');
    if (navItem && navItem.getAttribute('href')) {
        // Der Browser regelt den Hashchange selbst
    }

    const toggleBtn = e.target.closest('.js-toggle-more-btn');
    if (toggleBtn) toggleText(toggleBtn);

    const copyItemBtn = e.target.closest('.js-copy-item-btn');
    if (copyItemBtn) copyTextToClipboard(copyItemBtn.dataset.text);

    const toggleItemBtn = e.target.closest('.js-toggle-item-btn');
    if (toggleItemBtn) toggleToSchreiben(toggleItemBtn.dataset.id);

    const removeItemBtn = e.target.closest('.js-remove-item-btn');
    if (removeItemBtn) toggleToSchreiben(removeItemBtn.dataset.id);

    const moveItemBtn = e.target.closest('.js-move-item-btn');
    if (moveItemBtn) moveItem(parseInt(moveItemBtn.dataset.idx), parseInt(moveItemBtn.dataset.dir));

    if (e.target.closest('#copySchreibenBtn')) copyComposedSchreiben();
    if (e.target.closest('#clearSchreibenBtn')) clearSchreiben();
    if (e.target.closest('#reloadBtn')) initData(state.lastLoadedFileText, state.lastLoadedFileName);

    const settingsBtn = e.target.closest('#settingsBtn');
    if (settingsBtn) {
        const menu = document.getElementById('settingsMenu');
        menu.classList.toggle('hidden');
        menu.setAttribute('aria-hidden', menu.classList.contains('hidden'));
    }

    const uploadTrigger = e.target.closest('#uploadTrigger');
    if (uploadTrigger) {
        document.getElementById('csvFileInput').click();
    }

    if (e.target.closest('#btn-clear-all')) {
        if (confirm('ACHTUNG: Dies löscht ALLE gespeicherten Daten unwiderruflich. Fortfahren?')) {
            localStorage.clear();
            location.reload();
        }
    }

    if (e.target.closest('#btn-toggle-theme')) {
        toggleTheme();
    }

    if (e.target.closest('#btn-app-info')) {
        alert('ArbeitsSafe v1.4.0.0\n\nEin smarter Generator für Revisionsschreiben.\n\nNeu: Rechtssicherheit & Compliance.');
    }

    if (e.target.closest('#btn-show-legal')) {
        document.getElementById('legalModal').classList.remove('hidden');
        document.getElementById('settingsMenu').classList.add('hidden');
    }

    if (e.target.closest('#acceptLegalBtn')) {
        localStorage.setItem('arbeitsSafe_legal_accepted', 'true');
        document.getElementById('legalModal').classList.add('hidden');
    }

    const menu = document.getElementById('settingsMenu');
    if (menu && !menu.classList.contains('hidden') && !e.target.closest('.settings-menu-content') && !e.target.closest('#settingsBtn')) {
        menu.classList.add('hidden');
        menu.setAttribute('aria-hidden', 'true');
    }

    const filterToggle = e.target.closest('#mobileFilterToggle');
    if (filterToggle) {
        const overlay = document.getElementById('filterOverlay');
        overlay.classList.toggle('hidden');
    }

    if (e.target.closest('#closeSettingsBtn')) {
        document.getElementById('settingsMenu').classList.add('hidden');
    }

    if (e.target.closest('#closeFilterBtn') || e.target.closest('#applyFilterBtn')) {
        document.getElementById('filterOverlay').classList.add('hidden');
    }

    if (e.target.id === 'filterOverlay') {
        e.target.classList.add('hidden');
    }

    if (e.target.closest('#resetFilterBtn')) {
        DOM.lawFilter.value = '';
        DOM.paragraphFilter.value = '';
        DOM.absatzFilter.value = '';
        DOM.searchInput.value = '';
        DOM.hasBausteinFilter.checked = false;
        updateDropdowns();
        renderResults();
    }

    if (e.target.closest('#reloadUpdateBtn')) {
        if (newWorker) {
            newWorker.postMessage('SKIP_WAITING');
        }
    }
});

document.addEventListener('input', e => {
    if (e.target.id === 'compactModeToggle') {
        const isCompact = e.target.checked;
        localStorage.setItem('arbeitsSafe_compact', isCompact);
        document.body.classList.toggle('compact-mode', isCompact);
    }
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
DOM.lawFilter.addEventListener('change', () => {
    updateDropdowns(); renderResults();
    if(window.innerWidth <= 768) document.querySelector('.controls-toolbar').classList.add('collapsed');
});
DOM.paragraphFilter.addEventListener('change', () => {
    updateDropdowns(); renderResults();
    if(window.innerWidth <= 768) document.querySelector('.controls-toolbar').classList.add('collapsed');
});
DOM.absatzFilter.addEventListener('change', () => {
    renderResults();
    if(window.innerWidth <= 768) document.querySelector('.controls-toolbar').classList.add('collapsed');
});
DOM.hasBausteinFilter.addEventListener('change', () => {
    updateDropdowns(); renderResults();
});

let searchTimeout;
DOM.searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        renderResults();
        if (DOM.searchInput.value.trim().length > 2 && window.innerWidth <= 768) {
            document.querySelector('.controls-toolbar').classList.add('collapsed');
        }
    }, 500);
});

// --- App Start ---
window.addEventListener('DOMContentLoaded', () => {
    initTheme();
    injectStaticIcons();
    loadState();
    renderDocumentView();
    handleRouting(); // Initial route

    fetch('gesetze.csv')
        .then(r => { if(!r.ok) throw new Error(r.status); return r.text(); })
        .then(t => initData(t, "Datenbank geladen"))
        .catch(e => { 
            document.getElementById('errorContainer').innerHTML=`<div class="error-alert"><strong>Hinweis:</strong> Datenbank wird geladen...</div>`;
            initData(state.rawCsvData); 
        });
});

window.addEventListener('hashchange', handleRouting);

// --- Service Worker ---
let newWorker;
let refreshing = false;

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw2.js').then(reg => {
            reg.addEventListener('updatefound', () => {
                newWorker = reg.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        const banner = document.getElementById('updateBanner');
                        if (banner) banner.classList.remove('hidden');
                    }
                });
            });
        });
    });

    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        window.location.reload();
        refreshing = true;
    });
}
