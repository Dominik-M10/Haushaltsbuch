// Segmentierter Balken: ein Ganzes, aufgeteilt in wenige Teile (Anteile auf einen Blick).
// Jeder Teil ist ein eigener Block mit seinem Anteil darin, darunter eine Legende mit den Namen.
// Passt der Anteil nicht in einen schmalen Block, steht er stattdessen in der Legende.
// Antippen, Überfahren mit der Maus oder Tastaturfokus zeigt Name, Betrag und Anteil.
import { h } from './ui.js';
import { prozent } from './format.js';

/**
 * teile: [{ name, wert, serie }]  serie = 1 bis 4 (Farbe), wert in beliebiger Einheit, Teile mit 0 entfallen
 * gesamt: Bezugsgröße für die Anteile
 * format(wert): Text für den Betrag im Hinweis
 * titel: Beschreibung für Screenreader
 */
export function segmentBalken({ teile, gesamt, format, titel }) {
  const sichtbar = teile.filter((t) => t.wert > 0);
  const tooltip = h('div', { class: 'diagramm-tooltip', role: 'tooltip', hidden: true });
  const balken = h('div', { class: 'segmente', role: 'group', 'aria-label': titel });
  const legende = h('ul', { class: 'legende' });
  const eintraege = [];

  function tooltipZeigen(eintrag) {
    const { teil, anteil, block } = eintrag;
    tooltip.replaceChildren(
      h('strong', {}, `${format(teil.wert)} · ${prozent(anteil)}`),
      h('span', {}, teil.name),
    );
    tooltip.hidden = false;
    // mittig über dem Block, aber innerhalb der Diagrammbreite
    const breite = balken.clientWidth;
    const mitte = block.offsetLeft + block.offsetWidth / 2;
    const tipBreite = tooltip.offsetWidth;
    const links = Math.min(Math.max(mitte - tipBreite / 2, 0), Math.max(breite - tipBreite, 0));
    tooltip.style.left = `${links}px`;
    eintraege.forEach((e) => e.block.classList.toggle('aktiv', e === eintrag));
  }

  function tooltipVerstecken() {
    tooltip.hidden = true;
    eintraege.forEach((e) => e.block.classList.remove('aktiv'));
  }

  for (const teil of sichtbar) {
    const anteil = teil.wert / gesamt;
    const text = h('span', { class: 'segment-text' }, prozent(anteil));
    const block = h('div', {
      class: `segment serie-${teil.serie}`,
      tabindex: 0,
      role: 'img',
      'aria-label': `${teil.name}: ${format(teil.wert)}, ${prozent(anteil)}`,
      style: `flex-grow: ${teil.wert}`,
    }, text);
    const legendenAnteil = h('span', { class: 'legende-anteil', hidden: true }, prozent(anteil));
    const eintrag = { teil, anteil, block, text, legendenAnteil };
    eintraege.push(eintrag);

    block.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') tooltipZeigen(eintrag); });
    block.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') tooltipVerstecken(); });
    // Antippen setzt zuerst den Fokus und löst dann den Klick aus. Beides zeigt nur an,
    // sonst würde der Klick den gerade geöffneten Hinweis gleich wieder schließen.
    // Geschlossen wird, sobald woanders hingetippt wird (Fokus geht verloren).
    block.addEventListener('focus', () => tooltipZeigen(eintrag));
    block.addEventListener('click', () => tooltipZeigen(eintrag));
    block.addEventListener('blur', tooltipVerstecken);

    balken.append(block);
    legende.append(h('li', {},
      h('span', { class: `legende-farbe serie-${teil.serie}`, 'aria-hidden': 'true' }),
      h('span', {}, teil.name),
      legendenAnteil,
    ));
  }

  // Anteil nur im Block zeigen, wenn er mit etwas Luft hineinpasst, sonst in der Legende
  function einpassen() {
    for (const e of eintraege) {
      e.text.hidden = false;
      // die Beschriftung hat links und rechts je 8 px Abstand eingebaut
      const passt = e.text.offsetWidth <= e.block.clientWidth;
      e.text.hidden = !passt;
      e.legendenAnteil.hidden = passt;
    }
  }

  const huelle = h('div', { class: 'diagramm' }, tooltip, balken, legende);
  if ('ResizeObserver' in window) new ResizeObserver(einpassen).observe(balken);
  else requestAnimationFrame(einpassen);
  return huelle;
}
