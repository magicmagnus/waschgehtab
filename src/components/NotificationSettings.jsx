import { useState, useEffect } from "react";
import { getNotificationStatus, requestNotificationPermission } from "../messaging";

export function NotificationSettings({ onTokenUpdate }) {
  const [notificationStatus, setNotificationStatus] = useState({
    supported: false,
    permission: "default",
  });
  const [message, setMessage] = useState("");

  useEffect(() => {
    setNotificationStatus(getNotificationStatus());
  }, []);

  const handleEnableNotifications = async () => {
    setMessage("");

    try {
      const permission = await requestNotificationPermission();

      if (permission === "granted") {
        setMessage(
          "✅ Benachrichtigungen aktiviert! Du erhältst jetzt Benachrichtigungen wenn du dran bist."
        );
      } else if (permission === "denied") {
        setMessage(
          "❌ Benachrichtigungen wurden abgelehnt. Du kannst sie in den Browser-Einstellungen aktivieren."
        );
      } else {
        setMessage("⚠️ Benachrichtigungen konnten nicht aktiviert werden.");
      }

      setNotificationStatus(getNotificationStatus());
    } catch (error) {
      console.error("Error enabling notifications:", error);
      setMessage("❌ Fehler beim Aktivieren der Benachrichtigungen: " + error.message);
    }
  };

  if (!notificationStatus.supported) {
    return (
      <div className="w-full max-w-xl rounded-lg border border-gray-600 bg-gray-800 p-4">
        <h3 className="text-lg font-semibold text-gray-200">Push-Benachrichtigungen</h3>
        <p className="mt-2 text-sm text-gray-400">
          Dein Browser unterstützt keine Push-Benachrichtigungen.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl rounded-lg border border-gray-600 bg-gray-800 p-4">
      <h3 className="text-lg font-semibold text-gray-200">Push-Benachrichtigungen</h3>

      {notificationStatus.permission === "granted" ? (
        <div className="mt-3">
          <div className="flex items-center space-x-2">
            <div className="h-3 w-3 rounded-full bg-green-500"></div>
            <span className="text-sm text-green-400">Benachrichtigungen sind aktiviert</span>
          </div>
          <p className="mt-2 text-sm text-gray-400">
            Du erhältst eine Benachrichtigung, wenn du an der Reihe bist zu waschen.
          </p>
        </div>
      ) : (
        <div className="mt-3">
          <div className="flex items-center space-x-2">
            <div className="h-3 w-3 rounded-full bg-orange-500"></div>
            <span className="text-sm text-orange-400">
              {notificationStatus.permission === "denied"
                ? "Benachrichtigungen sind deaktiviert"
                : "Benachrichtigungen sind nicht aktiviert"}
            </span>
          </div>

          {notificationStatus.permission === "denied" ? (
            <div className="mt-3">
              <p className="text-sm text-gray-400">
                Benachrichtigungen wurden blockiert. Du kannst sie in den Browser-Einstellungen
                wieder aktivieren:
              </p>
              <ol className="mt-2 text-xs text-gray-500 space-y-1">
                <li>1. Klicke auf das Schloss-Symbol in der Adressleiste</li>
                <li>2. Stelle "Benachrichtigungen" auf "Zulassen"</li>
                <li>3. Lade die Seite neu</li>
              </ol>
            </div>
          ) : (
            <div className="mt-3">
              <p className="text-sm text-gray-400 mb-3">
                Aktiviere Benachrichtigungen, um informiert zu werden, wenn du dran bist.
              </p>
              <button
                onClick={handleEnableNotifications}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
              >
                Benachrichtigungen aktivieren
              </button>
            </div>
          )}
        </div>
      )}

      {message && (
        <div
          className={`mt-3 rounded-md p-2 text-sm ${
            message.includes("aktiviert")
              ? "bg-green-900 text-green-200"
              : "bg-orange-900 text-orange-200"
          }`}
        >
          {message}
        </div>
      )}
    </div>
  );
}
