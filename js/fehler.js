// Verständliche deutsche Fehlermeldungen für Fehler aus Eingaben und aus der Datenbank.
import { Eingabefehler } from './eingabe.js';

/** true, wenn der Fehler an der Verbindung liegt (Chrome, Firefox und Safari melden das unterschiedlich) */
export function istNetzfehler(fehler) {
  if (fehler instanceof Eingabefehler) return false;
  const text = `${fehler?.message ?? ''} ${fehler?.details ?? ''}`;
  return /Failed to fetch|NetworkError|Load failed|network/i.test(text) || !navigator.onLine;
}

/**
 * Weiß das Gerät, dass es keine Verbindung hat (zum Beispiel im Flugmodus), sofort mit einem Verbindungsfehler abbrechen.
 * Sonst wartet eine Anfrage mit abgelaufener Anmeldung bis zu etwa 30 Sekunden, bis Supabase aufgibt.
 */
export function pruefeVerbindung() {
  if (!navigator.onLine) throw new Error('NetworkError: das Gerät ist offline');
}

export function fehlertext(fehler) {
  if (fehler instanceof Eingabefehler) return fehler.message;

  const text = `${fehler?.message ?? ''} ${fehler?.details ?? ''}`;

  if (istNetzfehler(fehler)) {
    return 'Keine Verbindung zum Server. Bitte die Internetverbindung prüfen.';
  }
  if (fehler?.code === '23514') {
    // Prüfregel in der Datenbank verletzt
    if (text.includes('mietpositionen_anteil_nicht_hoeher')) {
      return 'Dein Anteil kann nicht höher sein als der Gesamtbetrag.';
    }
    return 'Ein Wert ist nicht zulässig. Bitte die Eingaben prüfen.';
  }
  if (fehler?.code === '23505') {
    if (text.includes('programme_name_eindeutig')) return 'Ein Programm mit diesem Namen gibt es schon.';
    if (text.includes('meilenziele_ein_ziel_pro_programm')) return 'Für dieses Programm gibt es schon ein Ziel.';
    return 'Diesen Eintrag gibt es schon.';
  }
  if (fehler?.code === 'PGRST301' || fehler?.code === 'PGRST303' || /JWT/i.test(text)) {
    return 'Die Anmeldung ist abgelaufen. Bitte neu anmelden.';
  }
  return 'Das hat nicht geklappt. Bitte erneut versuchen.';
}
