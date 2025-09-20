// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, updateDoc, getDoc, arrayUnion } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";
import { getFunctions /*, connectFunctionsEmulator*/ } from "firebase/functions";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "strawberry-plant-ac866.firebaseapp.com",
  projectId: "strawberry-plant-ac866",
  storageBucket: "strawberry-plant-ac866.firebasestorage.app",
  messagingSenderId: "597144290332",
  appId: "1:597144290332:web:c5176a6da33274319c4bd9",
};

// 1) init app FIRST
export const app = initializeApp(firebaseConfig);

// 2) then services (these depend on app)
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, "asia-southeast1"); // correct region

// (optional emulator)
// if (import.meta.env.DEV) connectFunctionsEmulator(functions, "localhost", 5001);

// ---- helpers (unchanged) ----
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
  if (!(await isSupported())) return;
  if ("serviceWorker" in navigator) {
    try { await navigator.serviceWorker.register("/firebase-messaging-sw.js"); }
    catch { return; }
  }
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return;

  const messaging = getMessaging(app);
  try {
    const token = await getToken(messaging, { vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY });
    if (token) await saveUserTokenToFirestore(token);
  } catch (err) { console.error("FCM token error:", err); }

  onMessage(messaging, async (payload) => {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return;
    const n = payload.notification || {};
    const d = payload.data || {};
    reg.showNotification(n.title || d.title || "Berrify", {
      body: n.body || d.body || "Update",
      tag: "watering_reminder_daily",
      renotify: true,
      data: d,
    });
  });
}

onAuthStateChanged(auth, (user) => { if (user) initMessagingForUser(); });

// expose for console debugging
if (typeof window !== "undefined") {
  window.__FB = { app, db, auth, functions };
  if (import.meta.env.DEV) {
    import("firebase/firestore").then((m) => (window.__FBS = m));
  }
}

export default app;
