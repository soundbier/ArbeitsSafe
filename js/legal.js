/**
 * Rechtliche Seiten (Datenschutzerklärung, Impressum).
 * Die Inhalte sind statisch und auch ohne JavaScript lesbar; hier nur Komfort.
 */

import { applyAppearance } from './appearance.js';

applyAppearance();

// "Zurück" führt dorthin, woher die Seite aufgerufen wurde (Haupt-App oder Revisionsbogen).
const back = document.getElementById('backLink');
const from = document.referrer ? new URL(document.referrer) : null;
if (back && from?.origin === location.origin && /(?:\/|\/index\.html|\/bogen\.html)$/.test(from.pathname)) {
    back.href = from.pathname;
}
