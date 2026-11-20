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
| `mietpositionen` | Positionen der Miete (zum Beispiel Miete, Strom) mit Gesamtbetrag und meinem Anteil, beides pro Monat |
| `sparziele` | Name, Zielbetrag, bisher gespart |
| `programme` | Meilen und Hotelprogramme mit Zuordnung zu Amex, Revolut, Payback und Transferverhältnissen |
| `meilenstaende` | Zwischenstände je Programm (Datum, Stand, Notiz) |
| `meilenziele` | Ziele je Programm, mehrere möglich: benötigte Meilen oder Punkte, freiwillig Von, Nach und Art (One way oder Hin und zurück) |

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
4. Die Miete besteht aus einzelnen Positionen, zum Beispiel Miete, Strom und Internet. Jede Position hat einen
   Gesamtbetrag und meinen Anteil, beides monatlich. Mein Anteil darf nicht höher sein als der Gesamtbetrag.
   Die Positionen sind nach meinem Anteil sortiert, die größte steht oben. Unter der Liste stehen die Summen
   (Gesamt, mein Anteil, Anteil am Einkommen). In Monatsübersicht und Verteilung zählt die Summe meiner Anteile.
   Die frühere einzelne Miete wurde am 19.11.2026 als Position „Miete“ übernommen.
5. Der Export hat dieselbe Reihenfolge wie die Anzeige.

## Regeln im Meilenstand

1. Verhältnisse sind immer Quelle zu Ziel: 5:4 heißt 5 Punkte ergeben 4 Meilen.
2. Der Umrechner rundet auf ganze Meilen oder Punkte ab, bei zwei Schritten nach jedem Schritt.
3. Steht bei einem Programm „Amex über Payback“, rechnet der Umrechner zuerst mit dem Amex Verhältnis
   des Programms „Payback“ und danach mit dem Payback Verhältnis des Programms.
   Das Gesamtverhältnis in der Tabelle ergibt sich daraus (bei Miles & More 3:1).
4. Aktueller Stand ist der Eintrag mit dem jüngsten Datum. Die Kachel auf der Startseite zeigt groß
   die Summe der aktuellen Stände aller Programme, Meilen und Punkte zusammengezählt (also auch Hotels,
   Amex, Revolut und Payback). Darunter steht klein der zuletzt angelegte oder geänderte Eintrag.
5. Der Umrechner trägt bei den Punkten den aktuellen Stand der gewählten Quelle ein. Dazu sucht er das Programm
   mit demselben Namen wie die Quelle: „Amex Membership Rewards“, „Revolut RevPoints“ oder „Payback“.
   Wer ein solches Programm umbenennt, bekommt keine Vorbelegung mehr. Eine eigene Eingabe bleibt beim Wechsel
   der Quelle stehen.
6. Unter dem Ergebnis zeigt der Umrechner, was die Punkte bei allen erreichbaren Programmen ergeben.
7. Programmlisten sind überall gleich geordnet: zuerst Airlines, dann Hotels, dann Bonusprogramme,
   jede Kategorie mit Überschrift und Trennlinie, darin alphabetisch. Das gilt für den Reiter Stände,
   die Übersicht im Umrechner, die Auswahllisten und den Reiter Programme.
8. Im Reiter Stände lässt sich innerhalb der Kategorien auch nach Stand sortieren, der höchste Stand oben.
   Programme, die nur ein Ziel und noch keinen Stand haben, stehen dann am Ende ihrer Kategorie.
   Die gewählte Sortierung merkt sich jedes Gerät für sich, ohne Wahl gilt alphabetisch.

## Ziele im Meilenstand

1. Ein Ziel gehört zu einem Programm, ein Programm kann mehrere Ziele haben.
2. Pflicht sind nur die benötigten Meilen oder Punkte. Bei Airlines lassen sich zusätzlich Von, Nach und die Art
   (One way oder Hin und zurück) angeben, bei Hotels und Bonusprogrammen nicht.
3. Als Name dient die Strecke: „Frankfurt nach New York“, nur mit Ziel „Nach New York“, nur mit Abflugort
   „Ab Frankfurt“, ohne Strecke „Ziel“.
4. Der Fortschritt rechnet mit dem aktuellen Stand des Programms. Die Ziele stehen nach benötigten Meilen sortiert,
   das kleinste oben. Im Reiter Stände erscheinen alle Ziele unter ihrem Programm.

## Export

Haushaltsbuch und Meilenstand haben jeweils unten eine Karte „Export“ (beim Meilenstand im Reiter Stände).
Im Haushaltsbuch steht bei den Mietpositionen mein Anteil unter Betrag, der Gesamtbetrag in einer eigenen Spalte.
Die CSV Dateien sind für Excel und Numbers mit deutschen Einstellungen gemacht: Semikolon als Trennzeichen,
Komma bei Beträgen, Datum als TT.MM.JJJJ. Texte, die mit = + - oder @ beginnen, bekommen ein ' davor,
damit Tabellenprogramme sie nicht als Formel ausführen.

## Ohne Verbindung

1. Die App legt ihre Dateien über einen Service Worker (`sw.js`) auf dem Gerät ab. Jede Datei kommt zuerst
   aus dem Netz, ohne Verbindung aus dem Speicher. Neue Versionen kommen dadurch sofort an.
2. Die zuletzt geladenen Daten merkt sich die App je Benutzer im Browser (`js/zwischenspeicher.js`). Ohne Verbindung
   zeigt sie diesen Stand mit einem Hinweis samt Uhrzeit. Ändern geht erst wieder mit Verbindung.
3. Weiß das Gerät, dass es offline ist (zum Beispiel im Flugmodus), nimmt die App sofort den gespeicherten Stand.
   Das klappt auch, wenn die Anmeldung inzwischen abgelaufen ist, solange sie noch auf dem Gerät liegt.
   Bei schwachem Netz, das das Gerät für eine Verbindung hält, wartet die App, bis die Anfragen scheitern.
4. Kommt die Verbindung zurück, lädt die App nicht von selbst neu, damit ein angefangenes Formular nicht verloren geht.
   Der Hinweis bietet dann „Aktualisieren“ an.
5. Gespeichert sind nur Bereiche, die mit Verbindung schon einmal geöffnet wurden.
6. Beim Abmelden löscht die App die gespeicherten Daten auf dem Gerät.

## App Sperre

1. Auf der Startseite unten lässt sich pro Gerät „App Sperre einschalten“. Der Knopf erscheint nur auf Geräten
   mit Face ID, Touch ID oder einem anderen Entsperren des Geräts.
2. Gesperrt wird beim Öffnen der App und wenn sie mindestens eine Minute im Hintergrund war. Entsperrt wird mit
   Face ID, Touch ID oder dem Gerätecode. Nach einer Anmeldung mit Passwort ist die App nicht gesperrt.
3. Technisch ist das ein Passkey (WebAuthn) nur für dieses Gerät, Supabase ist nicht beteiligt (`js/sperre.js`).
   Es funktioniert deshalb auch ohne Verbindung.
4. Die Prüfung läuft nur im Browser. Sie schützt vor fremden Blicken auf ein entsperrtes Gerät, die Daten auf dem
   Gerät verschlüsselt sie nicht.
5. Klappt das Entsperren nicht mehr (zum Beispiel weil der Passkey gelöscht wurde), führt „Abmelden“ auf dem
   Sperrbildschirm zur Anmeldung mit Passwort. Danach die App Sperre aus und wieder einschalten.

## Einrichtung

1. Im Supabase Dashboard unter Authentication ein Benutzerkonto mit Mailadresse und Passwort anlegen.
   Die Programmliste wird dabei automatisch angelegt.
2. In den Auth Einstellungen die Registrierung neuer Benutzer abschalten, damit sich niemand sonst ein Konto anlegen kann.
   Konten im Dashboard anlegen funktioniert danach weiter.
3. Passwort ändern und zurücksetzen gibt es bewusst nicht in der App. Das bleibt im Supabase Dashboard,
   auf das nur der Inhaber des Projekts Zugriff hat.

## Adresse

Die App läuft unter https://meilenkasse.de. Ausgeliefert wird sie von GitHub Pages aus diesem Repository.

1. Die Datei `CNAME` legt die Domain für GitHub Pages fest. Die alte Adresse
   dominik-m10.github.io/Haushaltsbuch leitet automatisch auf meilenkasse.de weiter. In den Repository Settings
   unter Pages ist „Enforce HTTPS“ eingeschaltet, dadurch landen auch http und www auf https://meilenkasse.de.
2. Die Domain ist bei IONOS registriert. Dort stehen diese DNS Einträge:

   | Typ | Hostname | Zeigt auf |
   |---|---|---|
   | A | @ | 185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153 |
   | AAAA | @ | 2606:50c0:8000::153, 2606:50c0:8001::153, 2606:50c0:8002::153, 2606:50c0:8003::153 |
   | CNAME | www | dominik-m10.github.io |
   | MX | @ | mx00.ionos.de und mx01.ionos.de (Mail bei IONOS, nicht ändern) |

   Für A und AAAA nennt GitHub je vier Adressen. Pro Eintrag passt bei IONOS eine Adresse. Mindestens eine
   muss eingetragen sein, die übrigen sind Reserve, falls eine Adresse von GitHub ausfällt.
   Keinen Eintrag mit dem Hostnamen `*` anlegen, davor warnt GitHub.
3. Anmeldung, gespeicherte Daten und App Sperre gehören zur Adresse. Nach einem Wechsel der Adresse muss man sich
   auf jedem Gerät neu anmelden, die App Sperre neu einschalten und das Symbol auf dem Home Bildschirm neu anlegen.

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
| `CNAME` | Eigene Domain meilenkasse.de für GitHub Pages |
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
| `js/zwischenspeicher.js` | Zuletzt geladene Daten für die Nutzung ohne Verbindung |
| `sw.js` | Service Worker, hält die Dateien der App auf dem Gerät |
| `js/sperre.js` | App Sperre mit Face ID, Touch ID oder Gerätecode |
| `vendor/supabase.js` | Lokale Kopie von supabase-js 2.119.1 (MIT Lizenz) |
| `fonts/` | Schrift Figtree (SIL Open Font License) |
