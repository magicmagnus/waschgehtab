import { ref, onValue, get } from "firebase/database";
import { auth, db } from "./firebase";

/**
 * Client-side notification system - alternative to Cloud Functions
 * Watches for status changes and sends notifications directly from the client
 */

let statusWatcher = null;
let currentUser = null;

// Initialize client-side notification watcher
export function initClientNotifications(user) {
  currentUser = user;

  if (!user) {
    console.log("User not available for client notifications");
    return;
  }

  // Clean up existing watcher
  if (statusWatcher) {
    statusWatcher();
    statusWatcher = null;
  }

  console.log("Initializing client-side notification watcher for user:", user.uid);

  // Watch for status changes
  const statusRef = ref(db, "machines/washer/status");
  statusWatcher = onValue(statusRef, async (snapshot) => {
    const status = snapshot.val();

    if (!status) return;

    console.log("Status change detected:", status);

    // Check if this is a notification trigger for current user
    if (await shouldNotifyUser(status, user.uid)) {
      await sendLocalNotification(status, user);
    }
  });

  console.log("Client notification watcher initialized");
}

// Check if we should notify the current user
async function shouldNotifyUser(status, userUid) {
  // Only notify if status is "paused" and user is next
  if (status.phase !== "paused" || !status.next?.uid) {
    return false;
  }

  // Only notify if this user is the next one
  if (status.next.uid !== userUid) {
    return false;
  }

  console.log("User should be notified - they are next in queue");
  return true;
}

// Send local notification and browser notification
async function sendLocalNotification(status, user) {
  try {
    console.log("Sending local notification to user:", user.uid);

    // Show browser notification
    if (Notification.permission === "granted") {
      const notification = new Notification("🧺 Du bist dran!", {
        body: "Die Waschmaschine ist frei. Bestätige jetzt deinen Waschgang!",
        icon: "/android-chrome-192x192.png",
        badge: "/android-chrome-192x192.png",
        tag: "washing-turn",
        requireInteraction: true,
        vibrate: [200, 100, 200, 100, 200],
        data: {
          action: "washing_turn",
          machine: "washer",
          userId: user.uid,
          timestamp: Date.now(),
        },
      });

      notification.onclick = () => {
        window.focus();
        notification.close();

        // Optionally scroll to the action button or show a highlight
        const acceptButton = document.querySelector('[data-action="accept-wash"]');
        if (acceptButton) {
          acceptButton.scrollIntoView({ behavior: "smooth" });
          acceptButton.style.animation = "pulse 2s";
        }
      };

      // Auto-close after 30 seconds
      setTimeout(() => notification.close(), 30000);
    }

    // Also show in-app notification if possible
    showInAppNotification();
  } catch (error) {
    console.error("Error sending local notification:", error);
  }
}

// Show in-app notification banner
function showInAppNotification() {
  // Create in-app notification
  const notification = document.createElement("div");
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, #22c55e, #16a34a);
    color: white;
    padding: 16px 24px;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(34, 197, 94, 0.4);
    z-index: 10000;
    font-family: system-ui, -apple-system, sans-serif;
    font-weight: 600;
    font-size: 16px;
    text-align: center;
    min-width: 300px;
    animation: slideDown 0.5s ease-out;
  `;

  notification.innerHTML = `
    <div style="display: flex; align-items: center; gap: 12px;">
      <span style="font-size: 24px;">🧺</span>
      <div>
        <div style="font-size: 18px; margin-bottom: 4px;">Du bist dran!</div>
        <div style="font-size: 14px; opacity: 0.9;">Die Waschmaschine ist frei</div>
      </div>
    </div>
  `;

  // Add CSS animation
  const style = document.createElement("style");
  style.textContent = `
    @keyframes slideDown {
      from { transform: translateX(-50%) translateY(-100%); opacity: 0; }
      to { transform: translateX(-50%) translateY(0); opacity: 1; }
    }
    @keyframes slideUp {
      from { transform: translateX(-50%) translateY(0); opacity: 1; }
      to { transform: translateX(-50%) translateY(-100%); opacity: 0; }
    }
  `;
  document.head.appendChild(style);

  document.body.appendChild(notification);

  // Remove after 10 seconds with animation
  setTimeout(() => {
    notification.style.animation = "slideUp 0.5s ease-in forwards";
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    }, 500);
  }, 10000);

  // Click to dismiss
  notification.addEventListener("click", () => {
    notification.style.animation = "slideUp 0.5s ease-in forwards";
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 500);
  });
}

// Clean up watcher
export function cleanupClientNotifications() {
  if (statusWatcher) {
    statusWatcher();
    statusWatcher = null;
  }
  currentUser = null;
  console.log("Client notification watcher cleaned up");
}

// Test function for manual testing
export async function testClientNotification() {
  if (!currentUser) {
    console.error("No current user for testing");
    return;
  }

  console.log("Sending test notification...");

  const mockStatus = {
    phase: "paused",
    next: {
      uid: currentUser.uid,
      name: currentUser.displayName || "Test User",
    },
  };

  await sendLocalNotification(mockStatus, currentUser);
}
