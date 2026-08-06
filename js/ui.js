import { state } from './data.js';

export function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    
    document.getElementById(tabId).classList.add('active');
    document.querySelector(`.tab-btn[data-tab="${tabId}"]`).classList.add('active');
    
    // Auf Mobile sanft nach oben scrollen beim Tab-Wechsel
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

export const DOM = {
    lawFilter: document.getElementById('lawFilter'), paragraphFilter: document.getElementById('paragraphFilter'),
    absatzFilter: document.getElementById('absatzFilter'), searchInput: document.getElementById('searchInput'),
    hasBausteinFilter: document.getElementById('hasBausteinFilter'), resultsContainer: document.getElementById('results'),
    schreibenList: document.getElementById('schreibenList'), schreibenCounter: document.getElementById('schreibenCounter'),
    copySchreibenBtn: document.getElementById('copySchreibenBtn'), clearSchreibenBtn: document.getElementById('clearSchreibenBtn'),
    errorContainer: document.getElementById('errorContainer'), statusBadge: document.getElementById('statusBadge'),
    tabCounter: document.getElementById('tabCounter'),
    statusText: document.getElementById('statusText'), csvFileInput: document.getElementById('csvFileInput'),
    reloadBtn: document.getElementById('reloadBtn')
};

export function escapeHTML(t) { return t ? String(t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;") : ""; }
export function escapeJS(s) { return s ? s.replace(/\\/g,'\\\\').replace(/`/g,'\\`').replace(/\n/g,'\\n') : ''; }
export function containsExactWord(t, q) { 
    if(!t||!q) return false; 
    const e = q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); 
    return new RegExp(`(^|[^\\p{L}\\p{N}])(${e})([^\\p{L}\\p{N}]|$)`,'iu').test(t); 
}

// NEU: Globale Text-Toggle Funktion für "Mehr lesen"
window.toggleText = function(btn) {
    const target = btn.previousElementSibling;
    target.classList.toggle('text-clamp');
    btn.innerHTML = target.classList.contains('text-clamp') ? 'Mehr anzeigen ⬇' : 'Weniger anzeigen ⬆';
};

// NEU: Mobile-freundliches Toast-Feedback
export function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
}

export function copyTextToClipboard(btn, text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('✓ Text erfolgreich kopiert');
    });
}

function getFilteredData() {
    const law = DOM.lawFilter.value, par = DOM.paragraphFilter.value, abs = DOM.absatzFilter.value, search = DOM.searchInput.value.trim(), reqB = DOM.hasBausteinFilter.checked;
    return state.gesetzeData.filter(item => {
        if (reqB && !item.mangelVorgefunden && !item.rechtsgrundlage && !item.handlungsaufforderung) return false;
        if (law && item.gesetzKuerzel !== law) return false;
        if (par && item.paragraf !== par) return false;
        if (abs && item.absatz !== abs) return false; 
        if (search && !containsExactWord(`${item.paragraf} ${item.absatz} ${item.titel} ${item.inhalt} ${item.mangelVorgefunden} ${item.rechtsgrundlage} ${item.handlungsaufforderung}`, search)) return false;
        return true;
    });
}

export function updateDropdowns() {
    const curL = DOM.lawFilter.value, curP = DOM.paragraphFilter.value, curA = DOM.absatzFilter.value, reqB = DOM.hasBausteinFilter.checked;
    const laws = new Map(), pars = new Map(), absatze = new Set();
    
    state.gesetzeData.forEach(i => { if (!reqB || i.mangelVorgefunden || i.rechtsgrundlage || i.handlungsaufforderung) laws.set(i.gesetzKuerzel, i.gesetzName || i.gesetzKuerzel); });
    DOM.lawFilter.innerHTML = '<option value="">-- Alle Gesetze --</option>' + Array.from(laws).map(([k,n])=>`<option value="${escapeHTML(k)}">${escapeHTML(k)} - ${escapeHTML(n)}</option>`).join('');
    if (laws.has(curL)) DOM.lawFilter.value = curL;

    state.gesetzeData.forEach(i => { if((!DOM.lawFilter.value || i.gesetzKuerzel === DOM.lawFilter.value) && (!reqB || i.mangelVorgefunden || i.rechtsgrundlage || i.handlungsaufforderung) && i.paragraf) pars.set(i.paragraf, i.titel); });
    DOM.paragraphFilter.innerHTML = '<option value="">-- Alle Paragrafen --</option>' + Array.from(pars).map(([p,t])=>`<option value="${escapeHTML(p)}">${escapeHTML(p)}${t?' — '+escapeHTML(t):''}</option>`).join('');
    if (pars.has(curP)) DOM.paragraphFilter.value = curP;

    if(DOM.paragraphFilter.value) { state.gesetzeData.forEach(i => { if(i.paragraf === DOM.paragraphFilter.value && (!reqB || i.mangelVorgefunden || i.rechtsgrundlage || i.handlungsaufforderung) && i.absatz) absatze.add(i.absatz); }); }
    DOM.absatzFilter.innerHTML = '<option value="">-- Alle Absätze --</option>' + Array.from(absatze).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true})).map(a=>`<option value="${escapeHTML(a)}">${escapeHTML(a)}</option>`).join('');
    if (absatze.has(curA)) DOM.absatzFilter.value = curA;
    DOM.absatzFilter.disabled = absatze.size === 0;
}

export function renderResults() {
    const data = getFilteredData();
    if (data.length === 0) { DOM.resultsContainer.innerHTML = `<div class="card-base no-results">Keine passenden Einträge gefunden.</div>`; return; }
    if(!DOM.searchInput.value && !DOM.paragraphFilter.value && !DOM.lawFilter.value) { DOM.resultsContainer.innerHTML = `<div class="card-base no-results">Wählen Sie Filter oder nutzen Sie die Suche.</div>`; return; }

    const groupMap = new Map();
    data.forEach(item => { const k = `${item.gesetzKuerzel}_${item.paragraf}`; if (!groupMap.has(k)) groupMap.set(k, { ...item, entries: [] }); groupMap.get(k).entries.push(item); });

    DOM.resultsContainer.innerHTML = Array.from(groupMap.values()).map(g => `
        <div class="card-base law-card">
            <div class="card-top"><div><span class="badge">${escapeHTML(g.gesetzKuerzel)}</span><span class="law-title-meta">${escapeHTML(g.gesetzName)}</span></div></div>
            <div class="paragraph-heading">${escapeHTML(g.paragraf)}${g.titel && !g.titel.startsWith(g.paragraf) ? ' — ' + escapeHTML(g.titel) : ''}</div>
            ${g.entries.map(item => {
                const hasB = item.mangelVorgefunden || item.rechtsgrundlage || item.handlungsaufforderung;
                const uB = [item.mangelVorgefunden, item.rechtsgrundlage, item.handlungsaufforderung].filter(Boolean).join("\n\n");
                const isA = state.revisionsSchreibenListe.some(i => i.id === item.id);
                
                return `
                <div class="paragraph-box">
                    <div class="paragraph-box-header">
                        <span class="absatz-tag">${escapeHTML(item.absatz || 'Norm')}</span>
                        <div class="action-buttons-group">
                            <button class="action-icon-btn" onclick="copyTextToClipboard(this, \`${escapeJS(item.inhalt)}\`)">📋 Gesetz</button>
                            ${hasB ? `<button class="action-icon-btn ${isA?'added':''}" id="add-btn-${item.id}" onclick="toggleToSchreiben('${item.id}')">${isA?'✓ Im Schreiben':'➕ Zum Schreiben'}</button>`:''}
                        </div>
                    </div>
                    
                    <div class="text-content-wrapper">
                        <div class="paragraph-text text-clamp">${escapeHTML(item.inhalt)}</div>
                        <button class="toggle-more-btn" onclick="window.toggleText(this)">Mehr anzeigen ⬇</button>
                    </div>

                    ${hasB ? `
                    <div class="revision-preview-box">
                        <div style="font-size:0.75rem;font-weight:700;color:var(--primary);margin-bottom:0.35rem;">Vorschau Textbaustein</div>
                        <div class="text-clamp">${escapeHTML(uB)}</div>
                        <button class="toggle-more-btn" onclick="window.toggleText(this)">Mehr anzeigen ⬇</button>
                    </div>`:''}
                </div>`;
            }).join('')}
        </div>`).join('');
}

export function renderDocumentView() {
    const count = state.revisionsSchreibenListe.length;
    DOM.schreibenCounter.textContent = `${count} Punkt${count !== 1 ? 'e' : ''}`;
    DOM.tabCounter.textContent = count; 
    
    if (count === 0) {
        DOM.schreibenList.innerHTML = `<div class="doc-empty">Das Schreiben ist noch leer.<br><br>Wechseln Sie in den Reiter <strong>"Datenbank & Suche"</strong> und klicken Sie auf <strong>„➕ Zum Schreiben“</strong>.</div>`;
        DOM.copySchreibenBtn.disabled = true; DOM.clearSchreibenBtn.style.display = 'none'; return;
    }

    DOM.copySchreibenBtn.disabled = false; DOM.clearSchreibenBtn.style.display = 'flex';

    DOM.schreibenList.innerHTML = state.revisionsSchreibenListe.map((item, idx) => {
        return `
            <div class="doc-item">
                <div class="doc-item-title-row">
                    <span class="doc-item-num">${idx + 1}.</span>
                    <input type="text" class="doc-title-input" value="${escapeHTML(item.titel)}" oninput="updateItemTitle('${item.id}', this.value)">
                </div>
                <div class="doc-editable-text" contenteditable="true" 
                     oninput="updateItemText('${item.id}', this.innerText)" 
                     title="Klicken, um den Text zu bearbeiten">${escapeHTML(item.editedText)}</div>
                <div class="doc-item-actions">
                    ${idx > 0 ? `<button class="action-icon-btn" title="Nach oben" onclick="moveItem(${idx}, -1)">▲</button>` : ''}
                    ${idx < count - 1 ? `<button class="action-icon-btn" title="Nach unten" onclick="moveItem(${idx}, 1)">▼</button>` : ''}
                    <button class="action-icon-btn" style="color:#dc2626;" title="Punkt entfernen" onclick="removeFromSchreiben('${item.id}')">🗑️</button>
                </div>
            </div>`;
    }).join('');
}

export function copyComposedSchreiben() {
    if (state.revisionsSchreibenListe.length === 0) return;
    
    const plain = state.revisionsSchreibenListe.map((i, idx) => `${idx + 1}. ${i.titel}\r\n\r\n${i.editedText}`).join("\r\n\r\n\r\n");
    const html = state.revisionsSchreibenListe.map((item, idx) => {
        const paragraphs = item.editedText.split(/(?:\r?\n){2,}/).map(block => {
            const htmlBlock = escapeHTML(block).replace(/\r?\n/g, '<br>');
            return `<p style="margin-top:0; margin-bottom:12pt; text-align:justify;">${htmlBlock}</p>`;
        }).join('');
        return `<p style="margin-top:0; margin-bottom:12pt; text-align:justify;"><strong>${idx + 1}. ${escapeHTML(item.titel)}</strong></p>` + paragraphs;
    }).join(`<p style="margin-top:0; margin-bottom:24pt;">&nbsp;</p>`); 

    const cbText = `<html><head><meta charset="utf-8"></head><body>${html}</body></html>`;
    const fb = () => navigator.clipboard.writeText(plain).then(onCopySuccess);
    
    if (navigator.clipboard && window.ClipboardItem) {
        navigator.clipboard.write([
            new ClipboardItem({
                "text/plain": new Blob([plain], {type: "text/plain"}), 
                "text/html": new Blob([cbText], {type: "text/html"})
            })
        ]).then(onCopySuccess).catch(fb);
    } else fb();
}

function onCopySuccess() { 
    showToast('✓ Gesamtes Schreiben erfolgreich kopiert!');
}
