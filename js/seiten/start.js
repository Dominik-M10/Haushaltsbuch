// Startseite: oben Uhrzeit und Datum in deutscher Zeit, darunter eine Kachel pro Bereich.
import { db } from '../supabase.js';
import { h, symbol } from '../ui.js';
import { ZEITZONE } from '../format.js';
import { bereiche } from '../bereiche.js';
import { sperreAktiv, sperreMoeglich, sperreEinschalten, sperreAusschalten } from '../sperre.js';

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

// Fliegt auf der gestrichelten Route unter dem Datum. Rein dekorativ, bewegt sich allein über CSS.
function flugzeug() {
  const flieger = symbol('flugzeug');
  flieger.classList.add('uhr-flieger');
  return h('span', { class: 'uhr-bahn', 'aria-hidden': 'true' }, h('span', { class: 'uhr-flug' }, flieger));
}

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
    element: h('section', { class: 'karte uhr', 'aria-label': 'Uhrzeit und Datum in Deutschland' },
      zeit, tag, flugzeug()),
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

  const benutzer = kontext.sitzung.user;
  const meldung = h('p', { class: 'fuss-meldung', role: 'status' });

  const abmelden = h('button', { class: 'knopf', type: 'button' }, 'Abmelden');
  abmelden.addEventListener('click', async () => {
    abmelden.disabled = true;
    // Nur dieses Gerät abmelden, andere Geräte bleiben angemeldet
    const { error } = await db.auth.signOut({ scope: 'local' });
    if (error) {
      console.warn(error);
      abmelden.disabled = false;
      meldung.textContent = 'Abmelden geht nur mit Verbindung zum Server.';
    }
  });

  // App Sperre mit Face ID oder Touch ID, nur auf Geräten, die das anbieten (siehe sperre.js)
  const sperreKnopf = h('button', { class: 'knopf', type: 'button', hidden: true });
  const sperreBeschriften = () => {
    sperreKnopf.textContent = sperreAktiv(benutzer.id) ? 'App Sperre ausschalten' : 'App Sperre einschalten';
  };
  sperreMoeglich().then((moeglich) => {
    if (!moeglich || !kontext.aktiv()) return;
    sperreBeschriften();
    sperreKnopf.hidden = false;
  });
  sperreKnopf.addEventListener('click', async () => {
    if (sperreAktiv(benutzer.id)) {
      sperreAusschalten();
      sperreBeschriften();
      meldung.textContent = 'App Sperre ist aus.';
      return;
    }
    sperreKnopf.disabled = true;
    try {
      await sperreEinschalten(benutzer);
      meldung.textContent = 'App Sperre ist an. Beim Öffnen und nach einer Minute im Hintergrund fragt die App '
        + 'nach Face ID, Touch ID oder dem Gerätecode.';
    } catch (fehler) {
      console.warn(fehler);
      meldung.textContent = 'App Sperre ist nicht eingeschaltet: Face ID oder Touch ID wurde abgebrochen oder hat nicht geklappt. '
        + `(Technischer Grund: ${fehler?.name ?? 'unbekannt'}${fehler?.message ? `, ${fehler.message}` : ''})`;
    } finally {
      sperreKnopf.disabled = false;
      sperreBeschriften();
    }
  });

  container.append(
    h('h1', { class: 'unsichtbar' }, 'Startseite'),
    anzeige.element,
    h('div', { class: 'kacheln' }, kacheln.map((k) => k.element)),
    h('footer', { class: 'fuss' },
      h('span', {}, `Angemeldet als ${benutzer.email}`),
      h('div', { class: 'fuss-knoepfe' }, sperreKnopf, abmelden),
      meldung,
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
