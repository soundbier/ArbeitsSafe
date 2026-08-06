# Arbeitsschutz Dashboard

Browserbasiertes Dashboard zur Bereitstellung von Werkzeugen, Rechnern und Formularen für den Arbeitsschutz und Außendienst. Das System ist für den Einsatz im administrativen und behördlichen Umfeld konzipiert.

## Bereitstellung und Zugriff
Das Dashboard wird als statische Website über Cloudflare Pages ausgeliefert:
https://arbeitsschutz-dashboard.pages.dev/

Für den Aufruf über die URL ist eine Internetverbindung erforderlich, um die HTML-, CSS- und JavaScript-Dateien initial in den Browser zu laden.

## Enthaltene Module
* Gesetze & Textbausteine: Nachschlagewerk für Rechtsgrundlagen und wiederkehrende Formulierungshilfen.
* Arbeitszeitrechner: Werkzeug zur Berechnung von Präsenzzeiten und tariflichen Arbeitsstunden.
* Gefährdungsbeurteilung: Formular zur strukturierten Erfassung und Analyse arbeitsschutzrechtlicher Risiken.
* Akustik- & Lärmrechner: Tool zur Ermittlung von Lärmexpositionen (LEX,8h), Abstandsgesetzen (Pegelabnahme) und Summenpegeln.
* Tagesplaner: Werkzeug für die Routen- und Terminplanung im Außendienst.
* Inspektor: Lernanwendung zur Sensibilisierung für Gefährdungen im Arbeitsumfeld.

## Datenschutz und IT-Sicherheit
Das Dashboard erfüllt strikte Datenschutzvorgaben und ist für den Einsatz in restriktiven IT-Umgebungen geeignet, da eine strikte Trennung zwischen der Auslieferung der Anwendung und der Verarbeitung der Nutzerdaten besteht:
* Lokale Datenverarbeitung (Client-Side): Nach dem Laden der Seite werden alle Berechnungen und Eingaben ausschließlich im Arbeitsspeicher des lokalen Browsers verarbeitet.
* Keine Datenabflüsse: Es existiert keine Datenbankanbindung und keine serverseitige Datenverarbeitung. Vom Nutzer eingegebene Daten werden zu keinem Zeitpunkt an Cloudflare oder andere Server übertragen.
* Kein Tracking: Es werden keine Web-Analytics-Tools (wie Google Analytics) eingesetzt.
* Datensparsamkeit: Nach dem Schließen des Browser-Tabs oder einem Neuladen der Seite werden alle eingegebenen Daten im flüchtigen Speicher restlos gelöscht.

## Alternative: Lokale Offline-Nutzung
Sollte ein Einsatz in Umgebungen ohne Internetanbindung (z. B. auf abgesetzten Laptops oder Tablets) erforderlich sein, kann das System auch lokal betrieben werden:
1. Repository herunterladen.
2. Die Einstiegsdatei `Dashboard.htm` von der lokalen Festplatte in einem Standard-Webbrowser öffnen.
3. In diesem Betriebsmodus ist das System autark und ohne Netzwerkverbindung lauffähig.

## Technische Basis
* HTML5
* CSS3
* Vanilla JavaScript (ohne externe Frameworks)
