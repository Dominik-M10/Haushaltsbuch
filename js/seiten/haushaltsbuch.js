// Haushaltsbuch: Monatsübersicht, Verteilung, Einkommen, Fixkosten, Sparen, Miete und Sparziele.
// Alle Beträge sind ein fester Monatsplan. Nach jeder Änderung werden die Daten neu geladen.
import { h, seitenKopf, fortschrittsbalken } from '../ui.js';
import { euro, euroAusCent, prozent, prozentGenau } from '../format.js';
import { feld, Eingabefehler } from '../eingabe.js';
import { fehlertext } from '../fehler.js';
import { bearbeitbareListe } from '../liste.js';
import { segmentBalken } from '../diagramm.js';
import {
  cent, fixkostenMonatCent, ladeHaushalt, ladeSparziele, monatsuebersicht, speichereMiete, haushaltCsv,
} from '../daten/haushalt.js';
import { exportKarte } from '../export.js';
import { speichereZeile, loescheZeile } from '../daten/tabellen.js';

// Farben im Diagramm und in der Übersicht (Reihenfolge fest, siehe css/style.css)
const SERIE = { fixkosten: 1, sparen: 2, miete: 3, uebrig: 4 };

function farbe(serie) {
  return h('span', { class: `legende-farbe serie-${serie}`, 'aria-hidden': 'true' });
}

function uebersichtKarte(u) {
  const zeile = (name, betragCent, serie) => h('tr', {},
    h('th', { scope: 'row' }, serie ? farbe(serie) : h('span', { class: 'legende-farbe leer' }), name),
    h('td', {}, euroAusCent(betragCent)),
  );
  return h('section', { class: 'karte bereich' },
    h('div', { class: 'bereich-kopf' }, h('h2', {}, 'Monatsübersicht'), h('span', { class: 'bereich-summe leise' }, 'pro Monat')),
    h('table', { class: 'uebersicht' },
      h('tbody', {},
        zeile('Einkommen', u.einkommen, null),
        zeile('Fixkosten', u.fixkosten, SERIE.fixkosten),
        zeile('Sparen', u.sparen, SERIE.sparen),
        zeile('Miete (mein Anteil)', u.miete, SERIE.miete),
      ),
      h('tfoot', {},
        h('tr', {},
          h('th', { scope: 'row' }, farbe(SERIE.uebrig), 'Übrig'),
          h('td', { class: u.rest < 0 ? 'negativ' : null }, euroAusCent(u.rest)),
        ),
      ),
    ),
  );
}

function verteilungKarte(u) {
  const ausgaben = u.fixkosten + u.sparen + u.miete;
  const kopf = h('div', { class: 'bereich-kopf' }, h('h2', {}, 'Verteilung'));

  if (u.einkommen === 0 && ausgaben === 0) {
    return h('section', { class: 'karte bereich' }, kopf, h('p', { class: 'leise' }, 'Noch keine Beträge erfasst.'));
  }

  const ueberzogen = u.rest < 0;
  const teile = [
    { name: 'Fixkosten', wert: u.fixkosten, serie: SERIE.fixkosten },
    { name: 'Sparen', wert: u.sparen, serie: SERIE.sparen },
    { name: 'Miete', wert: u.miete, serie: SERIE.miete },
    { name: 'Übrig', wert: ueberzogen ? 0 : u.rest, serie: SERIE.uebrig },
  ];

  let hinweis;
  if (!ueberzogen) {
    hinweis = h('p', { class: 'leise' }, 'Anteile am Einkommen pro Monat');
  } else if (u.einkommen === 0) {
    hinweis = h('p', { class: 'warnhinweis' }, 'Noch kein Einkommen erfasst. Die Anteile beziehen sich auf die Ausgaben.');
  } else {
    hinweis = h('p', { class: 'warnhinweis' },
      `Die Ausgaben liegen ${euroAusCent(-u.rest)} über dem Einkommen. Die Anteile beziehen sich deshalb auf die Ausgaben.`);
  }

  return h('section', { class: 'karte bereich' },
    kopf,
    hinweis,
    segmentBalken({
      teile,
      gesamt: ueberzogen ? ausgaben : u.einkommen,
      format: euroAusCent,
      titel: 'Verteilung des Einkommens auf Fixkosten, Sparen, Miete und Übrig',
    }),
  );
}

function mieteKarte(miete, u, speichern) {
  const karte = h('section', { class: 'karte bereich' });
  let bearbeiten = false;

  function zeichnen() {
    const kopf = h('div', { class: 'bereich-kopf' },
      h('h2', {}, 'Miete'),
      miete ? h('span', { class: 'bereich-summe' }, euro(miete.mein_anteil)) : null,
    );

    if (bearbeiten) {
      const gesamt = feld({ name: 'gesamtmiete', label: 'Gesamtmiete', typ: 'euro', pflicht: true }, miete?.gesamtmiete);
      const anteil = feld({ name: 'mein_anteil', label: 'Mein Anteil', typ: 'euro', pflicht: true }, miete?.mein_anteil);
      const meldung = h('p', { class: 'fehlermeldung', role: 'alert', hidden: true });
      const sichern = h('button', { class: 'knopf primaer', type: 'submit' }, 'Speichern');
      const abbrechen = h('button', { class: 'knopf', type: 'button' }, 'Abbrechen');
      const form = h('form', { class: 'formular zeilen-formular', novalidate: true },
        gesamt.element, anteil.element, meldung, h('div', { class: 'knopfreihe' }, sichern, abbrechen));

      abbrechen.addEventListener('click', () => { bearbeiten = false; zeichnen(); });
      form.addEventListener('submit', async (ereignis) => {
        ereignis.preventDefault();
        meldung.hidden = true;
        try {
          const werte = { gesamtmiete: gesamt.lesen(), mein_anteil: anteil.lesen() };
          if (werte.mein_anteil > werte.gesamtmiete) {
            throw new Eingabefehler('Dein Anteil kann nicht höher sein als die Gesamtmiete.', anteil.eingabe);
          }
          sichern.disabled = true;
          abbrechen.disabled = true;
          await speichern(werte);
        } catch (fehler) {
          if (!(fehler instanceof Eingabefehler)) console.error(fehler);
          meldung.textContent = fehlertext(fehler);
          meldung.hidden = false;
          fehler.feld?.focus();
          sichern.disabled = false;
          abbrechen.disabled = false;
        }
      });

      karte.replaceChildren(kopf, form);
      gesamt.eingabe.focus();
      return;
    }

    const knopf = h('button', { class: 'knopf', type: 'button' }, miete ? 'Bearbeiten' : '+ Miete eintragen');
    knopf.addEventListener('click', () => { bearbeiten = true; zeichnen(); });

    if (!miete) {
      karte.replaceChildren(kopf, h('p', { class: 'leise' }, 'Noch keine Miete erfasst.'), knopf);
      return;
    }

    const anteilAmEinkommen = u.einkommen > 0
      ? prozentGenau(cent(miete.mein_anteil) / u.einkommen)
      : 'kein Einkommen erfasst';

    karte.replaceChildren(
      kopf,
      h('dl', { class: 'werte' },
        h('div', {}, h('dt', {}, 'Gesamtmiete'), h('dd', {}, euro(miete.gesamtmiete))),
        h('div', {}, h('dt', {}, 'Mein Anteil'), h('dd', {}, euro(miete.mein_anteil))),
        h('div', {}, h('dt', {}, 'Anteil am Einkommen'), h('dd', {}, anteilAmEinkommen)),
      ),
      knopf,
    );
  }

  zeichnen();
  return karte;
}

export function haushaltsbuchSeite(container, kontext) {
  const inhalt = h('div', { class: 'raster' }, h('p', { class: 'laden' }, 'Wird geladen …'));
  container.append(seitenKopf('Haushaltsbuch'), inhalt);
  const userId = kontext.sitzung.user.id;

  // Laufen mehrere Ladevorgänge gleichzeitig, zählt nur der zuletzt gestartete.
  // Sonst könnte eine spät eintreffende ältere Antwort einen neueren Stand überschreiben.
  let ladeNummer = 0;

  async function laden() {
    const nummer = ++ladeNummer;
    const aktuell = () => kontext.aktiv() && nummer === ladeNummer;
    try {
      const [haushalt, sparziele] = await Promise.all([ladeHaushalt(), ladeSparziele()]);
      if (!aktuell()) return;
      zeichnen({ ...haushalt, sparziele });
    } catch (fehler) {
      console.error(fehler);
      if (!aktuell()) return;
      const nochmal = h('button', { class: 'knopf', type: 'button' }, 'Erneut versuchen');
      nochmal.addEventListener('click', () => {
        inhalt.replaceChildren(h('p', { class: 'laden' }, 'Wird geladen …'));
        laden();
      });
      inhalt.replaceChildren(h('div', { class: 'karte bereich breit' },
        h('p', { class: 'fehlermeldung' }, fehlertext(fehler)), nochmal));
    }
  }

  // Speichern oder Löschen, danach alles neu laden
  const aendern = async (aktion) => {
    await aktion();
    await laden();
  };

  // Gemeinsame Einstellungen der drei einfachen Listen
  const einfacheListe = (tabelle, titel, eintraege, extra) => bearbeitbareListe({
    titel,
    eintraege,
    speichern: (werte, e) => aendern(() => speichereZeile(tabelle, werte, e?.id)),
    loeschen: (e) => aendern(() => loescheZeile(tabelle, e.id)),
    loeschFrage: (e) => `„${e.bezeichnung ?? e.name}“ wirklich löschen?`,
    ...extra,
  });

  function zeichnen(d) {
    const u = monatsuebersicht(d);

    const einkommen = einfacheListe('einkommen', 'Einkommen', d.einkommen, {
      kopfWert: euroAusCent(u.einkommen),
      leerText: 'Noch kein Einkommen erfasst.',
      neuText: 'Einkommen hinzufügen',
      felder: [
        { name: 'bezeichnung', label: 'Bezeichnung', typ: 'text', pflicht: true },
        { name: 'betrag', label: 'Betrag pro Monat', typ: 'euro', pflicht: true },
      ],
      zeile: (e) => ({ titel: e.bezeichnung, wert: euro(e.betrag) }),
    });

    const fixkosten = einfacheListe('fixkosten', 'Fixkosten', d.fixkosten, {
      kopfWert: euroAusCent(u.fixkosten),
      leerText: 'Noch keine Fixkosten erfasst.',
      neuText: 'Fixkosten hinzufügen',
      felder: [
        { name: 'bezeichnung', label: 'Bezeichnung', typ: 'text', pflicht: true },
        { name: 'betrag', label: 'Betrag', typ: 'euro', pflicht: true },
        {
          name: 'intervall', label: 'Intervall', typ: 'auswahl', standard: 'monatlich',
          optionen: [['monatlich', 'monatlich'], ['jaehrlich', 'jährlich']],
          hinweis: 'Jährliche Beträge werden durch 12 geteilt.',
        },
      ],
      zeile: (e) => ({
        titel: e.bezeichnung,
        zusatz: e.intervall === 'jaehrlich' ? `jährlich ${euro(e.betrag)}` : 'monatlich',
        wert: euroAusCent(fixkostenMonatCent(e)),
      }),
    });

    const sparen = einfacheListe('sparen', 'Sparen', d.sparen, {
      kopfWert: euroAusCent(u.sparen),
      leerText: 'Noch nichts zum Sparen erfasst.',
      neuText: 'Sparbetrag hinzufügen',
      felder: [
        { name: 'bezeichnung', label: 'Bezeichnung', typ: 'text', pflicht: true },
        { name: 'betrag', label: 'Betrag pro Monat', typ: 'euro', pflicht: true },
      ],
      zeile: (e) => ({ titel: e.bezeichnung, wert: euro(e.betrag) }),
    });

    const miete = mieteKarte(d.miete, u, (werte) => aendern(() => speichereMiete(userId, werte)));

    const sparziele = einfacheListe('sparziele', 'Sparziele', d.sparziele, {
      klasse: 'breit',
      leerText: 'Noch keine Sparziele angelegt.',
      neuText: 'Sparziel hinzufügen',
      felder: [
        { name: 'name', label: 'Name', typ: 'text', pflicht: true },
        { name: 'zielbetrag', label: 'Zielbetrag', typ: 'euro', pflicht: true, groesserNull: true },
        { name: 'bisher_gespart', label: 'Bisher gespart', typ: 'euro', pflicht: true, standard: 0 },
      ],
      zeile: (e) => {
        const anteil = cent(e.bisher_gespart) / cent(e.zielbetrag);
        const fehlt = cent(e.zielbetrag) - cent(e.bisher_gespart);
        return {
          titel: e.name,
          zusatz: `${euro(e.bisher_gespart)} von ${euro(e.zielbetrag)} · ${
            fehlt > 0 ? `noch ${euroAusCent(fehlt)}` : 'Ziel erreicht'}`,
          wert: prozent(anteil),
          unten: fortschrittsbalken(anteil, e.name),
        };
      },
    });

    inhalt.replaceChildren(
      uebersichtKarte(u),
      verteilungKarte(u),
      einkommen,
      fixkosten,
      sparen,
      miete,
      sparziele,
      exportKarte({
        beschreibung: 'Alle Einträge des Haushaltsbuchs als Tabelle für Excel oder Numbers.',
        namensanfang: 'haushaltsbuch',
        erstellen: () => haushaltCsv(d),
      }),
    );
  }

  laden();
}
