# Haushaltsbuch

Webanwendung als persönliches Haushaltsbuch mit Meilenstand. Sprache Deutsch, Währung Euro.
Frontend mit HTML, CSS und JavaScript ohne Build Schritt, Login und Datenbank über Supabase.

## Stand

| Schritt | Status |
|---|---|
| Datenmodell | erledigt |
| SQL (Tabellen, Row Level Security, Vorbelegung) | erledigt |
| Login | erledigt |
| Startseite | erledigt |
| Haushaltsbuch | erledigt |
| Meilenstand | offen |
| Export | offen |

## Datenbank

Das komplette SQL liegt in `supabase/migrations/`. Es ist im Supabase Projekt „Haushaltsbuch“ bereits ausgeführt.

Alle Tabellen haben Row Level Security. Jeder angemeldete Benutzer sieht und ändert nur seine eigenen Zeilen, anonyme Zugriffe haben keine Rechte.

| Tabelle | Inhalt |
|---|---|
| `einkommen` | Bezeichnung, Betrag pro Monat |
| `fixkosten` | Bezeichnung, Betrag, Intervall (monatlich oder jährlich) |
| `sparen` | Bezeichnung, Betrag pro Monat |
| `miete` | Gesamtmiete und mein Anteil in Euro, eine Zeile pro Benutzer |
| `sparziele` | Name, Zielbetrag, bisher gespart |
| `programme` | Meilen und Hotelprogramme mit Zuordnung zu Amex, Revolut, Payback und Transferverhältnissen |
| `meilenstaende` | Zwischenstände je Programm (Datum, Stand, Notiz) |
| `meilenziele` | Zielstand je Programm, höchstens eines pro Programm |

Transferverhältnisse sind als zwei Zahlen gespeichert (Quelle und Ziel), 5 und 4 heißt 5:4.
Bei Miles & More über Amex ist `amex_ueber_payback` gesetzt. Die App rechnet dann in zwei Schritten:
Amex zu Payback mit dem Verhältnis aus der Zeile „Payback“, danach Payback zu Miles & More.

Beim Anlegen eines neuen Benutzerkontos werden automatisch 29 Programme mit den Verhältnissen vom 18.11.2026 eingetragen.

## Einrichtung

1. Im Supabase Dashboard unter Authentication ein Benutzerkonto mit Mailadresse und Passwort anlegen.
   Die Programmliste wird dabei automatisch angelegt.
2. In den Auth Einstellungen die Registrierung neuer Benutzer abschalten, damit sich niemand sonst ein Konto anlegen kann.

## Lokal ausprobieren

Die App muss über einen Webserver geöffnet werden. Ein Doppelklick auf `index.html` reicht nicht,
weil Browser JavaScript Module aus lokalen Dateien blockieren. Im Projektordner zum Beispiel:

```bash
python3 -m http.server 8080
```

Danach im Browser `http://localhost:8080` öffnen.

## Neue Kachel ergänzen

1. Seite in `js/seiten/` anlegen.
2. Eine Funktion für die Kurzinfo schreiben, zum Beispiel in `js/daten/`.
3. Einen Eintrag in `js/bereiche.js` hinzufügen. Kachel auf der Startseite und Seitenwechsel entstehen automatisch.

## Aufbau

| Pfad | Inhalt |
|---|---|
| `index.html` | Einzige HTML Seite, lädt Supabase und die App |
| `manifest.webmanifest`, `icons/` | Installation auf dem Home Bildschirm |
| `css/style.css` | Gestaltung, mobil zuerst, Dunkelmodus nach Geräteeinstellung |
| `js/config.js` | Adresse und öffentlicher Schlüssel des Supabase Projekts |
| `js/app.js` | Anmeldestatus und Seitenwechsel über die Adresse nach `#` |
| `js/bereiche.js` | Liste der Bereiche, daraus entstehen Kacheln und Seiten |
| `js/seiten/` | Eine Datei pro Seite |
| `js/daten/` | Laden und Berechnen der Daten je Bereich |
| `js/format.js` | Euro, Zahlen und Datum im deutschen Format |
| `js/eingabe.js` | Eingabefelder, liest deutsche Beträge wie 1.234,56 |
| `js/liste.js` | Bearbeitbare Liste (anzeigen, anlegen, ändern, löschen) |
| `js/diagramm.js` | Segmentierter Balken für Anteile an einem Ganzen |
| `js/fehler.js` | Deutsche Fehlermeldungen |
| `vendor/supabase.js` | Lokale Kopie von supabase-js 2.119.1 (MIT Lizenz) |
