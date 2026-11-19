// Daten und Berechnungen für das Haushaltsbuch.
// Gerechnet wird in ganzen Cent, damit keine Rundungsfehler durch Kommazahlen entstehen.
import { db } from '../supabase.js';
import { euroAusCent, monatsname } from '../format.js';
import { abfrage } from './tabellen.js';
import { csvText, textZelle, betragZelle } from '../export.js';

export function cent(wert) {
  return Math.round(Number(wert) * 100);
}

/** Monatlicher Betrag einer Fixkostenzeile in Cent. Jährliche Beträge durch 12, auf ganze Cent gerundet. */
export function fixkostenMonatCent(zeile) {
  const betrag = cent(zeile.betrag);
  return zeile.intervall === 'jaehrlich' ? Math.round(betrag / 12) : betrag;
}

/** Sortiert absteigend nach Betrag in Cent. Bei gleichem Betrag bleibt die Reihenfolge der Anlage. */
export function nachBetrag(liste, betragCent) {
  return [...liste].sort((a, b) => betragCent(b) - betragCent(a));
}

export async function ladeHaushalt() {
  const [einkommen, fixkosten, sparen, miete] = await Promise.all([
    abfrage(db.from('einkommen').select('*').order('erstellt_am')),
    abfrage(db.from('fixkosten').select('*').order('erstellt_am')),
    abfrage(db.from('sparen').select('*').order('erstellt_am')),
    abfrage(db.from('miete').select('*').maybeSingle()),
  ]);
  // Größte Position oben, Fixkosten nach ihrem Betrag pro Monat
  return {
    einkommen: nachBetrag(einkommen, (z) => cent(z.betrag)),
    fixkosten: nachBetrag(fixkosten, fixkostenMonatCent),
    sparen: nachBetrag(sparen, (z) => cent(z.betrag)),
    miete,
  };
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

export async function ladeSparziele() {
  return abfrage(db.from('sparziele').select('*').order('erstellt_am'));
}

/** Miete: genau eine Zeile pro Benutzer, daher anlegen oder überschreiben */
export async function speichereMiete(userId, werte) {
  const { error } = await db.from('miete').upsert({ user_id: userId, ...werte });
  if (error) throw error;
}

/** CSV mit allen Einträgen des Haushaltsbuchs (für den Export) */
export function haushaltCsv({ einkommen, fixkosten, sparen, miete, sparziele }) {
  if (!einkommen.length && !fixkosten.length && !sparen.length && !miete && !sparziele.length) {
    return { leer: 'Noch nichts zum Exportieren.' };
  }
  const zeilen = [
    ...einkommen.map((z) => ['Einkommen', textZelle(z.bezeichnung), betragZelle(z.betrag), 'monatlich', betragZelle(z.betrag), '', '']),
    ...fixkosten.map((z) => [
      'Fixkosten', textZelle(z.bezeichnung), betragZelle(z.betrag),
      z.intervall === 'jaehrlich' ? 'jährlich' : 'monatlich', betragZelle(fixkostenMonatCent(z) / 100), '', '',
    ]),
    ...sparen.map((z) => ['Sparen', textZelle(z.bezeichnung), betragZelle(z.betrag), 'monatlich', betragZelle(z.betrag), '', '']),
    ...(miete ? [
      ['Miete', 'Gesamtmiete', betragZelle(miete.gesamtmiete), 'monatlich', '', '', ''],
      ['Miete', 'Mein Anteil', betragZelle(miete.mein_anteil), 'monatlich', betragZelle(miete.mein_anteil), '', ''],
    ] : []),
    ...sparziele.map((z) => ['Sparziel', textZelle(z.name), '', '', '', betragZelle(z.zielbetrag), betragZelle(z.bisher_gespart)]),
  ];
  return {
    text: csvText(['Bereich', 'Bezeichnung', 'Betrag', 'Intervall', 'Betrag pro Monat', 'Zielbetrag', 'Bisher gespart'], zeilen),
  };
}
