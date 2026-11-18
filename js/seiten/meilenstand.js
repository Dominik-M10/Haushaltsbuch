// Meilenstand: Reiter für Stände, Umrechner und Programme, dazu eine eigene Seite pro Programm.
//   #/meilenstand              Stände aller Programme, Stand erfassen
//   #/meilenstand/umrechner    Umrechner
//   #/meilenstand/programme    Tabelle aller Programme, Programm anlegen
//   #/meilenstand/p/<id>       ein Programm: Stand, Ziel, Verlauf mit Diagramm, Zuordnung
import { h, seitenKopf, fortschrittsbalken } from '../ui.js';
import { datum, zahl, prozent } from '../format.js';
import { feld, Eingabefehler, leseGanzzahl } from '../eingabe.js';
import { fehlertext } from '../fehler.js';
import { bearbeitbareListe } from '../liste.js';
import { linienDiagramm } from '../liniendiagramm.js';
import {
  ladeMeilenDaten, speichereProgramm, loescheProgramm, speichereStand, loescheStand, speichereZiel, loescheZiel, meilenCsv,
} from '../daten/meilen.js';
import { exportKarte } from '../export.js';
import {
  QUELLEN, TYPEN, einheit, erreichbareProgramme, umrechnen, zuordnungText, verhaeltnisText, verlauf,
} from '../daten/programme.js';

const TYP_MEHRZAHL = { Airline: 'Airlines', Hotel: 'Hotels', Bonusprogramm: 'Bonusprogramme' };
const QUELLE_KURZ = { amex: 'Amex', revolut: 'Revolut', payback: 'Payback' };
const nachName = (a, b) => a.name.localeCompare(b.name, 'de');

function differenzText(differenz) {
  if (differenz == null) return 'erster Eintrag';
  if (differenz === 0) return 'unverändert';
  return `${differenz > 0 ? '+' : '-'}${zahl(Math.abs(differenz))}`;
}

/** Lädt alle Meilendaten und ruft zeichnen(daten, neuLaden) auf. Bei Fehlern erscheint ein Hinweis mit "Erneut versuchen". */
function ladeUndZeige(ziel, kontext, zeichnen) {
  async function laden() {
    try {
      const daten = await ladeMeilenDaten();
      if (!kontext.aktiv()) return;
      zeichnen(daten, laden);
    } catch (fehler) {
      console.error(fehler);
      if (!kontext.aktiv()) return;
      const nochmal = h('button', { class: 'knopf', type: 'button' }, 'Erneut versuchen');
      nochmal.addEventListener('click', () => {
        ziel.replaceChildren(h('p', { class: 'laden' }, 'Wird geladen …'));
        laden();
      });
      ziel.replaceChildren(h('div', { class: 'karte bereich breit' },
        h('p', { class: 'fehlermeldung' }, fehlertext(fehler)), nochmal));
    }
  }
  laden();
}

/** Formular mit Meldung und Knöpfen. absenden() liest die Werte und speichert; Fehler erscheinen im Formular. */
function formular({ felder, absenden, abbrechen, loeschen, loeschFrage, loeschText = 'Löschen' }) {
  const meldung = h('p', { class: 'fehlermeldung', role: 'alert', hidden: true });
  const speichern = h('button', { class: 'knopf primaer', type: 'submit' }, 'Speichern');
  const zurueck = h('button', { class: 'knopf', type: 'button' }, 'Abbrechen');
  const weg = loeschen ? h('button', { class: 'knopf gefahr', type: 'button' }, loeschText) : null;
  const knoepfe = [speichern, zurueck, weg].filter(Boolean);
  const form = h('form', { class: 'formular zeilen-formular', novalidate: true },
    felder, meldung, h('div', { class: 'knopfreihe' }, knoepfe));

  const zeigen = (fehler) => {
    if (!(fehler instanceof Eingabefehler)) console.error(fehler);
    meldung.textContent = fehlertext(fehler);
    meldung.hidden = false;
    fehler.feld?.focus();
    knoepfe.forEach((k) => { k.disabled = false; });
  };

  zurueck.addEventListener('click', abbrechen);
  form.addEventListener('submit', async (ereignis) => {
    ereignis.preventDefault();
    meldung.hidden = true;
    try {
      knoepfe.forEach((k) => { k.disabled = true; });
      await absenden();
    } catch (fehler) {
      zeigen(fehler);
    }
  });
  weg?.addEventListener('click', async () => {
    if (!window.confirm(loeschFrage)) return;
    try {
      knoepfe.forEach((k) => { k.disabled = true; });
      await loeschen();
    } catch (fehler) {
      zeigen(fehler);
    }
  });
  return form;
}

// =====================================================================
// Hauptseite mit Reitern
// =====================================================================

export function meilenstandSeite(container, kontext) {
  const [teil, id] = kontext.pfad;
  if (teil === 'p' && id) {
    programmSeite(container, kontext, id);
    return;
  }

  const ansicht = teil === 'umrechner' || teil === 'programme' ? teil : 'staende';
  const inhalt = h('div', { class: 'raster' }, h('p', { class: 'laden' }, 'Wird geladen …'));
  container.append(seitenKopf('Meilenstand'), reiter(ansicht), inhalt);

  ladeUndZeige(inhalt, kontext, (daten, laden) => {
    const aendern = async (aktion) => {
      await aktion();
      await laden();
    };
    if (ansicht === 'umrechner') inhalt.replaceChildren(umrechnerKarte(daten));
    else if (ansicht === 'programme') inhalt.replaceChildren(...programmeAnsicht(daten));
    else {
      inhalt.replaceChildren(
        staendeKarte(daten, aendern),
        exportKarte({
          beschreibung: 'Alle Zwischenstände mit Datum, Stand, Differenz und Notiz als Tabelle für Excel oder Numbers.',
          namensanfang: 'meilenstaende',
          erstellen: () => meilenCsv(daten),
        }),
      );
    }
  });
}

function reiter(aktiv) {
  const eintraege = [
    ['staende', 'Stände', '#/meilenstand'],
    ['umrechner', 'Umrechner', '#/meilenstand/umrechner'],
    ['programme', 'Programme', '#/meilenstand/programme'],
  ];
  return h('nav', { class: 'reiter', 'aria-label': 'Bereiche im Meilenstand' },
    eintraege.map(([id, text, href]) => h('a', { class: 'reiter-eintrag', href, 'aria-current': id === aktiv ? 'page' : null }, text)),
  );
}

// =====================================================================
// Reiter Stände
// =====================================================================

function zielZeile(programm, stand, ziel) {
  const e = einheit(programm.typ);
  const fehlt = ziel.zielstand - stand;
  return h('span', { class: 'zeile-unten' },
    fortschrittsbalken(stand / ziel.zielstand, `Ziel ${programm.name}`),
    h('span', { class: 'zeile-zusatz' }, fehlt > 0
      ? `Ziel ${zahl(ziel.zielstand)} · noch ${zahl(fehlt)} ${e}`
      : `Ziel ${zahl(ziel.zielstand)} erreicht`),
  );
}

function staendeKarte(daten, aendern) {
  const zeilen = daten.programme
    .map((p) => {
      const v = verlauf(daten.staende, p.id);
      return { p, letzter: v.at(-1), ziel: daten.ziele.find((z) => z.programm_id === p.id) };
    })
    .filter((z) => z.letzter || z.ziel)
    .sort((a, b) => nachName(a.p, b.p));

  const liste = h('ul', { class: 'liste' });
  if (!zeilen.length) {
    liste.append(h('li', { class: 'liste-leer' }, 'Noch kein Stand erfasst. Über „Stand erfassen“ trägst du den ersten ein.'));
  }
  for (const { p, letzter, ziel } of zeilen) {
    const e = einheit(p.typ);
    liste.append(h('li', {},
      h('a', { class: 'zeile', href: `#/meilenstand/p/${p.id}` },
        h('span', { class: 'zeile-text' },
          h('span', { class: 'zeile-titel' }, p.name),
          h('span', { class: 'zeile-zusatz' }, letzter
            ? `Stand vom ${datum(letzter.datum)} · ${differenzText(letzter.differenz)}`
            : 'Noch kein Stand erfasst'),
        ),
        h('span', { class: 'zeile-wert' }, letzter ? `${zahl(letzter.stand)} ${e}` : ''),
        ziel ? zielZeile(p, letzter?.stand ?? 0, ziel) : null,
      ),
    ));
  }

  return h('section', { class: 'karte bereich breit' },
    h('div', { class: 'bereich-kopf' }, h('h2', {}, 'Meine Stände')),
    liste,
    standErfassen(daten, aendern),
  );
}

/** Knopf "Stand erfassen", der ein Formular mit Programmauswahl öffnet */
function standErfassen(daten, aendern) {
  const huelle = h('div', {});
  const knopf = h('button', { class: 'knopf neu', type: 'button' }, '+ Stand erfassen');
  knopf.addEventListener('click', oeffnen);
  huelle.append(knopf);

  function oeffnen() {
    const gruppen = TYPEN.map((t) => ({
      name: TYP_MEHRZAHL[t],
      optionen: daten.programme.filter((p) => p.typ === t).sort(nachName).map((p) => [p.id, p.name]),
    }));
    const fProgramm = feld({ name: 'programm_id', label: 'Programm', typ: 'auswahl', gruppen });
    const fDatum = feld({ name: 'datum', label: 'Datum', typ: 'datum' });
    const fStand = feld({ name: 'stand', label: 'Stand', typ: 'ganzzahl', pflicht: true });
    const fNotiz = feld({ name: 'notiz', label: 'Notiz (optional)', typ: 'langtext' });

    huelle.replaceChildren(formular({
      felder: [fProgramm.element, fDatum.element, fStand.element, fNotiz.element],
      absenden: () => aendern(() => speichereStand({
        programm_id: fProgramm.lesen(),
        datum: fDatum.lesen(),
        stand: fStand.lesen(),
        notiz: fNotiz.lesen(),
      })),
      abbrechen: () => huelle.replaceChildren(knopf),
    }));
    fProgramm.eingabe.focus();
  }

  return huelle;
}

// =====================================================================
// Reiter Umrechner
// =====================================================================

function umrechnerKarte(daten) {
  let quelleId = 'amex';

  const quellen = h('fieldset', { class: 'wahl-gruppe' },
    h('legend', { class: 'feld-name' }, '1. Quelle'),
    QUELLEN.map((q) => {
      const knopf = h('input', { type: 'radio', name: 'umrechner-quelle', value: q.id, id: `quelle-${q.id}`, checked: q.id === quelleId });
      knopf.addEventListener('change', () => {
        quelleId = q.id;
        programmeFuellen();
        rechnen();
      });
      return h('label', { class: 'wahl', for: `quelle-${q.id}` }, knopf, h('span', {}, q.name));
    }),
  );

  const programmFeld = h('select', { class: 'eingabe', id: 'umrechner-programm' });
  const punkteFeld = h('input', {
    class: 'eingabe', id: 'umrechner-punkte', type: 'text', inputmode: 'numeric', autocomplete: 'off', placeholder: '0',
  });
  const punkteName = h('label', { class: 'feld-name', for: 'umrechner-punkte' });
  const ergebnis = h('div', { class: 'umrechner-ergebnis', 'aria-live': 'polite' });

  function programmeFuellen() {
    const vorher = programmFeld.value;
    const erreichbar = erreichbareProgramme(daten.programme, quelleId);
    programmFeld.replaceChildren(...TYPEN
      .map((t) => {
        const auswahl = erreichbar.filter((p) => p.typ === t);
        return auswahl.length
          ? h('optgroup', { label: TYP_MEHRZAHL[t] }, auswahl.map((p) => h('option', { value: p.id }, p.name)))
          : null;
      })
      .filter(Boolean));
    if (erreichbar.some((p) => p.id === vorher)) programmFeld.value = vorher;
    punkteName.textContent = `3. ${QUELLEN.find((q) => q.id === quelleId).einheit}`;
  }

  function zeigen(...teile) {
    ergebnis.replaceChildren(...teile.filter(Boolean));
  }

  function rechnen() {
    const programm = daten.programme.find((p) => p.id === programmFeld.value);
    const roh = punkteFeld.value.trim();
    if (!programm) return zeigen(h('p', { class: 'leise' }, 'Über diese Quelle ist kein Programm erreichbar.'));
    if (!roh) return zeigen(h('p', { class: 'leise' }, 'Punkte eingeben, dann erscheint hier das Ergebnis.'));
    const punkte = leseGanzzahl(roh);
    if (Number.isNaN(punkte)) return zeigen(h('p', { class: 'fehlermeldung' }, 'Bitte eine ganze Zahl eingeben, zum Beispiel 10.000.'));

    const r = umrechnen(programm, quelleId, punkte, daten.programme);
    if (r.fehler) return zeigen(h('p', { class: 'fehlermeldung' }, r.fehler));

    const mehrereSchritte = r.schritte.length > 1;
    return zeigen(
      mehrereSchritte
        ? h('ol', { class: 'schritte' }, r.schritte.map((s, i) => h('li', {},
            h('span', { class: 'schritt-titel' }, `Schritt ${i + 1}: ${s.von} zu ${s.nach}, ${s.verhaeltnis}`),
            h('span', {}, `${zahl(s.punkteVon)} ${s.einheitVon} ergeben ${zahl(s.punkteNach)} ${s.einheitNach}`),
          )))
        : null,
      h('p', { class: 'ergebnis-beschriftung' }, mehrereSchritte ? 'Gesamt' : 'Ergebnis'),
      h('p', { class: 'gross-wert' }, `${zahl(r.ergebnis)} ${einheit(programm.typ)}`),
      h('p', {}, `bei ${programm.name}`),
      h('p', { class: 'leise' },
        `Verhältnis ${verhaeltnisText(r.weg.quelle, r.weg.ziel)}${mehrereSchritte ? ' gesamt' : ''} · ${r.weg.art}`),
      r.weg.hinweis ? h('p', { class: 'hinweis-box' }, `Hinweis: ${r.weg.hinweis}`) : null,
      h('p', { class: 'feld-hinweis' }, 'Ergebnis auf ganze Zahlen abgerundet.'),
    );
  }

  programmFeld.addEventListener('change', rechnen);
  punkteFeld.addEventListener('input', rechnen);
  programmeFuellen();
  rechnen();

  return h('section', { class: 'karte bereich breit' },
    h('div', { class: 'bereich-kopf' }, h('h2', {}, 'Umrechner')),
    h('div', { class: 'umrechner' },
      h('div', { class: 'formular' },
        quellen,
        h('div', { class: 'feld' },
          h('label', { class: 'feld-name', for: 'umrechner-programm' }, '2. Ziel'),
          h('span', { class: 'auswahl-huelle' }, programmFeld),
        ),
        h('div', { class: 'feld' }, punkteName, punkteFeld),
      ),
      ergebnis,
    ),
  );
}

// =====================================================================
// Reiter Programme
// =====================================================================

function programmeAnsicht(daten) {
  const neu = h('div', { class: 'breit' });
  const knopf = h('button', { class: 'knopf neu', type: 'button' }, '+ Programm anlegen');
  knopf.addEventListener('click', () => {
    neu.replaceChildren(h('section', { class: 'karte bereich' },
      h('div', { class: 'bereich-kopf' }, h('h2', {}, 'Neues Programm')),
      programmFormular({
        programm: null,
        speichern: async (werte) => {
          const id = await speichereProgramm(werte);
          location.hash = `#/meilenstand/p/${id}`;
        },
        abbrechen: () => neu.replaceChildren(knopf),
      }),
    ));
    neu.querySelector('.eingabe')?.focus();
  });
  neu.append(knopf);

  const karten = TYPEN.map((typ) => {
    const liste = daten.programme.filter((p) => p.typ === typ).sort(nachName);
    if (!liste.length) return null;
    return h('section', { class: 'karte bereich breit' },
      h('div', { class: 'bereich-kopf' },
        h('h2', {}, TYP_MEHRZAHL[typ]),
        h('span', { class: 'bereich-summe leise' }, `${liste.length}`),
      ),
      h('div', { class: 'tabelle-huelle' },
        h('table', { class: 'programmtabelle' },
          h('thead', {}, h('tr', {},
            h('th', { scope: 'col' }, 'Name'),
            QUELLEN.map((q) => h('th', { scope: 'col' }, QUELLE_KURZ[q.id])),
          )),
          h('tbody', {}, liste.map((p) => h('tr', {},
            h('th', { scope: 'row' }, h('a', { href: `#/meilenstand/p/${p.id}` }, p.name)),
            QUELLEN.map((q) => {
              const z = zuordnungText(p, q.id, daten.programme);
              return h('td', { class: z.text === 'nein' ? 'nein' : null },
                h('span', {}, z.text),
                z.hinweis ? h('span', { class: 'zelle-hinweis' }, z.hinweis) : null,
              );
            }),
          ))),
        ),
      ),
    );
  });

  return [neu, ...karten.filter(Boolean)];
}

/** Formular für Name, Typ und die Zuordnung zu Amex, Revolut und Payback mit Verhältnissen */
function programmFormular({ programm, speichern, abbrechen, loeschen }) {
  const p = programm ?? {};
  const zuordnung = [['nein', 'nein'], ['direkt', 'direkt'], ['indirekt', 'indirekt']];
  const verhaeltnisHinweis = 'Links die Punkte der Quelle, rechts Meilen oder Punkte im Programm. 5 : 4 heißt 5 Punkte ergeben 4 Meilen.';
  const paar = (q, z) => (q && z ? [q, z] : null);

  const fName = feld({ name: 'name', label: 'Name', typ: 'text', pflicht: true }, p.name);
  const fTyp = feld({ name: 'typ', label: 'Typ', typ: 'auswahl', optionen: TYPEN.map((t) => [t, t]), standard: 'Airline' }, p.typ);
  const amex = {
    art: feld({ name: 'amex', label: 'Zuordnung', typ: 'auswahl', optionen: zuordnung, standard: 'nein' }, p.amex),
    verh: feld({ name: 'amex_v', label: 'Verhältnis', typ: 'verhaeltnis', hinweis: verhaeltnisHinweis }, paar(p.amex_quelle, p.amex_ziel)),
    ueber: feld({
      name: 'amex_ueber_payback', label: 'Über Payback in zwei Schritten', typ: 'schalter',
      hinweis: 'Amex zu Payback, dann Payback zu diesem Programm. Das Verhältnis ergibt sich aus beiden Schritten.',
    }, p.amex_ueber_payback),
    hinweis: feld({ name: 'amex_hinweis', label: 'Hinweis (optional)', typ: 'text', hinweis: 'Zum Beispiel „über Avios“' }, p.amex_hinweis),
  };
  const revolut = {
    art: feld({ name: 'revolut', label: 'Zuordnung', typ: 'auswahl', optionen: zuordnung, standard: 'nein' }, p.revolut),
    verh: feld({ name: 'revolut_v', label: 'Verhältnis', typ: 'verhaeltnis', hinweis: verhaeltnisHinweis }, paar(p.revolut_quelle, p.revolut_ziel)),
    hinweis: feld({ name: 'revolut_hinweis', label: 'Hinweis (optional)', typ: 'text', hinweis: 'Zum Beispiel „über Avios“' }, p.revolut_hinweis),
  };
  const payback = {
    art: feld({ name: 'payback', label: 'Zuordnung', typ: 'auswahl', optionen: [['nein', 'nein'], ['direkt', 'direkt']], standard: 'nein' }, p.payback),
    verh: feld({ name: 'payback_v', label: 'Verhältnis', typ: 'verhaeltnis', hinweis: verhaeltnisHinweis }, paar(p.payback_quelle, p.payback_ziel)),
  };

  // Felder ein und ausblenden, je nach Zuordnung
  function sichtbarkeit() {
    const amexArt = amex.art.eingabe.value;
    const ueberPayback = amexArt === 'indirekt' && amex.ueber.eingabe.checked;
    amex.ueber.element.hidden = amexArt !== 'indirekt';
    amex.verh.element.hidden = amexArt === 'nein' || ueberPayback;
    amex.hinweis.element.hidden = amexArt === 'nein';
    revolut.verh.element.hidden = revolut.art.eingabe.value === 'nein';
    revolut.hinweis.element.hidden = revolut.art.eingabe.value === 'nein';
    payback.verh.element.hidden = payback.art.eingabe.value === 'nein';
  }
  [amex.art, amex.ueber, revolut.art, payback.art].forEach((f) => f.eingabe.addEventListener('change', sichtbarkeit));
  sichtbarkeit();

  function werteLesen() {
    const w = { name: fName.lesen(), typ: fTyp.lesen() };

    w.amex = amex.art.lesen();
    w.amex_quelle = null;
    w.amex_ziel = null;
    w.amex_hinweis = null;
    w.amex_ueber_payback = false;
    if (w.amex !== 'nein') {
      w.amex_hinweis = amex.hinweis.lesen();
      if (w.amex === 'indirekt' && amex.ueber.lesen()) w.amex_ueber_payback = true;
      else [w.amex_quelle, w.amex_ziel] = amex.verh.lesen();
    }

    w.revolut = revolut.art.lesen();
    w.revolut_quelle = null;
    w.revolut_ziel = null;
    w.revolut_hinweis = null;
    if (w.revolut !== 'nein') {
      [w.revolut_quelle, w.revolut_ziel] = revolut.verh.lesen();
      w.revolut_hinweis = revolut.hinweis.lesen();
    }

    w.payback = payback.art.lesen();
    w.payback_quelle = null;
    w.payback_ziel = null;
    if (w.payback !== 'nein') [w.payback_quelle, w.payback_ziel] = payback.verh.lesen();

    if (w.amex_ueber_payback && w.payback !== 'direkt') {
      throw new Eingabefehler('Für den Weg über Payback muss Payback bei diesem Programm auf „direkt“ stehen.', payback.art.eingabe);
    }
    return w;
  }

  const gruppe = (titel, ...felder) => h('fieldset', { class: 'quelle-gruppe' },
    h('legend', {}, titel), felder.map((f) => f.element));

  return formular({
    felder: [
      fName.element,
      fTyp.element,
      gruppe('Amex Membership Rewards', amex.art, amex.verh, amex.ueber, amex.hinweis),
      gruppe('Revolut RevPoints', revolut.art, revolut.verh, revolut.hinweis),
      gruppe('Payback', payback.art, payback.verh),
    ],
    absenden: () => speichern(werteLesen()),
    abbrechen,
    loeschen,
    loeschFrage: `„${p.name}“ mit allen Zwischenständen und dem Ziel löschen?`,
    loeschText: 'Programm löschen',
  });
}

// =====================================================================
// Seite eines Programms
// =====================================================================

function programmSeite(container, kontext, id) {
  const inhalt = h('div', {}, h('p', { class: 'laden' }, 'Wird geladen …'));
  container.append(inhalt);
  const zurueckZumMeilenstand = { weitereLinks: [{ href: '#/meilenstand', text: 'Meilenstand' }] };

  ladeUndZeige(inhalt, kontext, (daten, laden) => {
    const p = daten.programme.find((x) => x.id === id);
    if (!p) {
      inhalt.replaceChildren(
        seitenKopf('Programm nicht gefunden', zurueckZumMeilenstand),
        h('p', { class: 'leise' }, 'Dieses Programm gibt es nicht mehr.'),
      );
      return;
    }
    document.title = `${p.name} · Meilenstand`;
    const aendern = async (aktion) => {
      await aktion();
      await laden();
    };
    const v = verlauf(daten.staende, p.id);
    const ziel = daten.ziele.find((z) => z.programm_id === p.id);

    inhalt.replaceChildren(
      seitenKopf(p.name, { ...zurueckZumMeilenstand, untertitel: p.typ }),
      h('div', { class: 'raster' },
        standKarte(p, v),
        zielKarte(p, v, ziel, aendern),
        verlaufKarte(p, v, aendern),
        zuordnungKarte(p, daten.programme, aendern),
      ),
    );
  });
}

function standKarte(p, v) {
  const letzter = v.at(-1);
  const kopf = h('div', { class: 'bereich-kopf' }, h('h2', {}, 'Aktueller Stand'));
  if (!letzter) {
    return h('section', { class: 'karte bereich' }, kopf, h('p', { class: 'leise' }, 'Noch kein Stand erfasst.'));
  }
  return h('section', { class: 'karte bereich' },
    kopf,
    h('p', { class: 'gross-wert' }, `${zahl(letzter.stand)} ${einheit(p.typ)}`),
    h('p', { class: 'leise' }, `Stand vom ${datum(letzter.datum)}`),
    h('p', {}, letzter.differenz == null
      ? 'Erster Eintrag'
      : `${differenzText(letzter.differenz)} zum vorherigen Eintrag vom ${datum(v.at(-2).datum)}`),
  );
}

function zielKarte(p, v, ziel, aendern) {
  const e = einheit(p.typ);
  const stand = v.at(-1)?.stand ?? 0;
  const karte = h('section', { class: 'karte bereich' });
  let bearbeiten = false;

  function zeichnen() {
    const kopf = h('div', { class: 'bereich-kopf' }, h('h2', {}, 'Ziel'));

    if (bearbeiten) {
      const fZiel = feld({ name: 'zielstand', label: `Zielstand in ${e}`, typ: 'ganzzahl', pflicht: true, groesserNull: true }, ziel?.zielstand);
      karte.replaceChildren(kopf, formular({
        felder: [fZiel.element],
        absenden: () => aendern(() => speichereZiel(p.id, fZiel.lesen(), ziel?.id)),
        abbrechen: () => { bearbeiten = false; zeichnen(); },
        loeschen: ziel ? () => aendern(() => loescheZiel(ziel.id)) : null,
        loeschFrage: 'Ziel wirklich löschen?',
        loeschText: 'Ziel löschen',
      }));
      fZiel.eingabe.focus();
      return;
    }

    const knopf = h('button', { class: 'knopf', type: 'button' }, ziel ? 'Bearbeiten' : '+ Ziel festlegen');
    knopf.addEventListener('click', () => { bearbeiten = true; zeichnen(); });

    if (!ziel) {
      karte.replaceChildren(kopf, h('p', { class: 'leise' }, 'Noch kein Ziel festgelegt.'), knopf);
      return;
    }

    const fehlt = ziel.zielstand - stand;
    karte.replaceChildren(
      kopf,
      h('dl', { class: 'werte' },
        h('div', {}, h('dt', {}, 'Zielstand'), h('dd', {}, `${zahl(ziel.zielstand)} ${e}`)),
        h('div', {}, h('dt', {}, 'Erreicht'), h('dd', {}, prozent(stand / ziel.zielstand))),
      ),
      fortschrittsbalken(stand / ziel.zielstand, `Ziel ${p.name}`),
      h('p', { class: fehlt > 0 ? null : 'erfolgstext' }, fehlt > 0 ? `Noch ${zahl(fehlt)} ${e} bis zum Ziel` : 'Ziel erreicht'),
      knopf,
    );
  }

  zeichnen();
  return karte;
}

function verlaufKarte(p, v, aendern) {
  const e = einheit(p.typ);
  let oben = null;
  if (v.length >= 2) {
    oben = linienDiagramm({ punkte: v.map((s) => ({ datum: s.datum, wert: s.stand })), einheit: e, titel: `Verlauf ${p.name}` });
  } else if (v.length === 1) {
    oben = h('p', { class: 'leise' }, 'Ab zwei Einträgen erscheint hier ein Diagramm.');
  }

  return bearbeitbareListe({
    titel: 'Verlauf',
    klasse: 'breit',
    oben,
    eintraege: [...v].reverse(), // neuester Eintrag oben
    leerText: 'Noch kein Stand erfasst.',
    neuText: 'Stand erfassen',
    felder: [
      { name: 'datum', label: 'Datum', typ: 'datum' },
      { name: 'stand', label: `Stand in ${e}`, typ: 'ganzzahl', pflicht: true },
      { name: 'notiz', label: 'Notiz (optional)', typ: 'langtext' },
    ],
    zeile: (s) => ({
      titel: datum(s.datum),
      zusatz: s.differenz == null ? 'erster Eintrag' : `${differenzText(s.differenz)} zum vorherigen`,
      wert: `${zahl(s.stand)} ${e}`,
      unten: s.notiz ? h('span', { class: 'zeile-notiz' }, s.notiz) : null,
    }),
    speichern: (werte, s) => aendern(() => speichereStand(s ? werte : { ...werte, programm_id: p.id }, s?.id)),
    loeschen: (s) => aendern(() => loescheStand(s.id)),
    loeschFrage: (s) => `Stand vom ${datum(s.datum)} wirklich löschen?`,
  });
}

function zuordnungKarte(p, programme, aendern) {
  const karte = h('section', { class: 'karte bereich breit' });
  let bearbeiten = false;

  function zeichnen() {
    const kopf = h('div', { class: 'bereich-kopf' }, h('h2', {}, 'Zuordnung und Verhältnisse'));

    if (bearbeiten) {
      karte.replaceChildren(kopf, programmFormular({
        programm: p,
        speichern: (werte) => aendern(() => speichereProgramm(werte, p.id)),
        abbrechen: () => { bearbeiten = false; zeichnen(); },
        loeschen: async () => {
          await loescheProgramm(p.id);
          location.hash = '#/meilenstand/programme';
        },
      }));
      karte.querySelector('.eingabe')?.focus();
      return;
    }

    const knopf = h('button', { class: 'knopf', type: 'button' }, 'Bearbeiten');
    knopf.addEventListener('click', () => { bearbeiten = true; zeichnen(); });

    karte.replaceChildren(
      kopf,
      h('dl', { class: 'werte' },
        h('div', {}, h('dt', {}, 'Typ'), h('dd', {}, p.typ)),
        QUELLEN.map((q) => {
          const z = zuordnungText(p, q.id, programme);
          return h('div', {},
            h('dt', {}, q.name),
            h('dd', {}, z.text, z.hinweis ? h('span', { class: 'zelle-hinweis' }, z.hinweis) : null),
          );
        }),
      ),
      knopf,
    );
  }

  zeichnen();
  return karte;
}
