// Simple Service Worker for Android Chrome notification compatibility
const CACHE_NAME = "waschgehtab-v1";

console.log("[SW] Service Worker loaded for Android Chrome compatibility");

// Install event
self.addEventListener("install", (event) => {
  console.log("[SW] Service Worker installing");
  self.skipWaiting();
});

// Activate event
self.addEventListener("activate", (event) => {
  console.log("[SW] Service Worker activating");
  event.waitUntil(clients.claim());
});

// Handle notification clicks
self.addEventListener("notificationclick", (event) => {
  console.log("[SW] Notification click received:", event.notification.data);

  event.notification.close();

  // Focus or open the app
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow("/");
      }
    })
  );
});

// Handle push events (for Android Chrome notification display)
self.addEventListener("push", (event) => {
  console.log("[SW] Push event received:", event);

  // This can be used if we need to show notifications from push events
  if (event.data) {
    try {
      const data = event.data.json();
      console.log("[SW] Push data:", data);

      event.waitUntil(
        self.registration.showNotification(data.title || "Waschgehtab", {
          body: data.body || "Neue Benachrichtigung",
          icon: "/android-chrome-192x192.png",
          badge: "/android-chrome-192x192.png",
          tag: data.tag || "default",
          renotify: true,
          requireInteraction: true,
          vibrate: [200, 100, 200, 100, 200],
          data: data.data || {},
        })
      );
    } catch (error) {
      console.error("[SW] Error parsing push data:", error);
    }
  }
});

// Basic fetch handler (not needed for notifications but good practice)
self.addEventListener("fetch", (event) => {
  // Let network handle all requests for now
  event.respondWith(fetch(event.request));
});

// Handle notification close events
self.addEventListener("notificationclose", (event) => {
  console.log("[SW] Notification was closed:", event.notification.data);
});

// Handle background sync for potential offline notification queueing
self.addEventListener("sync", (event) => {
  console.log("[SW] Background sync event:", event.tag);
  if (event.tag === "background-notifications") {
    // Could be used for offline notification handling
    console.log("[SW] Processing background notifications");
  }
});
