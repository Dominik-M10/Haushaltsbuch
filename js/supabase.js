// Gemeinsamer Supabase Client für die ganze App.
// Die Bibliothek liegt als lokale Kopie in vendor/supabase.js und stellt window.supabase bereit.
import { SUPABASE_URL, SUPABASE_KEY } from './config.js';

if (!window.supabase || typeof window.supabase.createClient !== 'function') {
  throw new Error('Die Supabase Bibliothek wurde nicht geladen.');
}

export const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
