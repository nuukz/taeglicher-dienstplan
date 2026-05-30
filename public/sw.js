// Service Worker für Dienstplan-App
// Push-Benachrichtigungen + einfacher Offline-Fallback

const CACHE_NAME = "dienstplan-v3";

// --- Lifecycle ---

self.addEventListener("install", (event) => {
  // Sofort aktivieren, nicht auf alte Tabs warten
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Alle alten Caches löschen
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  // Sofort alle offenen Clients übernehmen
  self.clients.claim();
});

// --- Push-Benachrichtigungen ---

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = {
      title: "Dienstplan",
      body: event.data.text(),
      url: "/dienstplan",
    };
  }

  const options = {
    body: data.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: data.tag || "dienstplan-notification",
    renotify: true,
    data: {
      url: data.url || "/dienstplan",
    },
  };

  event.waitUntil(
    self.registration.showNotification(data.title || "Dienstplan", options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/dienstplan";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Wenn ein Tab schon offen ist, dort hin navigieren
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        // Sonst neuen Tab öffnen
        return clients.openWindow(targetUrl);
      })
  );
});

// --- Einfacher Offline-Fallback (Netzwerk-First) ---
// Nur statische Assets cachen (Icons, Bilder, manifest), KEINE JS-Chunks oder HTML-Seiten

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Nur statische Assets im /icons/ Ordner und manifest.json cachen
  const isCacheable =
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.json";

  if (!isCacheable) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
