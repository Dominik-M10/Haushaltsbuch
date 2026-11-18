// Startseite. Vorläufige Fassung für den Schritt Login: zeigt den angemeldeten Benutzer und Abmelden.
// Uhrzeit und Kacheln kommen im nächsten Schritt dazu.
import { db } from '../supabase.js';
import { h } from '../ui.js';

export function startSeite(container, { sitzung }) {
  const abmelden = h('button', { class: 'knopf', type: 'button' }, 'Abmelden');
  abmelden.addEventListener('click', async () => {
    abmelden.disabled = true;
    // Nur dieses Gerät abmelden, andere Geräte bleiben angemeldet
    await db.auth.signOut({ scope: 'local' });
  });

  container.append(
    h('header', { class: 'kopf' },
      h('h1', {}, 'Startseite'),
      abmelden,
    ),
    h('p', { class: 'leise' }, `Angemeldet als ${sitzung.user.email}`),
  );
}
