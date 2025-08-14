import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";
import { auth, app, db } from "./firebase";
import { ref, set, remove } from "firebase/database";

// Initialize messaging for client-side notifications only
export async function initMessaging() {
  try {
    if (!(await isSupported())) {
      console.warn("Messaging not supported in this browser.");
      return null;
    }

    // Request notification permission
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.info("Notification permission not granted.");
      return null;
    }

    console.log("Client-side notifications initialized successfully");
    return "client-notifications-enabled";
  } catch (err) {
    console.error("initMessaging failed", err);
    return null;
  }
}

// Remove token when user logs out (placeholder for future use)
export async function removeToken(token) {
  try {
    console.log("Cleaning up notifications on logout");
  } catch (e) {
    console.error("removeToken error", e);
  }
}

// Check if notifications are supported and enabled
export function getNotificationStatus() {
  if (!("Notification" in window)) {
    return { supported: false, permission: "not-supported" };
  }

  return {
    supported: true,
    permission: Notification.permission,
  };
}

// Request notification permission explicitly
export async function requestNotificationPermission() {
  if (!("Notification" in window)) {
    return "not-supported";
  }

  if (Notification.permission === "granted") {
    return "granted";
  }

  if (Notification.permission === "denied") {
    return "denied";
  }

  // Request permission
  const permission = await Notification.requestPermission();
  return permission;
}
