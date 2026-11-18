// Haushaltsbuch. Platzhalter, der Inhalt folgt im Schritt Haushaltsbuch.
import { h, seitenKopf } from '../ui.js';

export function haushaltsbuchSeite(container) {
  container.append(
    seitenKopf('Haushaltsbuch'),
    h('p', { class: 'leise' }, 'Diese Seite wird im Schritt Haushaltsbuch gebaut.'),
  );
}
