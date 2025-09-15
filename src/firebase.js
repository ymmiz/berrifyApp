// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, updateDoc, getDoc, arrayUnion } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "strawberry-plant-ac866.firebaseapp.com",
  projectId: "strawberry-plant-ac866",
  storageBucket: "strawberry-plant-ac866.firebasestorage.app",
  messagingSenderId: "597144290332",
  appId: "1:597144290332:web:c5176a6da33274319c4bd9",
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// ---- helpers ----
async function saveUserTokenToFirestore(token) {
  const user = auth.currentUser;
  if (!user || !token) return;

  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) {
    await setDoc(userRef, { tokens: [token] }, { merge: true });
  } else {
    await updateDoc(userRef, { tokens: arrayUnion(token) });
  }
}

async function initMessagingForUser() {
  if (!(await isSupported())) {
    console.warn("⚠️ FCM not supported in this browser");
    return;
  }

  // Register SW before getToken
  if ("serviceWorker" in navigator) {
    try {
      await navigator.serviceWorker.register("/firebase-messaging-sw.js");
      console.log("✅ Service worker registered");
    } catch (e) {
      console.error("❌ SW registration failed:", e);
      return;
    }
  }

  const perm = await Notification.requestPermission();
  if (perm !== "granted") {
    console.warn("⚠️ Notification permission not granted");
    return;
  }

  const messaging = getMessaging(app);

  try {
    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    });
    if (token) {
      console.log("📩 Your FCM token:", token);
      await saveUserTokenToFirestore(token);
    } else {
      console.warn("⚠️ No registration token available");
    }
  } catch (err) {
    console.error("❌ Error retrieving FCM token:", err);
  }

  // Foreground push → show a real banner via SW
  onMessage(messaging, async (payload) => {
    console.log("💌 FCM foreground:", payload);
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return;

    const n = payload.notification || {};
    const d = payload.data || {};
    const title = n.title || d.title || "Berrify";
    const options = {
      body: n.body || d.body || "Update",
      tag: "watering_reminder_daily", // collapse duplicates
      renotify: true,
      data: d,
    };
    reg.showNotification(title, options);
  });
}

// Only init messaging AFTER user signs in (so we can save token under the user)
onAuthStateChanged(auth, (user) => {
  if (user) initMessagingForUser();
});

export default app;
