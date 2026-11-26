/* =========================================================
   SERVICE WORKER — OS Fácil (Escapamento)
   ========================================================= */

const VERSAO = "v1"; // 🔴 BUMP A CADA DEPLOY que altere HTML/JS/CSS
const CACHE_SHELL = `precadastro-shell-${VERSAO}`;
const CACHE_CDN = `precadastro-cdn-${VERSAO}`;
const CACHE_API = `precadastro-api-${VERSAO}`;

const TIMEOUT_REDE = 5000;

// ⚠️ NÃO coloque "./" nem "./index.html" aqui.
// O HTML deve ser SEMPRE buscado via network-first (navegacaoNetworkFirst).
// Pré-cachear o HTML congela a versão na primeira instalação.
const ASSETS_SHELL = [
  "./manifest.json",
  "./js/db.js",
  "./js/dexie.min.mjs",
  "./js/os-repository.js",
  "./js/os-sync.js",
  "./js/supabase.js",
  "./js/supabase_sdk.js",
  "./components/custom-alert.js",
  "./components/device-id.js",
  "./components/header.js",
  "./components/customer-info.js",
  "./components/morph-input-cpf.js",
  "./components/morph-input-placa.js",
  "./components/service-sheet.js",
  "./components/image-upload.js",
  "./favicon-32x32.png",
  "./apple-touch-icon.png",
  "./icon-192.png",
  "./icon-192-maskable.png",
  "./icon-512.png",
  "./icon-512-maskable.png",
];

const ASSETS_CDN = ["https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"];

const SUPABASE_HOST = "kiiswukzwwoznkgjyaod.supabase.co";

/* ---------- INSTALL ---------- */
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cacheShell = await caches.open(CACHE_SHELL);
      await Promise.all(
        ASSETS_SHELL.map((url) =>
          cacheShell.add(url).catch((err) => {
            console.warn("[SW] Falha ao cachear (shell):", url, err);
          }),
        ),
      );

      const cacheCdn = await caches.open(CACHE_CDN);
      await Promise.all(
        ASSETS_CDN.map((url) =>
          cacheCdn.add(new Request(url, { mode: "cors" })).catch((err) => {
            console.warn("[SW] Falha ao cachear (cdn):", url, err);
          }),
        ),
      );

      self.skipWaiting();
    })(),
  );
});

/* ---------- ACTIVATE ---------- */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const nomes = await caches.keys();
      await Promise.all(
        nomes.filter((n) => !n.endsWith(VERSAO)).map((n) => caches.delete(n)),
      );
      await self.clients.claim();
    })(),
  );
});

/* ---------- FETCH ---------- */
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // 0) service-worker.js NUNCA deve passar pelo SW (deixa o browser cuidar)
  if (url.pathname.endsWith("/service-worker.js")) return;

  // 1) API do Supabase → network-first com fallback cache
  if (url.hostname === SUPABASE_HOST && url.pathname.startsWith("/rest/")) {
    event.respondWith(networkFirstComCache(req, CACHE_API, 8000));
    return;
  }

  // 2) Storage do Supabase → cache-first
  if (url.hostname === SUPABASE_HOST && url.pathname.startsWith("/storage/")) {
    event.respondWith(cacheFirst(req, CACHE_CDN));
    return;
  }

  // 3) Navegação (HTML) → network-first com fallback cache
  if (req.mode === "navigate") {
    event.respondWith(navegacaoNetworkFirst(req));
    return;
  }

  // 4) CDNs externas → cache-first
  if (ASSETS_CDN.some((u) => req.url.startsWith(u.split("?")[0]))) {
    event.respondWith(cacheFirst(req, CACHE_CDN));
    return;
  }

  // 5) Assets locais → stale-while-revalidate
  if (url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(req, CACHE_SHELL));
    return;
  }
});

/* ---------- MENSAGENS DO APP ---------- */
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
/* ---------- ESTRATÉGIAS ---------- */

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    return new Response("", { status: 504, statusText: "Offline" });
  }
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);

  const fetchPromise = fetch(req)
    .then((res) => {
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    })
    .catch(() => null);

  return cached || (await fetchPromise) || new Response("", { status: 504 });
}

async function networkFirstComCache(req, cacheName, timeoutMs) {
  const cache = await caches.open(cacheName);

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(req, {
      signal: controller.signal,
      cache: "no-store", // ignora cache HTTP do CDN
    });
    clearTimeout(timer);

    if (res && res.ok) {
      cache.put(req, res.clone());
      return res;
    }
    const cached = await cache.match(req);
    if (cached) return cached;
    return res;
  } catch (err) {
    const cached = await cache.match(req);
    if (cached) return cached;
    return new Response(
      JSON.stringify({ error: "offline", message: "Sem conexão." }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }
}

async function navegacaoNetworkFirst(req) {
  const cache = await caches.open(CACHE_SHELL);
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_REDE);

    // ⚠️ cache: "no-store" é o que fura o Cache-Control alto do GitHub Pages.
    const res = await fetch(req, {
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timer);

    if (res && res.ok) {
      cache.put(req, res.clone());
      return res;
    }
    throw new Error("Não OK");
  } catch (err) {
    const cached =
      (await cache.match(req)) || (await cache.match("./index.html"));
    if (cached) return cached;
    return new Response("<h1>Offline</h1><p>Sem conexão com a internet.</p>", {
      headers: { "Content-Type": "text/html; charset=utf-8" },
      status: 503,
    });
  }
}
