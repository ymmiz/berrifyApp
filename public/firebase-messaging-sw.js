// public/firebase-messaging-sw.js
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyCoQrwt1QCbpr4_foobbMrp3c0jLcc-HS8",
  authDomain: "strawberry-plant-ac866.firebaseapp.com",
  projectId: "strawberry-plant-ac866",
  storageBucket: "strawberry-plant-ac866.firebasestorage.app",
  messagingSenderId: "597144290332",
  appId: "1:597144290332:web:c5176a6da33274319c4bd9",
});

const messaging = firebase.messaging();

// Background / closed tab
messaging.onBackgroundMessage((payload) => {
  const n = payload.notification || {};
  const d = payload.data || {};
  const title = n.title || d.title || "Berrify";
  const body  = n.body  || d.body  || "Update";
  self.registration.showNotification(title, {
    body,
    tag: "watering_reminder_daily", // replace same-day reminders
    renotify: true,
    data: d,
    // icon: n.icon || d.icon || "/icons/icon-192x192.png",
  });
});

// Focus or open app on click
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      for (const c of wins) if (c.url.includes("/")) return c.focus();
      return clients.openWindow("/");
    })
  );
});
