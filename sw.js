// Service Worker: hält die Dateien der App auf dem Gerät, damit sie sich auch ohne Verbindung öffnet.
//
// Jede Datei kommt zuerst aus dem Netz, damit neue Versionen sofort ankommen. Dabei wird sie auf dem Gerät abgelegt.
// Ohne Verbindung kommt die abgelegte Datei. Nur Dateien der App selbst, keine Anfragen an Supabase:
// die Daten merkt sich die App getrennt (js/zwischenspeicher.js).

const SPEICHER = 'haushaltsbuch-dateien-v1';

self.addEventListener('install', (ereignis) => {
  ereignis.waitUntil((async () => {
    const speicher = await caches.open(SPEICHER);
    await speicher.addAll(['./', './index.html']);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (ereignis) => {
  ereignis.waitUntil((async () => {
    for (const name of await caches.keys()) {
      if (name !== SPEICHER) await caches.delete(name);
    }
    await self.clients.claim();
  })());
});

const eigeneDatei = (adresse) => new URL(adresse, self.location.href).origin === self.location.origin;

// Die Seite schickt nach dem ersten Laden die Liste ihrer Dateien, die werden hier abgelegt
self.addEventListener('message', (ereignis) => {
  if (ereignis.data?.typ !== 'merken' || !Array.isArray(ereignis.data.adressen)) return;
  ereignis.waitUntil((async () => {
    const speicher = await caches.open(SPEICHER);
    await Promise.all(ereignis.data.adressen.filter(eigeneDatei).map(async (adresse) => {
      if (await speicher.match(adresse)) return;
      try {
        const antwort = await fetch(adresse);
        if (antwort.ok) await speicher.put(adresse, antwort);
      } catch {
        // ohne Verbindung beim nächsten Mal
      }
    }));
  })());
});

self.addEventListener('fetch', (ereignis) => {
  const anfrage = ereignis.request;
  if (anfrage.method !== 'GET' || !eigeneDatei(anfrage.url)) return;

  ereignis.respondWith((async () => {
    const speicher = await caches.open(SPEICHER);
    try {
      const antwort = await fetch(anfrage);
      if (antwort.ok && antwort.type === 'basic') {
        ereignis.waitUntil(speicher.put(anfrage, antwort.clone()));
      }
      return antwort;
    } catch (fehler) {
      const abgelegt = (await speicher.match(anfrage, { ignoreSearch: true }))
        ?? (anfrage.mode === 'navigate' ? await speicher.match('./index.html') : undefined);
      if (abgelegt) return abgelegt;
      throw fehler;
    }
  })());
});
