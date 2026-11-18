# Haushaltsbuch

Webanwendung als persönliches Haushaltsbuch mit Meilenstand. Sprache Deutsch, Währung Euro.
Frontend mit HTML, CSS und JavaScript ohne Build Schritt, Login und Datenbank über Supabase.

## Stand

| Schritt | Status |
|---|---|
| Datenmodell | erledigt |
| SQL (Tabellen, Row Level Security, Vorbelegung) | erledigt |
| Login | offen |
| Startseite | offen |
| Haushaltsbuch | offen |
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
