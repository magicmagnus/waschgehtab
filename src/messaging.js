import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";
import { auth, app, db } from "./firebase";
import { ref, set, remove } from "firebase/database";

// Initialize messaging and register token
export async function initMessaging() {
  try {
    if (!(await isSupported())) {
      console.warn("Messaging not supported in this browser.");
      return null;
    }
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.info("Notification permission not granted.");
      return null;
    }
    const messaging = getMessaging(app);
    const vapidKey = import.meta.env.VITE_VAPID_KEY;
    if (!vapidKey || vapidKey.startsWith("REPLACE_")) {
      console.warn("Missing VAPID key. Set VITE_VAPID_KEY in .env");
      return null;
    }
    const token = await getToken(messaging, { vapidKey });
    const uid = auth.currentUser?.uid;
    if (uid && token) {
      await set(ref(db, `userTokens/${uid}/${token}`), {
        ts: Date.now(),
        ua: navigator.userAgent,
      });
    }
    onMessage(messaging, (payload) => {
      console.log("Foreground push:", payload);
      // Optionally surface an in-app toast
    });
    return token;
  } catch (err) {
    console.error("initMessaging failed", err);
    return null;
  }
}

export async function removeToken(token) {
  try {
    const uid = auth.currentUser?.uid;
    if (uid && token) {
      await remove(ref(db, `userTokens/${uid}/${token}`));
    }
  } catch (e) {
    console.error("removeToken error", e);
  }
}
