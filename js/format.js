// Formatierung für Deutschland: Euro, Zahlen, Datum. Zeitzone immer Europe/Berlin.

export const ZEITZONE = 'Europe/Berlin';

const euroFormat = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });
const zahlFormat = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 });
const monatFormat = new Intl.DateTimeFormat('de-DE', { month: 'long', timeZone: ZEITZONE });

/** 1234.5 wird zu "1.234,50 €" */
export function euro(betrag) {
  // verhindert "-0,00 €"
  const wert = Math.abs(betrag) < 0.005 ? 0 : betrag;
  return euroFormat.format(wert);
}

/** Betrag in Cent, zum Beispiel 123450 wird zu "1.234,50 €" */
export function euroAusCent(cent) {
  return euro(cent / 100);
}

/** 12345 wird zu "12.345" */
export function zahl(wert) {
  return zahlFormat.format(wert);
}

/** "2026-11-18" wird zu "18.11.2026" (ohne Umweg über Date, damit keine Zeitzone stört) */
export function datum(isoDatum) {
  const [jahr, monat, tag] = String(isoDatum).slice(0, 10).split('-');
  return `${tag}.${monat}.${jahr}`;
}

/** Name des aktuellen Monats in deutscher Zeit, zum Beispiel "November" */
export function monatsname(zeitpunkt = new Date()) {
  return monatFormat.format(zeitpunkt);
}
