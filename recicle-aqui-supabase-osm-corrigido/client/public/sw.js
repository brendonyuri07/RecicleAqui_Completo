// Only a generic offline page is cached. API data, sessions, messages and
// third-party map tiles always go directly to the network.
const CACHE = "recicle-aqui-offline-v1";
const OFFLINE = "/offline.html";

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.add(new Request(OFFLINE, { cache: "reload" }))));
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith("recicle-aqui-offline-") && key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || request.mode !== "navigate" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;
  event.respondWith(fetch(request).catch(async () => {
    const fallback = await caches.match(OFFLINE);
    return fallback || new Response("Sem conexão. Conecte-se à internet e tente novamente.", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }));
});
