/* Deckhand — the offline worker (v7.19). Only registered when Deckhand is served from an https
   address. Network first: every online load gets the newest Deckhand.html (updates just arrive);
   the cached copy answers when the network doesn't, so the board still opens. Same-origin GETs
   only — Google Fonts, YouTube and Slides go to the network as always.
   v7.55 (audit): four fixes. (1) Only a real copy is cached — a 200 that is same-origin, not
   redirected, and (for the page) carries the deckhand-config block; a district filter's block
   page used to land in the cache AS Deckhand.html and then answer offline forever. (2) The cache
   write is held open with waitUntil, so the worker isn't stopped before it lands. (3) Offline,
   only a navigation gets the cached page; an icon or the manifest gets its own copy or an error,
   never HTML. (4) Network first, but not forever: a hung school connection gets ~4 s, then the
   cached board opens while the network answer still updates the cache behind it. */
const CACHE = "deckhand-v1";
const SHELL = ["./Deckhand.html", "./deckhand.webmanifest", "./icons/deckhand-192.png", "./icons/deckhand-512.png"];
const TIMEOUT_MS = 4000;        // v7.55: how long a hung network gets before the cached board answers
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith("deckhand-") && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
/* v7.55: the page is the navigation or the file itself (./ resolves to index.html, which redirects) */
const isPage = req => req.mode === "navigate" || /\/Deckhand\.html$/.test(new URL(req.url).pathname);
/* v7.55: cache only a real copy — a block page is a 200 too. Resolves when the write has landed
   (or been declined); the old entry stays when it is declined. */
const keep = (req, r) => {
  if (!r || !r.ok || r.redirected || r.type !== "basic") return Promise.resolve();
  const copy = r.clone();
  if (!isPage(req)) return caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
  return copy.clone().text().then(t => {
    if (t.indexOf('id="deckhand-config"') === -1) return;      // not Deckhand: keep the last good one
    return caches.open(CACHE).then(c => c.put(req.mode === "navigate" ? "./Deckhand.html" : req, copy));
  }).catch(() => {});
};
/* v7.55: offline, a page gets the cached board; anything else its own copy or an error */
const fallback = req => caches.match(req, { ignoreSearch: true }).then(r => {
  if (r) return r;
  if (isPage(req)) return caches.match("./Deckhand.html").then(p => p || Response.error());
  return Response.error();
});
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin || u.pathname.includes("/webapp-test/")) return;
  const net = fetch(e.request);
  const stored = net.then(r => keep(e.request, r), () => {});
  e.waitUntil(stored);                                          // v7.55: the write outlives the response
  const timeout = new Promise(res => setTimeout(() => res("timeout"), TIMEOUT_MS));
  e.respondWith(Promise.race([net.then(r => r, () => "failed"), timeout]).then(r => {
    if (r === "failed") return fallback(e.request);
    if (r !== "timeout") return r;
    /* hung: the cache if there is one, else keep waiting on the network */
    return caches.match(e.request, { ignoreSearch: true })
      .then(c => c || (isPage(e.request) ? caches.match("./Deckhand.html") : null))
      .then(c => c || net.catch(() => fallback(e.request)));
  }));
});
