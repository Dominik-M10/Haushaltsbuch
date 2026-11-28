// Daten und Berechnungen für das Haushaltsbuch.
// Gerechnet wird in ganzen Cent, damit keine Rundungsfehler durch Kommazahlen entstehen.
import { db } from '../supabase.js';
import { euroAusCent, monatsname } from '../format.js';
import { abfrage } from './tabellen.js';
import { mitZwischenspeicher, ausSpeicher } from '../zwischenspeicher.js';
import { csvText, textZelle, betragZelle } from '../export.js';

export function cent(wert) {
  return Math.round(Number(wert) * 100);
}

/**
 * Monatlicher Betrag einer Zeile aus Einkommen, Fixkosten oder Sparen in Cent.
 * Jährliche Beträge durch 12, auf ganze Cent gerundet.
 */
export function monatsbetragCent(zeile) {
  const betrag = cent(zeile.betrag);
  return zeile.intervall === 'jaehrlich' ? Math.round(betrag / 12) : betrag;
}

/** Mein Anteil einer Mietposition in Cent (Mietpositionen sind immer monatlich) */
export function meinAnteilCent(position) {
  return cent(position.mein_anteil);
}

/** Sortiert absteigend nach wert(eintrag). Bei gleichem Wert bleibt die Reihenfolge der Anlage. */
export function absteigend(liste, wert) {
  return [...liste].sort((a, b) => wert(b) - wert(a));
}

/** Fortschritt eines Sparziels als Anteil, 1 heißt 100 % (der Zielbetrag ist laut Datenbank immer größer als 0) */
export function sparzielFortschritt(ziel) {
  return cent(ziel.bisher_gespart) / cent(ziel.zielbetrag);
}

// Größte Position oben, jährliche Beträge zählen mit ihrem Betrag pro Monat, bei der Miete zählt mein Anteil.
// Eigene Funktion, damit gespeicherte und frisch geladene Daten genau gleich aufbereitet werden.
function ordneHaushalt([einkommen, fixkosten, sparen, miete]) {
  return {
    einkommen: absteigend(einkommen, monatsbetragCent),
    fixkosten: absteigend(fixkosten, monatsbetragCent),
    sparen: absteigend(sparen, monatsbetragCent),
    miete: absteigend(miete, meinAnteilCent),
  };
}

export async function ladeHaushalt() {
  return ordneHaushalt(await mitZwischenspeicher('haushalt', () => Promise.all([
    abfrage(db.from('einkommen').select('*').order('erstellt_am')),
    abfrage(db.from('fixkosten').select('*').order('erstellt_am')),
    abfrage(db.from('sparen').select('*').order('erstellt_am')),
    abfrage(db.from('mietpositionen').select('*').order('erstellt_am')),
  ])));
}

/** Der Haushalt vom letzten Mal, ohne zu warten. null, wenn auf diesem Gerät noch nichts geladen wurde. */
export function haushaltAusSpeicher() {
  const roh = ausSpeicher('haushalt');
  return roh ? ordneHaushalt(roh) : null;
}

export function summeCent(liste, betrag) {
  return liste.reduce((gesamt, zeile) => gesamt + betrag(zeile), 0);
}

/** Summen pro Monat in Cent: Einkommen, Fixkosten, Sparen, Miete (Summe meiner Anteile) und was übrig bleibt. */
export function monatsuebersicht({ einkommen, fixkosten, sparen, miete }) {
  const e = summeCent(einkommen, monatsbetragCent);
  const f = summeCent(fixkosten, monatsbetragCent);
  const s = summeCent(sparen, monatsbetragCent);
  const m = summeCent(miete, meinAnteilCent);
  return { einkommen: e, fixkosten: f, sparen: s, miete: m, rest: e - f - s - m };
}

/**
 * Summen über alle Sparziele in Cent: Zielbeträge, bisher Gespartes und was noch fehlt.
 * „Fehlt noch“ zählt je Ziel nur, was dort tatsächlich fehlt. Wer über ein Ziel hinaus gespart hat,
 * gleicht damit andere Ziele nicht aus, darum ist es nicht einfach Ziel minus Gespartes.
 */
export function sparzielSummen(sparziele) {
  return {
    ziel: summeCent(sparziele, (z) => cent(z.zielbetrag)),
    gespart: summeCent(sparziele, (z) => cent(z.bisher_gespart)),
    fehlt: summeCent(sparziele, (z) => Math.max(0, cent(z.zielbetrag) - cent(z.bisher_gespart))),
  };
}

function kurzinfoAusHaushalt(daten) {
  const leer = !daten.einkommen.length && !daten.fixkosten.length && !daten.sparen.length && !daten.miete.length;
  if (leer) return { text: 'Noch keine Einträge' };

  const { rest } = monatsuebersicht(daten);
  return {
    beschriftung: `Übrig im ${monatsname()}`,
    wert: euroAusCent(rest),
    negativ: rest < 0,
  };
}

/** Kurzinfo für die Kachel auf der Startseite */
export async function kurzinfoHaushalt() {
  return kurzinfoAusHaushalt(await ladeHaushalt());
}

/** Dieselbe Kurzinfo aus dem Stand vom letzten Mal, ohne zu warten. null, wenn es keinen gibt. */
export function kurzinfoHaushaltAusSpeicher() {
  const daten = haushaltAusSpeicher();
  return daten ? kurzinfoAusHaushalt(daten) : null;
}

/** Sparziele mit dem größten Fortschritt oben */
export async function ladeSparziele() {
  const ziele = await mitZwischenspeicher('sparziele', () => abfrage(db.from('sparziele').select('*').order('erstellt_am')));
  return absteigend(ziele, sparzielFortschritt);
}

/** Die Sparziele vom letzten Mal, ohne zu warten. null, wenn noch nichts geladen wurde. */
export function sparzieleAusSpeicher() {
  const roh = ausSpeicher('sparziele');
  return roh ? absteigend(roh, sparzielFortschritt) : null;
}

/** CSV mit allen Einträgen des Haushaltsbuchs (für den Export) */
export function haushaltCsv({ einkommen, fixkosten, sparen, miete, sparziele }) {
  if (!einkommen.length && !fixkosten.length && !sparen.length && !miete.length && !sparziele.length) {
    return { leer: 'Noch nichts zum Exportieren.' };
  }
  // Einkommen, Fixkosten und Sparen: Betrag wie eingetragen, dazu Intervall und Betrag pro Monat
  const zeile = (bereich, z) => [
    bereich, textZelle(z.bezeichnung), betragZelle(z.betrag),
    z.intervall === 'jaehrlich' ? 'jährlich' : 'monatlich', betragZelle(monatsbetragCent(z) / 100), '', '', '',
  ];
  const zeilen = [
    ...einkommen.map((z) => zeile('Einkommen', z)),
    ...fixkosten.map((z) => zeile('Fixkosten', z)),
    ...sparen.map((z) => zeile('Sparen', z)),
    // Miete: Betrag ist mein Anteil, daneben der Gesamtbetrag der Position
    ...miete.map((z) => [
      'Miete', textZelle(z.bezeichnung), betragZelle(z.mein_anteil), 'monatlich', betragZelle(z.mein_anteil),
      betragZelle(z.gesamtbetrag), '', '',
    ]),
    ...sparziele.map((z) => ['Sparziel', textZelle(z.name), '', '', '', '', betragZelle(z.zielbetrag), betragZelle(z.bisher_gespart)]),
  ];
  return {
    text: csvText(
      ['Bereich', 'Bezeichnung', 'Betrag', 'Intervall', 'Betrag pro Monat', 'Gesamtbetrag (Miete)', 'Zielbetrag', 'Bisher gespart'],
      zeilen,
    ),
  };
}
