// Alle Bereiche der App. Jeder Bereich bekommt eine Kachel auf der Startseite und eine eigene Seite.
//
// Neue Kachel ergänzen:
// 1. Seite in js/seiten/ anlegen (Funktion, die den Inhalt in den Container schreibt).
// 2. Eine Kurzinfo Funktion schreiben, die { beschriftung, wert, zusatz, negativ } oder { text } liefert.
// 3. Hier einen Eintrag hinzufügen. Startseite und Seitenwechsel übernehmen ihn automatisch.

import { haushaltsbuchSeite } from './seiten/haushaltsbuch.js';
import { meilenstandSeite } from './seiten/meilenstand.js';
import { kurzinfoHaushalt } from './daten/haushalt.js';
import { kurzinfoMeilen } from './daten/meilen.js';

export const bereiche = [
  {
    id: 'haushaltsbuch',        // erscheint in der Adresse als #/haushaltsbuch
    titel: 'Haushaltsbuch',
    symbol: 'geldboerse',
    seite: haushaltsbuchSeite,
    kurzinfo: kurzinfoHaushalt,
  },
  {
    id: 'meilenstand',
    titel: 'Meilenstand',
    symbol: 'flugzeug',
    seite: meilenstandSeite,
    kurzinfo: kurzinfoMeilen,
  },
];
