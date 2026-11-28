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

Look „Travel und Tourism“, ausgewählt über den UI/UX Skill (Produkttyp Travel/Tourism Agency): Himmelblau als
Hauptfarbe, Orange nur für die wichtigste Aktion, weiche Verläufe in Blau und Türkis (Aurora) im Hintergrund und
auf dem Kopfbereich der Startseite, runde Karten mit weichem Schatten, Radius 16 px (Knöpfe und Felder 12 px),
Schrift Figtree. Alle Werte stehen als Variablen oben in `css/style.css`.

| Wert | Hell | Dunkel |
|---|---|---|
| Hintergrund | `#f0f9ff` | `#08192b` |
| Karten | `#ffffff` | `#0f2a44` |
| Schrift | `#0c4a6e` | `#e0f2fe` |
| Gedämpfte Schrift | `#3f5c73` | `#a5c3da` |
| Akzent (Links, Fokus, Symbole, Fortschritt) | `#0369a1` | `#38bdf8` |
| Primärer Knopf | Orange `#f97316`, Schrift `#0c2d48` | Orange `#fb923c`, Schrift `#1a0f00` |
| Fehler | `#b42318` | `#ff8f96` |
| Erfolg | `#0f6b45`, Balken `#059669` | `#34d399` |

Text und Bedienfarben sind auf Kontrast nach WCAG geprüft (Text 4,5:1, Rand der Eingabefelder und Symbole 3:1).
Der Dunkelmodus folgt dem Gerät und hat eigene Farbstufen. Die Diagrammfarben (Blau, Rotorange, Grün, Violett)
sind für Hell und Dunkel einzeln auf Farbsehschwäche und Unterscheidbarkeit geprüft, die Anteile stehen zusätzlich
als Text in der Legende.

Die Schrift Figtree liegt als Datei in `fonts/` (SIL Open Font License), es wird nichts von Google geladen.
Das App Symbol (`icons/`) hat dieselben Farben.

### Himmel nach Tageszeit

Die Karte oben auf der Startseite färbt sich nach dem echten Sonnenstand: nachts tiefdunkel, bei Dämmerung
warm mit dem Schein der Sonne am unteren Rand (morgens links, abends rechts), tagsüber das gewohnte Blau.
Feste Uhrzeiten wären falsch gewesen, denn Ende November ist es um 17 Uhr dunkel und Ende Juni um 21 Uhr
noch hell.

`js/himmel.js` rechnet die Höhe der Sonne über dem Horizont (Formel aus dem Astronomical Almanac, geringe
Genauigkeit). Der Ort ist fest die Mitte Deutschlands, passend dazu, dass die App ohnehin immer deutsche Zeit
zeigt. Über 8 Grad gilt als Tag, unter -6 Grad als Nacht, dazwischen Dämmerung, aufgeteilt danach, ob die Sonne
gerade steigt oder fällt. Am kürzesten Tag ergibt das Morgen ab 7:40, Tag ab 9:42, Abend ab 14:52 und Nacht ab
16:53, am längsten Tag Morgen ab 4:16, Tag ab 6:11, Abend ab 20:30 und Nacht ab 22:25.

Die Uhr setzt daraus `data-himmel` auf der Karte, die Farben stehen im Stylesheet. Beim Wechsel blenden sie über
vier Sekunden über statt zu springen; dafür sind die Farben mit `@property` angemeldet, sonst ließen sich Verläufe
nicht überblenden. Der weiße Text ist auf allen vier Himmeln auf Kontrast geprüft, der knappste Wert liegt bei
5,7:1.

## Bewegung

1. Beim Öffnen einer Seite blenden Kopfzeile, Reiter und Karten nacheinander ein (0,34 Sekunden, je 60 Millisekunden
   Versatz, höchstens sechs Stufen).
2. Beim Seitenwechsel geht der alte Inhalt sichtbar weg, während der neue kommt. Dafür hält der Browser den alten
   Stand als Bild fest (View Transitions), der Aufbau wird dadurch nicht langsamer. Beim Reiterwechsel im
   Meilenstand schiebt der Inhalt zur Seite, in Richtung des neuen Reiters, und der alte dorthin zurück, woher der
   neue kommt. Kopfzeile und Reiterleiste bleiben dabei ruhig. Bei einem Wechsel in einen anderen Bereich bewegt
   sich die ganze Seite ruhig nach oben weg und die neue kommt von unten nach. Der Hinweis „Wird geladen …“ bewegt
   sich nicht, sonst liefe die Bewegung auf ihm ab statt auf dem Inhalt danach.
   Die Richtung steht währenddessen als `data-wechsel` am `<html>` (`vor`, `zurueck` oder `seite`). Kennt ein
   Browser View Transitions nicht, blendet der neue Inhalt wie bisher ein und der alte verschwindet ohne Bewegung.
   Steht der Inhalt beim Wechsel schon da, zeigt ihn der Übergang selbst und die Karten blenden nicht zusätzlich
   einzeln ein. Täten sie es, liefe die Bewegung nach dem Übergang noch gut 200 Millisekunden weiter und wirkte
   wie ein Nachzittern. Nur wenn die Seite noch lädt, blenden die später eintreffenden Karten ein.
3. Karten, die beim Öffnen noch unter dem Bildschirmrand liegen, erscheinen beim Scrollen. Fortschrittsbalken und das
   Diagramm wachsen von links, sobald sie im Bild sind.
4. Formulare in den Karten, der Hinweis ohne Verbindung und der Sperrbildschirm blenden kurz ein. Knöpfe geben beim
   Antippen leicht nach.
5. Auf der Startseite fliegt ein Flugzeug die gestrichelte Route unter dem Datum entlang, in 24 Sekunden von links
   nach rechts, am Rand blendet es ein und aus. Die Stützstellen der Bewegung sind aus derselben Kurve gerechnet,
   die den Strich zeichnet, und stehen in Prozent, damit sie mit der Kartenbreite mitwachsen. Weil die Route auf
   die Kartenbreite gestreckt wird und dadurch auf breiten Bildschirmen flacher aussieht, gibt es zwei Sätze für
   die Neigung (`flug-dreh-schmal` und `flug-dreh-breit`, umgeschaltet über `--flug-dreh` ab 768 Pixeln). Ohne
   Animation steht das Flugzeug am höchsten Punkt der Route.
6. Animiert werden nur `transform`, `translate`, `rotate`, `opacity` und `clip-path`, also nichts, wofür der
   Browser die Seite neu aufteilen muss. Nach dem Einblenden gelten wieder die normalen Stile.
7. Ist am Gerät „Bewegung reduzieren“ eingestellt, erscheint alles sofort, `js/animation.js` setzt dann keine
   Klassen und im Stylesheet sind alle Animationen abgeschaltet. Beim Drucken erscheint ebenfalls alles, auch was
   noch auf das Scrollen wartet.
8. Die Stile stehen am Ende von `css/style.css`, die Klassen setzt `js/animation.js`.

## Regeln im Haushaltsbuch

1. Alle Beträge sind ein fester Monatsplan. Einkommen, Fixkosten und Sparen können monatlich oder jährlich sein,
   jährliche Beträge werden durch 12 geteilt (zum Beispiel Weihnachtsgeld oder eine Versicherung).
2. Einkommen, Fixkosten und Sparen sind nach Betrag sortiert, die größte Position steht oben.
   Jährliche Beträge zählen dabei mit ihrem Betrag pro Monat. Bei gleichem Betrag steht der ältere Eintrag oben.
3. Sparziele sind nach Fortschritt in Prozent sortiert, das am weitesten fortgeschrittene Ziel steht oben.
   Erreichte Ziele (100 % und mehr) stehen deshalb ganz oben. Oben rechts in der Karte steht, wie viel über alle
   Ziele zusammen noch fehlt, unter der Liste die Summen (Ziele gesamt, bisher gespart, fehlt noch).
   „Fehlt noch“ zählt je Ziel nur, was dort tatsächlich fehlt: Wer über ein Ziel hinaus gespart hat, gleicht damit
   andere Ziele nicht aus. Deshalb ist „Fehlt noch“ nicht immer „Ziele gesamt“ minus „Bisher gespart“. Tritt dieser
   Fall ein, steht ein Hinweis darunter, sonst nicht.
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

## Seiten öffnen sofort

Beim Öffnen einer Seite steht zuerst der Stand vom letzten Mal da, der auf dem Gerät gespeichert ist. Die frischen
Daten werden im Hintergrund geholt und ersetzen ihn. Vorher wartete jede Seite auf den Server, gemessen 1,2 bis
1,7 Sekunden mit „Wird geladen …“; jetzt sind es 19 bis 36 Millisekunden.

1. `ausSpeicher(name)` in `js/zwischenspeicher.js` liefert den gespeicherten Stand, ohne zu warten. Anders als beim
   Lesen in `mitZwischenspeicher` meldet es keinen Hinweis: der Stand ist gleich wieder ersetzt. Der Hinweis „Du
   siehst den Stand vom …“ erscheint weiterhin nur, wenn die frischen Daten wirklich ausbleiben.
2. Jede Ladefunktion hat eine Fassung aus dem Speicher (`haushaltAusSpeicher`, `sparzieleAusSpeicher`,
   `meilenDatenAusSpeicher`, `kurzinfoHaushaltAusSpeicher`, `kurzinfoMeilenAusSpeicher`). Beide Wege teilen sich die
   Aufbereitung, damit gespeicherte und frische Daten gleich sortiert und gerechnet werden.
3. Sind die frischen Daten gleich dem schon gezeigten Stand, baut sich die Seite nicht noch einmal auf
   (`gleicherStand`). Das vermeidet Flackern, und eine gerade begonnene Eingabe geht nicht verloren.
4. Nach dem Speichern oder Löschen merkt sich `standUeberholt()` den Zeitpunkt. Jeder ältere Stand wird danach
   nicht mehr vorab gezeigt, sonst stünde dort kurz der Wert von vorher. Gelöscht wird nichts: der Stand bleibt
   für den Fall ohne Verbindung erhalten.
5. Ist auf dem Gerät noch nichts gespeichert, erscheint wie bisher „Wird geladen …“.
6. Eine Änderung auf einem anderen Gerät kennt die App nicht. Dann steht beim Öffnen kurz der eigene letzte Stand
   da und wird ersetzt, sobald die frischen Daten eintreffen.

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
| `js/animation.js` | Setzt die Klassen für Bewegung (Seitenwechsel, Reiter, Scrollen) |
| `js/sperre.js` | App Sperre mit Face ID, Touch ID oder Gerätecode |
| `vendor/supabase.js` | Lokale Kopie von supabase-js 2.119.1 (MIT Lizenz) |
| `fonts/` | Schrift Figtree (SIL Open Font License) |
