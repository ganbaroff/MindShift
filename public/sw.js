/**
 * public/sw.js
 * MindFocus Service Worker — Bolt 4.2
 *
 * Strategy:
 *   - Install:  pre-cache static shell + offline page
 *   - Activate: purge stale caches, claim all clients
 *   - Fetch:    Cache-First for same-origin assets
 *               Network-Only  for Supabase / Anthropic API
 *               Offline page  fallback for failed navigation
 */

const CACHE_VERSION = "mf-v1";
const STATIC_CACHE  = `mf-static-${CACHE_VERSION}`;

// Assets pre-cached on install so they're always available offline.
const PRECACHE_URLS = [
  "/",
  "/offline.html",
  "/manifest.json",
  "/icon.svg",
  "/icon-192.png",
  "/icon-512.png",
];

// ── Install ───────────────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate ──────────────────────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== STATIC_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle GET requests over http(s).
  if (request.method !== "GET" || !request.url.startsWith("http")) return;

  const url = new URL(request.url);

  // Network-Only: Supabase and Anthropic API calls (never stale-cache these).
  if (
    url.hostname.includes("supabase.co") ||
    url.hostname.includes("anthropic.com")
  ) {
    // Let the browser handle it directly — no SW interception.
    return;
  }

  // Cache-First: same-origin assets (JS bundles, CSS, images, fonts).
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;

        return fetch(request)
          .then((response) => {
            // Cache valid responses (exclude opaque / error responses).
            if (response && response.status === 200 && response.type !== "opaque") {
              const clone = response.clone();
              caches
                .open(STATIC_CACHE)
                .then((cache) => cache.put(request, clone));
            }
            return response;
          })
          .catch(() => {
            // Navigation fallback: serve offline page when network fails.
            if (request.mode === "navigate") {
              return caches.match("/offline.html");
            }
          });
      })
    );
  }
});
