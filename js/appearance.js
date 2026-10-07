/**
 * Darstellung aus den Einstellungen der Haupt-App übernehmen
 * (Revisionsbogen, rechtliche Seiten). Gesetzt werden die Werte in js/app.js.
 */

export const SPELLCHECK_KEY = 'arbeitsSafe_spellcheck';

export const spellcheckEnabled = () => localStorage.getItem(SPELLCHECK_KEY) !== 'false';

/**
 * Rechtschreibprüfung in Freitexten. Das Attribut vererbt sich auf alle Eingabefelder
 * ohne eigene Angabe; Felder für Namen und Kontaktdaten setzen spellcheck="false".
 */
export function applySpellcheck(enabled = spellcheckEnabled()) {
    document.documentElement.spellcheck = enabled;
}

export function applyAppearance() {
    const pref = localStorage.getItem('arbeitsSafe_theme') || 'system';
    const dark = pref === 'dark' || (pref === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    document.documentElement.dataset.fontsize = localStorage.getItem('arbeitsSafe_fontsize') || 'normal';
    applySpellcheck();
}
