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
 * def: { name, label, typ: 'text' | 'euro' | 'ganzzahl' | 'datum' | 'auswahl' | 'langtext',
 *        pflicht, groesserNull, optionen: [[wert, text], ...], standard, hinweis }
 * Rückgabe: { element, eingabe, lesen() }. lesen() wirft einen Eingabefehler bei ungültigen Werten.
 */
export function feld(def, wert) {
  const id = `feld-${++feldZaehler}`;
  const startwert = wert ?? def.standard;
  let eingabe;

  switch (def.typ) {
    case 'auswahl':
      eingabe = h('select', { class: 'eingabe', id, name: def.name },
        def.optionen.map(([w, text]) => h('option', { value: w, selected: w === startwert }, text)),
      );
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
  const steuerung = def.typ === 'auswahl' ? h('span', { class: 'auswahl-huelle' }, eingabe) : eingabe;
  const element = h('div', { class: 'feld' },
    h('label', { class: 'feld-name', for: id }, def.label),
    steuerung,
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
      default: {
        const text = roh.trim();
        if (def.pflicht && !text) throw new Eingabefehler(`Bitte ${def.label} eingeben.`, eingabe);
        return text || null;
      }
    }
  }

  return { element, eingabe, lesen };
}
