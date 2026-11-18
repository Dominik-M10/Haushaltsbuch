// Daten für den Meilenstand.
import { db } from '../supabase.js';
import { datum, zahl } from '../format.js';

/** Airlines zählen in Meilen, Hotels und Bonusprogramme in Punkten */
export function einheit(typ) {
  return typ === 'Airline' ? 'Meilen' : 'Punkte';
}

/** Der zuletzt angelegte oder geänderte Zwischenstand, mit Programmname */
export async function ladeLetztenStand() {
  const { data, error } = await db
    .from('meilenstaende')
    .select('datum, stand, geaendert_am, programme(name, typ)')
    .order('geaendert_am', { ascending: false })
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
