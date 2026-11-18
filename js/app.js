// Einstieg der App: Anmeldestatus verfolgen und die passende Seite anzeigen.
//
// Seiten werden über den Teil der Adresse nach # gewählt, zum Beispiel #/meilenstand.
// Jede Seite ist eine Funktion (container, kontext) und darf eine Aufräumfunktion zurückgeben,
// die beim Verlassen der Seite aufgerufen wird (zum Beispiel um eine laufende Uhr zu stoppen).

import { db } from './supabase.js';
import { loginSeite } from './seiten/login.js';
import { startSeite } from './seiten/start.js';

// Unterseiten, die nach dem Login erreichbar sind. Neue Seiten hier eintragen.
const seiten = {
  start: { titel: 'Haushaltsbuch', anzeigen: startSeite },
};

const container = document.getElementById('app');
let sitzung = null;
let aufraeumen = null;
let durchlauf = 0;

function routeAusAdresse() {
  const name = location.hash.replace(/^#\/?/, '');
  return seiten[name] ? name : 'start';
}

function anzeigen() {
  if (aufraeumen) {
    try { aufraeumen(); } catch (fehler) { console.error(fehler); }
    aufraeumen = null;
  }
  const dieserDurchlauf = ++durchlauf;
  container.replaceChildren();
  window.scrollTo(0, 0);

  const kontext = {
    sitzung,
    // false, sobald der Benutzer die Seite verlassen hat. Wichtig nach dem Laden von Daten.
    aktiv: () => dieserDurchlauf === durchlauf,
  };

  if (!sitzung) {
    document.title = 'Anmelden · Haushaltsbuch';
    aufraeumen = loginSeite(container, kontext) ?? null;
    return;
  }

  const seite = seiten[routeAusAdresse()];
  document.title = seite.titel;
  aufraeumen = seite.anzeigen(container, kontext) ?? null;
}

// Supabase meldet Änderungen am Anmeldestatus. Die Seite wird erst danach neu aufgebaut
// (setTimeout), weil in diesem Rückruf keine weiteren Supabase Aufrufe passieren sollen.
db.auth.onAuthStateChange((ereignis, neueSitzung) => {
  const warAngemeldet = Boolean(sitzung);
  sitzung = neueSitzung;

  if (ereignis === 'INITIAL_SESSION') {
    setTimeout(anzeigen, 0);
  } else if (ereignis === 'SIGNED_IN' && !warAngemeldet) {
    // Nach dem Login immer zuerst die Startseite
    history.replaceState(null, '', location.pathname + location.search);
    setTimeout(anzeigen, 0);
  } else if (ereignis === 'SIGNED_OUT') {
    history.replaceState(null, '', location.pathname + location.search);
    setTimeout(anzeigen, 0);
  }
});

window.addEventListener('hashchange', () => {
  if (sitzung) anzeigen();
});
