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
