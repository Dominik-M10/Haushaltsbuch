// Verständliche deutsche Fehlermeldungen für Fehler aus Eingaben und aus der Datenbank.
import { Eingabefehler } from './eingabe.js';

export function fehlertext(fehler) {
  if (fehler instanceof Eingabefehler) return fehler.message;

  const text = `${fehler?.message ?? ''} ${fehler?.details ?? ''}`;

  if (/Failed to fetch|NetworkError|Load failed|network/i.test(text) || !navigator.onLine) {
    return 'Keine Verbindung zum Server. Bitte die Internetverbindung prüfen.';
  }
  if (fehler?.code === '23514') {
    // Prüfregel in der Datenbank verletzt
    if (text.includes('anteil_nicht_hoeher_als_gesamtmiete')) {
      return 'Dein Anteil kann nicht höher sein als die Gesamtmiete.';
    }
    return 'Ein Wert ist nicht zulässig. Bitte die Eingaben prüfen.';
  }
  if (fehler?.code === '23505') {
    return 'Diesen Eintrag gibt es schon.';
  }
  if (fehler?.code === 'PGRST301' || fehler?.code === 'PGRST303' || /JWT/i.test(text)) {
    return 'Die Anmeldung ist abgelaufen. Bitte neu anmelden.';
  }
  return 'Das hat nicht geklappt. Bitte erneut versuchen.';
}
