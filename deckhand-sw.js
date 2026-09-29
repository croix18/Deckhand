/* Deckhand — the offline worker (v7.19). Only registered when Deckhand is served from an https
   address. Network first: every online load gets the newest Deckhand.html (updates just arrive);
   the cached copy answers when the network doesn't, so the board still opens. Same-origin GETs
   only — Google Fonts, YouTube and Slides go to the network as always. */
const CACHE = "deckhand-v1";
const SHELL = ["./Deckhand.html", "./deckhand.webmanifest", "./icons/deckhand-192.png", "./icons/deckhand-512.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith("deckhand-") && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin || u.pathname.includes("/webapp-test/")) return;
  e.respondWith(fetch(e.request).then(r => {
    if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
    return r;
  }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match("./Deckhand.html"))));
});
