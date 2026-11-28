// Zwischenspeicher für Daten: Die App merkt sich auf dem Gerät, was sie zuletzt aus der Datenbank geladen hat.
// Ohne Verbindung zeigt sie diesen Stand an, ändern geht erst wieder mit Verbindung.
// Gespeichert wird je Benutzer im localStorage des Browsers. Beim Abmelden wird alles gelöscht.
import { istNetzfehler, pruefeVerbindung } from './fehler.js';

const PRAEFIX = 'hb-zwischenspeicher:';
let benutzerId = null;
let aeltesterStand = null; // Zeitpunkt der ältesten Daten aus dem Zwischenspeicher in der aktuellen Ansicht
let geaendertAm = 0;       // wann in dieser Sitzung zuletzt etwas gespeichert oder gelöscht wurde

export function setzeBenutzer(id) {
  benutzerId = id ?? null;
}

const schluessel = (name) => `${PRAEFIX}${benutzerId}:${name}`;

function melden() {
  window.dispatchEvent(new CustomEvent('zwischenspeicher', { detail: { stand: aeltesterStand } }));
}

/** Beim Wechsel der Seite: Hinweis zurücksetzen, die neue Seite meldet selbst, ob sie gespeicherte Daten zeigt */
export function neueAnsicht() {
  aeltesterStand = null;
  melden();
}

function lesen(name) {
  try {
    return JSON.parse(localStorage.getItem(schluessel(name)));
  } catch {
    return null;
  }
}

function ausDemSpeicher(eintrag) {
  aeltesterStand = aeltesterStand == null ? eintrag.zeit : Math.min(aeltesterStand, eintrag.zeit);
  melden();
  return eintrag.daten;
}

/**
 * Merkt sich, dass gerade etwas geändert wurde. Danach ist jeder ältere Stand überholt und wird
 * nicht mehr vorab gezeigt: sonst stünde nach dem Speichern kurz der Wert von vorher da.
 * Gelöscht wird nichts, der Stand bleibt für den Fall ohne Verbindung erhalten.
 */
export function standUeberholt() {
  geaendertAm = Date.now();
}

/**
 * Der zuletzt gespeicherte Stand, ohne auf den Server zu warten. null, wenn es keinen gibt
 * oder er älter ist als die letzte Änderung.
 * Damit zeigt eine Seite sofort etwas an, während die frischen Daten noch unterwegs sind.
 * Anders als beim Lesen in mitZwischenspeicher wird hier kein Hinweis gemeldet: der Stand ist
 * gleich wieder ersetzt. Gemeldet wird nur, wenn die frischen Daten wirklich ausbleiben.
 */
export function ausSpeicher(name) {
  if (!benutzerId) return null;
  const eintrag = lesen(name);
  if (!eintrag || eintrag.zeit < geaendertAm) return null;
  return eintrag.daten;
}

/**
 * Zeigen a und b dasselbe? Verglichen wird der Inhalt, nicht das Objekt.
 * Damit erkennt eine Seite, dass die frischen Daten gleich dem schon gezeigten Stand sind, und
 * baut sich nicht noch einmal auf: kein Flackern, und ein gerade geöffnetes Formular bleibt offen.
 */
export function gleicherStand(a, b) {
  return a != null && JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Lädt Daten mit laden(). Klappt das, werden sie unter name gespeichert.
 * Scheitert es an der Verbindung, kommen die zuletzt gespeicherten Daten zurück (falls vorhanden).
 */
export async function mitZwischenspeicher(name, laden) {
  // Weiß das Gerät schon, dass es keine Verbindung hat (zum Beispiel im Flugmodus), gleich den gespeicherten Stand
  // nehmen. Sonst wartet jede Anfrage erst, bis Supabase mehrere Versuche aufgibt.
  if (benutzerId && !navigator.onLine) {
    const eintrag = lesen(name);
    if (eintrag) return ausDemSpeicher(eintrag);
  }
  try {
    pruefeVerbindung();
    const daten = await laden();
    if (benutzerId) {
      try {
        localStorage.setItem(schluessel(name), JSON.stringify({ zeit: Date.now(), daten }));
      } catch {
        // Speicher voll oder gesperrt: die App funktioniert trotzdem, nur ohne Stand für unterwegs
      }
    }
    return daten;
  } catch (fehler) {
    if (!benutzerId || !istNetzfehler(fehler)) throw fehler;
    const eintrag = lesen(name);
    if (!eintrag) throw fehler;
    return ausDemSpeicher(eintrag);
  }
}

/** Löscht alle gespeicherten Daten auf diesem Gerät (beim Abmelden) */
export function allesLoeschen() {
  try {
    const weg = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(PRAEFIX)) weg.push(k);
    }
    weg.forEach((k) => localStorage.removeItem(k));
  } catch {
    // ohne Zugriff auf den Speicher gibt es auch nichts zu löschen
  }
}
