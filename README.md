# ArbeitsSafe 🛡️

Ein smarter Generator für Revisionsschreiben und Textbausteine im Arbeitsschutz. ArbeitsSafe unterstützt Arbeitsschutz-Experten dabei, festgestellte Mängel und gesetzliche Grundlagen schnell zu filtern, zu strukturieren und als professionelles Revisionsschreiben zusammenzustellen.

---

## 🚀 Hauptfunktionen

* **Datenbank & erweiterte Suche**:
  * Filterung nach Gesetzen, Paragraphen und Absätzen.
  * Globale Textsuche mit präzisem Wort-Matching.
  * Filteroption, um gezielt nur Einträge mit vorhandenen Textbausteinen anzuzeigen.
    
* **CSV-Datenimport**:
  * Flexibles Laden eigener CSV-Datensätze (z. B. `gesetze.csv`) per Dateiupload.
  * Automatisierter Parser zur Erkennung von Paragraphen, Inhalten, Mängeln, Rechtsgrundlagen und Handlungsaufforderungen.
    
* **Entwurfs-Ansicht & Text-Komposition**:
  * Per Klick können relevante Normen und Textbausteine in einen Entwurf übernommen werden.
  * Inline-Bearbeitung von Titeln und Texten direkt im Entwurf.
  * Sortierfunktion (Verschieben nach oben/unten) und Verwaltung der Revisionspunkte.
    
* **Export-Funktion**:
  * Kopieren des vollständigen Schreibens in die Zwischenablage wahlweise als formatierter HTML-Text (ideal für Word oder E-Mail) oder als Klartex.
    
* **Progressive Web App (PWA)**:
  * Vollständig offline-fähig dank integriertem Service Worker.
  * Installierbar auf mobilen Geräten und Desktop-Systemen (Stand-alone-Modus).
  * Mobil-optimiertes UI mit responsivem Layout, Touch-freundlichen Elementen und Toast-Benachrichtigungen.

---

## 🛠️ Technologie-Stack

* **Frontend**: Vanilla JavaScript (ES Modules).
* **Styling**: Modernes CSS (mit CSS Custom Properties, Flexbox & Grid, responsiven Media Queries).
* **PWA**: Service Worker (`sw2.js`) mit Cache-First-Strategie und Manifest.

---

## 📂 Projektstruktur

```text
├── index.html          # Hauptanwendung (UI & Layout)[cite: 1]
├── manifest.json       # PWA-Manifest für die Installation[cite: 2]
├── sw2.js              # Service Worker für Offline-Caching[cite: 3]
├── gesetze.csv         # Standard-Datenbank für Gesetze und Bausteine
├── css/
│   └── style.css       # Zentrales Stylesheet[cite: 1, 7]
└── js/
    ├── app.js          # App-Logik, Event-Listener & Initialisierung[cite: 5]
    ├── data.js         # CSV-Parser und globaler State[cite: 6]
    └── ui.js           # DOM-Rendering, Filter- und Clipboard-Funktionen[cite: 4]
