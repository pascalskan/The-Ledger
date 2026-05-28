// Mock Service Worker for PWA scaffolding
self.addEventListener("install", (event) => {
  console.log("[Service Worker] Install Event processing");
});

self.addEventListener("activate", (event) => {
  console.log("[Service Worker] Activate Event processing");
});

self.addEventListener("fetch", (event) => {
  // Pass through all requests in mockup mode
  event.respondWith(fetch(event.request));
});