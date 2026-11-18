// Einstieg der App: Anmeldestatus verfolgen und die passende Seite anzeigen.
//
// Seiten werden über den Teil der Adresse nach # gewählt, zum Beispiel #/meilenstand.
// Jede Seite ist eine Funktion (container, kontext) und darf eine Aufräumfunktion zurückgeben,
// die beim Verlassen der Seite aufgerufen wird (zum Beispiel um eine laufende Uhr zu stoppen).

import { db } from './supabase.js';
import { loginSeite } from './seiten/login.js';
import { startSeite } from './seiten/start.js';
import { bereiche } from './bereiche.js';

// Seiten, die nach dem Login erreichbar sind: die Startseite und alle Bereiche aus bereiche.js
const seiten = {
  start: { titel: 'Haushaltsbuch', anzeigen: startSeite },
};
for (const bereich of bereiche) {
  seiten[bereich.id] = { titel: `${bereich.titel} · Haushaltsbuch`, anzeigen: bereich.seite };
}

const container = document.getElementById('app');
let sitzung = null;
let aufraeumen = null;
let durchlauf = 0;
let ansicht = null; // was gerade zu sehen ist: null (noch nichts), 'login' oder 'app'

// "#/meilenstand/p/123" wird zu { name: 'meilenstand', pfad: ['p', '123'] }
function routeAusAdresse() {
  const entschluesseln = (teil) => { try { return decodeURIComponent(teil); } catch { return ''; } };
  const [name, ...pfad] = location.hash.replace(/^#\/?/, '').split('/').map(entschluesseln);
  return Object.hasOwn(seiten, name) ? { name, pfad } : { name: 'start', pfad: [] };
}

function anzeigen() {
  if (aufraeumen) {
    try { aufraeumen(); } catch (fehler) { console.error(fehler); }
    aufraeumen = null;
  }
  const dieserDurchlauf = ++durchlauf;
  container.replaceChildren();
  window.scrollTo(0, 0);

  const route = routeAusAdresse();
  const kontext = {
    sitzung,
    pfad: route.pfad, // Teile der Adresse nach dem Seitennamen
    // false, sobald der Benutzer die Seite verlassen hat. Wichtig nach dem Laden von Daten.
    aktiv: () => dieserDurchlauf === durchlauf,
  };

  ansicht = sitzung ? 'app' : 'login';
  if (!sitzung) {
    document.title = 'Anmelden · Haushaltsbuch';
    aufraeumen = loginSeite(container, kontext) ?? null;
    return;
  }

  const seite = seiten[route.name];
  document.title = seite.titel;
  aufraeumen = seite.anzeigen(container, kontext) ?? null;
}

// Supabase meldet Änderungen am Anmeldestatus. Die Seite wird erst danach neu aufgebaut
// (setTimeout), weil in diesem Rückruf keine weiteren Supabase Aufrufe passieren sollen.
//
// Beim Öffnen meldet Supabase eine gespeicherte Anmeldung ebenfalls als SIGNED_IN, noch vor INITIAL_SESSION.
// Zur Startseite geht es deshalb nur, wenn gerade das Login Formular zu sehen war. Wer eine Unterseite
// neu lädt, bleibt auf ihr.
db.auth.onAuthStateChange((ereignis, neueSitzung) => {
  sitzung = neueSitzung;

  if (ereignis === 'INITIAL_SESSION') {
    setTimeout(anzeigen, 0);
  } else if (ereignis === 'SIGNED_IN' && ansicht === 'login' && neueSitzung) {
    // Nach dem Login über das Formular immer zuerst die Startseite
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
