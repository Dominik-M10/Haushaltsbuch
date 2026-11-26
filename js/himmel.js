// Tageszeit aus dem echten Sonnenstand. Feste Uhrzeiten gingen nicht: Ende November ist es
// um 17 Uhr dunkel, Ende Juni um 21 Uhr noch hell.

// Mitte Deutschlands. Die App zeigt ohnehin immer deutsche Zeit, darum ist der Ort fest.
// Innerhalb Deutschlands geht die Sonne höchstens eine knappe halbe Stunde früher oder
// später unter als hier, das ändert an der Färbung nichts.
const BREITE = 51.16;
const LAENGE = 10.45;

// Grenzen der Sonnenhöhe in Grad. Unter -6 Grad ist die bürgerliche Dämmerung vorbei,
// über 8 Grad steht die Sonne so hoch, dass es nach Tag aussieht.
const NACHT_BIS = -6;
const TAG_AB = 8;

const RAD = Math.PI / 180;

/**
 * Höhe der Sonne über dem Horizont in Grad, dazu ob sie gerade steigt.
 * Formel aus dem Astronomical Almanac (geringe Genauigkeit). Geprüft gegen die
 * veröffentlichten Zeiten für Berlin: Sonnenuntergang am kürzesten Tag auf die Minute genau.
 */
export function sonnenstand(zeit = new Date()) {
  const n = zeit.getTime() / 86400000 + 2440587.5 - 2451545.0; // Tage seit dem 1.1.2000, 12 Uhr
  const mittlereLaenge = (280.460 + 0.9856474 * n) % 360;
  const anomalie = ((357.528 + 0.9856003 * n) % 360) * RAD;
  const ekliptik = (mittlereLaenge + 1.915 * Math.sin(anomalie) + 0.020 * Math.sin(2 * anomalie)) * RAD;
  const schiefe = (23.439 - 0.0000004 * n) * RAD;

  const rektaszension = Math.atan2(Math.cos(schiefe) * Math.sin(ekliptik), Math.cos(ekliptik)) / RAD;
  const deklination = Math.asin(Math.sin(schiefe) * Math.sin(ekliptik));

  // Sternzeit am Ort, daraus der Stundenwinkel: negativ vor dem höchsten Stand, positiv danach
  const sternzeit = (18.697374558 + 24.06570982441908 * n) % 24;
  const ortsSternzeit = (sternzeit * 15 + LAENGE + 3600) % 360;
  const stundenwinkel = ((ortsSternzeit - rektaszension + 540) % 360 - 180) * RAD;

  const breite = BREITE * RAD;
  const hoehe = Math.asin(
    Math.sin(breite) * Math.sin(deklination)
    + Math.cos(breite) * Math.cos(deklination) * Math.cos(stundenwinkel),
  ) / RAD;

  return { hoehe, steigend: stundenwinkel < 0 };
}

/** 'nacht', 'morgen', 'tag' oder 'abend' */
export function tageszeit(zeit = new Date()) {
  const { hoehe, steigend } = sonnenstand(zeit);
  if (hoehe > TAG_AB) return 'tag';
  if (hoehe < NACHT_BIS) return 'nacht';
  return steigend ? 'morgen' : 'abend';
}
