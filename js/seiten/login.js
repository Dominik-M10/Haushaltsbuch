// Login mit Mailadresse und Passwort. Eine Registrierung gibt es in der App bewusst nicht.
import { db } from '../supabase.js';
import { h } from '../ui.js';

function fehlertext(fehler) {
  const code = fehler?.code ?? '';
  const text = fehler?.message ?? '';

  if (code === 'invalid_credentials' || /invalid login credentials/i.test(text)) {
    return 'Mailadresse oder Passwort ist falsch.';
  }
  if (code === 'email_not_confirmed') {
    return 'Die Mailadresse ist noch nicht bestätigt.';
  }
  if (code === 'email_address_invalid' || code === 'validation_failed') {
    return 'Bitte eine gültige Mailadresse eingeben.';
  }
  if (code === 'user_banned') {
    return 'Dieses Konto ist gesperrt.';
  }
  if (code === 'over_request_rate_limit' || fehler?.status === 429) {
    return 'Zu viele Versuche. Bitte kurz warten und es dann erneut versuchen.';
  }
  if (fehler?.name === 'AuthRetryableFetchError' || fehler?.status === 0 || !navigator.onLine) {
    return 'Keine Verbindung zum Server. Bitte die Internetverbindung prüfen.';
  }
  return 'Die Anmeldung hat nicht geklappt. Bitte erneut versuchen.';
}

export function loginSeite(container) {
  const meldung = h('p', { class: 'fehlermeldung', role: 'alert', hidden: true });

  const mail = h('input', {
    class: 'eingabe',
    id: 'login-mail',
    type: 'email',
    name: 'email',
    autocomplete: 'username',
    inputmode: 'email',
    autocapitalize: 'none',
    autocorrect: 'off',
    spellcheck: 'false',
    required: true,
  });

  const passwort = h('input', {
    class: 'eingabe',
    id: 'login-passwort',
    type: 'password',
    name: 'password',
    autocomplete: 'current-password',
    required: true,
  });

  const knopf = h('button', { class: 'knopf primaer breit', type: 'submit' }, 'Anmelden');

  function zeigeFehler(text) {
    meldung.textContent = text;
    meldung.hidden = false;
  }

  const formular = h('form', { class: 'formular', novalidate: true },
    h('label', { class: 'feld', for: 'login-mail' },
      h('span', { class: 'feld-name' }, 'Mailadresse'),
      mail,
    ),
    h('label', { class: 'feld', for: 'login-passwort' },
      h('span', { class: 'feld-name' }, 'Passwort'),
      passwort,
    ),
    meldung,
    knopf,
  );

  formular.addEventListener('submit', async (ereignis) => {
    ereignis.preventDefault();
    meldung.hidden = true;

    const email = mail.value.trim();
    const kennwort = passwort.value;
    if (!email || !kennwort) {
      zeigeFehler('Bitte Mailadresse und Passwort eingeben.');
      return;
    }

    knopf.disabled = true;
    knopf.textContent = 'Anmelden …';
    let fehler = null;
    try {
      ({ error: fehler } = await db.auth.signInWithPassword({ email, password: kennwort }));
    } catch (unerwartet) {
      fehler = unerwartet;
    }

    // Bei Erfolg baut app.js die Startseite auf. Nur im Fehlerfall geht es hier weiter.
    if (fehler) {
      console.error(fehler);
      zeigeFehler(fehlertext(fehler));
      knopf.disabled = false;
      knopf.textContent = 'Anmelden';
      passwort.select();
    }
  });

  container.append(
    h('section', { class: 'login' },
      h('div', { class: 'karte login-karte' },
        h('div', { class: 'login-kopf' },
          h('img', { class: 'login-logo', src: 'icons/icon.svg', alt: '' }),
          h('h1', {}, 'Haushaltsbuch'),
        ),
        formular,
      ),
    ),
  );
}
