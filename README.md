# ArbeitsSafe 🛡️ (v2.0.0)

Ein smarter, moderner Generator für Revisionsschreiben und Textbausteine im Arbeitsschutz. ArbeitsSafe unterstützt Arbeitsschutz-Experten dabei, festgestellte Mängel und gesetzliche Grundlagen schnell zu filtern, zu strukturieren und als professionelles Revisionsschreiben zusammenzustellen.

---

## ✨ Highlights & Features

* **Adaptives UI (v2.0)**:
  * Ein Layout, drei Ausbaustufen: Mobile (Bottom-Nav + Filter-Sheet), Tablet, Desktop (feste Filter-Sidebar) und ab 1280 px zusätzlich der Entwurf als permanente zweite Spalte.
  * Konsistentes Token-Design-System (Farben, Radien, Abstände, Schatten) mit Hell-/Dunkel-Modus und Systemerkennung.
  * Touch-optimiert: Ziele ab 44 px, `safe-area`-Insets, `100dvh`, kein erzwungenes Zoom-Verbot.
  * Barrierearm: Fokus-Sichtbarkeit, ARIA-Rollen, Escape schließt Overlays, `prefers-reduced-motion` respektiert.

* **Intelligentes Filtering**:
  * Filter nach Gesetz, Paragraf und Absatz — abhängige Auswahllisten in einem einzigen Datendurchlauf.
  * Entprellte Volltextsuche mit Treffer-Hervorhebung, Chip-Leiste mit aktiven Kriterien und Ein-Klick-Reset.
  * Tastatur: `/` bzw. `Strg/Cmd + K` springt in die Suche.

* **Effiziente Dokument-Komposition**:
  * Übernahme einzelner Normen in den Entwurf, Sortierung, Inline-Bearbeitung von Titel und Text (auto-wachsende Textfelder).
  * Export in die Zwischenablage (formatiertes HTML + Reintext) oder als `.doc`-Datei.
  * Entwurf wird lokal gespeichert; nur die betroffene Karte wird neu gerendert.

* **PWA**: Offline-fähig via Service Worker (Stale-While-Revalidate), Update-Banner mit Nutzerbestätigung, installierbar.

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
├── index.html          # Hauptanwendung (UI & Layout)
├── manifest.json       # PWA-Manifest für die Installation
├── sw2.js              # Service Worker für Offline-Caching
├── gesetze.csv         # Standard-Datenbank für Gesetze und Bausteine
├── css/
│   └── style.css       # Zentrales Stylesheet
└── js/
    ├── app.js          # App-Logik, Event-Wiring, Theme & Service Worker
    ├── data.js         # CSV-Parser, globaler State & LocalStorage
    ├── ui.js           # DOM-Referenzen, Rendering, Filter, Export
    └── icons.js        # SVG-Icon-Registry
```
