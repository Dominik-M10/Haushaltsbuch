// Daten für den Meilenstand: Programme, Zwischenstände und Meilenziele.
import { db } from '../supabase.js';
import { datum, zahl } from '../format.js';
import { einheit, verlauf, aktuellerStand } from './programme.js';
import { abfrage, speichereZeile, loescheZeile } from './tabellen.js';
import { csvText, textZelle, zahlZelle } from '../export.js';

export { einheit };

export async function ladeMeilenDaten() {
  const [programme, staende, ziele] = await Promise.all([
    abfrage(db.from('programme').select('*').order('name')),
    abfrage(db.from('meilenstaende').select('*').order('datum').order('erstellt_am')),
    abfrage(db.from('meilenziele').select('*')),
  ]);
  return { programme, staende, ziele };
}

export const speichereProgramm = (werte, id) => speichereZeile('programme', werte, id);
export const loescheProgramm = (id) => loescheZeile('programme', id);
export const speichereStand = (werte, id) => speichereZeile('meilenstaende', werte, id);
export const loescheStand = (id) => loescheZeile('meilenstaende', id);
export const loescheZiel = (id) => loescheZeile('meilenziele', id);

/** Legt das Ziel eines Programms an oder ändert es (höchstens ein Ziel pro Programm) */
export function speichereZiel(programmId, zielstand, zielId) {
  return zielId
    ? speichereZeile('meilenziele', { zielstand }, zielId)
    : speichereZeile('meilenziele', { programm_id: programmId, zielstand });
}

/** Der zuletzt angelegte oder geänderte Zwischenstand, mit Programmname */
export async function ladeLetztenStand() {
  const { data, error } = await db
    .from('meilenstaende')
    .select('datum, stand, geaendert_am, programme(name, typ)')
    .order('geaendert_am', { ascending: false })
    .order('datum', { ascending: false }) // bei gleicher Änderungszeit der jüngere Stand
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Kurzinfo für die Kachel auf der Startseite: Summe aller aktuellen Stände und der zuletzt geänderte Eintrag */
export async function kurzinfoMeilen() {
  const [staende, letzter] = await Promise.all([
    abfrage(db.from('meilenstaende').select('programm_id, datum, stand, erstellt_am')),
    ladeLetztenStand(),
  ]);
  if (!letzter) return { text: 'Noch kein Stand erfasst' };

  // Aktueller Stand je Programm ist der Eintrag mit dem jüngsten Datum, Meilen und Punkte zählen zusammen
  const programmIds = new Set(staende.map((s) => s.programm_id));
  const summe = [...programmIds].reduce((s, id) => s + aktuellerStand(staende, id).stand, 0);
  return {
    beschriftung: 'Meilen und Punkte insgesamt',
    wert: zahl(summe),
    zusatz: `Zuletzt geändert: ${letzter.programme.name}, ${zahl(letzter.stand)} ${einheit(letzter.programme.typ)} vom ${datum(letzter.datum)}`,
  };
}

/** CSV mit allen Zwischenständen, nach Programm und Datum sortiert (für den Export) */
export function meilenCsv({ programme, staende }) {
  if (!staende.length) return { leer: 'Noch keine Zwischenstände zum Exportieren.' };
  const zeilen = [];
  for (const p of [...programme].sort((a, b) => a.name.localeCompare(b.name, 'de'))) {
    for (const s of verlauf(staende, p.id)) {
      zeilen.push([
        textZelle(p.name), p.typ, datum(s.datum), zahlZelle(s.stand), einheit(p.typ),
        s.differenz == null ? '' : zahlZelle(s.differenz), textZelle(s.notiz),
      ]);
    }
  }
  return {
    text: csvText(['Programm', 'Typ', 'Datum', 'Stand', 'Einheit', 'Differenz zum vorherigen', 'Notiz'], zeilen),
  };
}
