/* global self */
// Firebase Messaging Service Worker
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: self?.ENV_API_KEY || "${VITE_API_KEY}",
  authDomain: "waschgehtab-61c62.firebaseapp.com",
  projectId: "waschgehtab-61c62",
  storageBucket: "waschgehtab-61c62.firebasestorage.app",
  messagingSenderId: "26465431600",
  appId: "1:26465431600:web:fa788390af7503ee907df5",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body, icon } = payload.notification || {};
  self.registration.showNotification(title || "WaschGehtAb", {
    body: body || "Status aktualisiert",
    icon: icon || "/vite.svg",
    data: payload.data || {},
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(url) && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
