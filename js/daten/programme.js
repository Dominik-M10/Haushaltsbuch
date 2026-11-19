// Regeln für Programme, Transferwege und den Umrechner. Ohne Datenbankzugriff, daher einzeln testbar.
//
// Verhältnisse sind immer Quelle zu Ziel: quelle 5, ziel 4 heißt 5 Punkte ergeben 4 Meilen.
// Ergebnisse werden auf ganze Meilen oder Punkte abgerundet, bei zwei Schritten nach jedem Schritt.

export const QUELLEN = [
  { id: 'amex', name: 'Amex Membership Rewards', einheit: 'Membership Rewards Punkte' },
  { id: 'revolut', name: 'Revolut RevPoints', einheit: 'RevPoints' },
  { id: 'payback', name: 'Payback', einheit: 'Payback Punkte' },
];

export const TYPEN = ['Airline', 'Hotel', 'Bonusprogramm'];

/** Airlines zählen in Meilen, Hotels und Bonusprogramme in Punkten */
export function einheit(typ) {
  return typ === 'Airline' ? 'Meilen' : 'Punkte';
}

export function verhaeltnisText(quelle, ziel) {
  return `${quelle}:${ziel}`;
}

function ggt(a, b) {
  while (b) [a, b] = [b, a % b];
  return a;
}

/** Sortierung: erst nach Typ (Airline, Hotel, Bonusprogramm), dann nach Name */
export function nachTypUndName(a, b) {
  return TYPEN.indexOf(a.typ) - TYPEN.indexOf(b.typ) || a.name.localeCompare(b.name, 'de');
}

/**
 * Das Programm, das zu einer Quelle gehört: gleicher Name wie die Quelle, Groß und Kleinschreibung egal.
 * Zum Beispiel "Amex Membership Rewards" für amex. Liefert null, wenn es keins gibt.
 */
export function findeQuellProgramm(programme, quelleId) {
  const quelle = QUELLEN.find((q) => q.id === quelleId);
  if (!quelle) return null;
  const name = quelle.name.toLowerCase();
  return programme.find((p) => p.name.trim().toLowerCase() === name) ?? null;
}

/** Das Programm "Payback" in der Liste (Groß und Kleinschreibung egal) */
export function findePayback(programme) {
  return findeQuellProgramm(programme, 'payback');
}

/**
 * Transferweg von einer Quelle zu einem Programm.
 * Liefert null, wenn das Programm über diese Quelle nicht erreichbar ist, sonst
 * { art, quelle, ziel, hinweis, ueberPayback, payback, fehler }.
 * Beim Weg über Payback wird das Gesamtverhältnis aus beiden Schritten berechnet.
 */
export function transferweg(programm, quelleId, programme) {
  const art = programm[quelleId];
  if (!art || art === 'nein') return null;
  const hinweis = quelleId === 'payback' ? null : (programm[`${quelleId}_hinweis`] || null);

  if (quelleId === 'amex' && programm.amex_ueber_payback) {
    const payback = findePayback(programme);
    if (!payback || payback.amex === 'nein' || !payback.amex_quelle || programm.payback === 'nein') {
      return {
        art, hinweis, ueberPayback: true,
        fehler: 'Für den Weg über Payback braucht das Programm „Payback“ ein Amex Verhältnis und dieses Programm ein Payback Verhältnis.',
      };
    }
    const q = payback.amex_quelle * programm.payback_quelle;
    const z = payback.amex_ziel * programm.payback_ziel;
    const teiler = ggt(q, z);
    return { art, hinweis, ueberPayback: true, payback, quelle: q / teiler, ziel: z / teiler };
  }

  return {
    art, hinweis, ueberPayback: false,
    quelle: programm[`${quelleId}_quelle`],
    ziel: programm[`${quelleId}_ziel`],
  };
}

/** Programme, die über eine Quelle erreichbar sind, sortiert nach Typ und Name */
export function erreichbareProgramme(programme, quelleId) {
  return programme.filter((p) => transferweg(p, quelleId, programme)).sort(nachTypUndName);
}

function schritt(punkte, quelle, ziel) {
  return Math.floor((punkte * ziel) / quelle);
}

/**
 * Rechnet Punkte einer Quelle in Meilen oder Punkte des Programms um.
 * Ergebnis: { ergebnis, weg, schritte: [{ von, nach, verhaeltnis, punkteVon, einheitVon, punkteNach, einheitNach }] }
 * oder { fehler }.
 */
export function umrechnen(programm, quelleId, punkte, programme) {
  const quelle = QUELLEN.find((q) => q.id === quelleId);
  const weg = transferweg(programm, quelleId, programme);
  if (!quelle || !weg) return { fehler: 'Dieses Programm ist über diese Quelle nicht erreichbar.' };
  if (weg.fehler) return { fehler: weg.fehler };

  if (weg.ueberPayback) {
    const pb = weg.payback;
    const zwischen = schritt(punkte, pb.amex_quelle, pb.amex_ziel);
    const ende = schritt(zwischen, programm.payback_quelle, programm.payback_ziel);
    return {
      ergebnis: ende,
      weg,
      schritte: [
        {
          von: quelle.name, nach: pb.name, verhaeltnis: verhaeltnisText(pb.amex_quelle, pb.amex_ziel),
          punkteVon: punkte, einheitVon: quelle.einheit, punkteNach: zwischen, einheitNach: 'Payback Punkte',
        },
        {
          von: pb.name, nach: programm.name, verhaeltnis: verhaeltnisText(programm.payback_quelle, programm.payback_ziel),
          punkteVon: zwischen, einheitVon: 'Payback Punkte', punkteNach: ende, einheitNach: einheit(programm.typ),
        },
      ],
    };
  }

  const ende = schritt(punkte, weg.quelle, weg.ziel);
  return {
    ergebnis: ende,
    weg,
    schritte: [{
      von: quelle.name, nach: programm.name, verhaeltnis: verhaeltnisText(weg.quelle, weg.ziel),
      punkteVon: punkte, einheitVon: quelle.einheit, punkteNach: ende, einheitNach: einheit(programm.typ),
    }],
  };
}

/**
 * Umrechnung zu allen Programmen, die über die Quelle erreichbar sind.
 * Reihenfolge wie in der Auswahlliste: nach Typ (Airlines, Hotels, Bonusprogramme), darin alphabetisch.
 */
export function alleUmrechnungen(programme, quelleId, punkte) {
  return erreichbareProgramme(programme, quelleId)
    .map((programm) => ({ programm, weg: transferweg(programm, quelleId, programme), ...umrechnen(programm, quelleId, punkte, programme) }));
}

/** Kurztext für die Programmtabelle, zum Beispiel "direkt 5:4" oder "nein" */
export function zuordnungText(programm, quelleId, programme) {
  const weg = transferweg(programm, quelleId, programme);
  if (!weg) return { text: 'nein' };
  if (weg.fehler) return { text: weg.art, hinweis: weg.hinweis, fehler: true };
  return { text: `${weg.art} ${verhaeltnisText(weg.quelle, weg.ziel)}`, hinweis: weg.hinweis };
}

/** Aktueller Stand eines Programms: der Eintrag mit dem jüngsten Datum, oder null */
export function aktuellerStand(staende, programmId) {
  return verlauf(staende, programmId).at(-1) ?? null;
}

/** Zwischenstände eines Programms in zeitlicher Reihenfolge, jeweils mit Differenz zum vorherigen Eintrag */
export function verlauf(staende, programmId) {
  const liste = staende
    .filter((s) => s.programm_id === programmId)
    .sort((a, b) => a.datum.localeCompare(b.datum) || a.erstellt_am.localeCompare(b.erstellt_am));
  return liste.map((s, i) => ({
    ...s,
    differenz: i === 0 ? null : s.stand - liste[i - 1].stand,
  }));
}
