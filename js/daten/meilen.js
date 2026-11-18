// Daten für den Meilenstand: Programme, Zwischenstände und Meilenziele.
import { db } from '../supabase.js';
import { datum, zahl } from '../format.js';
import { einheit, verlauf } from './programme.js';
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

/** Kurzinfo für die Kachel auf der Startseite */
export async function kurzinfoMeilen() {
  const stand = await ladeLetztenStand();
  if (!stand) return { text: 'Noch kein Stand erfasst' };

  return {
    beschriftung: 'Zuletzt geändert',
    wert: `${zahl(stand.stand)} ${einheit(stand.programme.typ)}`,
    zusatz: `${stand.programme.name} · Stand vom ${datum(stand.datum)}`,
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
