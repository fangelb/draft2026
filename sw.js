const CACHE = 'tab-draft-2026-v13';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js',
  'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800&family=Barlow:wght@300;400;500&display=swap'
];

// Install: guarda la nova caché i s'activa immediatament sense esperar
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())  // Força activació immediata
  );
});

// Activate: esborra TOTES les cachés antigues i pren el control de tots els clients
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())  // Pren control de tots els clients oberts
      .then(() => {
        // Envia missatge a tots els clients perquè es recarreguin
        return self.clients.matchAll({ type: 'window' }).then(clients => {
          clients.forEach(client => client.navigate(client.url));
        });
      })
  );
});

// Fetch: network-first per a index.html (sempre la versió més nova),
// cache-first per a la resta (assets estàtics)
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  const isHTML = url.pathname.endsWith('.html') || url.pathname.endsWith('/');

  if (isHTML) {
    // HTML: xarxa primer, caché com a fallback
    e.respondWith(
      fetch(e.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return response;
        })
        .catch(() => caches.match(e.request))
    );
  } else {
    // Altres assets: caché primer, xarxa com a fallback
    e.respondWith(
      caches.match(e.request)
        .then(cached => cached || fetch(e.request)
          .then(response => {
            const clone = response.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
            return response;
          })
        )
        .catch(() => caches.match('./index.html'))
    );
  }
});
