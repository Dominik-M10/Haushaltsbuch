// Eingabefelder für Formulare und das Lesen deutscher Zahlen.
import { h } from './ui.js';
import { heuteIso } from './format.js';

/** Fehler in einer Eingabe. Merkt sich das Feld, damit es danach den Fokus bekommt. */
export class Eingabefehler extends Error {
  constructor(text, feld) {
    super(text);
    this.feld = feld;
  }
}

/**
 * Liest einen Eurobetrag. Erlaubt "1.234,56", "1234,56", "1234.56", "1234" und "1.234".
 * Gibt NaN zurück, wenn die Eingabe kein gültiger Betrag mit höchstens zwei Nachkommastellen ist.
 */
export function leseBetrag(text) {
  let s = String(text ?? '').replace(/[\s€  ]/g, '');
  if (s === '') return NaN;
  if (s.includes(',')) {
    // deutsches Format: Punkte trennen Tausender, das Komma die Cent
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    // nur Tausenderpunkte, zum Beispiel 1.234
    s = s.replace(/\./g, '');
  }
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return NaN;
  return Number(s);
}

/** Liest eine ganze Zahl wie "12.345" oder "12345". Gibt NaN bei ungültiger Eingabe zurück. */
export function leseGanzzahl(text) {
  const s = String(text ?? '').replace(/[\s.  ]/g, '');
  if (!/^\d+$/.test(s)) return NaN;
  return Number(s);
}

/** Betrag für ein Eingabefeld: 1234.5 wird zu "1234,50" */
export function betragFuerEingabe(wert) {
  if (wert == null || wert === '') return '';
  return Number(wert).toFixed(2).replace('.', ',');
}

let feldZaehler = 0;

/**
 * Erzeugt ein beschriftetes Eingabefeld.
 * def: { name, label, typ: 'text' | 'euro' | 'ganzzahl' | 'datum' | 'auswahl' | 'langtext' | 'verhaeltnis' | 'schalter',
 *        pflicht, groesserNull, optionen: [[wert, text], ...], gruppen, standard, hinweis }
 * 'verhaeltnis' liest [quelle, ziel], 'schalter' liest true oder false.
 * Rückgabe: { element, eingabe, lesen() }. lesen() wirft einen Eingabefehler bei ungültigen Werten.
 */
export function feld(def, wert) {
  const id = `feld-${++feldZaehler}`;
  const startwert = wert ?? def.standard;
  let eingabe;

  let zweite = null; // zweites Zahlenfeld beim Verhältnis
  let steuerung = null;

  switch (def.typ) {
    case 'auswahl': {
      const option = ([w, text]) => h('option', { value: w, selected: w === startwert }, text);
      // optionen: [[wert, text], ...] oder gruppen: [{ name, optionen: [[wert, text], ...] }, ...]
      const inhalt = def.gruppen
        ? def.gruppen.filter((g) => g.optionen.length).map((g) => h('optgroup', { label: g.name }, g.optionen.map(option)))
        : def.optionen.map(option);
      eingabe = h('select', { class: 'eingabe', id, name: def.name }, inhalt);
      steuerung = h('span', { class: 'auswahl-huelle' }, eingabe);
      break;
    }
    case 'verhaeltnis': {
      // zwei ganze Zahlen, Quelle : Ziel
      const [q, z] = startwert ?? [null, null];
      const zahlfeld = (wert, name, beschriftung) => h('input', {
        class: 'eingabe', type: 'text', inputmode: 'numeric', autocomplete: 'off', name,
        value: wert == null ? '' : String(wert), 'aria-label': beschriftung,
      });
      eingabe = zahlfeld(q, `${def.name}_quelle`, `${def.label}, Punkte der Quelle`);
      eingabe.id = id;
      zweite = zahlfeld(z, `${def.name}_ziel`, `${def.label}, Punkte im Ziel`);
      steuerung = h('span', { class: 'verhaeltnis' }, eingabe, h('span', { 'aria-hidden': 'true' }, ':'), zweite);
      break;
    }
    case 'schalter':
      eingabe = h('input', { class: 'schalter-eingabe', id, name: def.name, type: 'checkbox', checked: Boolean(startwert) });
      break;
    case 'euro':
      eingabe = h('input', {
        class: 'eingabe', id, name: def.name, type: 'text', inputmode: 'decimal',
        autocomplete: 'off', placeholder: '0,00', value: betragFuerEingabe(startwert),
      });
      break;
    case 'ganzzahl':
      eingabe = h('input', {
        class: 'eingabe', id, name: def.name, type: 'text', inputmode: 'numeric',
        autocomplete: 'off', placeholder: '0', value: startwert == null ? '' : String(startwert),
      });
      break;
    case 'datum':
      eingabe = h('input', { class: 'eingabe', id, name: def.name, type: 'date', value: startwert ?? heuteIso() });
      break;
    case 'langtext':
      eingabe = h('textarea', { class: 'eingabe', id, name: def.name, rows: 2, maxlength: 500 });
      eingabe.value = startwert ?? '';
      break;
    default:
      eingabe = h('input', {
        class: 'eingabe', id, name: def.name, type: 'text', autocomplete: 'off',
        maxlength: def.maxlaenge ?? 100, value: startwert ?? '',
      });
  }

  // Hinweis getrennt von der Beschriftung, damit der Feldname kurz bleibt (wichtig für Screenreader)
  let hinweis = null;
  if (def.hinweis) {
    hinweis = h('span', { class: 'feld-hinweis', id: `${id}-hinweis` }, def.hinweis);
    eingabe.setAttribute('aria-describedby', `${id}-hinweis`);
  }
  const element = def.typ === 'schalter'
    ? h('div', { class: 'feld feld-schalter' },
        h('label', { class: 'schalter', for: id }, eingabe, h('span', {}, def.label)),
        hinweis,
      )
    : h('div', { class: 'feld' },
        h('label', { class: 'feld-name', for: id }, def.label),
        steuerung ?? eingabe,
        hinweis,
      );

  function lesen() {
    const roh = eingabe.value;
    switch (def.typ) {
      case 'euro': {
        if (roh.trim() === '' && !def.pflicht) return null;
        const betrag = leseBetrag(roh);
        if (Number.isNaN(betrag)) {
          throw new Eingabefehler(`${def.label}: bitte einen gültigen Betrag eingeben, zum Beispiel 1.234,56.`, eingabe);
        }
        if (betrag >= 1e10) throw new Eingabefehler(`${def.label}: der Betrag ist zu groß.`, eingabe);
        if (def.groesserNull && betrag <= 0) throw new Eingabefehler(`${def.label} muss größer als 0 sein.`, eingabe);
        return betrag;
      }
      case 'ganzzahl': {
        if (roh.trim() === '' && !def.pflicht) return null;
        const zahl = leseGanzzahl(roh);
        if (Number.isNaN(zahl)) {
          throw new Eingabefehler(`${def.label}: bitte eine ganze Zahl eingeben, zum Beispiel 12.345.`, eingabe);
        }
        if (zahl > Number.MAX_SAFE_INTEGER) throw new Eingabefehler(`${def.label}: die Zahl ist zu groß.`, eingabe);
        if (def.groesserNull && zahl <= 0) throw new Eingabefehler(`${def.label} muss größer als 0 sein.`, eingabe);
        return zahl;
      }
      case 'datum':
        if (!/^\d{4}-\d{2}-\d{2}$/.test(roh)) throw new Eingabefehler(`Bitte ein gültiges ${def.label} eingeben.`, eingabe);
        return roh;
      case 'auswahl':
        return roh;
      case 'schalter':
        return eingabe.checked;
      case 'verhaeltnis': {
        const q = leseGanzzahl(roh);
        const z = leseGanzzahl(zweite.value);
        if (!(q > 0) || !(z > 0) || q > 1e6 || z > 1e6) {
          throw new Eingabefehler(`${def.label}: bitte zwei ganze Zahlen größer als 0 eingeben, zum Beispiel 5 : 4.`, eingabe);
        }
        return [q, z];
      }
      default: {
        const text = roh.trim();
        if (def.pflicht && !text) throw new Eingabefehler(`Bitte ${def.label} eingeben.`, eingabe);
        return text || null;
      }
    }
  }

  return { element, eingabe, lesen };
}
