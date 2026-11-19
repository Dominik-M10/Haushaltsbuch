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
| Meilenstand | erledigt |
| Export | erledigt |

## Datenbank

Das komplette SQL liegt in `supabase/migrations/`. Es ist im Supabase Projekt „Haushaltsbuch“ bereits ausgeführt.

Alle Tabellen haben Row Level Security. Jeder angemeldete Benutzer sieht und ändert nur seine eigenen Zeilen, anonyme Zugriffe haben keine Rechte.

| Tabelle | Inhalt |
|---|---|
| `einkommen` | Bezeichnung, Betrag, Intervall (monatlich oder jährlich) |
| `fixkosten` | Bezeichnung, Betrag, Intervall (monatlich oder jährlich) |
| `sparen` | Bezeichnung, Betrag, Intervall (monatlich oder jährlich) |
| `miete` | Gesamtmiete und mein Anteil in Euro, eine Zeile pro Benutzer |
| `sparziele` | Name, Zielbetrag, bisher gespart |
| `programme` | Meilen und Hotelprogramme mit Zuordnung zu Amex, Revolut, Payback und Transferverhältnissen |
| `meilenstaende` | Zwischenstände je Programm (Datum, Stand, Notiz) |
| `meilenziele` | Zielstand je Programm, höchstens eines pro Programm |

Transferverhältnisse sind als zwei Zahlen gespeichert (Quelle und Ziel), 5 und 4 heißt 5:4.
Bei Miles & More über Amex ist `amex_ueber_payback` gesetzt. Die App rechnet dann in zwei Schritten:
Amex zu Payback mit dem Verhältnis aus der Zeile „Payback“, danach Payback zu Miles & More.

Beim Anlegen eines neuen Benutzerkontos werden automatisch 31 Programme eingetragen, die Verhältnisse haben den Stand 18.11.2026.
Dazu gehören seit dem 19.11.2026 „Amex Membership Rewards“ und „Revolut RevPoints“ als Bonusprogramme, damit sich auch
die Punktestände der beiden Quellen erfassen lassen. Sie sind selbst Quellen und deshalb über keine Quelle erreichbar.

## Design

Grundlage ist die Token Datei „Look: YNAB“: Hintergrund Creme `#fef9ed`, Karten Weiß, Schrift Navy `#1c1f58`,
Akzent `#545bfe`, primäre Knöpfe Grün `#aee865` mit Navy Schrift, Radius 8 px (Knöpfe 6 px), Schrift Figtree.
Alle Werte stehen als Variablen oben in `css/style.css`.

Ergänzt, weil die Vorlage sie nicht enthält (alle auf Kontrast nach WCAG geprüft):

| Wert | Hell | Dunkel |
|---|---|---|
| Hintergrund | aus der Vorlage | `#13153d` |
| Karten | aus der Vorlage | `#1c1f58` (Navy der Vorlage) |
| Schrift | aus der Vorlage | `#fef9ed` (Creme der Vorlage) |
| Gedämpfte Schrift | `#5d608c` | `#b7b6d6` |
| Akzent | aus der Vorlage | `#8f95ff` |
| Fehler | `#c42b3a` | `#ff8f96` |
| Erfolg | `#147a50`, Balken Mint `#41d298` | `#41d298` |

Die Schrift Figtree liegt als Datei in `fonts/` (SIL Open Font License), es wird nichts von Google geladen.
Diagrammfarben sind auf Farbsehschwäche geprüft, die erste Farbe ist der Akzent der Vorlage.

## Regeln im Haushaltsbuch

1. Alle Beträge sind ein fester Monatsplan. Einkommen, Fixkosten und Sparen können monatlich oder jährlich sein,
   jährliche Beträge werden durch 12 geteilt (zum Beispiel Weihnachtsgeld oder eine Versicherung).
2. Einkommen, Fixkosten und Sparen sind nach Betrag sortiert, die größte Position steht oben.
   Jährliche Beträge zählen dabei mit ihrem Betrag pro Monat. Bei gleichem Betrag steht der ältere Eintrag oben.
3. Sparziele sind nach Fortschritt in Prozent sortiert, das am weitesten fortgeschrittene Ziel steht oben.
   Erreichte Ziele (100 % und mehr) stehen deshalb ganz oben.
4. Der Export hat dieselbe Reihenfolge wie die Anzeige.

## Regeln im Meilenstand

1. Verhältnisse sind immer Quelle zu Ziel: 5:4 heißt 5 Punkte ergeben 4 Meilen.
2. Der Umrechner rundet auf ganze Meilen oder Punkte ab, bei zwei Schritten nach jedem Schritt.
3. Steht bei einem Programm „Amex über Payback“, rechnet der Umrechner zuerst mit dem Amex Verhältnis
   des Programms „Payback“ und danach mit dem Payback Verhältnis des Programms.
   Das Gesamtverhältnis in der Tabelle ergibt sich daraus (bei Miles & More 3:1).
4. Aktueller Stand ist der Eintrag mit dem jüngsten Datum. Die Kachel auf der Startseite zeigt
   den zuletzt angelegten oder geänderten Eintrag.
5. Der Umrechner trägt bei den Punkten den aktuellen Stand der gewählten Quelle ein. Dazu sucht er das Programm
   mit demselben Namen wie die Quelle: „Amex Membership Rewards“, „Revolut RevPoints“ oder „Payback“.
   Wer ein solches Programm umbenennt, bekommt keine Vorbelegung mehr. Eine eigene Eingabe bleibt beim Wechsel
   der Quelle stehen.
6. Unter dem Ergebnis zeigt der Umrechner, was die Punkte bei allen erreichbaren Programmen ergeben.
7. Programmlisten sind überall gleich geordnet: zuerst Airlines, dann Hotels, dann Bonusprogramme,
   jede Kategorie mit Überschrift und Trennlinie, darin alphabetisch. Das gilt für den Reiter Stände,
   die Übersicht im Umrechner, die Auswahllisten und den Reiter Programme.

## Export

Haushaltsbuch und Meilenstand haben jeweils unten eine Karte „Export“ (beim Meilenstand im Reiter Stände).
Die CSV Dateien sind für Excel und Numbers mit deutschen Einstellungen gemacht: Semikolon als Trennzeichen,
Komma bei Beträgen, Datum als TT.MM.JJJJ. Texte, die mit = + - oder @ beginnen, bekommen ein ' davor,
damit Tabellenprogramme sie nicht als Formel ausführen.

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
| `js/liniendiagramm.js` | Liniendiagramm für den Verlauf eines Programms |
| `js/daten/tabellen.js` | Gemeinsames Laden, Speichern und Löschen |
| `js/daten/programme.js` | Regeln für Transferwege und Umrechner (ohne Datenbank, einzeln testbar) |
| `js/fehler.js` | Deutsche Fehlermeldungen |
| `js/export.js` | CSV Export (Semikolon, Komma bei Beträgen, UTF-8) |
| `vendor/supabase.js` | Lokale Kopie von supabase-js 2.119.1 (MIT Lizenz) |
| `fonts/` | Schrift Figtree (SIL Open Font License) |
