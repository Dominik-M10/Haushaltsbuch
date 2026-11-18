// CSV Export für Excel und Numbers mit deutschen Einstellungen:
// Semikolon als Trennzeichen, Komma bei Beträgen, Datum als TT.MM.JJJJ,
// UTF-8 mit Kennung am Dateianfang (damit Umlaute und € richtig erscheinen), Zeilenende CRLF.
import { h } from './ui.js';
import { heuteIso } from './format.js';

/** Text für eine Zelle. Texte, die mit = + - @ beginnen, bekommen ein ' davor, damit Excel sie nicht als Formel liest. */
export function textZelle(wert) {
  if (wert == null) return '';
  const text = String(wert);
  return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
}

/** Betrag in Euro für eine Zelle: 1234.5 wird zu "1234,50" */
export function betragZelle(euro) {
  if (euro == null || euro === '') return '';
  return Number(euro).toFixed(2).replace('.', ',');
}

/** Ganze Zahl für eine Zelle, ohne Tausenderpunkt (den lesen Tabellenprogramme sonst falsch) */
export function zahlZelle(wert) {
  return wert == null ? '' : String(Math.trunc(wert));
}

function zelle(wert) {
  const text = wert == null ? '' : String(wert);
  return /[;"\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Baut den Dateiinhalt aus Kopfzeile und Zeilen (Arrays von Zellwerten) */
export function csvText(kopf, zeilen) {
  const linien = [kopf, ...zeilen].map((zeile) => zeile.map(zelle).join(';'));
  return `﻿${linien.join('\r\n')}\r\n`;
}

/** Startet den Download einer CSV Datei, Name zum Beispiel "haushaltsbuch-2026-11-18.csv" */
export function csvHerunterladen(namensanfang, text) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
  const adresse = URL.createObjectURL(blob);
  const link = h('a', { href: adresse, download: `${namensanfang}-${heuteIso()}.csv`, hidden: true });
  document.body.append(link);
  link.click();
  link.remove();
  // Adresse erst später freigeben, manche Browser starten den Download verzögert
  setTimeout(() => URL.revokeObjectURL(adresse), 60000);
}

/**
 * Karte mit Knopf zum Herunterladen.
 * erstellen() liefert { text } oder { leer: 'Hinweis' }, wenn es nichts zu exportieren gibt.
 */
export function exportKarte({ titel = 'Export', beschreibung, namensanfang, erstellen }) {
  const meldung = h('p', { class: 'leise', role: 'status', hidden: true });
  const knopf = h('button', { class: 'knopf', type: 'button' }, 'Als CSV herunterladen');
  knopf.addEventListener('click', () => {
    const ergebnis = erstellen();
    if (ergebnis.leer) {
      meldung.textContent = ergebnis.leer;
      meldung.hidden = false;
      return;
    }
    meldung.hidden = true;
    csvHerunterladen(namensanfang, ergebnis.text);
  });
  return h('section', { class: 'karte bereich breit' },
    h('div', { class: 'bereich-kopf' }, h('h2', {}, titel)),
    h('p', { class: 'leise' }, beschreibung),
    knopf,
    meldung,
  );
}
