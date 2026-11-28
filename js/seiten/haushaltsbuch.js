// Haushaltsbuch: Monatsübersicht, Verteilung, Einkommen, Fixkosten, Sparen, Miete und Sparziele.
// Alle Beträge sind ein fester Monatsplan. Nach jeder Änderung werden die Daten neu geladen.
import { h, seitenKopf, fortschrittsbalken } from '../ui.js';
import { euro, euroAusCent, prozent, prozentGenau } from '../format.js';
import { feld, Eingabefehler } from '../eingabe.js';
import { fehlertext } from '../fehler.js';
import { bearbeitbareListe } from '../liste.js';
import { segmentBalken } from '../diagramm.js';
import {
  cent, monatsbetragCent, ladeHaushalt, ladeSparziele, monatsuebersicht, haushaltCsv, sparzielFortschritt,
  sparzielSummen, summeCent, haushaltAusSpeicher, sparzieleAusSpeicher,
} from '../daten/haushalt.js';
import { gleicherStand } from '../zwischenspeicher.js';
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

export function haushaltsbuchSeite(container, kontext) {
  const inhalt = h('div', { class: 'raster' }, h('p', { class: 'laden' }, 'Wird geladen …'));
  container.append(seitenKopf('Haushaltsbuch'), inhalt);

  // Laufen mehrere Ladevorgänge gleichzeitig, zählt nur der zuletzt gestartete.
  // Sonst könnte eine spät eintreffende ältere Antwort einen neueren Stand überschreiben.
  let ladeNummer = 0;

  async function laden() {
    const nummer = ++ladeNummer;
    const aktuell = () => kontext.aktiv() && nummer === ladeNummer;

    // Der Stand vom letzten Mal steht sofort da, statt gut einer Sekunde „Wird geladen …“.
    // Nach dem Speichern liefert der Zwischenspeicher nichts, der Stand wäre dort überholt.
    let vorab = null;
    const gespeicherterHaushalt = haushaltAusSpeicher();
    const gespeicherteZiele = sparzieleAusSpeicher();
    if (gespeicherterHaushalt && gespeicherteZiele) {
      vorab = { ...gespeicherterHaushalt, sparziele: gespeicherteZiele };
      zeichnen(vorab);
    }

    try {
      const [haushalt, sparziele] = await Promise.all([ladeHaushalt(), ladeSparziele()]);
      if (!aktuell()) return;
      const frisch = { ...haushalt, sparziele };
      // Hat sich nichts geändert, bleibt die Seite genau so stehen, wie sie ist
      if (!gleicherStand(vorab, frisch)) zeichnen(frisch);
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

    // Einkommen, Fixkosten und Sparen: je Eintrag Bezeichnung, Betrag und Intervall
    const betragsListe = (tabelle, titel, eintraege, summeCent, texte) => einfacheListe(tabelle, titel, eintraege, {
      kopfWert: euroAusCent(summeCent),
      ...texte,
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
        wert: euroAusCent(monatsbetragCent(e)),
      }),
    });

    const einkommen = betragsListe('einkommen', 'Einkommen', d.einkommen, u.einkommen, {
      leerText: 'Noch kein Einkommen erfasst.',
      neuText: 'Einkommen hinzufügen',
    });
    const fixkosten = betragsListe('fixkosten', 'Fixkosten', d.fixkosten, u.fixkosten, {
      leerText: 'Noch keine Fixkosten erfasst.',
      neuText: 'Fixkosten hinzufügen',
    });
    const sparen = betragsListe('sparen', 'Sparen', d.sparen, u.sparen, {
      leerText: 'Noch nichts zum Sparen erfasst.',
      neuText: 'Sparbetrag hinzufügen',
    });

    // Miete: einzelne Positionen (zum Beispiel Miete, Strom) mit Gesamtbetrag und meinem Anteil.
    // Oben rechts und in den Summen unter der Liste steht, was alle Positionen zusammen ergeben.
    const miete = einfacheListe('mietpositionen', 'Miete', d.miete, {
      kopfWert: euroAusCent(u.miete),
      leerText: 'Noch keine Miete erfasst.',
      neuText: 'Position hinzufügen',
      felder: [
        { name: 'bezeichnung', label: 'Bezeichnung', typ: 'text', pflicht: true },
        { name: 'gesamtbetrag', label: 'Gesamtbetrag', typ: 'euro', pflicht: true },
        {
          name: 'mein_anteil', label: 'Mein Anteil', typ: 'euro', pflicht: true,
          hinweis: 'Zahlst du die Position allein, trägst du denselben Betrag ein.',
        },
      ],
      pruefen: (werte, eingaben) => {
        if (werte.mein_anteil > werte.gesamtbetrag) {
          throw new Eingabefehler('Dein Anteil kann nicht höher sein als der Gesamtbetrag.', eingaben.mein_anteil);
        }
      },
      zeile: (e) => ({
        titel: e.bezeichnung,
        zusatz: `Gesamt ${euro(e.gesamtbetrag)}`,
        wert: euro(e.mein_anteil),
      }),
      unten: d.miete.length
        ? h('dl', { class: 'werte summen' },
            h('div', {}, h('dt', {}, 'Gesamt'), h('dd', {}, euroAusCent(summeCent(d.miete, (e) => cent(e.gesamtbetrag))))),
            h('div', {}, h('dt', {}, 'Mein Anteil'), h('dd', {}, euroAusCent(u.miete))),
            h('div', {}, h('dt', {}, 'Anteil am Einkommen'), h('dd', {},
              u.einkommen > 0 ? prozentGenau(u.miete / u.einkommen) : 'kein Einkommen erfasst')),
          )
        : null,
    });

    // Oben rechts und unter der Liste steht, wie weit alle Ziele zusammen sind
    const zielSummen = sparzielSummen(d.sparziele);
    const sparziele = einfacheListe('sparziele', 'Sparziele', d.sparziele, {
      klasse: 'breit',
      kopfWert: d.sparziele.length
        ? (zielSummen.fehlt > 0 ? `noch ${euroAusCent(zielSummen.fehlt)}` : 'alle erreicht')
        : null,
      leerText: 'Noch keine Sparziele angelegt.',
      neuText: 'Sparziel hinzufügen',
      felder: [
        { name: 'name', label: 'Name', typ: 'text', pflicht: true },
        { name: 'zielbetrag', label: 'Zielbetrag', typ: 'euro', pflicht: true, groesserNull: true },
        { name: 'bisher_gespart', label: 'Bisher gespart', typ: 'euro', pflicht: true, standard: 0 },
      ],
      zeile: (e) => {
        const anteil = sparzielFortschritt(e);
        const fehlt = cent(e.zielbetrag) - cent(e.bisher_gespart);
        return {
          titel: e.name,
          zusatz: `${euro(e.bisher_gespart)} von ${euro(e.zielbetrag)} · ${
            fehlt > 0 ? `noch ${euroAusCent(fehlt)}` : 'Ziel erreicht'}`,
          wert: prozent(anteil),
          unten: fortschrittsbalken(anteil, e.name),
        };
      },
      unten: d.sparziele.length
        ? [
            h('dl', { class: 'werte summen' },
              h('div', {}, h('dt', {}, 'Ziele gesamt'), h('dd', {}, euroAusCent(zielSummen.ziel))),
              h('div', {}, h('dt', {}, 'Bisher gespart'), h('dd', {}, euroAusCent(zielSummen.gespart))),
              h('div', {}, h('dt', {}, 'Fehlt noch'), h('dd', {}, euroAusCent(zielSummen.fehlt))),
            ),
            // Nur wenn irgendwo über das Ziel hinaus gespart wurde. Dann geht die naheliegende
            // Rechnung „Ziele gesamt minus Bisher gespart“ nicht auf, und das sieht nach einem
            // Fehler aus, obwohl es keiner ist.
            zielSummen.ziel - zielSummen.gespart !== zielSummen.fehlt
              ? h('p', { class: 'leise' }, 'Was über ein Ziel hinaus gespart ist, zählt nicht für die anderen Ziele.')
              : null,
          ]
        : null,
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
