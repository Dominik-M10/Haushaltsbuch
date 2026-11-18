// Bearbeitbare Liste in einer Karte: Einträge anzeigen, antippen zum Bearbeiten, neue hinzufügen, löschen.
// Die Liste kennt die Datenbank nicht. Speichern und Löschen übergibt die Seite als Funktionen.
import { h } from './ui.js';
import { feld } from './eingabe.js';
import { fehlertext } from './fehler.js';

/**
 * optionen:
 *   titel, eintraege, felder (siehe eingabe.js), leerText, neuText,
 *   kopfWert:   optionaler Text rechts neben dem Titel, zum Beispiel die Summe
 *   zeile(e):   { titel, wert, zusatz, unten } für die Anzeige eines Eintrags (unten: optionales Element)
 *   pruefen(werte): optional, wirft einen Fehler mit Text, wenn die Werte nicht zusammenpassen
 *   speichern(werte, eintrag oder null): async, legt an oder ändert
 *   loeschen(eintrag): async
 *   loeschFrage(eintrag): Text für die Sicherheitsabfrage
 *   klasse: zusätzliche CSS Klasse für die Karte
 */
export function bearbeitbareListe(o) {
  let offen = null; // id des Eintrags im Bearbeitungsmodus oder 'neu'

  const liste = h('ul', { class: 'liste' });
  const neuKnopf = h('button', { class: 'knopf neu', type: 'button' }, `+ ${o.neuText}`);
  neuKnopf.addEventListener('click', () => {
    offen = 'neu';
    zeichnen(true);
  });

  const karte = h('section', { class: `karte bereich ${o.klasse ?? ''}` },
    h('div', { class: 'bereich-kopf' },
      h('h2', {}, o.titel),
      o.kopfWert ? h('span', { class: 'bereich-summe' }, o.kopfWert) : null,
    ),
    liste,
    neuKnopf,
  );

  function zeile(eintrag) {
    const z = o.zeile(eintrag);
    const knopf = h('button', { class: 'zeile', type: 'button' },
      h('span', { class: 'zeile-text' },
        h('span', { class: 'zeile-titel' }, z.titel),
        z.zusatz ? h('span', { class: 'zeile-zusatz' }, z.zusatz) : null,
      ),
      h('span', { class: 'zeile-wert' }, z.wert),
      h('span', { class: 'unsichtbar' }, ', bearbeiten'),
      z.unten ?? null,
    );
    knopf.addEventListener('click', () => {
      offen = eintrag.id;
      zeichnen(true);
    });
    return h('li', {}, knopf);
  }

  function formular(eintrag) {
    const felder = o.felder.map((def) => feld(def, eintrag ? eintrag[def.name] : undefined));
    const meldung = h('p', { class: 'fehlermeldung', role: 'alert', hidden: true });
    const speichern = h('button', { class: 'knopf primaer', type: 'submit' }, 'Speichern');
    const abbrechen = h('button', { class: 'knopf', type: 'button' }, 'Abbrechen');
    const loeschen = eintrag ? h('button', { class: 'knopf gefahr', type: 'button' }, 'Löschen') : null;
    const knoepfe = [speichern, abbrechen, loeschen].filter(Boolean);

    const form = h('form', { class: 'formular zeilen-formular', novalidate: true },
      felder.map((f) => f.element),
      meldung,
      h('div', { class: 'knopfreihe' }, knoepfe),
    );

    const zeigen = (text) => {
      meldung.textContent = text;
      meldung.hidden = false;
    };
    const sperren = (gesperrt) => knoepfe.forEach((k) => { k.disabled = gesperrt; });

    abbrechen.addEventListener('click', () => {
      offen = null;
      zeichnen(false);
    });

    form.addEventListener('submit', async (ereignis) => {
      ereignis.preventDefault();
      meldung.hidden = true;
      const werte = {};
      try {
        o.felder.forEach((def, i) => { werte[def.name] = felder[i].lesen(); });
        o.pruefen?.(werte);
      } catch (fehler) {
        zeigen(fehlertext(fehler));
        fehler.feld?.focus();
        return;
      }
      sperren(true);
      try {
        // Bei Erfolg lädt die Seite die Daten neu und baut die Liste neu auf
        await o.speichern(werte, eintrag);
      } catch (fehler) {
        console.error(fehler);
        zeigen(fehlertext(fehler));
        sperren(false);
      }
    });

    loeschen?.addEventListener('click', async () => {
      if (!window.confirm(o.loeschFrage(eintrag))) return;
      sperren(true);
      try {
        await o.loeschen(eintrag);
      } catch (fehler) {
        console.error(fehler);
        zeigen(fehlertext(fehler));
        sperren(false);
      }
    });

    return h('li', { class: 'liste-formular' }, form);
  }

  function zeichnen(fokussieren) {
    const teile = [];
    if (!o.eintraege.length && offen !== 'neu') {
      teile.push(h('li', { class: 'liste-leer' }, o.leerText));
    }
    for (const eintrag of o.eintraege) {
      teile.push(offen === eintrag.id ? formular(eintrag) : zeile(eintrag));
    }
    if (offen === 'neu') teile.push(formular(null));
    liste.replaceChildren(...teile);
    neuKnopf.hidden = offen === 'neu';
    if (fokussieren && offen !== null) {
      liste.querySelector('.zeilen-formular .eingabe')?.focus();
    }
  }

  zeichnen(false);
  return karte;
}
