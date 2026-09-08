// Service worker: precarga la aplicación y sirve desde la red con respaldo en caché.
// Sube VERSION cada vez que cambien los archivos precargados.

const VERSION = 'nutriplan-v1.0.0';

const ASSETS = [
  './index.html',
  './manifest.webmanifest',
  './css/styles.css',
  './js/app.js',
  './js/store.js',
  './js/data.js',
  './js/nutrition.js',
  './js/dates.js',
  './js/ui.js',
  './js/charts.js',
  './js/views/parts.js',
  './js/views/hoy.js',
  './js/views/plan.js',
  './js/views/dietas.js',
  './js/views/progreso.js',
  './js/views/alimentos.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET' || new URL(request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(request)
      .then((res) => {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(request, copy));
        return res;
      })
      .catch(() => caches.match(request).then((r) => r || caches.match('./index.html'))),
  );
});
