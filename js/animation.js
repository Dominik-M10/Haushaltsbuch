// Bewegung in der App: Seiten und Reiter blenden weich ein, Karten erscheinen beim Scrollen,
// Fortschrittsbalken und das Diagramm wachsen von links.
//
// Das meiste erledigt css/style.css. Dieses Modul setzt nur Klassen:
//   .wechsel      am Container, kurz nach jedem Seitenwechsel (Einblenden mit gestaffelten Verzögerungen)
//   data-richtung am Container, beim Wechsel zwischen den Reitern im Meilenstand ("vor" oder "zurueck")
//   .einblenden   an Karten unterhalb des sichtbaren Bereichs, bis sie beim Scrollen ins Bild kommen
//   .wachsen      an Balken und Diagramm, bis sie im Bild sind
//
// Mit der Geräteeinstellung "Bewegung reduzieren" setzt dieses Modul gar nichts, die App erscheint sofort.
// Ohne IntersectionObserver bleibt alles einfach sichtbar.

const WECHSEL_DAUER_MS = 1500;
const EINBLENDEN = '.karte, .kachel';
const WACHSEN = '.fortschritt-balken, .segmente';

const bewegungReduziert = matchMedia('(prefers-reduced-motion: reduce)'); // aktualisiert sich selbst
const reduziert = () => bewegungReduziert.matches;

let letzterReiter = null; // Nummer des zuletzt gezeigten Reiters im Meilenstand, sonst null
let zeitgeber = null;
let ersterAufbauVorbei = false; // beim allerersten Aufbau gibt es nichts, was weggehen könnte
let laufenderUebergang = null;
let beobachter = null; // wartet darauf, dass Karten und Balken ins Bild kommen

/** 0 = Stände, 1 = Umrechner, 2 = Programme, null = keine Reiterseite. route: { name, pfad } aus js/app.js */
function reiterNummer({ name, pfad }) {
  if (name !== 'meilenstand' || pfad[0] === 'p') return null;
  return pfad[0] === 'umrechner' ? 1 : pfad[0] === 'programme' ? 2 : 0;
}

/**
 * Baut die neue Seite auf und bewegt dabei den Wechsel (js/app.js ruft das statt des Aufbaus direkt auf).
 * `aufbauen` ersetzt den Inhalt des Containers und muss dabei ohne Warten durchlaufen.
 *
 * Mit View Transitions geht der alte Inhalt sichtbar weg, während der neue kommt: beim Reiterwechsel
 * zur Seite, sonst mit einem ruhigen Übergang. Ohne diese Unterstützung bleibt es beim Einblenden.
 */
export function seitenwechsel(container, route, aufbauen) {
  const zuruecksetzen = () => {
    container.classList.remove('wechsel');
    delete container.dataset.richtung;
  };
  clearTimeout(zeitgeber);
  zuruecksetzen();
  // Die Elemente der alten Seite sind weg. Ohne das bliebe jede ungesehene Karte im Beobachter liegen.
  beobachter?.disconnect();

  const reiter = reiterNummer(route);
  const vorher = letzterReiter;
  letzterReiter = reiter;

  // Zwischen zwei Reitern: der neue Inhalt kommt aus der Richtung des neuen Reiters, der alte geht dorthin zurück
  const richtung = reiter != null && vorher != null && reiter !== vorher
    ? (reiter > vorher ? 'vor' : 'zurueck')
    : null;

  if (reduziert()) {
    aufbauen();
    return;
  }

  // Ohne View Transitions bleibt es beim bisherigen Einblenden: der alte Inhalt verschwindet ohne Bewegung
  if (!document.startViewTransition || !ersterAufbauVorbei) {
    ersterAufbauVorbei = true;
    if (richtung) container.dataset.richtung = richtung;
    container.classList.add('wechsel');
    zeitgeber = setTimeout(zuruecksetzen, WECHSEL_DAUER_MS);
    aufbauen();
    return;
  }

  // Läuft noch ein Übergang, wird er jetzt beendet. Sonst könnte sein Aufbau erst nach dem neuen
  // an die Reihe kommen und die gerade geladenen Daten der neuen Seite als veraltet verwerfen.
  laufenderUebergang?.skipTransition();

  // Die Richtung steht am <html>, weil die Bilder des Übergangs dort hängen, nicht am Container
  document.documentElement.dataset.wechsel = richtung ?? 'seite';
  const uebergang = document.startViewTransition(() => {
    aufbauen();
    // Steht der Inhalt schon da, zeigt ihn der Übergang selbst. Blendeten die Karten zusätzlich
    // einzeln ein, liefe die Bewegung nach dem Übergang noch weiter und wirkte wie ein Nachzittern.
    // Nur wenn die Seite noch lädt, blenden die später eintreffenden Karten ein.
    if (container.querySelector('.laden')) {
      // Keine Richtung am Container: die zeigt der Übergang schon
      container.classList.add('wechsel');
      zeitgeber = setTimeout(zuruecksetzen, WECHSEL_DAUER_MS);
    }
  });
  // Löst ein schneller zweiter Wechsel den ersten ab, lehnt der Browser dessen Zusagen ab.
  // Das ist normal, muss aber abgefangen werden, sonst landet eine Meldung in der Konsole.
  uebergang.ready.catch(() => {});
  uebergang.updateCallbackDone.catch(() => {});
  uebergang.finished.catch(() => {}).finally(() => {
    // Nur aufräumen, wenn inzwischen kein neuer Wechsel läuft
    if (uebergang === laufenderUebergang) delete document.documentElement.dataset.wechsel;
  });
  laufenderUebergang = uebergang;
}

/** Einmal beim Start aufrufen: beobachtet, was in den Container kommt */
export function animationenEinrichten(container) {
  if (!('IntersectionObserver' in window) || !('MutationObserver' in window)) return;

  // Balken und Diagramm sind zu Beginn abgeschnitten (clip-path). Der Browser meldet ein abgeschnittenes Element
  // nie als sichtbar, deshalb wird bei ihnen der Behälter darum beobachtet und darin alles Wachsende freigegeben.
  beobachter = new IntersectionObserver((eintraege) => {
    for (const eintrag of eintraege) {
      if (!eintrag.isIntersecting) continue;
      beobachter.unobserve(eintrag.target);
      // Freizugeben ist das Element selbst (wartende Karte) und alles Wachsende darin (Balken, Diagramm)
      const ziele = [...eintrag.target.querySelectorAll('.wachsen')];
      if (eintrag.target.matches('.einblenden')) ziele.push(eintrag.target);
      for (const el of ziele) {
        el.classList.add('sichtbar');
        // Nach der Bewegung (längste: 0,8 s) gelten wieder die normalen Stile (Hover, Antippen, Tooltips am Diagramm)
        setTimeout(() => el.classList.remove('einblenden', 'wachsen', 'sichtbar'), 900);
      }
    }
  }, { rootMargin: '0px 0px -6% 0px', threshold: 0.08 });

  const vorbereiten = (el) => {
    if (reduziert() || el.classList.contains('einblenden') || el.classList.contains('wachsen')) return;
    if (el.matches(WACHSEN)) {
      el.classList.add('wachsen');
      beobachter.observe(el.parentElement ?? el);
    } else if (el.matches(EINBLENDEN) && el.getBoundingClientRect().top > innerHeight) {
      // Nur was noch unter dem Bildschirmrand liegt, erscheint erst beim Scrollen
      el.classList.add('einblenden');
      beobachter.observe(el);
    }
  };

  new MutationObserver((aenderungen) => {
    for (const aenderung of aenderungen) {
      for (const knoten of aenderung.addedNodes) {
        if (knoten.nodeType !== 1) continue;
        vorbereiten(knoten);
        knoten.querySelectorAll?.(`${EINBLENDEN}, ${WACHSEN}`).forEach(vorbereiten);
      }
    }
  }).observe(container, { childList: true, subtree: true });
}
