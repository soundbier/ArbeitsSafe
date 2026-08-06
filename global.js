/* ==========================================================================
   GLOBAL JAVASCRIPT UTILITIES
   Zentrale Hilfsfunktionen für alle Tools im Arbeitsschutz-Dashboard
   ========================================================================== */

/**
 * 1. SICHERHEIT: Escaped HTML-Sonderzeichen, um XSS-Angriffe zu vermeiden.
 */
function escapeHtml(text) {
    if (text === null || text === undefined) return "";
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
const escapeHTML = escapeHtml;

/**
 * 2. SICHERHEIT: Escaped Strings für die sichere Übergabe an JavaScript-Funktionen.
 */
function escapeJS(str) {
    if (!str) return '';
    return str.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\n/g, '\\n');
}

/**
 * 3. DATUM: Formatiert das aktuelle Datum in deutscher Langform.
 */
function formatiereDatumHeute() {
    const heute = new Date();
    return heute.toLocaleDateString("de-DE", {
        weekday: "long", day: "2-digit", month: "long", year: "numeric"
    });
}

/**
 * 4. DATUM: Formatiert einen beliebigen Datums-String in "DD.MM.YYYY".
 */
function formatDate(dateStr) {
    if(!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr; 
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/**
 * 5. IDs: Erzeugt eine einfache, eindeutige ID auf Basis von Zeitstempel + Zufallszahl.
 */
function erzeugeId(praefix) {
    return praefix + "_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
}

/**
 * 6. UI: Kopiert Text in die Zwischenablage und gibt visuelles Feedback.
 */
function copyTextToClipboard(btn, text) {
    if (!navigator.clipboard) {
        alert("Kopieren wird in diesem Browser nicht unterstützt.");
        return;
    }
    navigator.clipboard.writeText(text).then(() => {
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '✓ Kopiert!';
        btn.style.backgroundColor = '#10b981'; 
        btn.style.color = 'white';
        btn.style.borderColor = '#10b981';
        
        setTimeout(() => {
            btn.innerHTML = originalHTML;
            btn.style.backgroundColor = '';
            btn.style.color = '';
            btn.style.borderColor = '';
        }, 2000);
    });
}

/**
 * 7. SUCHE: Prüft, ob ein exaktes Wort in einem Text vorkommt.
 */
function containsExactWord(text, query) {
    if (!text || !query) return false;
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[^\\p{L}\\p{N}])(${escaped})([^\\p{L}\\p{N}]|$)`, 'iu').test(text);
}

/**
 * 8. NAVIGATION: Injiziert den "Zurück"-Button automatisch auf allen Unterseiten.
 */
function initNavigation() {
    // Prüfen, ob wir auf der Startseite (Dashboard) sind.
    const path = window.location.pathname;
    if (path.endsWith('index.html') || path === '/' || path.endsWith('/')) {
        return;
    }

    // Den Haupt-Container der Seite suchen
    const container = document.querySelector('main.container');
    
    // Nur einfügen, wenn der Container existiert und nicht schon ein Button da ist
    if (container && !document.querySelector('.nav-back')) {
        const backBtn = document.createElement('a');
        backBtn.href = 'index.html';
        backBtn.className = 'nav-back no-print';
        backBtn.innerHTML = '🔙 Zurück zum Dashboard';
        
        container.insertBefore(backBtn, container.firstChild);
    }
}

// Wird automatisch ausgeführt, sobald das HTML der Seite geladen ist
document.addEventListener('DOMContentLoaded', initNavigation);
