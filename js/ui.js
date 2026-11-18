// Kleine Helfer zum Aufbau der Oberfläche.
// Inhalte werden immer als Text eingefügt, nie als HTML. So kann kein eingegebener Text Code ausführen.

/**
 * Erzeugt ein Element.
 * h('button', { class: 'knopf', onclick: fn }, 'Text')
 */
export function h(tag, eigenschaften = {}, ...kinder) {
  const el = document.createElement(tag);
  for (const [name, wert] of Object.entries(eigenschaften ?? {})) {
    if (wert == null || wert === false) continue;
    if (name === 'class') el.className = wert;
    else if (name === 'dataset') Object.assign(el.dataset, wert);
    else if (name.startsWith('on') && typeof wert === 'function') el.addEventListener(name.slice(2), wert);
    else if (wert === true) el.setAttribute(name, '');
    else el.setAttribute(name, String(wert));
  }
  for (const kind of kinder.flat()) {
    if (kind == null || kind === false) continue;
    el.append(kind instanceof Node ? kind : String(kind));
  }
  return el;
}

// Feste Symbole der App (eigene Zeichnungen, keine Benutzereingaben)
const SYMBOLE = {
  zurueck: '<path d="M15 18l-6-6 6-6"/>',
  weiter: '<path d="M9 18l6-6-6-6"/>',
  geldboerse:
    '<rect x="3" y="6" width="18" height="14" rx="3"/><path d="M3 10h18"/><circle cx="16.5" cy="15" r="1.3"/>',
  flugzeug:
    '<path d="M12 2.5c.9 0 1.6.7 1.6 1.6V9.5l7.4 4.3v2.1l-7.4-2.2v4.5l2.2 1.6v1.8L12 20.6l-3.8 1V19.8l2.2-1.6v-4.5L3 15.9v-2.1l7.4-4.3V4.1c0-.9.7-1.6 1.6-1.6z"/>',
};

export function symbol(name) {
  const huelle = document.createElement('span');
  huelle.className = 'symbol';
  huelle.setAttribute('aria-hidden', 'true');
  huelle.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
    `stroke-linecap="round" stroke-linejoin="round">${SYMBOLE[name] ?? ''}</svg>`;
  return huelle;
}

/**
 * Kopf für Unterseiten: Button zurück zur Startseite, darunter der Titel.
 * weitereLinks: optionale zusätzliche Rücksprünge, zum Beispiel [{ href: '#/meilenstand', text: 'Meilenstand' }]
 */
export function seitenKopf(titel, { weitereLinks = [], untertitel = null } = {}) {
  return h('header', { class: 'kopf-unterseite' },
    h('nav', { class: 'kopf-links', 'aria-label': 'Zurück' },
      h('a', { class: 'knopf zurueck', href: '#/' }, symbol('zurueck'), 'Startseite'),
      weitereLinks.map((l) => h('a', { class: 'knopf zurueck', href: l.href }, symbol('zurueck'), l.text)),
    ),
    h('div', { class: 'kopf-titelzeile' },
      h('h1', {}, titel),
      untertitel ? h('p', { class: 'leise' }, untertitel) : null,
    ),
  );
}

/** Fortschrittsbalken für Ziele. anteil 0.3 entspricht 30 %, über 100 % bleibt der Balken voll. */
export function fortschrittsbalken(anteil, name) {
  const prozentWert = Math.round(Math.min(Math.max(anteil, 0), 1) * 100);
  return h('span', {
    class: anteil >= 1 ? 'fortschritt erreicht' : 'fortschritt',
    role: 'progressbar',
    'aria-label': `Fortschritt ${name}`,
    'aria-valuemin': 0,
    'aria-valuemax': 100,
    'aria-valuenow': prozentWert,
  }, h('span', { class: 'fortschritt-balken', style: `width: ${prozentWert}%` }));
}
