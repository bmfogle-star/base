// Service worker: make Playbook work offline so everything a player needs is on
// their phone with no signal. Strategy:
//  - App shell + built assets: cache-first, updated in the background.
//  - Navigations: serve the cached app shell when offline (SPA fallback).
// Local storage (plays, progress, notes) already lives on-device, so once the
// app is cached the whole thing runs offline.

const CACHE = 'playbook-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll([
      './',
      './index.html',
      './manifest.webmanifest',
      './favicon.svg',
    ]).catch(() => {}))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Never cache API calls (e.g. the Anthropic AI coach) — always go to network.
  if (url.origin !== self.location.origin) return;

  // SPA navigations → cached shell when the network is unavailable.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('./index.html').then((r) => r || caches.match('./')))
    );
    return;
  }

  // Static assets → cache-first, refresh in the background.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request).then((resp) => {
        if (resp && resp.ok) {
          const copy = resp.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return resp;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
