import { state, STATUS_COLORS } from './data.js';

/* ---------- Lokaler State ---------- */
let currentView = 'list'; 
let currentFilter = 'all';
let pendingRemarkSnapshotId = null;
let deleteMode = null; 
let deleteTargetId = null;
let lastChange = null;
let exportFormat = 'html';
let expandedChecklist = {};   
let expandedManage = {};      

/* ---------- Helpers ---------- */
function pad(n){ return n.toString().padStart(2,'0'); }
function todayISO(){ const d = new Date(); return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
function nowHM(){ const d = new Date(); return pad(d.getHours())+':'+pad(d.getMinutes()); }
function fmtDate(iso){ const [y,m,d] = iso.split('-'); return d+'.'+m+'.'+y; }

function isMangel(q){ return q.status === 'NEIN' || q.status === 'AMPEL_ROT' || q.status === 'JA_INV' || (q.remark && q.remark.trim() !== ''); }
function getSession(id){ return state.sessions.find(s => s.id === id); }
function escapeHtml(str){ if(!str) return ''; const div = document.createElement('div'); div.textContent = str; return div.innerHTML; }

function buildNumbering(items){
  const catSeen = []; const catCounters = {}; const numberMap = {}; const catIndexMap = {};
  items.forEach(it => {
    if (!catSeen.includes(it.category)) { catSeen.push(it.category); catCounters[it.category] = 0; catIndexMap[it.category] = catSeen.length; }
    catCounters[it.category]++;
    numberMap[it._numKey] = catIndexMap[it.category] + '.' + pad(catCounters[it.category]);
  });
  return { numberMap, catIndexMap };
}

let toastTimer = null;
export function showChecklistToast(msg, withUndo){
  document.getElementById('toastText').textContent = msg; 
  document.getElementById('toastUndoBtn').style.display = withUndo ? 'inline-block' : 'none';
  document.getElementById('toastMessage').classList.add('show'); 
  clearTimeout(toastTimer); 
  toastTimer = setTimeout(hideChecklistToast, 3200);
}
function hideChecklistToast(){ document.getElementById('toastMessage').classList.remove('show'); }

function cssId(str){ return str.replace(/[^a-zA-Z0-9]/g, '_'); }
function escapeJs(str){ return str.replace(/\\/g,'\\\\').replace(/'/g,"\\'"); }
function escapeAttr(str){ const div = document.createElement('div'); div.textContent = str; return div.innerHTML.replace(/"/g,'&quot;'); }


/* ---------- Import/Export JSON ---------- */
export function exportState() {
  const exportData = { 
    sessions: state.sessions, 
    nextSessionId: state.nextSessionId, 
    QUESTIONS: state.QUESTIONS, 
    nextQuestionId: state.nextQuestionId, 
    categoryOrder: state.categoryOrder 
  };
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData));
  const downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute("href", dataStr);
  downloadAnchorNode.setAttribute("download", "auditbank_" + todayISO() + ".json");
  document.body.appendChild(downloadAnchorNode); 
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
  showChecklistToast('Datensatz gesichert', false);
}

export function importState(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const parsed = JSON.parse(e.target.result);
      if (parsed.sessions) state.sessions = parsed.sessions;
      if (parsed.nextSessionId) state.nextSessionId = parsed.nextSessionId;
      if (parsed.QUESTIONS) state.QUESTIONS = parsed.QUESTIONS;
      if (parsed.nextQuestionId) state.nextQuestionId = parsed.nextQuestionId;
      if (parsed.categoryOrder) state.categoryOrder = parsed.categoryOrder;
      goToList();
      showChecklistToast('Datensatz geladen', false);
    } catch (err) { alert('Formatfehler: Ungültige Datei.'); }
  };
  reader.readAsText(file);
  event.target.value = '';
}

/* ---------- Routing ---------- */
function setTopbar(view, title, sub){
  document.getElementById('backBtn').style.display = view === 'list' ? 'none' : 'block';
  document.getElementById('saveStateBtn').style.display = view === 'list' ? 'block' : 'none';
  document.getElementById('loadStateBtn').style.display = view === 'list' ? 'block' : 'none';
  document.getElementById('manageBtn').style.display = view === 'list' ? 'block' : 'none';
  document.getElementById('menuBtn').style.display = view === 'checklist' ? 'block' : 'none';
  document.getElementById('exportBar').style.display = view === 'checklist' ? 'block' : 'none';
  document.getElementById('topTitle').textContent = title;
  document.getElementById('topSub').textContent = sub;
}

function syncFabVisibility(){ 
  const fab = document.getElementById('fabBtn');
  if(fab) fab.style.display = currentView === 'list' ? 'block' : 'none'; 
}

export function goToList(){
  currentView = 'list'; state.currentSessionId = null;
  setTopbar('list', 'Begehungen', 'Systemübersicht');
  renderSessionList(); syncFabVisibility();
}

function openChecklist(id){
  currentView = 'checklist'; state.currentSessionId = id; currentFilter = 'all';
  const s = getSession(id);
  setTopbar('checklist', s.location || 'Ohne Bezeichnung', fmtDate(s.date) + ' | ' + s.time + ' UHR');
  renderChecklist(); syncFabVisibility();
}

export function openManageQuestions(){
  currentView = 'manage';
  setTopbar('manage', 'Katalog Struktur', state.categoryOrder.length + ' Rubriken · ' + state.QUESTIONS.length + ' Parameter');
  renderManage(); syncFabVisibility();
}

/* ---------- List View ---------- */
function renderSessionList(){
  const main = document.getElementById('auditMainArea');
  if (state.sessions.length === 0) {
    main.innerHTML = `<div class="empty-state"><p class="bold-text">Keine Datensätze vorhanden</p><p>System bereit für neue Erfassung oder Datenimport.</p></div>`; return;
  }
  const sorted = [...state.sessions].sort((a,b) => b.createdAt - a.createdAt);
  main.innerHTML = `
    <div class="session-list-header"><p>Lokales Register (${state.sessions.length})</p></div>
    <div class="session-grid">
      ${sorted.map(s => {
        const total = s.questions.length;
        const answered = s.questions.filter(q => q.status !== 'OFFEN').length;
        return `
        <div class="session-card" data-action="open-checklist" data-id="${s.id}">
          <div class="meta">
            <div class="loc">${s.location ? escapeHtml(s.location) : 'UNBENANNT'}</div>
            <div class="when">${fmtDate(s.date)} — ${s.time} UHR</div>
          </div>
          <span class="progress-pill">${answered}/${total}</span>
          <button class="del" title="Datensatz entfernen" data-action="delete-session" data-id="${s.id}">[ X ]</button>
        </div>`;
      }).join('')}
    </div>`;
}

export function openNewSessionModal(){
  document.getElementById('dateInput').value = todayISO();
  document.getElementById('locInput').value = '';
  openOverlay('newLocModal');
}

export function createNewLocation(){
  const date = document.getElementById('dateInput').value || todayISO();
  const time = nowHM(); // Default time if missing
  const location = document.getElementById('locInput').value.trim();
  
  const snapshotQuestions = state.QUESTIONS.map(q => {
    let sqList = q.subQuestions ? q.subQuestions.map(text => ({ text: text, status: 'OFFEN' })) : null;
    return { snapshotId: q.id, category: q.category, questionText: q.questionText, answerType: q.answerType, status: 'OFFEN', remark: '', subQuestions: sqList };
  });

  const session = { id: state.nextSessionId++, date, time, location, createdAt: Date.now(), questions: snapshotQuestions };
  state.sessions.push(session);
  closeOverlay('newLocModal');
  openChecklist(session.id);
}

/* ---------- Checklist View ---------- */
function renderChecklist(){
  const s = getSession(state.currentSessionId);
  if (!s) { goToList(); return; }
  const total = s.questions.length;
  const answered = s.questions.filter(q => q.status !== 'OFFEN').length;
  const pct = total ? Math.round((answered/total)*100) : 0;

  const numbered = s.questions.map(q => ({...q, _numKey: q.snapshotId}));
  const { numberMap } = buildNumbering(numbered);

  let visible = s.questions;
  if (currentFilter === 'open') visible = visible.filter(q => q.status === 'OFFEN');
  if (currentFilter === 'maengel') visible = visible.filter(isMangel);

  const categories = []; const grouped = {};
  visible.forEach(q => { if (!grouped[q.category]) { grouped[q.category] = []; categories.push(q.category); } grouped[q.category].push(q); });

  let html = `
    <div class="checklist-toolbar">
      <div class="progress-row">
        <span class="label" id="progressLabel">${answered} / ${total} ERFASST</span>
        <div class="progress-bar-track"><div class="progress-bar-fill" id="progressFill" style="width:${pct}%;"></div></div>
      </div>
      <div class="filter-row">
        <button class="filter-chip ${currentFilter==='all'?'active':''}" data-action="set-filter" data-val="all">GESAMT</button>
        <button class="filter-chip ${currentFilter==='open'?'active':''}" data-action="set-filter" data-val="open">OFFEN</button>
        <button class="filter-chip ${currentFilter==='maengel'?'active':''}" data-action="set-filter" data-val="maengel">BEFUNDE</button>
      </div>
    </div>`;

  if (categories.length === 0) {
    html += `<div class="empty-state"><p class="bold-text">Filter leer</p><p>Keine Einträge für diese Ansicht vorhanden.</p></div>`;
  } else {
    categories.forEach(cat => {
      const isOpen = expandedChecklist[cat] !== false;
      const catQuestions = grouped[cat];
      const allAnswered = catQuestions.length > 0 && catQuestions.every(q => q.status !== 'OFFEN');
      const checkBadge = allAnswered ? `<span class="status-indicator">(KOMPLETT)</span>` : '';

      html += `<div class="category-header" data-action="toggle-category" data-cat="${escapeAttr(cat)}">
                 <span class="chev">${isOpen? '[-]' : '[+]'}</span>
                 <span>${escapeHtml(cat)}</span>${checkBadge}
                 <span class="cnt">${grouped[cat].length} POSITONEN</span>
               </div>`;
               
      if (isOpen) {
        if (cat === "Anlagen & Bestellungspflichten") {
            html += `<div class="bulk-action-bar">
                       <button data-action="set-cat-entfaellt" data-cat="${escapeAttr(cat)}">[ KATEGORIE KOMPLETT ENTFÄLLT ]</button>
                     </div>`;
        }

        grouped[cat].forEach(q => {
          const opts = state.ANSWER_OPTIONS[q.answerType];
          const mainOpts = opts.filter(([val]) => val !== 'ENTFAELLT');
          const hasEntfaellt = opts.some(([val]) => val === 'ENTFAELLT');
          const num = numberMap[q.snapshotId];
          
          // Container für die ganze Frage (wichtig fürs partielle Update)
          html += `
          <div class="question-row" data-snapshot="${q.snapshotId}">
            <div class="question-text"><span class="num">${num}</span>${escapeHtml(q.questionText)}</div>
            <div class="question-controls">
              <div class="answer-chips" data-parent-chips="true">
                ${mainOpts.map(([val,label]) => `
                  <button class="answer-chip ${q.status===val?'sel':''}" data-action="set-answer" data-snapshot="${q.snapshotId}" data-val="${val}">${label}</button>
                `).join('')}
              </div>
              <div class="row-actions">
                ${hasEntfaellt ? `
                  <button class="answer-chip ${q.status==='ENTFAELLT'?'sel':''}" data-action="set-answer" data-snapshot="${q.snapshotId}" data-val="ENTFAELLT">ENTFÄLLT</button>
                ` : ''}
                <button class="ghost-btn ${q.remark? 'has-remark':''}" data-action="open-remark" data-snapshot="${q.snapshotId}">
                  ${q.remark ? '[ BEMERKUNG GEPRÜFT ]' : '[ BEMERKUNG HINZUFÜGEN ]'}
                </button>
              </div>
            </div>`;

          if (q.subQuestions) {
             html += `<div class="sub-questions-container">`;
             q.subQuestions.forEach((sq, sIdx) => {
                 let subLetter = String.fromCharCode(97 + sIdx);
                 html += `
                 <div class="sub-question-row" data-sub-idx="${sIdx}">
                   <div class="question-text"><span class="num">${num}${subLetter}</span>${escapeHtml(sq.text)}</div>
                   <div class="question-controls">
                     <div class="answer-chips">
                       ${mainOpts.map(([val,label]) => `
                         <button class="answer-chip ${sq.status===val?'sel':''}" data-action="set-answer" data-snapshot="${q.snapshotId}" data-sub-idx="${sIdx}" data-val="${val}">${label}</button>
                       `).join('')}
                     </div>
                     <div class="row-actions">
                       ${hasEntfaellt ? `
                         <button class="answer-chip ${sq.status==='ENTFAELLT'?'sel':''}" data-action="set-answer" data-snapshot="${q.snapshotId}" data-sub-idx="${sIdx}" data-val="ENTFAELLT">ENTFÄLLT</button>
                       ` : ''}
                     </div>
                   </div>
                 </div>`;
             });
             html += `</div>`;
          }
          html += `</div>`; // Close question-row
        });
      }
    });
  }
  document.getElementById('auditMainArea').innerHTML = html;
}

function setFilter(f){ currentFilter = f; renderChecklist(); }

function evaluateParentStatus(q) {
    if (!q.subQuestions) return q.status;
    let hasOffen = false, hasMangelRot = false, hasMangelGelb = false, hasMangelInv = false, hasJa = false, hasEntfaellt = false;
    
    q.subQuestions.forEach(sq => {
        if (sq.status === 'OFFEN') hasOffen = true;
        if (sq.status === 'NEIN' || sq.status === 'AMPEL_ROT') hasMangelRot = true;
        if (sq.status === 'AMPEL_GELB') hasMangelGelb = true;
        if (sq.status === 'JA_INV') hasMangelInv = true;
        if (sq.status === 'JA' || sq.status === 'AMPEL_GRUEN' || sq.status === 'NEIN_INV') hasJa = true;
        if (sq.status === 'ENTFAELLT') hasEntfaellt = true;
    });

    if (q.answerType === 'JA_NEIN_ENTFAELLT_INVERTED') {
        if (hasMangelInv) return 'JA_INV';
        if (hasOffen) return 'OFFEN';
        if (hasJa) return 'NEIN_INV';
        if (hasEntfaellt) return 'ENTFAELLT';
    } else if (q.answerType === 'AMPEL') {
        if (hasMangelRot) return 'AMPEL_ROT';
        if (hasMangelGelb) return 'AMPEL_GELB';
        if (hasOffen) return 'OFFEN';
        if (hasJa) return 'AMPEL_GRUEN';
        if (hasEntfaellt) return 'ENTFAELLT';
    } else {
        if (hasMangelRot) return 'NEIN';
        if (hasOffen) return 'OFFEN';
        if (hasJa) return 'JA';
        if (hasEntfaellt) return 'ENTFAELLT';
    }
    return 'OFFEN';
}

// --- OPTIMIERT: Partielles Rendering ---
function setAnswerStatus(snapshotId, status, subIndex = undefined){
  const s = getSession(state.currentSessionId);
  const q = s.questions.find(q => q.snapshotId === snapshotId);
  if (!q) return;
  
  let prevStatusObj = { parentStatus: q.status, subStatuses: q.subQuestions ? q.subQuestions.map(sq => sq.status) : null };

  if (subIndex !== undefined) {
      q.subQuestions[subIndex].status = status;
      q.status = evaluateParentStatus(q);
  } else {
      q.status = status;
      if (q.subQuestions) { q.subQuestions.forEach(sq => sq.status = status); }
  }

  lastChange = { sessionId: s.id, snapshotId, prevStatusObj };

  // Sonderlogik: Wenn Frage 23 (GB durchgeführt) "NEIN" ist, setze Folgefragen auf ROT
  let requiresFullRender = false;
  if (q.snapshotId === 23 && status === 'NEIN') {
      [24, 25, 26, 27, 28, 29, 30].forEach(id => {
          const childQ = s.questions.find(x => x.snapshotId === id);
          if (childQ) {
              childQ.status = 'AMPEL_ROT';
              if (childQ.subQuestions) childQ.subQuestions.forEach(sq => sq.status = 'AMPEL_ROT');
          }
      });
      requiresFullRender = true;
  }

  const cat = q.category;
  const catQuestions = s.questions.filter(x => x.category === cat);
  const allAnswered = catQuestions.every(x => x.status !== 'OFFEN');
  
  if (allAnswered && prevStatusObj.parentStatus === 'OFFEN') {
      expandedChecklist[cat] = false;
      requiresFullRender = true;
  }

  // Entweder volles Re-Render (bei Kategorie-Abschluss oder Kaskade) oder nur DOM-Update
  if (requiresFullRender) {
      renderChecklist();
  } else {
      updateDOMForQuestion(snapshotId, q);
      updateProgressUI(s);
  }
  
  showChecklistToast('STATUS AKTUALISIERT', true);
}

function updateDOMForQuestion(snapshotId, q) {
    const row = document.querySelector(`.question-row[data-snapshot="${snapshotId}"]`);
    if (!row) return;

    // 1. Parent Chips updaten
    const parentChips = row.querySelectorAll('.question-controls > .answer-chips > .answer-chip, .question-controls > .row-actions > .answer-chip');
    parentChips.forEach(chip => {
        if (chip.getAttribute('data-sub-idx') === null) {
            chip.classList.toggle('sel', chip.getAttribute('data-val') === q.status);
        }
    });

    // 2. Sub-Chips updaten
    if (q.subQuestions) {
        q.subQuestions.forEach((sq, sIdx) => {
            const subChips = row.querySelectorAll(`.sub-question-row[data-sub-idx="${sIdx}"] .answer-chip`);
            subChips.forEach(chip => {
                chip.classList.toggle('sel', chip.getAttribute('data-val') === sq.status);
            });
        });
    }
}

function updateProgressUI(session) {
    const total = session.questions.length;
    const answered = session.questions.filter(q => q.status !== 'OFFEN').length;
    const pct = total ? Math.round((answered/total)*100) : 0;
    
    const label = document.getElementById('progressLabel');
    const fill = document.getElementById('progressFill');
    
    if (label) label.textContent = `${answered} / ${total} ERFASST`;
    if (fill) fill.style.width = `${pct}%`;
}


function setCategoryEntfaellt(catName) {
    const s = getSession(state.currentSessionId);
    let changed = false;
    s.questions.forEach(q => {
        if (q.category === catName) {
            q.status = 'ENTFAELLT';
            if (q.subQuestions) q.subQuestions.forEach(sq => sq.status = 'ENTFAELLT');
            changed = true;
        }
    });
    if (changed) {
        expandedChecklist[catName] = false; 
        lastChange = null; 
        renderChecklist();
        showChecklistToast('KATEGORIE ENTFÄLLT', false);
    }
}

export function undoLastChange(){
  if (!lastChange) return;
  const s = getSession(lastChange.sessionId);
  if (s) { 
      const q = s.questions.find(q => q.snapshotId === lastChange.snapshotId); 
      if (q) {
          q.status = lastChange.prevStatusObj.parentStatus;
          if (q.subQuestions && lastChange.prevStatusObj.subStatuses) {
              q.subQuestions.forEach((sq, idx) => sq.status = lastChange.prevStatusObj.subStatuses[idx]);
          }
      }
  }
  lastChange = null; hideChecklistToast();
  if (state.currentSessionId) renderChecklist();
}

function openRemarkModal(snapshotId){
  pendingRemarkSnapshotId = snapshotId; const s = getSession(state.currentSessionId);
  const q = s.questions.find(q => q.snapshotId === snapshotId);
  
  // HIER KORRIGIERT: Modal HTML IDs angepasst
  document.getElementById('remarkText').value = q.remark || ''; 
  document.getElementById('remarkSnapshotId').value = snapshotId;
  
  openOverlay('remarkModal'); 
  setTimeout(() => document.getElementById('remarkText').focus(), 50);
}

export function saveRemark(){
  const snapshotId = parseInt(document.getElementById('remarkSnapshotId').value, 10);
  const s = getSession(state.currentSessionId); 
  const q = s.questions.find(q => q.snapshotId === snapshotId);
  
  if (q) q.remark = document.getElementById('remarkText').value;
  closeOverlay('remarkModal'); 
  renderChecklist();
}

/* ---------- Delete ---------- */
export function openConfirmDelete(mode, id){
  deleteMode = mode; deleteTargetId = id;
  const titleEl = document.getElementById('confirmDeleteTitle');
  if (mode === 'session') titleEl.textContent = 'DATENSATZ LÖSCHEN?';
  else if (mode === 'category') titleEl.textContent = 'RUBRIK ENTFERNEN?';
  else if (mode === 'question') titleEl.textContent = 'PARAMETER ENTFERNEN?';
  openOverlay('confirmDeleteModal');
}

export function executeConfirmDelete(){
  if (deleteMode === 'session') { 
      state.sessions = state.sessions.filter(s => s.id !== deleteTargetId); 
      closeOverlay('confirmDeleteModal'); 
      if (state.currentSessionId === deleteTargetId) goToList(); else renderSessionList(); 
  } 
  else if (deleteMode === 'category') { 
      state.categoryOrder = state.categoryOrder.filter(c => c !== deleteTargetId); 
      state.QUESTIONS = state.QUESTIONS.filter(q => q.category !== deleteTargetId); 
      closeOverlay('confirmDeleteModal'); renderManage(); 
  } 
  else if (deleteMode === 'question') { 
      state.QUESTIONS = state.QUESTIONS.filter(q => q.id !== deleteTargetId); 
      closeOverlay('confirmDeleteModal'); renderManage(); 
  }
  deleteMode = null; deleteTargetId = null;
}

/* ---------- Export (HTML mit Farben / JSON) ---------- */
// Hinweis: Konstanten werden später in data.js ausgelagert
function getStatusBadgeHtml(status) {
    const baseStyle = "padding: 3px 6px; font-size: 11px; font-weight: bold; text-transform: uppercase; white-space: nowrap; border-radius: 4px; display: inline-block; min-width: 65px; text-align: center;";
    let bg = "#cbd5e1", col = "#475569", text = status;
    
    if (status === 'NEIN' || status === 'AMPEL_ROT') { bg = "#fef2f2"; col = "#dc2626"; text = (status==='AMPEL_ROT'?'ROT':'NEIN'); }
    else if (status === 'JA_INV') { bg = "#fef2f2"; col = "#dc2626"; text = "JA (MANGEL)"; }
    else if (status === 'JA' || status === 'AMPEL_GRUEN') { bg = "#f0fdf4"; col = "#16a34a"; text = (status==='AMPEL_GRUEN'?'GRÜN':'JA'); }
    else if (status === 'NEIN_INV') { bg = "#f0fdf4"; col = "#16a34a"; text = "NEIN (OK)"; }
    else if (status === 'AMPEL_GELB') { bg = "#fef9c3"; col = "#d97706"; text = "GELB"; }
    else if (status === 'ENTFAELLT') { bg = "#f1f5f9"; col = "#64748b"; text = "ENTFÄLLT"; }
    else if (status === 'OFFEN') { bg = "transparent"; col = "#94a3b8"; text = "OFFEN"; }
    
    return `<span style="${baseStyle} background-color: ${bg}; color: ${col}; border: 1px solid ${col}40;">${text}</span>`;
}

// ... Rest der Export und Manage-Funktionen bleiben unverändert ...

export function openExportModal(){ 
    exportFormat = 'html'; 
    setExportFormat('ALL'); 
    openOverlay('exportModal'); 
}

export function setExportFormat(fmt){
    exportFormat = fmt;
    // Hier folgt später die Logik zum Umschalten zwischen ALL und MÄNGEL
}

export function closeOverlay(id){ 
    document.getElementById(id).classList.remove('open'); 
}
export function openOverlay(id){ 
    document.getElementById(id).classList.add('open'); 
}

/* ==========================================
   EVENT DELEGATION (Ersatz für Inline-onclicks)
   ========================================== */
document.addEventListener('DOMContentLoaded', () => {
    
    // Zentraler Listener für alle Klicks im Hauptbereich
    document.getElementById('auditMainArea').addEventListener('click', (e) => {
        // Suche nach dem nächsten Element mit 'data-action'
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        
        const action = btn.getAttribute('data-action');
        
        // Router für die Actions
        switch (action) {
            case 'open-checklist':
                openChecklist(parseInt(btn.getAttribute('data-id'), 10));
                break;
            case 'delete-session':
                e.stopPropagation(); // Verhindert Auslösen von open-checklist
                openConfirmDelete('session', parseInt(btn.getAttribute('data-id'), 10));
                break;
            case 'set-filter':
                setFilter(btn.getAttribute('data-val'));
                break;
            case 'toggle-category':
                const cat = btn.getAttribute('data-cat');
                expandedChecklist[cat] = expandedChecklist[cat] === false ? true : false;
                renderChecklist();
                break;
            case 'set-cat-entfaellt':
                setCategoryEntfaellt(btn.getAttribute('data-cat'));
                break;
            case 'set-answer':
                const snapId = parseInt(btn.getAttribute('data-snapshot'), 10);
                const subIdxAttr = btn.getAttribute('data-sub-idx');
                const subIdx = subIdxAttr !== null ? parseInt(subIdxAttr, 10) : undefined;
                setAnswerStatus(snapId, btn.getAttribute('data-val'), subIdx);
                break;
            case 'open-remark':
                openRemarkModal(parseInt(btn.getAttribute('data-snapshot'), 10));
                break;
        }
    });

    // Initial laden
    goToList();
});

// Schließt Modals wenn man daneben klickt
document.querySelectorAll('.overlay').forEach(ov => { 
    ov.addEventListener('click', e => { 
        if (e.target === ov) ov.classList.remove('open'); 
    }); 
});
