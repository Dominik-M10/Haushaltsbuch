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

/** 0 = Stände, 1 = Umrechner, 2 = Programme, null = keine Reiterseite. route: { name, pfad } aus js/app.js */
function reiterNummer({ name, pfad }) {
  if (name !== 'meilenstand' || pfad[0] === 'p') return null;
  return pfad[0] === 'umrechner' ? 1 : pfad[0] === 'programme' ? 2 : 0;
}

/** Nach jedem Aufbau einer Seite aufrufen (js/app.js), mit der Route der neuen Seite */
export function seitenwechsel(container, route) {
  const zuruecksetzen = () => {
    container.classList.remove('wechsel');
    delete container.dataset.richtung;
  };
  clearTimeout(zeitgeber);
  zuruecksetzen();

  const reiter = reiterNummer(route);
  const vorher = letzterReiter;
  letzterReiter = reiter;
  if (reduziert()) return;

  // Zwischen zwei Reitern schiebt der Inhalt von der Seite herein, in Richtung des neuen Reiters
  if (reiter != null && vorher != null && reiter !== vorher) {
    container.dataset.richtung = reiter > vorher ? 'vor' : 'zurueck';
  }
  container.classList.add('wechsel');
  zeitgeber = setTimeout(zuruecksetzen, WECHSEL_DAUER_MS);
}

/** Einmal beim Start aufrufen: beobachtet, was in den Container kommt */
export function animationenEinrichten(container) {
  if (!('IntersectionObserver' in window) || !('MutationObserver' in window)) return;

  // Balken und Diagramm sind zu Beginn abgeschnitten (clip-path). Der Browser meldet ein abgeschnittenes Element
  // nie als sichtbar, deshalb wird bei ihnen der Behälter darum beobachtet.
  const behaelterVon = new WeakMap(); // schwach, damit abgeräumte Seiten nicht hängen bleiben

  const beobachter = new IntersectionObserver((eintraege) => {
    for (const eintrag of eintraege) {
      if (!eintrag.isIntersecting) continue;
      beobachter.unobserve(eintrag.target);
      const el = behaelterVon.get(eintrag.target) ?? eintrag.target;
      behaelterVon.delete(eintrag.target);
      el.classList.add('sichtbar');
      // Nach der Bewegung (längste: 0,8 s) gelten wieder die normalen Stile (Hover, Antippen, Tooltips am Diagramm)
      setTimeout(() => el.classList.remove('einblenden', 'wachsen', 'sichtbar'), 900);
    }
  }, { rootMargin: '0px 0px -6% 0px', threshold: 0.08 });

  const vorbereiten = (el) => {
    if (reduziert() || el.classList.contains('einblenden') || el.classList.contains('wachsen')) return;
    if (el.matches(WACHSEN)) {
      el.classList.add('wachsen');
      const behaelter = el.parentElement ?? el;
      behaelterVon.set(behaelter, el);
      beobachter.observe(behaelter);
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
