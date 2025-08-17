import { useState, useEffect } from "react";
import { ref, set } from "firebase/database";
import { db } from "../firebase";

export function WashTimer({ currentStatus, user, onTimerEnd }) {
    const [timeLeft, setTimeLeft] = useState(0);
    const [isExpired, setIsExpired] = useState(false);
    const [hasNotifiedWaitingUsers, setHasNotifiedWaitingUsers] = useState(false);

    // Calculate time left based on Firebase data
    useEffect(() => {
        if (currentStatus.phase === "busy" && currentStatus.timer) {
            const { startTime, duration } = currentStatus.timer;
            const now = Date.now();
            const elapsed = now - startTime;
            const remaining = Math.max(0, duration - elapsed);

            setTimeLeft(remaining);
            setIsExpired(remaining === 0 && elapsed >= duration);
            setHasNotifiedWaitingUsers(false); // Reset notification flag when timer changes
        } else {
            setTimeLeft(0);
            setIsExpired(false);
            setHasNotifiedWaitingUsers(false);
        }
    }, [currentStatus]);

    // Update timer every second
    useEffect(() => {
        if (currentStatus.phase !== "busy" || !currentStatus.timer) {
            return;
        }

        const interval = setInterval(() => {
            const { startTime, duration } = currentStatus.timer;
            const now = Date.now();
            const elapsed = now - startTime;
            const remaining = Math.max(0, duration - elapsed);

            setTimeLeft(remaining);

            // Check if timer just expired
            if (remaining === 0 && elapsed >= duration && !isExpired) {
                setIsExpired(true);

                // Check if current user is the one washing
                const isCurrentUserWashing = currentStatus.uid && currentStatus.uid === user?.uid;

                if (isCurrentUserWashing) {
                    // Current user's timer expired - call the main timer end handler
                    if (onTimerEnd) {
                        onTimerEnd();
                    }
                } else if (!hasNotifiedWaitingUsers) {
                    // Other users should see waiting notification
                    setHasNotifiedWaitingUsers(true);
                    showWaitingUserNotification(currentStatus.name);
                }
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [currentStatus, isExpired, onTimerEnd, hasNotifiedWaitingUsers]);

    // Show notification for waiting users when someone's timer expires
    const showWaitingUserNotification = (washingUserName) => {
        // Create in-app notification for waiting users
        const notification = document.createElement("div");
        notification.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, #f59e0b, #d97706);
      color: white;
      padding: 16px 24px;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(245, 158, 11, 0.4);
      z-index: 10000;
      font-family: system-ui, -apple-system, sans-serif;
      font-weight: 600;
      font-size: 16px;
      text-align: center;
      min-width: 300px;
      max-width: 90vw;
      animation: slideDown 0.5s ease-out;
    `;

        notification.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px;">
        <span style="font-size: 24px;">⏱️</span>
        <div>
          <div style="font-size: 18px; margin-bottom: 4px;">${washingUserName}s Waschzeit ist abgelaufen!</div>
          <div style="font-size: 14px; opacity: 0.9; line-height: 1.3;">
            Die Waschmaschine sollte bald frei sein. Halte dich bereit!
          </div>
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
        if (!document.head.querySelector("style[data-timer-notifications]")) {
            style.setAttribute("data-timer-notifications", "true");
            document.head.appendChild(style);
        }

        document.body.appendChild(notification);

        // Remove after 10 seconds with animation
        setTimeout(() => {
            notification.style.animation = "slideUp 0.5s ease-in forwards";
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
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
    };

    // Format time as HH:MM:SS
    const formatTime = (milliseconds) => {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    };

    // Calculate and format end time
    const getEndTime = () => {
        if (!currentStatus.timer) return "";
        const { startTime, duration } = currentStatus.timer;
        const endTime = new Date(startTime + duration);
        return endTime.toLocaleTimeString("de-DE", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        });
    };

    if (currentStatus.phase !== "busy" || !currentStatus.timer) {
        return null;
    }

    // Check if the current user is the one washing
    const isCurrentUserWashing = currentStatus.uid && currentStatus.uid === user?.uid;

    return (
        <div className="mb-0 flex flex-col items-center gap-1">
            <p
                className={`text-sm font-medium ${isExpired ? "text-red-400 animate-pulse" : "text-gray-300"}`}
            >
                {isExpired ? "Zeit abgelaufen!" : "Verbleibende Zeit:"}
            </p>
            <p
                className={`text-4xl font-bold ${
                    isExpired ? "text-red-400 animate-pulse" : "text-gray-100"
                }`}
            >
                {formatTime(timeLeft)}
            </p>
            {!isExpired && (
                <p className="text-center text-sm text-gray-400">Ende um: {getEndTime()}</p>
            )}
            {isExpired && isCurrentUserWashing && (
                <p className="animate-pulse text-center text-xs text-red-300">
                    Bitte Waschgang beenden
                </p>
            )}
            {isExpired && !isCurrentUserWashing && (
                <p className="text-center text-xs text-orange-300">Waschzeit abgelaufen</p>
            )}
        </div>
    );
}
