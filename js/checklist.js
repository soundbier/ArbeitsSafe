import { state } from './data.js';

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
function showChecklistToast(msg, withUndo){
  document.getElementById('toastText').textContent = msg; 
  document.getElementById('toastUndoBtn').style.display = withUndo ? 'inline-block' : 'none';
  document.getElementById('toast').classList.add('show'); 
  clearTimeout(toastTimer); 
  toastTimer = setTimeout(hideChecklistToast, 3200);
}
function hideChecklistToast(){ document.getElementById('toast').classList.remove('show'); }

function cssId(str){ return str.replace(/[^a-zA-Z0-9]/g, '_'); }
function escapeJs(str){ return str.replace(/\\/g,'\\\\').replace(/'/g,"\\'"); }
function escapeAttr(str){ const div = document.createElement('div'); div.textContent = str; return div.innerHTML.replace(/"/g,'&quot;'); }


/* ---------- Import/Export JSON ---------- */
function exportState() {
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

function importState(event) {
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

function goToList(){
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

function openManageQuestions(){
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
        <div class="session-card" onclick="openChecklist(${s.id})">
          <div class="meta">
            <div class="loc">${s.location ? escapeHtml(s.location) : 'UNBENANNT'}</div>
            <div class="when">${fmtDate(s.date)} — ${s.time} UHR</div>
          </div>
          <span class="progress-pill">${answered}/${total}</span>
          <button class="del" title="Datensatz entfernen" onclick="event.stopPropagation(); openConfirmDelete('session', ${s.id})">[ X ]</button>
        </div>`;
      }).join('')}
    </div>`;
}

function openNewSessionModal(){
  document.getElementById('newSessionDate').value = todayISO();
  document.getElementById('newSessionTime').value = nowHM();
  document.getElementById('newSessionLocation').value = '';
  openOverlay('newSessionOverlay');
}

function confirmCreateSession(){
  const date = document.getElementById('newSessionDate').value || todayISO();
  const time = document.getElementById('newSessionTime').value || nowHM();
  const location = document.getElementById('newSessionLocation').value.trim();
  
  const snapshotQuestions = state.QUESTIONS.map(q => {
    let sqList = q.subQuestions ? q.subQuestions.map(text => ({ text: text, status: 'OFFEN' })) : null;
    return { snapshotId: q.id, category: q.category, questionText: q.questionText, answerType: q.answerType, status: 'OFFEN', remark: '', subQuestions: sqList };
  });

  const session = { id: state.nextSessionId++, date, time, location, createdAt: Date.now(), questions: snapshotQuestions };
  state.sessions.push(session);
  closeOverlay('newSessionOverlay');
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
        <span class="label">${answered} / ${total} ERFASST</span>
        <div class="progress-bar-track"><div class="progress-bar-fill" style="width:${pct}%;"></div></div>
      </div>
      <div class="filter-row">
        <button class="filter-chip ${currentFilter==='all'?'active':''}" onclick="setFilter('all')">GESAMT</button>
        <button class="filter-chip ${currentFilter==='open'?'active':''}" onclick="setFilter('open')">OFFEN</button>
        <button class="filter-chip ${currentFilter==='maengel'?'active':''}" onclick="setFilter('maengel')">BEFUNDE</button>
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

      html += `<div class="category-header" onclick="toggleChecklistCategory('${escapeJs(cat)}')">
                 <span class="chev">${isOpen? '[-]' : '[+]'}</span>
                 <span>${escapeHtml(cat)}</span>${checkBadge}
                 <span class="cnt">${grouped[cat].length} POSITONEN</span>
               </div>`;
               
      if (isOpen) {
        if (cat === "Anlagen & Bestellungspflichten") {
            html += `<div class="bulk-action-bar">
                       <button onclick="setCategoryEntfaellt('${escapeJs(cat)}')">[ KATEGORIE KOMPLETT ENTFÄLLT ]</button>
                     </div>`;
        }

        grouped[cat].forEach(q => {
          const opts = state.ANSWER_OPTIONS[q.answerType];
          
          const mainOpts = opts.filter(([val]) => val !== 'ENTFAELLT');
          const hasEntfaellt = opts.some(([val]) => val === 'ENTFAELLT');
          
          const num = numberMap[q.snapshotId];
          
          html += `
          <div class="question-row">
            <div class="question-text"><span class="num">${num}</span>${escapeHtml(q.questionText)}</div>
            <div class="question-controls">
              <div class="answer-chips">
                ${mainOpts.map(([val,label]) => `
                  <button class="answer-chip ${q.status===val?'sel':''}" data-val="${val}"
                    onclick="setAnswerStatus(${q.snapshotId}, '${val}')">${label}</button>
                `).join('')}
              </div>
              <div class="row-actions">
                ${hasEntfaellt ? `
                  <button class="answer-chip ${q.status==='ENTFAELLT'?'sel':''}" data-val="ENTFAELLT"
                    onclick="setAnswerStatus(${q.snapshotId}, 'ENTFAELLT')">ENTFÄLLT</button>
                ` : ''}
                <button class="ghost-btn ${q.remark? 'has-remark':''}" onclick="openRemarkModal(${q.snapshotId})">
                  ${q.remark ? '[ BEMERKUNG GEPRÜFT ]' : '[ BEMERKUNG HINZUFÜGEN ]'}
                </button>
              </div>
            </div>
          </div>`;

          if (q.subQuestions) {
             html += `<div class="sub-questions-container">`;
             q.subQuestions.forEach((sq, sIdx) => {
                 let subLetter = String.fromCharCode(97 + sIdx);
                 html += `
                 <div class="sub-question-row">
                   <div class="question-text"><span class="num">${num}${subLetter}</span>${escapeHtml(sq.text)}</div>
                   <div class="question-controls">
                     <div class="answer-chips">
                       ${mainOpts.map(([val,label]) => `
                         <button class="answer-chip ${sq.status===val?'sel':''}" data-val="${val}"
                           onclick="setAnswerStatus(${q.snapshotId}, '${val}', ${sIdx})">${label}</button>
                       `).join('')}
                     </div>
                     <div class="row-actions">
                       ${hasEntfaellt ? `
                         <button class="answer-chip ${sq.status==='ENTFAELLT'?'sel':''}" data-val="ENTFAELLT"
                           onclick="setAnswerStatus(${q.snapshotId}, 'ENTFAELLT', ${sIdx})">ENTFÄLLT</button>
                       ` : ''}
                     </div>
                   </div>
                 </div>`;
             });
             html += `</div>`;
          }
        });
      }
    });
  }
  document.getElementById('auditMainArea').innerHTML = html;
}

function toggleChecklistCategory(cat){ expandedChecklist[cat] = expandedChecklist[cat] === false ? true : false; renderChecklist(); }
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

  if (q.snapshotId === 23 && status === 'NEIN') {
      [24, 25, 26, 27, 28, 29, 30].forEach(id => {
          const childQ = s.questions.find(x => x.snapshotId === id);
          if (childQ) {
              childQ.status = 'AMPEL_ROT';
              if (childQ.subQuestions) childQ.subQuestions.forEach(sq => sq.status = 'AMPEL_ROT');
          }
      });
  }

  const cat = q.category;
  const catQuestions = s.questions.filter(x => x.category === cat);
  const allAnswered = catQuestions.every(x => x.status !== 'OFFEN');
  
  if (allAnswered && prevStatusObj.parentStatus === 'OFFEN') {
      expandedChecklist[cat] = false;
  }

  renderChecklist();
  showChecklistToast('STATUS AKTUALISIERT', true);
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

function undoLastChange(){
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
  document.getElementById('remarkQuestionText').textContent = q.questionText;
  document.getElementById('remarkTextarea').value = q.remark || '';
  openOverlay('remarkOverlay'); setTimeout(() => document.getElementById('remarkTextarea').focus(), 50);
}
function saveRemark(){
  const s = getSession(state.currentSessionId); const q = s.questions.find(q => q.snapshotId === pendingRemarkSnapshotId);
  if (q) q.remark = document.getElementById('remarkTextarea').value;
  closeOverlay('remarkOverlay'); renderChecklist();
}

/* ---------- Delete ---------- */
function openConfirmDelete(mode, id){
  deleteMode = mode; deleteTargetId = id;
  const titleEl = document.getElementById('confirmDeleteTitle');
  if (mode === 'session') titleEl.textContent = 'DATENSATZ LÖSCHEN?';
  else if (mode === 'category') titleEl.textContent = 'RUBRIK ENTFERNEN?';
  else if (mode === 'question') titleEl.textContent = 'PARAMETER ENTFERNEN?';
  openOverlay('confirmDeleteOverlay');
}

function executeDeleteGeneric(){
  if (deleteMode === 'session') { 
      state.sessions = state.sessions.filter(s => s.id !== deleteTargetId); 
      closeOverlay('confirmDeleteOverlay'); 
      if (state.currentSessionId === deleteTargetId) goToList(); else renderSessionList(); 
  } 
  else if (deleteMode === 'category') { 
      state.categoryOrder = state.categoryOrder.filter(c => c !== deleteTargetId); 
      state.QUESTIONS = state.QUESTIONS.filter(q => q.category !== deleteTargetId); 
      closeOverlay('confirmDeleteOverlay'); renderManage(); 
  } 
  else if (deleteMode === 'question') { 
      state.QUESTIONS = state.QUESTIONS.filter(q => q.id !== deleteTargetId); 
      closeOverlay('confirmDeleteOverlay'); renderManage(); 
  }
  deleteMode = null; deleteTargetId = null;
}

/* ---------- Export (HTML mit Farben / JSON) ---------- */
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

function buildExportHtml(s){
  const numbered = s.questions.map(q => ({...q, _numKey: q.snapshotId}));
  const { numberMap } = buildNumbering(numbered);
  
  let out = `<div style="font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a;">`;
  out += `<h3 style="margin: 0 0 8px 0; font-size: 16px; text-transform: uppercase; color: #0f172a;">ZUSAMMENFASSUNG: ${s.location || 'UNBENANNT'}</h3>`;
  out += `<p style="margin: 0 0 16px 0; font-size: 12px; color: #64748b; text-transform: uppercase;">${fmtDate(s.date)} — ${s.time} UHR</p>`;
  
  out += `<table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left;">`;
  
  let lastCat = null;
  s.questions.forEach(q => {
    let isParentOffen = (q.status === 'OFFEN');
    if (q.subQuestions && q.subQuestions.every(sq => sq.status === 'OFFEN') && isParentOffen) return;
    if (!q.subQuestions && isParentOffen) return;

    if (q.category !== lastCat) { 
       out += `<tr><td colspan="2" style="padding: 24px 0 6px 0; font-weight: bold; font-size: 11px; text-transform: uppercase; color: #64748b; border-bottom: 2px solid #0f172a;">${q.category}</td></tr>`;
       lastCat = q.category; 
    }
    
    if (q.subQuestions) {
         out += `<tr><td colspan="2" style="padding: 8px 0 4px 0; font-weight: bold; line-height: 1.4;">${numberMap[q.snapshotId]} | ${q.questionText}</td></tr>`;
         if (q.remark) out += `<tr><td colspan="2" style="padding: 2px 0 8px 16px; font-size: 12px; color: #0284c7; font-style: italic;">Bemerkung: ${q.remark}</td></tr>`;
         
         q.subQuestions.forEach((sq, idx) => {
             if (sq.status === 'OFFEN') return; 
             let subLetter = String.fromCharCode(97 + idx);
             out += `<tr>
                       <td style="padding: 6px 0 6px 16px; border-bottom: 1px solid #e2e8f0; line-height: 1.4; vertical-align: top;">${numberMap[q.snapshotId]}${subLetter} | ${sq.text}</td>
                       <td style="padding: 6px 0; border-bottom: 1px solid #e2e8f0; text-align: right; vertical-align: top;">${getStatusBadgeHtml(sq.status)}</td>
                     </tr>`;
         });
    } else {
         out += `<tr>
                   <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; line-height: 1.4; vertical-align: top; font-weight: 500;">
                     ${numberMap[q.snapshotId]} | ${q.questionText}
                     ${q.remark ? `<br><span style="font-size: 12px; color: #0284c7; font-style: italic; display: inline-block; margin-top: 4px;">Bemerkung: ${q.remark}</span>` : ''}
                   </td>
                   <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; text-align: right; vertical-align: top;">${getStatusBadgeHtml(q.status)}</td>
                 </tr>`;
    }
  });
  
  out += `</table></div>`;
  return out;
}

function buildExportJson(s){
  const numbered = s.questions.map(q => ({...q, _numKey: q.snapshotId}));
  const { numberMap } = buildNumbering(numbered);
  let items = [];
  
  s.questions.forEach(q => {
    let isParentMangel = isMangel(q);
    let mangelSubs = q.subQuestions ? q.subQuestions.filter(sq => isMangel(sq)) : [];
    
    if (isParentMangel || mangelSubs.length > 0 || (q.remark && q.remark.trim() !== '')) {
       items.push({
           pos: numberMap[q.snapshotId],
           rubrik: q.category,
           parameter: q.questionText,
           status: q.status,
           befund: q.remark || '',
           unterpunkte: q.subQuestions ? mangelSubs.map((sq) => ({
               pos: numberMap[q.snapshotId] + String.fromCharCode(97 + q.subQuestions.indexOf(sq)),
               parameter: sq.text,
               status: sq.status
           })) : undefined
       });
    }
  });
  return JSON.stringify({ meta: { datum: s.date, zeit: s.time, ort: s.location || null }, daten: items }, null, 2);
}

function openExportModal(){ exportFormat = 'html'; setExportFormat('html'); openOverlay('exportOverlay'); }

function setExportFormat(fmt){
  exportFormat = fmt; 
  document.getElementById('formatTextBtn').classList.toggle('active', fmt==='html'); 
  document.getElementById('formatJsonBtn').classList.toggle('active', fmt==='json');
  
  const outEl = document.getElementById('exportOutput');
  if (fmt === 'html') {
      outEl.style.whiteSpace = 'normal';
      outEl.style.fontFamily = 'inherit';
      outEl.innerHTML = buildExportHtml(getSession(state.currentSessionId));
  } else {
      outEl.style.whiteSpace = 'pre-wrap';
      outEl.style.fontFamily = '"Courier New", Courier, monospace';
      outEl.textContent = buildExportJson(getSession(state.currentSessionId));
  }
}

function copyExport(){
  const el = document.getElementById('exportOutput');
  if (exportFormat === 'json') {
      navigator.clipboard.writeText(el.textContent)
        .then(() => showChecklistToast('IN ZWISCHENABLAGE KOPIERT', false));
  } else {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(el);
      selection.removeAllRanges();
      selection.addRange(range);
      try {
          document.execCommand('copy');
          showChecklistToast('PROTOKOLL KOPIERT', false);
      } catch(e) {
          showChecklistToast('FEHLER BEIM KOPIEREN', false);
      }
      selection.removeAllRanges();
  }
}

function printExport() {
  if (exportFormat === 'json') {
     showChecklistToast('BITTE AUF FARBIGES PROTOKOLL WECHSELN', false);
     return;
  }
  
  const htmlContent = document.getElementById('exportOutput').innerHTML;
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  document.body.appendChild(iframe);
  
  iframe.contentDocument.write(`
    <html>
      <head>
        <title>Audit Protokoll</title>
        <style>
          body { font-family: "Segoe UI", Helvetica, Arial, sans-serif; padding: 20px; color: #000; }
          table { width: 100%; border-collapse: collapse; }
          /* Zwingt den Browser, die Hintergrundfarben der Etiketten zu drucken */
          @media print {
            @page { margin: 20mm; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        ${htmlContent}
      </body>
    </html>
  `);
  iframe.contentDocument.close();
  
  setTimeout(() => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    setTimeout(() => document.body.removeChild(iframe), 1000);
  }, 250);
}

/* ---------- Manage ---------- */
function renderManage(){
  const numbered = state.QUESTIONS.map(q => ({...q, _numKey: q.id})); const { numberMap } = buildNumbering(numbered); let html = '';
  state.categoryOrder.forEach(cat => {
    const qs = state.QUESTIONS.filter(q => q.category === cat); const isOpen = !!expandedManage[cat];
    html += `<div class="manage-cat"><div class="manage-cat-header" onclick="toggleManageCategory('${escapeJs(cat)}')"><span class="chev">${isOpen? '[-]' : '[+]'}</span><input class="cat-name" value="${escapeAttr(cat)}" onclick="event.stopPropagation()" onchange="renameCategory('${escapeJs(cat)}', this.value)"><span class="cnt">${qs.length} PARAMETER</span><button class="text-btn-del" onclick="event.stopPropagation(); openConfirmDelete('category', '${escapeJs(cat)}')">RUBRIK LÖSCHEN</button></div>`;
    if (isOpen) {
      qs.forEach(q => {
        const opts = Object.keys(state.ANSWER_OPTIONS);
        html += `<div class="manage-q-row"><div class="qnum">${numberMap[q.id]}</div><div class="qbody"><textarea class="qtext-edit" onchange="updateQuestionText(${q.id}, this.value)">${escapeHtml(q.questionText)}</textarea><div class="qmeta-row"><select class="type-edit" onchange="updateQuestionType(${q.id}, this.value)">${opts.map(t => `<option value="${t}" ${t===q.answerType?'selected':''}>${state.TYPE_LABELS[t].toUpperCase()}</option>`).join('')}</select><button class="text-btn-del" onclick="openConfirmDelete('question', ${q.id})">PARAMETER ENTFERNEN</button></div></div></div>`;
      });
      html += `<div class="add-question-row"><input type="text" id="newQText_${cssId(cat)}" placeholder="Neuen Parameter formulieren..." style="flex:1; padding:10px; border-radius:6px; border:1px solid #e2e8f0;"><select id="newQType_${cssId(cat)}" style="padding:10px; border-radius:6px; border:1px solid #e2e8f0;">${Object.keys(state.ANSWER_OPTIONS).map(t => `<option value="${t}">${state.TYPE_LABELS[t].toUpperCase()}</option>`).join('')}</select><button class="btn btn-secondary" onclick="addQuestion('${escapeJs(cat)}')">HINZUFÜGEN</button></div>`;
    }
    html += `</div>`;
  });
  html += `<div class="add-category-bar"><button class="btn btn-secondary" style="border: 2px dashed #94a3b8; background:transparent;" onclick="addCategory()">+ NEUE RUBRIK ERSTELLEN</button></div>`;
  document.getElementById('auditMainArea').innerHTML = html;
}

function toggleManageCategory(cat){ expandedManage[cat] = !expandedManage[cat]; renderManage(); }
function renameCategory(oldName, newName){
  newName = newName.trim(); if (!newName || newName === oldName) { renderManage(); return; }
  const idx = state.categoryOrder.indexOf(oldName); if (idx !== -1) state.categoryOrder[idx] = newName;
  state.QUESTIONS.forEach(q => { if (q.category === oldName) q.category = newName; });
  if (expandedManage[oldName] !== undefined) { expandedManage[newName] = expandedManage[oldName]; delete expandedManage[oldName]; }
  renderManage();
}
function updateQuestionText(id, newText){ const q = state.QUESTIONS.find(q => q.id === id); if (q) q.questionText = newText.trim(); renderManage(); }
function updateQuestionType(id, newType){ const q = state.QUESTIONS.find(q => q.id === id); if (q) q.answerType = newType; renderManage(); }
function addQuestion(cat){
  const textInput = document.getElementById('newQText_' + cssId(cat)); const typeInput = document.getElementById('newQType_' + cssId(cat));
  const text = textInput.value.trim(); if (!text) { textInput.focus(); return; }
  state.QUESTIONS.push({ id: state.nextQuestionId++, category: cat, questionText: text, answerType: typeInput.value }); renderManage();
}
function addCategory(){
  const name = prompt('Bezeichnung der neuen Rubrik:'); if (!name || !name.trim()) return;
  const trimmed = name.trim(); if (state.categoryOrder.includes(trimmed)) { alert('Rubrik existiert bereits.'); return; }
  state.categoryOrder.push(trimmed); expandedManage[trimmed] = true; renderManage();
}

function openOverlay(id){ document.getElementById(id).classList.add('open'); }
function closeOverlay(id){ document.getElementById(id).classList.remove('open'); }

document.querySelectorAll('.overlay').forEach(ov => { ov.addEventListener('click', e => { if (e.target === ov) ov.classList.remove('open'); }); });


/* ---------- Exposing functions to global scope for HTML inline calls ---------- */
window.exportState = exportState;
window.importState = importState;
window.goToList = goToList;
window.openChecklist = openChecklist;
window.openManageQuestions = openManageQuestions;
window.openNewSessionModal = openNewSessionModal;
window.confirmCreateSession = confirmCreateSession;
window.toggleChecklistCategory = toggleChecklistCategory;
window.setFilter = setFilter;
window.setAnswerStatus = setAnswerStatus;
window.setCategoryEntfaellt = setCategoryEntfaellt;
window.undoLastChange = undoLastChange;
window.openRemarkModal = openRemarkModal;
window.saveRemark = saveRemark;
window.openConfirmDelete = openConfirmDelete;
window.executeDeleteGeneric = executeDeleteGeneric;
window.openExportModal = openExportModal;
window.setExportFormat = setExportFormat;
window.copyExport = copyExport;
window.printExport = printExport;
window.toggleManageCategory = toggleManageCategory;
window.renameCategory = renameCategory;
window.updateQuestionText = updateQuestionText;
window.updateQuestionType = updateQuestionType;
window.addQuestion = addQuestion;
window.addCategory = addCategory;
window.closeOverlay = closeOverlay;

/* Initial load */
goToList();
