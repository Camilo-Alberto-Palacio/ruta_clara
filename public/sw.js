// Service Worker para Ruta Clara (SafeCycle Bogotá) - Modo Offline-First
const CACHE_NAME = 'rutaclara-cache-v1';
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './Logo.svg',
  './favicon.svg',
  './icons.svg',
  './localidades.json',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Ignorar esquemas que no sean http/https (como chrome-extension)
  if (!event.request.url.startsWith('http')) return;

  // Estrategia Stale-While-Revalidate para recursos estáticos y datos locales
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // En segundo plano actualizamos la caché si hay conexión
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {
          // Sin conexión: uso de respuesta en caché silencioso
        });
        return cachedResponse;
      }

      // Si no está en caché, intentar red
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      }).catch(() => {
        // Fallback offline para navegación HTML
        if (event.request.headers.get('accept')?.includes('text/html')) {
          return caches.match('./index.html');
        }
      });
    })
  );
});
