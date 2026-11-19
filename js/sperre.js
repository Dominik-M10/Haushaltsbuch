// App Sperre: Die App lässt sich mit Face ID, Touch ID oder dem Gerätecode entsperren.
//
// Technisch ist das ein Passkey (WebAuthn) nur für dieses Gerät. Beim Einschalten legt das Gerät ihn an,
// beim Entsperren fragt es nach Face ID, Touch ID oder dem Gerätecode. Die Prüfung läuft nur im Browser:
// Sie schützt vor fremden Blicken auf ein entsperrtes Gerät, sie verschlüsselt keine Daten.
//
// Gesperrt wird beim Öffnen der App und wenn sie mindestens eine Minute im Hintergrund war.
// Nach einer Anmeldung mit Passwort ist die App nicht gesperrt, man hat sich ja gerade ausgewiesen.
import { h } from './ui.js';

const SCHLUESSEL = 'hb-app-sperre';
const HINTERGRUND_MS = 60 * 1000;

let aktuellerBenutzer = () => null;
let abmelden = async () => {};
let geoeffnet = false;
let verborgenSeit = null;
let laufendeAbfrage = null;

// ---------------------------------------------------------------------
// Einstellung auf diesem Gerät
// ---------------------------------------------------------------------
function einstellung() {
  try {
    return JSON.parse(localStorage.getItem(SCHLUESSEL));
  } catch {
    return null;
  }
}

/** true, wenn die App Sperre auf diesem Gerät für diesen Benutzer eingeschaltet ist */
export function sperreAktiv(benutzerId) {
  const e = einstellung();
  return Boolean(benutzerId && e?.benutzer === benutzerId && e.id);
}

/** true, wenn das Gerät Face ID, Touch ID, einen Fingerabdruck oder Ähnliches anbietet */
export async function sperreMoeglich() {
  try {
    return Boolean(window.PublicKeyCredential)
      && await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

const zuText = (puffer) => btoa(String.fromCharCode(...new Uint8Array(puffer)))
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const ausText = (text) => Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/')), (z) => z.charCodeAt(0));
const zufall = () => crypto.getRandomValues(new Uint8Array(32));

/** Schaltet die App Sperre ein: das Gerät legt einen Passkey an und fragt dabei nach Face ID oder Touch ID */
export async function sperreEinschalten(benutzer) {
  const passkey = await navigator.credentials.create({
    publicKey: {
      challenge: zufall(),
      rp: { name: 'Haushaltsbuch' },
      user: { id: new TextEncoder().encode(benutzer.id), name: benutzer.email ?? 'Haushaltsbuch', displayName: 'Haushaltsbuch' },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'preferred' },
      attestation: 'none',
      timeout: 60000,
    },
  });
  localStorage.setItem(SCHLUESSEL, JSON.stringify({ benutzer: benutzer.id, id: zuText(passkey.rawId) }));
}

export function sperreAusschalten() {
  localStorage.removeItem(SCHLUESSEL);
}

/** Fragt nach Face ID, Touch ID oder Gerätecode. Wirft einen Fehler, wenn das nicht klappt oder abgebrochen wird. */
async function pruefen(signal) {
  const e = einstellung();
  const antwort = await navigator.credentials.get({
    signal,
    publicKey: {
      challenge: zufall(),
      allowCredentials: [{ type: 'public-key', id: ausText(e.id), transports: ['internal', 'hybrid'] }],
      userVerification: 'required',
      timeout: 60000,
    },
  });
  // Byte 32 der Authenticator Daten enthält die Flags, 0x04 heißt: Person wurde geprüft (Face ID, Touch ID oder Code)
  const flags = new Uint8Array(antwort.response.authenticatorData)[32];
  if (zuText(antwort.rawId) !== e.id || !(flags & 0x04)) throw new Error('Nicht bestätigt');
}

// ---------------------------------------------------------------------
// Sperrbildschirm
// ---------------------------------------------------------------------
const meldung = h('p', { class: 'fehlermeldung', role: 'alert', hidden: true });
const entsperrenKnopf = h('button', { class: 'knopf primaer breit', type: 'button' }, 'Entsperren');
const abmeldenKnopf = h('button', { class: 'knopf breit', type: 'button' }, 'Abmelden');
const bildschirm = h('div', { class: 'sperre', hidden: true },
  h('div', { class: 'sperre-inhalt' },
    h('img', { class: 'sperre-symbol', src: 'icons/icon.svg', alt: '', width: 72, height: 72 }),
    h('h1', {}, 'Haushaltsbuch ist gesperrt'),
    h('p', { class: 'leise' }, 'Entsperren mit Face ID, Touch ID oder dem Gerätecode.'),
    entsperrenKnopf,
    meldung,
    abmeldenKnopf,
  ),
);

export function istGesperrt() {
  return document.body.classList.contains('gesperrt');
}

function sperren() {
  if (istGesperrt()) return;
  if (!bildschirm.isConnected) document.body.append(bildschirm);
  meldung.hidden = true;
  bildschirm.hidden = false;
  document.body.classList.add('gesperrt');
  entsperrenKnopf.focus();
  // Gleich nachfragen. Verlangt der Browser dafür ein Antippen, bleibt der Knopf "Entsperren".
  entsperren(false);
}

/** Hebt die Sperre auf, ohne zu prüfen (nach dem Abmelden) */
export function sperreAufheben() {
  laufendeAbfrage?.abort();
  laufendeAbfrage = null;
  document.body.classList.remove('gesperrt');
  bildschirm.hidden = true;
}

async function entsperren(vomKnopf) {
  laufendeAbfrage?.abort();
  const abfrage = new AbortController();
  laufendeAbfrage = abfrage;
  if (vomKnopf) meldung.hidden = true;
  try {
    await pruefen(abfrage.signal);
    if (laufendeAbfrage !== abfrage) return;
    sperreAufheben();
  } catch (fehler) {
    if (laufendeAbfrage !== abfrage || abfrage.signal.aborted) return;
    laufendeAbfrage = null;
    // Ohne Antippen lehnt der Browser oft still ab, dann einfach auf den Knopf warten
    if (!vomKnopf) return;
    console.warn('Entsperren abgebrochen oder fehlgeschlagen', fehler);
    meldung.textContent = 'Entsperren hat nicht geklappt. Bitte noch einmal versuchen oder abmelden und mit Passwort anmelden.';
    meldung.hidden = false;
  }
}

entsperrenKnopf.addEventListener('click', () => entsperren(true));
abmeldenKnopf.addEventListener('click', async () => {
  abmeldenKnopf.disabled = true;
  const fehler = await abmelden();
  abmeldenKnopf.disabled = false;
  if (fehler) {
    meldung.textContent = 'Abmelden geht nur mit Verbindung zum Server.';
    meldung.hidden = false;
  }
});

// ---------------------------------------------------------------------
// Wann gesperrt wird
// ---------------------------------------------------------------------

/**
 * Richtet die App Sperre ein. benutzer() liefert die id des angemeldeten Benutzers oder null,
 * abmelden() meldet ab und gibt bei einem Fehler etwas zurück.
 */
export function sperreEinrichten(optionen) {
  aktuellerBenutzer = optionen.benutzer;
  abmelden = optionen.abmelden;
}

/** Beim Öffnen der App einmal aufrufen, sobald feststeht, wer angemeldet ist */
export function sperreBeimOeffnen(benutzerId) {
  if (geoeffnet) return;
  geoeffnet = true;
  if (sperreAktiv(benutzerId)) sperren();
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    verborgenSeit = Date.now();
    return;
  }
  const weg = verborgenSeit == null ? 0 : Date.now() - verborgenSeit;
  verborgenSeit = null;
  if (weg >= HINTERGRUND_MS && sperreAktiv(aktuellerBenutzer())) sperren();
});
