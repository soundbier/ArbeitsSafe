// Globaler Speicher für unsere Anwendung
export const state = {
    gesetzeData: [],
    revisionsSchreibenListe: [],
    lastLoadedFileText: null,
    lastLoadedFileName: null,
    // Fallback-Daten
    rawCsvData: `gesetzKuerzel;gesetzName;paragraf;absatz;titel;inhalt;mangelVorgefunden;rechtsgrundlage;handlungsaufforderung\nArbSchG;Arbeitsschutzgesetz;§ 5;Abs. 1;Beurteilung der Arbeitsbedingungen;"(1) Der Arbeitgeber hat durch eine Beurteilung der für die Beschäftigten mit ihrer Arbeit verbundenen Gefährdungen zu ermitteln, welche Maßnahmen des Arbeitsschutzes erforderlich sind.";"Zum Zeitpunkt der Besichtigung konnte von Ihnen keine Gefährdungsbeurteilungen vorgelegt werden.";"Laut § 5 Arbeitsschutzgesetzes (ArbSchG) hat der Arbeitgeber durch eine Beurteilung die für die Beschäftigten mit ihrer Arbeit verbundenen Gefährdungen zu ermitteln, bei Erfordernis notwendige Maßnahmen gegen diese Gefährdungen zu treffen und die Wirksamkeit dieser Maßnahmen fortlaufend zu prüfen.";"Bitte überarbeiten Sie eigenverantwortlich Ihre Gefährdungsbeurteilungen, dokumentieren Sie zukünftig die umgesetzten Maßnahmen und führen Sie Wirksamkeitskontrollen durch."\nArbSchG;Arbeitsschutzgesetz;§ 5;Abs. 2;Beurteilung der Arbeitsbedingungen;"(2) Eine Beurteilung nach Absatz 1 ist unabhängig von der Zahl der Beschäftigten vorzunehmen.";;;`
};

/**
 * Speichert den aktuellen Zustand in den LocalStorage.
 * Mit Debounce-Mechanismus, um die Performance beim Tippen nicht zu beeinträchtigen.
 */
let saveTimeout;
export function saveState(immediate = false) {
    const doSave = () => {
        try {
            localStorage.setItem('arbeitsSafe_revisionsSchreiben', JSON.stringify(state.revisionsSchreibenListe));
        } catch (e) {
            console.error('Fehler beim Speichern des Zustands:', e);
        }
    };

    if (immediate) {
        clearTimeout(saveTimeout);
        doSave();
    } else {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(doSave, 1000); // 1 Sekunde Verzögerung
    }
}

export function loadState() {
    try {
        const saved = localStorage.getItem('arbeitsSafe_revisionsSchreiben');
        if (saved) {
            state.revisionsSchreibenListe = JSON.parse(saved);
        }
    } catch (e) {
        console.error('Fehler beim Laden des Zustands:', e);
    }
}

export function parseCSV(text) {
    const linesText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(line => line.trim() !== '');
    if (linesText.length < 2) return [];
    
    const delimiter = (linesText[0].match(/;/g) || []).length >= (linesText[0].match(/,/g) || []).length ? ';' : ',';
    let lines = [], row = [''], inQuotes = false;

    for (let lineIdx = 0; lineIdx < linesText.length; lineIdx++) {
        let curr = linesText[lineIdx];
        for (let i = 0; i < curr.length; i++) {
            let c = curr[i];
            if (c === '"') { 
                if (inQuotes && curr[i + 1] === '"') { row[row.length - 1] += '"'; i++; } 
                else { inQuotes = !inQuotes; } 
            } 
            else if (c === delimiter && !inQuotes) { row.push(''); } 
            else { row[row.length - 1] += c; }
        }
        if (!inQuotes) { lines.push(row); row = ['']; } 
        else { row[row.length - 1] += '\n'; }
    }

    let rawHeaders = lines[0].map(h => h.trim().replace(/^"|"$/g, '').replace(/^\uFEFF/, ''));
    const findCol = (names) => rawHeaders.findIndex(h => names.includes(h.toLowerCase().replace(/[\s_-]/g, '')));
    const cols = {
        k: findCol(['gesetzkuerzel','kuerzel','gesetz']), n: findCol(['gesetzname','name','langname']),
        p: findCol(['paragraf','paragraph','par','norm']), a: findCol(['absatz','abs']),
        t: findCol(['titel','ueberschrift']), i: findCol(['inhalt','text','baustein']),
        m: findCol(['mangelvorgefunden','mangel']), r: findCol(['rechtsgrundlage','grundlage']),
        h: findCol(['handlungsaufforderung','handlung'])
    };

    let res = [], idCounter = 1;
    for (let r = 1; r < lines.length; r++) {
        let cur = lines[r];
        if (cur && cur.some(cell => cell && cell.trim() !== '')) {
            const getV = (idx, fbIdx) => ((idx !== -1 && cur[idx] !== undefined) ? cur[idx] : (cur[fbIdx] || '')).replace(/^"|"$/g, '').trim().replace(/\\n/g, '\n');
            res.push({
                id: `item_${idCounter++}`, gesetzKuerzel: getV(cols.k,0), gesetzName: getV(cols.n,1),
                paragraf: getV(cols.p,2), absatz: getV(cols.a,3), titel: getV(cols.t,4) || `${getV(cols.k,0)} ${getV(cols.p,2)}`,
                inhalt: getV(cols.i,5), mangelVorgefunden: getV(cols.m,6), rechtsgrundlage: getV(cols.r,7), handlungsaufforderung: getV(cols.h,8)
            });
        }
    }
    return res;
}
