// Gemeinsame Datenbankfunktionen für alle Bereiche.
import { db } from '../supabase.js';

/** Wartet auf eine Supabase Anfrage und wirft den Fehler, falls einer kommt */
export async function abfrage(anfrage) {
  const { data, error } = await anfrage;
  if (error) throw error;
  return data;
}

/** Legt eine Zeile an (ohne id) oder ändert sie (mit id). Gibt die id zurück. */
export async function speichereZeile(tabelle, werte, id) {
  if (id) {
    await abfrage(db.from(tabelle).update(werte).eq('id', id));
    return id;
  }
  const neu = await abfrage(db.from(tabelle).insert(werte).select('id').single());
  return neu.id;
}

export async function loescheZeile(tabelle, id) {
  await abfrage(db.from(tabelle).delete().eq('id', id));
}
