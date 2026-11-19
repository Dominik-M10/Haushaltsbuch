// Einstieg der App: Anmeldestatus verfolgen und die passende Seite anzeigen.
//
// Seiten werden über den Teil der Adresse nach # gewählt, zum Beispiel #/meilenstand.
// Jede Seite ist eine Funktion (container, kontext) und darf eine Aufräumfunktion zurückgeben,
// die beim Verlassen der Seite aufgerufen wird (zum Beispiel um eine laufende Uhr zu stoppen).

import { db } from './supabase.js';
import { loginSeite } from './seiten/login.js';
import { startSeite } from './seiten/start.js';
import { bereiche } from './bereiche.js';
import { h } from './ui.js';
import { ZEITZONE } from './format.js';
import { setzeBenutzer, neueAnsicht, allesLoeschen } from './zwischenspeicher.js';

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
let angezeigtFuer = null; // id des Benutzers, für den die App gerade aufgebaut ist

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
  setzeBenutzer(sitzung?.user?.id);
  neueAnsicht();

  const route = routeAusAdresse();
  const kontext = {
    sitzung,
    pfad: route.pfad, // Teile der Adresse nach dem Seitennamen
    // false, sobald der Benutzer die Seite verlassen hat. Wichtig nach dem Laden von Daten.
    aktiv: () => dieserDurchlauf === durchlauf,
  };

  ansicht = sitzung ? 'app' : 'login';
  angezeigtFuer = sitzung?.user?.id ?? null;
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
    // Ohne Verbindung kann Supabase eine abgelaufene Anmeldung nicht erneuern und meldet keine Sitzung.
    // Liegt die Anmeldung aber noch auf dem Gerät, bleibt man angemeldet und sieht den gespeicherten Stand.
    // (Supabase löscht die gespeicherte Anmeldung nur, wenn sie wirklich ungültig ist, nicht bei fehlender Verbindung.)
    if (!sitzung) sitzung = gespeicherteSitzung();
    // Wurde die App ohne Verbindung schon mit der gespeicherten Anmeldung aufgebaut, nicht noch einmal
    if (ansicht === 'app' && sitzung && sitzung.user.id === angezeigtFuer) return;
    setTimeout(anzeigen, 0);
  } else if (ereignis === 'SIGNED_IN' && ansicht === 'login' && neueSitzung) {
    // Nach dem Login über das Formular immer zuerst die Startseite
    history.replaceState(null, '', location.pathname + location.search);
    setTimeout(anzeigen, 0);
  } else if (ereignis === 'SIGNED_OUT') {
    allesLoeschen(); // gespeicherte Daten bleiben nicht auf dem Gerät
    history.replaceState(null, '', location.pathname + location.search);
    setTimeout(anzeigen, 0);
  }
});

window.addEventListener('hashchange', () => {
  if (sitzung) anzeigen();
});

// Ohne Verbindung (zum Beispiel im Flugmodus) nicht auf Supabase warten: Eine abgelaufene Anmeldung versucht
// Supabase bis zu etwa 30 Sekunden lang zu erneuern. Die gespeicherte Anmeldung reicht, um den Stand zu zeigen.
if (!navigator.onLine) {
  const gespeichert = gespeicherteSitzung();
  if (gespeichert) {
    sitzung = gespeichert;
    setTimeout(anzeigen, 0);
  }
}

/** Die auf dem Gerät gespeicherte Anmeldung, auch wenn sie gerade nicht erneuert werden kann */
function gespeicherteSitzung() {
  try {
    const gespeichert = JSON.parse(localStorage.getItem(db.auth.storageKey));
    return gespeichert?.user?.id && gespeichert.refresh_token ? { user: gespeichert.user, ohneVerbindung: true } : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------
// Hinweis oben, wenn die Seite Daten aus dem Zwischenspeicher zeigt
// ---------------------------------------------------------------------
const hinweis = document.getElementById('verbindung');
const zeitFormat = new Intl.DateTimeFormat('de-DE', {
  timeZone: ZEITZONE, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
});
let gespeicherterStand = null;

function hinweisZeigen() {
  if (!gespeicherterStand) {
    hinweis.replaceChildren();
    return;
  }
  if (!navigator.onLine) {
    hinweis.replaceChildren(h('div', { class: 'verbindung-hinweis' }, h('p', {},
      h('strong', {}, 'Keine Verbindung.'),
      ` Du siehst den Stand vom ${zeitFormat.format(gespeicherterStand)} Uhr. Ändern geht erst wieder mit Verbindung.`)));
    return;
  }
  // Verbindung wieder da: nicht selbst neu laden, damit ein angefangenes Formular nicht verloren geht
  const knopf = h('button', { class: 'knopf', type: 'button' }, 'Aktualisieren');
  knopf.addEventListener('click', async () => {
    knopf.disabled = true;
    await db.auth.getSession(); // erneuert die Anmeldung, falls sie ohne Verbindung abgelaufen ist
    if (sitzung) anzeigen();
  });
  hinweis.replaceChildren(h('div', { class: 'verbindung-hinweis' },
    h('p', {}, `Die Verbindung ist wieder da. Du siehst noch den Stand vom ${zeitFormat.format(gespeicherterStand)} Uhr.`),
    knopf));
}

window.addEventListener('zwischenspeicher', (ereignis) => {
  gespeicherterStand = ereignis.detail.stand;
  hinweisZeigen();
});
window.addEventListener('online', hinweisZeigen);
window.addEventListener('offline', hinweisZeigen);

// ---------------------------------------------------------------------
// Service Worker: hält die Dateien der App auf dem Gerät (siehe sw.js)
// ---------------------------------------------------------------------
async function dateienMerken() {
  try {
    const registrierung = await navigator.serviceWorker.register('./sw.js');
    await navigator.serviceWorker.ready;
    // Alles, was diese Seite schon geladen hat, gleich mit ablegen (beim ersten Besuch lief der Service Worker noch nicht)
    const adressen = [location.href.split('#')[0], ...performance.getEntriesByType('resource').map((e) => e.name)];
    registrierung.active?.postMessage({ typ: 'merken', adressen });
  } catch (fehler) {
    console.warn('Service Worker nicht verfügbar', fehler);
  }
}
if ('serviceWorker' in navigator) {
  if (document.readyState === 'complete') dateienMerken();
  else window.addEventListener('load', dateienMerken);
}
