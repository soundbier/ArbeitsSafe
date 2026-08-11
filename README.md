# ArbeitsSafe 🛡️ (v1.1.9.1)

Ein smarter, moderner Generator für Revisionsschreiben und Textbausteine im Arbeitsschutz. ArbeitsSafe unterstützt Arbeitsschutz-Experten dabei, festgestellte Mängel und gesetzliche Grundlagen schnell zu filtern, zu strukturieren und als professionelles Revisionsschreiben zusammenzustellen.

---

## ✨ Highlights & Features

* **Premium "2026" UI**: 
  * Modernes, minimalistisches Design mit Glassmorphism-Effekten (Backdrop-Blur).
  * Vollständiger **Dark Mode** Support mit automatischer Systemerkennung.
  * Native App-Haptik durch taktiles Feedback und flüssige Animationen.

* **Intelligentes Filtering**:
  * **Modernes Bottom-Sheet** für mobile Filterung.
  * Live-Statistik und Trefferanzeige direkt über den Suchergebnissen.
  * Filterung nach Gesetzen, Paragraphen und Absätzen sowie globale Volltextsuche.

* **Effiziente Dokument-Komposition**:
  * Kombiniert Mängel, Rechtsgrundlagen und Handlungsaufforderungen automatisch.
  * Flexibler Export in HTML (für Word/Outlook) oder Reintext.
  * Integriertes Draft-System mit Sortierfunktion.

---

## 📝 Beispiel eines Revisionspunktes

ArbeitsSafe strukturiert komplexe gesetzliche Anforderungen in klare, handlungsrelevante Blöcke:

> **1. Unterweisung und besondere Beauftragung von Beschäftigten**
> 
> **Mangel:** Zum Zeitpunkt der Besichtigung konnte nicht nachgewiesen werden, dass die Beschäftigten vor der erstmaligen Verwendung von Arbeitsmitteln ausreichend informiert und unterwiesen wurden und/oder die gesetzlich geforderte schriftliche Dokumentation dieser Unterweisungen fehlte.
> 
> **Rechtsgrundlage (§ 12 Abs. 1 BetrSichV):** Der Arbeitgeber hat die Beschäftigten vor Aufnahme der Verwendung von Arbeitsmitteln tätigkeitsbezogen zu unterweisen... Das Datum einer jeden Unterweisung und die Namen der Unterwiesenen hat er schriftlich festzuhalten.
> 
> **Handlungsaufforderung:** Bitte informieren und unterweisen Sie Ihre Beschäftigten tätigkeitsbezogen vor der erstmaligen Verwendung von Arbeitsmitteln und wiederholen Sie dies anschließend mindestens einmal jährlich.

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
