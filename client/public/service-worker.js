const CACHE = "pitchday-v1";
const ASSETS = ["/", "/index.html"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
        ),
      ),
  );
  self.clients.claim();
});

// Network-first for API + Socket; cache-first for static assets.
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (
    url.pathname.startsWith("/api") ||
    url.pathname.startsWith("/socket.io")
  ) {
    e.respondWith(
      fetch(e.request)
        .then((resp) => {
          // Cache GETs for offline read of last seen data
          if (e.request.method === "GET" && resp.ok) {
            const clone = resp.clone();
            caches.open(CACHE).then((c) => c.put(e.request, clone));
          }
          return resp;
        })
        .catch(() => caches.match(e.request)),
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then(
      (c) =>
        c ||
        fetch(e.request).then((resp) => {
          if (resp.ok && e.request.method === "GET") {
            const clone = resp.clone();
            caches.open(CACHE).then((cc) => cc.put(e.request, clone));
          }
          return resp;
        }),
    ),
  );
});
