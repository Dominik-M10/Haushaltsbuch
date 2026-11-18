// Startseite: oben Uhrzeit und Datum in deutscher Zeit, darunter eine Kachel pro Bereich.
import { db } from '../supabase.js';
import { h, symbol } from '../ui.js';
import { ZEITZONE } from '../format.js';
import { bereiche } from '../bereiche.js';

// Immer deutsche Zeit, egal welche Zeitzone am Gerät eingestellt ist
const zeitFormat = new Intl.DateTimeFormat('de-DE', {
  timeZone: ZEITZONE,
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});
const datumFormat = new Intl.DateTimeFormat('de-DE', {
  timeZone: ZEITZONE,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

function uhr() {
  const zeit = h('time', { class: 'uhr-zeit' });
  const tag = h('p', { class: 'uhr-datum' });
  let timer = null;

  // Aktualisiert die Anzeige und plant den nächsten Takt genau zum Beginn der nächsten Sekunde
  function takt() {
    clearTimeout(timer);
    const jetzt = new Date();
    zeit.textContent = zeitFormat.format(jetzt);
    zeit.setAttribute('datetime', jetzt.toISOString());
    tag.textContent = datumFormat.format(jetzt);
    timer = setTimeout(takt, 1000 - (Date.now() % 1000) + 10);
  }
  takt();

  return {
    element: h('section', { class: 'karte uhr', 'aria-label': 'Uhrzeit und Datum in Deutschland' }, zeit, tag),
    takt,
    stoppen: () => clearTimeout(timer),
  };
}

function kachel(bereich, kontext) {
  const info = h('div', { class: 'kachel-info' },
    h('p', { class: 'kachel-beschriftung' }, 'Wird geladen …'),
  );

  const element = h('a', { class: 'karte kachel', href: `#/${bereich.id}` },
    h('div', { class: 'kachel-kopf' },
      h('span', { class: 'kachel-symbol' }, symbol(bereich.symbol)),
      h('h2', { class: 'kachel-titel' }, bereich.titel),
      h('span', { class: 'kachel-pfeil' }, symbol('weiter')),
    ),
    info,
  );

  async function laden() {
    try {
      const k = await bereich.kurzinfo();
      if (!kontext.aktiv()) return;
      const teile = k.text
        ? [h('p', { class: 'kachel-beschriftung' }, k.text)]
        : [
            h('p', { class: 'kachel-beschriftung' }, k.beschriftung),
            h('p', { class: k.negativ ? 'kachel-wert negativ' : 'kachel-wert' }, k.wert),
            k.zusatz ? h('p', { class: 'kachel-zusatz' }, k.zusatz) : null,
          ];
      info.replaceChildren(...teile.filter(Boolean));
    } catch (fehler) {
      console.error(fehler);
      if (!kontext.aktiv()) return;
      info.replaceChildren(h('p', { class: 'kachel-beschriftung fehlertext' }, 'Konnte nicht geladen werden.'));
    }
  }

  return { element, laden };
}

export function startSeite(container, kontext) {
  const anzeige = uhr();
  const kacheln = bereiche.map((bereich) => kachel(bereich, kontext));

  const abmelden = h('button', { class: 'knopf', type: 'button' }, 'Abmelden');
  abmelden.addEventListener('click', async () => {
    abmelden.disabled = true;
    // Nur dieses Gerät abmelden, andere Geräte bleiben angemeldet
    await db.auth.signOut({ scope: 'local' });
  });

  container.append(
    h('h1', { class: 'unsichtbar' }, 'Startseite'),
    anzeige.element,
    h('div', { class: 'kacheln' }, kacheln.map((k) => k.element)),
    h('footer', { class: 'fuss' },
      h('span', {}, `Angemeldet als ${kontext.sitzung.user.email}`),
      abmelden,
    ),
  );

  kacheln.forEach((k) => k.laden());

  // Kommt die App wieder in den Vordergrund: Uhr sofort stellen und Kurzinfos neu laden
  // (zum Beispiel nach Änderungen auf einem anderen Gerät)
  function wiederSichtbar() {
    if (document.visibilityState !== 'visible') return;
    anzeige.takt();
    kacheln.forEach((k) => k.laden());
  }
  document.addEventListener('visibilitychange', wiederSichtbar);

  return () => {
    anzeige.stoppen();
    document.removeEventListener('visibilitychange', wiederSichtbar);
  };
}
