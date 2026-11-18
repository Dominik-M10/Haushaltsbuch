// Daten und Berechnungen für das Haushaltsbuch.
// Gerechnet wird in ganzen Cent, damit keine Rundungsfehler durch Kommazahlen entstehen.
import { db } from '../supabase.js';
import { euroAusCent, monatsname } from '../format.js';

export function cent(wert) {
  return Math.round(Number(wert) * 100);
}

/** Monatlicher Betrag einer Fixkostenzeile in Cent. Jährliche Beträge durch 12, auf ganze Cent gerundet. */
export function fixkostenMonatCent(zeile) {
  const betrag = cent(zeile.betrag);
  return zeile.intervall === 'jaehrlich' ? Math.round(betrag / 12) : betrag;
}

async function abfrage(anfrage) {
  const { data, error } = await anfrage;
  if (error) throw error;
  return data;
}

export async function ladeHaushalt() {
  const [einkommen, fixkosten, sparen, miete] = await Promise.all([
    abfrage(db.from('einkommen').select('*').order('erstellt_am')),
    abfrage(db.from('fixkosten').select('*').order('erstellt_am')),
    abfrage(db.from('sparen').select('*').order('erstellt_am')),
    abfrage(db.from('miete').select('*').maybeSingle()),
  ]);
  return { einkommen, fixkosten, sparen, miete };
}

/** Summen pro Monat in Cent: Einkommen, Fixkosten, Sparen, Miete (mein Anteil) und was übrig bleibt. */
export function monatsuebersicht({ einkommen, fixkosten, sparen, miete }) {
  const summe = (liste, betrag) => liste.reduce((gesamt, zeile) => gesamt + betrag(zeile), 0);
  const e = summe(einkommen, (z) => cent(z.betrag));
  const f = summe(fixkosten, fixkostenMonatCent);
  const s = summe(sparen, (z) => cent(z.betrag));
  const m = miete ? cent(miete.mein_anteil) : 0;
  return { einkommen: e, fixkosten: f, sparen: s, miete: m, rest: e - f - s - m };
}

/** Kurzinfo für die Kachel auf der Startseite */
export async function kurzinfoHaushalt() {
  const daten = await ladeHaushalt();
  const leer = !daten.einkommen.length && !daten.fixkosten.length && !daten.sparen.length && !daten.miete;
  if (leer) return { text: 'Noch keine Einträge' };

  const { rest } = monatsuebersicht(daten);
  return {
    beschriftung: `Übrig im ${monatsname()}`,
    wert: euroAusCent(rest),
    negativ: rest < 0,
  };
}
