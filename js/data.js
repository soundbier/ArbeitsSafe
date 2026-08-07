// Globaler Speicher für unsere Anwendung
export const state = {
    // --- Datenbank & Revisionsschreiben ---
    gesetzeData: [],
    revisionsSchreibenListe: [], // Namenskonvention für UI und App vereinheitlicht
    lastLoadedFileText: null,
    lastLoadedFileName: null,
    // Fallback-Daten
    rawCsvData: `gesetzKuerzel;gesetzName;paragraf;absatz;titel;inhalt;mangelVorgefunden;rechtsgrundlage;handlungsaufforderung\nArbSchG;Arbeitsschutzgesetz;§ 5;Abs. 1;Beurteilung der Arbeitsbedingungen;"(1) Der Arbeitgeber hat durch eine Beurteilung der für die Beschäftigten mit ihrer Arbeit verbundenen Gefährdungen zu ermitteln, welche Maßnahmen des Arbeitsschutzes erforderlich sind.";"Zum Zeitpunkt der Besichtigung konnte von Ihnen keine Gefährdungsbeurteilungen vorgelegt werden.";"Laut § 5 Arbeitsschutzgesetzes (ArbSchG) hat der Arbeitgeber durch eine Beurteilung die für die Beschäftigten mit ihrer Arbeit verbundenen Gefährdungen zu ermitteln, bei Erfordernis notwendige Maßnahmen gegen diese Gefährdungen zu treffen und die Wirksamkeit dieser Maßnahmen fortlaufend zu prüfen.";"Bitte überarbeiten Sie eigenverantwortlich Ihre Gefährdungsbeurteilungen, dokumentieren Sie zukünftig die umgesetzten Maßnahmen und führen Sie Wirksamkeitskontrollen durch."\nArbSchG;Arbeitsschutzgesetz;§ 5;Abs. 2;Beurteilung der Arbeitsbedingungen;"(2) Eine Beurteilung nach Absatz 1 ist unabhängig von der Zahl der Beschäftigten vorzunehmen.";;;`,

    // --- Systemprüfung / Checkliste ---
    sessions: [],
    nextSessionId: 1,
    currentSessionId: null,
    nextQuestionId: 50,
    categoryOrder: [
      "Arbeitsschutzorganisation & Pflichtenübertragung",
      "Betreuung & Arbeitsschutzakteure",
      "Unterweisungen & Prüffristen",
      "Explosionsschutz & Gefahrstoffe",
      "Gefährdungsbeurteilung (GB)",
      "Umweltschutz (Allgemein & Abfallrecht)",
      "Anlagen & Bestellungspflichten",
      "Betriebsrundgang"
    ],
    QUESTIONS: [
      // ... Deine Fragenliste bleibt 1:1 identisch ...
      {id:1,category:"Arbeitsschutzorganisation & Pflichtenübertragung",questionText:"Verantwortung, Aufgabenübertragung und Regelung der Kompetenzen im Arbeits- und Umweltschutz sind geregelt?",answerType:"JA_NEIN_ENTFAELLT"},
      {id:2,category:"Arbeitsschutzorganisation & Pflichtenübertragung",questionText:"Kennen Führungskräfte ihre Pflichten?",answerType:"AMPEL"},
      {id:3,category:"Arbeitsschutzorganisation & Pflichtenübertragung",questionText:"Ist die Kommunikation im Arbeits- und Umweltschutz geregelt und nachvollziehbar dokumentiert?",answerType:"AMPEL"},
      {id:4,category:"Arbeitsschutzorganisation & Pflichtenübertragung",questionText:"Zusammenarbeit mehrerer Arbeitgeber organisiert und berücksichtigt?",answerType:"JA_NEIN_ENTFAELLT"},
      {id:5,category:"Arbeitsschutzorganisation & Pflichtenübertragung",questionText:"Zusammenarbeit zeitlich befristeter Arbeitnehmer organisiert und berücksichtigt?",answerType:"JA_NEIN_ENTFAELLT"},
      {id:6,category:"Betreuung & Arbeitsschutzakteure",questionText:"Die sicherheitstechnische Betreuung (Sifa) ist geregelt hinsichtlich Bestellung, Einsatzzeit und Einbindung?",answerType:"JA_NEIN_ENTFAELLT"},
      {id:7,category:"Betreuung & Arbeitsschutzakteure",questionText:"Die betriebsärztliche Betreuung (BA) ist geregelt hinsichtlich Bestellung, Einbindung und Tätigkeitsbericht?",answerType:"JA_NEIN_ENTFAELLT"},
      {id:8,category:"Betreuung & Arbeitsschutzakteure",questionText:"Erfolgt eine aktive Zusammenarbeit und gibt es Berichte im Arbeitsschutzausschuss (ASA)?",answerType:"JA_NEIN_ENTFAELLT"},
      {id:9,category:"Betreuung & Arbeitsschutzakteure",questionText:"Sind Sicherheitsbeauftragte vorhanden und fortgebildet?",answerType:"JA_NEIN_ENTFAELLT"},
      {id:10,category:"Betreuung & Arbeitsschutzakteure",questionText:"Arbeitsmedizinische Vorsorge ist organisiert, durchgeführt und in der Vorsorgekartei dokumentiert?",answerType:"AMPEL"},
      {id:11,category:"Betreuung & Arbeitsschutzakteure",questionText:"Erst- und Brandschutzhelfer sind organisiert und umgesetzt?",answerType:"AMPEL", subQuestions: ["Ersthelfer", "Brandschutzhelfer"]},
      {id:12,category:"Unterweisungen & Prüffristen",questionText:"Regelmäßige Unterweisungen sind bezogen auf den Arbeitsplatz organisiert, durchgeführt und dokumentiert?",answerType:"AMPEL"},
      {id:13,category:"Unterweisungen & Prüffristen",questionText:"Betriebsanweisungen sind vorhanden, plausibel, unterschrieben und verfügbar?",answerType:"AMPEL"},
      {id:14,category:"Unterweisungen & Prüffristen",questionText:"Ist ein System zur Terminverfolgung bzw. Überwachung von Prüffristen vorhanden?",answerType:"AMPEL"},
      {id:15,category:"Unterweisungen & Prüffristen",questionText:"Erfolgen Prüfungen von elektrischen Anlagen, Leitern, Regalen, Feuerlöschern, kraftbetriebenen Türen und Toren, Flurförderzeugen, Kränen und Absauganlagen?",answerType:"AMPEL", subQuestions: ["Elektrische Anlagen", "Leitern", "Regale", "Feuerlöscher", "Kraftbetätigte Türen und Tore", "Flurförderzeuge", "Kräne", "Absauganlagen"]},
      {id:16,category:"Unterweisungen & Prüffristen",questionText:"Erfolgen Prüfungen überwachungsbedürftiger Anlagen (Aufzüge, Druckbehälter, Rohrleitungen, neue Maschinen mit CE-Kennzeichnung)?",answerType:"AMPEL", subQuestions: ["Aufzüge", "Druckbehälter", "Rohrleitungen", "Neue Maschinen (mit CE-Kennzeichnung)"]},
      {id:17,category:"Explosionsschutz & Gefahrstoffe",questionText:"Explosionsschutzdokument vorhanden und Prüfungen durchgeführt?",answerType:"JA_NEIN_ENTFAELLT"},
      {id:18,category:"Explosionsschutz & Gefahrstoffe",questionText:"Gefahrstoffverzeichnis vorhanden?",answerType:"JA_NEIN_ENTFAELLT"},
      {id:19,category:"Explosionsschutz & Gefahrstoffe",questionText:"Sicherheitsdatenblätter vorhanden?",answerType:"JA_NEIN_ENTFAELLT"},
      {id:20,category:"Explosionsschutz & Gefahrstoffe",questionText:"Betriebsanweisungen nach GefStoffV vorhanden?",answerType:"JA_NEIN_ENTFAELLT"},
      {id:21,category:"Explosionsschutz & Gefahrstoffe",questionText:"Werden Unterweisungen beim Umgang mit Gefahrstoffen durchgeführt und dokumentiert?",answerType:"JA_NEIN_ENTFAELLT"},
      {id:22,category:"Explosionsschutz & Gefahrstoffe",questionText:"Ist ein Expositionsverzeichnis vorhanden?",answerType:"JA_NEIN_ENTFAELLT"},
      {id:23,category:"Gefährdungsbeurteilung (GB)",questionText:"Wurde eine GB mit Dokumentation durchgeführt?",answerType:"JA_NEIN_ENTFAELLT"},
      {id:24,category:"Gefährdungsbeurteilung (GB)",questionText:"Prozess der GB: Ist die methodische Vorgehensweise bzgl. Systematik und Beteiligung nachvollziehbar?",answerType:"AMPEL"},
      {id:25,category:"Gefährdungsbeurteilung (GB)",questionText:"Ermittlung und Beurteilung: Sind die wesentlichen Gefährdungen ermittelt und zutreffend bewertet?",answerType:"AMPEL"},
      {id:26,category:"Gefährdungsbeurteilung (GB)",questionText:"Werden bei der Auswahl der Maßnahmen der Stand der Technik, Arbeitsmedizin und die TOP-Rangfolge berücksichtigt?",answerType:"AMPEL"},
      {id:27,category:"Gefährdungsbeurteilung (GB)",questionText:"Sind besondere Personengruppen (Schwangere, Jugendliche) sowie psychische Belastungen berücksichtigt?",answerType:"AMPEL", subQuestions: ["Werdende Mütter / Schwangere", "Jugendliche", "Psychische Belastungen"]},
      {id:28,category:"Gefährdungsbeurteilung (GB)",questionText:"Sind die festgelegten Maßnahmen vollständig umgesetzt und auf Wirksamkeit überprüft?",answerType:"AMPEL"},
      {id:29,category:"Gefährdungsbeurteilung (GB)",questionText:"Ist die Dokumentation hinsichtlich der Ergebnisse, Maßnahmen und Überprüfung angemessen?",answerType:"AMPEL"},
      {id:30,category:"Gefährdungsbeurteilung (GB)",questionText:"Fortschreibung: Erfolgt die Überprüfung der GB kontinuierlich bzw. anlassbezogen?",answerType:"AMPEL"},
      {id:31,category:"Umweltschutz (Allgemein & Abfallrecht)",questionText:"Sind Ihnen Beschwerden aus der Nachbarschaft (Lärm, Licht, Geruch, Staub) bekannt?",answerType:"JA_NEIN_ENTFAELLT_INVERTED", subQuestions: ["Lärm", "Licht", "Geruch", "Staub"]},
      {id:32,category:"Umweltschutz (Allgemein & Abfallrecht)",questionText:"Liegt eine Emissionsmessung der Holzfeuerungsanlage vor?",answerType:"JA_NEIN_ENTFAELLT"},
      {id:33,category:"Umweltschutz (Allgemein & Abfallrecht)",questionText:"Sind im Betrieb prüfpflichtige AwSV Anlagen vorhanden und dokumentiert?",answerType:"JA_NEIN_ENTFAELLT"},
      {id:34,category:"Umweltschutz (Allgemein & Abfallrecht)",questionText:"Werden Beschäftigte über die innerbetrieblichen Regelungen zum Umweltschutz unterwiesen?",answerType:"JA_NEIN_ENTFAELLT"},
      {id:35,category:"Umweltschutz (Allgemein & Abfallrecht)",questionText:"Werden Maßnahmen zur Vermeidung/Verwertung von Abfällen durchgeführt?",answerType:"JA_NEIN_ENTFAELLT"},
      {id:36,category:"Umweltschutz (Allgemein & Abfallrecht)",questionText:"Liegen Belege über die Entsorgung von gefährlichen und nicht gefährlichen Abfällen vor?",answerType:"JA_NEIN_ENTFAELLT"},
      {id:37,category:"Anlagen & Bestellungspflichten",questionText:"Liegt eine Genehmigung für den Betrieb der genehmigungsbedürftigen Anlage vor?",answerType:"JA_NEIN_ENTFAELLT"},
      {id:38,category:"Anlagen & Bestellungspflichten",questionText:"Gibt es Änderungen bzgl. der Mitteilungspflicht zur Betriebsorganisation?",answerType:"JA_NEIN_ENTFAELLT"},
      {id:39,category:"Anlagen & Bestellungspflichten",questionText:"Erfolgt die Umsetzung der Auflagen aus Genehmigungen (Auflagenmanagement)?",answerType:"JA_NEIN_ENTFAELLT"},
      {id:40,category:"Anlagen & Bestellungspflichten",questionText:"Sind Beauftragte bestellt (Immissionsschutz-, Abfall-, Störfall-, Gefahrgut-, Strahlenschutzbeauftragter)?",answerType:"JA_NEIN_ENTFAELLT", subQuestions: ["Immissionsschutz", "Abfall", "Störfall", "Gefahrgut", "Strahlenschutz"]},
      {id:41,category:"Anlagen & Bestellungspflichten",questionText:"Werden die erforderlichen Berichte im Umweltschutz erstellt?",answerType:"JA_NEIN_ENTFAELLT"},
      {id:42,category:"Anlagen & Bestellungspflichten",questionText:"Ist festgelegt, wer die Qualifikationen für Schlüsselfunktionen ermittelt und Fortbildungen organisiert?",answerType:"JA_NEIN_ENTFAELLT"},
      {id:43,category:"Betriebsrundgang",questionText:"Sind Flucht- und Rettungswege ausreichend ausgeschildert?",answerType:"AMPEL"},
      {id:44,category:"Betriebsrundgang",questionText:"Sind Anfahrschutz intakt, Feuerlöscher vorhanden, Türen/Tore sowie Gabelstapler, Kräne und Absauganlagen geprüft?",answerType:"AMPEL", subQuestions: ["Anfahrschutz", "Feuerlöscher", "Türen / Tore", "Gabelstapler", "Kräne", "Absauganlagen"]},
      {id:45,category:"Betriebsrundgang",questionText:"Ist Erste-Hilfe-Material (sowie Plakat, Verbandbuch) vorhanden?",answerType:"AMPEL", subQuestions: ["Erste-Hilfe-Koffer", "Plakat (Anleitung)", "Verbandbuch"]},
      {id:46,category:"Betriebsrundgang",questionText:"Sind Aufzüge, Druckbehälter und Rohrleitungen vorhanden und geprüft?",answerType:"AMPEL", subQuestions: ["Aufzüge", "Druckbehälter", "Rohrleitungen"]},
      {id:47,category:"Betriebsrundgang",questionText:"Sind Abfüllanlagen und Lagerbehälter vorhanden?",answerType:"JA_NEIN_ENTFAELLT"},
      {id:48,category:"Betriebsrundgang",questionText:"Sind elektrische Anlagen im Ex-Bereich vorhanden und Ex-geschützt?",answerType:"JA_NEIN_ENTFAELLT"},
      {id:49,category:"Betriebsrundgang",questionText:"Sind neue Maschinen vorhanden und CE-gekennzeichnet?",answerType:"JA_NEIN_ENTFAELLT"}
    ],
    ANSWER_OPTIONS: {
      JA_NEIN_ENTFAELLT: [["JA","Ja"],["NEIN","Nein"],["ENTFAELLT","Entfällt"]],
      JA_NEIN: [["JA","Ja"],["NEIN","Nein"]],
      AMPEL: [["AMPEL_GRUEN","Grün"],["AMPEL_GELB","Gelb"],["AMPEL_ROT","Rot"],["ENTFAELLT","Entfällt"]],
      JA_NEIN_ENTFAELLT_INVERTED: [["JA_INV","Ja"],["NEIN_INV","Nein"],["ENTFAELLT","Entfällt"]]
    },
    TYPE_LABELS: {
      JA_NEIN_ENTFAELLT: "Ja / Nein / Entfällt",
      JA_NEIN: "Ja / Nein",
      AMPEL: "Ampel (Grün/Gelb/Rot/Entfällt)",
      JA_NEIN_ENTFAELLT_INVERTED: "Invertiert (Ja)"
    }
};

// --- Lokaler Speicher (Auto-Save) ---
export function saveToLocalStorage() {
    try {
        localStorage.setItem('arbeitsSafeDrafts', JSON.stringify(state.revisionsSchreibenListe));
        localStorage.setItem('arbeitsSafeSessions', JSON.stringify(state.sessions));
    } catch(e) {
        console.warn('Speichern fehlgeschlagen', e);
    }
}

export function loadFromLocalStorage() {
    try {
        const drafts = localStorage.getItem('arbeitsSafeDrafts');
        if (drafts) state.revisionsSchreibenListe = JSON.parse(drafts);
        
        const sessions = localStorage.getItem('arbeitsSafeSessions');
        if (sessions) state.sessions = JSON.parse(sessions);
    } catch(e) {
        console.warn('Laden fehlgeschlagen', e);
    }
}

export function parseCSV(text) {
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const linesText = text.split(/\r?\n/).filter(line => line.trim() !== '');
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
