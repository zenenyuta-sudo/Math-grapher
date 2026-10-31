'use strict';
const CACHE = 'mathgrapher-v13';
const FILES = ['./', 'index.html', 'style.css', 'engine.js', 'gg.js', 'grapher.js', 'grapher3d.js', 'solver.js', 'calc.js', 'annot.js', 'theme.js', 'fx.js', 'i18n.js', 'home.js', 'app.js', 'manifest.json', 'assets/icon.svg', 'assets/UniSIRWAN.ttf', 'assets/dev.jpg', 'assets/channel.jpg', 'assets/icon-192.png', 'assets/icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => Promise.all(FILES.map(f => c.add(f).catch(() => { })))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
/* cache first (works offline), refresh the cached copy in the background so updates arrive next visit */
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  const same = new URL(r.url).origin === location.origin;
  e.respondWith(caches.match(r, { ignoreSearch: true }).then(hit => {
    const net = fetch(r).then(res => { if (same && res && res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(r, cp)); } return res; }).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }
    return net.then(res => res || (r.mode === 'navigate' ? caches.match('index.html') : Response.error()));
  }));
});
