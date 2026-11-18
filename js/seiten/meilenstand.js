// Meilenstand. Platzhalter, der Inhalt folgt im Schritt Meilenstand.
import { h, seitenKopf } from '../ui.js';

export function meilenstandSeite(container) {
  container.append(
    seitenKopf('Meilenstand'),
    h('p', { class: 'leise' }, 'Diese Seite wird im Schritt Meilenstand gebaut.'),
  );
}
