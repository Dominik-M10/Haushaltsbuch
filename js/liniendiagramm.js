// Liniendiagramm für den Verlauf eines Programms (eine Linie, Zeit auf der x Achse).
// Antippen, Überfahren mit der Maus oder die Pfeiltasten zeigen Datum und Stand des nächsten Punkts.
// Die Liste unter dem Diagramm enthält dieselben Werte, das Diagramm ist nur eine Ergänzung.
import { h } from './ui.js';
import { datum, zahl } from './format.js';

const SVG = 'http://www.w3.org/2000/svg';

function s(tag, eigenschaften = {}, text) {
  const el = document.createElementNS(SVG, tag);
  for (const [name, wert] of Object.entries(eigenschaften)) {
    if (wert != null) el.setAttribute(name, String(wert));
  }
  if (text != null) el.textContent = text;
  return el;
}

/** Runde Achsenwerte: Schritte von 1, 2, 2,5 oder 5 mal einer Zehnerpotenz, nie unter 0 */
function achse(min, max, anzahl = 4) {
  if (min === max) {
    const rand = Math.max(1, Math.abs(min) * 0.1);
    min -= rand;
    max += rand;
  }
  const roh = (max - min) / (anzahl - 1);
  const basis = 10 ** Math.floor(Math.log10(roh));
  const faktoren = basis >= 10 ? [1, 2, 2.5, 5, 10] : [1, 2, 5, 10];
  const schritt = Math.max(1, faktoren.map((f) => f * basis).find((x) => x >= roh));
  const start = Math.max(0, Math.floor(min / schritt) * schritt);
  const ende = Math.ceil(max / schritt) * schritt;
  const werte = [];
  for (let v = start; v <= ende + schritt / 2; v += schritt) werte.push(v);
  return { start, ende, werte };
}

const tageszahl = (iso) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));

/**
 * punkte: [{ datum: '2026-11-01', wert: 12345 }] in zeitlicher Reihenfolge (mindestens zwei)
 * einheit: 'Meilen' oder 'Punkte', titel: Name für Screenreader
 */
export function linienDiagramm({ punkte, einheit, titel }) {
  const huelle = h('div', { class: 'liniendiagramm' });
  const tooltip = h('div', { class: 'diagramm-tooltip', role: 'status', 'aria-live': 'polite', hidden: true });
  let auswahl = null;
  let lage = null; // Koordinaten der letzten Zeichnung

  const svg = s('svg', {
    role: 'img',
    tabindex: 0,
    'aria-label': `${titel}: ${punkte.length} Einträge vom ${datum(punkte[0].datum)} bis ${datum(punkte.at(-1).datum)}, `
      + `aktuell ${zahl(punkte.at(-1).wert)} ${einheit}. Mit den Pfeiltasten durch die Einträge gehen.`,
  });
  huelle.append(svg, tooltip);

  function zeichnen() {
    // Höhe kommt fest aus dem CSS, damit das Zeichnen die Größe nicht verändert
    const breite = Math.round(huelle.clientWidth);
    const hoehe = Math.round(huelle.clientHeight) || 220;
    if (!breite || (lage && lage.breite === breite && lage.hoehe === hoehe)) return;
    const y = achse(Math.min(...punkte.map((p) => p.wert)), Math.max(...punkte.map((p) => p.wert)));
    const links = Math.max(...y.werte.map((w) => zahl(w).length)) * 8 + 12;
    const rechts = 10;
    const oben = 26;
    const unten = 28;
    const x0 = links;
    const x1 = breite - rechts;
    const y0 = oben;
    const y1 = hoehe - unten;

    const t0 = tageszahl(punkte[0].datum);
    const t1 = tageszahl(punkte.at(-1).datum);
    const xVon = (iso) => (t1 === t0 ? (x0 + x1) / 2 : x0 + ((tageszahl(iso) - t0) / (t1 - t0)) * (x1 - x0));
    const yVon = (wert) => y1 - ((wert - y.start) / (y.ende - y.start)) * (y1 - y0);
    const xs = punkte.map((p) => xVon(p.datum));
    const ys = punkte.map((p) => yVon(p.wert));

    svg.setAttribute('viewBox', `0 0 ${breite} ${hoehe}`);
    svg.setAttribute('width', breite);
    svg.setAttribute('height', hoehe);
    svg.replaceChildren();

    // Hilfslinien und Werte an der y Achse
    for (const wert of y.werte) {
      const yy = Math.round(yVon(wert)) + 0.5;
      svg.append(
        s('line', { class: 'ld-raster', x1: x0, x2: x1, y1: yy, y2: yy }),
        s('text', { class: 'ld-achse', x: x0 - 8, y: yy + 4, 'text-anchor': 'end' }, zahl(wert)),
      );
    }

    // Datum am Anfang und am Ende
    svg.append(s('text', { class: 'ld-achse', x: x0, y: hoehe - 8, 'text-anchor': 'start' }, datum(punkte[0].datum)));
    if (t1 !== t0) {
      svg.append(s('text', { class: 'ld-achse', x: x1, y: hoehe - 8, 'text-anchor': 'end' }, datum(punkte.at(-1).datum)));
    }

    // Linie, Punkte und Wert am Ende
    const pfad = xs.map((x, i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ');
    svg.append(s('path', { class: 'ld-linie', d: pfad }));
    const allePunkte = punkte.length <= 40;
    xs.forEach((x, i) => {
      if (allePunkte || i === xs.length - 1) svg.append(s('circle', { class: 'ld-punkt', cx: x, cy: ys[i], r: 4 }));
    });
    // Wert am Ende: über dem Punkt, außer die Linie kommt von oben (dann darunter, damit er nicht auf der Linie liegt)
    const yEnde = ys.at(-1);
    const vonOben = ys.length > 1 && ys.at(-2) < yEnde - 1;
    let yText = vonOben ? yEnde + 20 : yEnde - 12;
    if (yText > y1 - 4) yText = yEnde - 12;
    if (yText < 12) yText = yEnde + 20;
    svg.append(s('text', {
      class: 'ld-endwert', x: Math.min(xs.at(-1) + 4, x1), y: yText, 'text-anchor': 'end',
    }, zahl(punkte.at(-1).wert)));

    // Fadenkreuz für die Auswahl
    const kreuz = s('line', { class: 'ld-kreuz', y1: y0, y2: y1, visibility: 'hidden' });
    const ring = s('circle', { class: 'ld-auswahl', r: 6, visibility: 'hidden' });
    svg.append(kreuz, ring);

    lage = { breite, hoehe, xs, ys, kreuz, ring };
    if (auswahl != null) zeigen(auswahl);
  }

  function zeigen(index) {
    if (!lage) return;
    auswahl = Math.max(0, Math.min(punkte.length - 1, index));
    const { xs, ys, kreuz, ring, breite } = lage;
    const x = xs[auswahl];
    kreuz.setAttribute('x1', x);
    kreuz.setAttribute('x2', x);
    kreuz.setAttribute('visibility', 'visible');
    ring.setAttribute('cx', x);
    ring.setAttribute('cy', ys[auswahl]);
    ring.setAttribute('visibility', 'visible');

    const p = punkte[auswahl];
    tooltip.replaceChildren(h('strong', {}, `${zahl(p.wert)} ${einheit}`), h('span', {}, datum(p.datum)));
    tooltip.hidden = false;
    const tipBreite = tooltip.offsetWidth;
    tooltip.style.left = `${Math.min(Math.max(x - tipBreite / 2, 0), Math.max(breite - tipBreite, 0))}px`;
  }

  function verstecken() {
    auswahl = null;
    tooltip.hidden = true;
    lage?.kreuz.setAttribute('visibility', 'hidden');
    lage?.ring.setAttribute('visibility', 'hidden');
  }

  function naechster(ereignis) {
    if (!lage) return;
    const rahmen = svg.getBoundingClientRect();
    const x = ((ereignis.clientX - rahmen.left) / rahmen.width) * lage.breite;
    let beste = 0;
    lage.xs.forEach((xx, i) => { if (Math.abs(xx - x) < Math.abs(lage.xs[beste] - x)) beste = i; });
    zeigen(beste);
  }

  svg.addEventListener('pointermove', naechster);
  svg.addEventListener('pointerdown', naechster);
  svg.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') verstecken(); });
  svg.addEventListener('focus', () => { if (auswahl == null) zeigen(punkte.length - 1); });
  svg.addEventListener('blur', verstecken);
  svg.addEventListener('keydown', (e) => {
    const sprung = { ArrowLeft: -1, ArrowRight: 1, Home: -Infinity, End: Infinity }[e.key];
    if (sprung === undefined) return;
    e.preventDefault();
    const start = auswahl ?? punkte.length - 1;
    zeigen(Number.isFinite(sprung) ? start + sprung : sprung < 0 ? 0 : punkte.length - 1);
  });

  if ('ResizeObserver' in window) new ResizeObserver(zeichnen).observe(huelle);
  else requestAnimationFrame(zeichnen);
  return huelle;
}
