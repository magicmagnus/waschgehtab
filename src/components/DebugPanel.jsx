import { useState } from "react";
import { testClientNotification, sendFinishedNotification } from "../clientNotifications";

export function DebugPanel({ user }) {
  const [testResult, setTestResult] = useState("");

  if (!user) return null;
  if (!(import.meta.env.DEV || import.meta.env.VITE_DEBUG === "true")) return null;

  const testClientNotifications = async () => {
    try {
      setTestResult("Sending test notification...");
      await testClientNotification();
      setTestResult("✅ Client notification sent! Check your screen and browser notifications.");
    } catch (error) {
      setTestResult(`❌ Client notification error: ${error.message}`);
    }

    // Clear result after 5 seconds
    setTimeout(() => setTestResult(""), 5000);
  };

  const testFinishedNotification = async () => {
    try {
      setTestResult("Sending finished notification test...");
      const mockNextUser = { uid: "test-next-uid", name: "Anna Schmidt" };
      await sendFinishedNotification(mockNextUser, user);
      setTestResult("✅ Finished notification sent! Check your screen for the in-app popup.");
    } catch (error) {
      setTestResult(`❌ Finished notification error: ${error.message}`);
    }

    // Clear result after 5 seconds
    setTimeout(() => setTestResult(""), 5000);
  };

  return (
    <div className="mt-6 w-full max-w-xl rounded-lg border border-zinc-700 bg-zinc-800 p-3 text-xs text-zinc-300">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-zinc-200">Debug Panel</h3>
        <span className="text-[10px] opacity-70">env: {import.meta.env.MODE}</span>
      </div>
      <div className="mt-2 space-y-3">
        <div>
          <div className="text-zinc-400">User UID:</div>
          <code className="break-all text-[10px] text-emerald-400">{user.uid}</code>
        </div>

        <div>
          <div className="text-zinc-400">Client Notifications:</div>
          <div className="space-y-2">
            <div className="text-[10px] text-green-400">
              ✅ Active - Real-time status monitoring
            </div>
            <button
              onClick={testClientNotifications}
              className="rounded bg-green-600 px-2 py-1 text-[10px] hover:bg-green-500"
            >
              Test Client Notification
            </button>
            <button
              onClick={testFinishedNotification}
              className="rounded bg-blue-600 px-2 py-1 text-[10px] hover:bg-blue-500"
            >
              Test Finished Notification
            </button>
          </div>
        </div>

        {testResult && (
          <div
            className={`rounded border p-2 text-[10px] ${
              testResult.includes("✅")
                ? "border-green-600 bg-green-900 text-green-200"
                : "border-red-600 bg-red-900 text-red-200"
            }`}
          >
            {testResult}
          </div>
        )}

        <div className="border-t border-zinc-700 pt-2 text-[10px] text-zinc-500">
          <div>
            Notifications:{" "}
            {"Notification" in window
              ? `${Notification.permission === "granted" ? "✅" : "⚠️"} ${Notification.permission}`
              : "❌ Not supported"}
          </div>
          <div>
            Browser: {navigator.userAgent.includes("Chrome") ? "Chrome" : "Firefox"}
            {navigator.userAgent.includes("Android") ? " (Android)" : " (Desktop)"}
          </div>
          <div>
            PWA Mode: {window.matchMedia("(display-mode: standalone)").matches ? "✅ Yes" : "❌ No"}
          </div>
          <div>Vibration: {navigator.vibrate ? "✅ Supported" : "❌ Not supported"}</div>
          <div className="mt-1">
            <strong>System:</strong> Client-side only (no Cloud Functions needed)
          </div>
          {navigator.userAgent.includes("Android") && navigator.userAgent.includes("Chrome") && (
            <div className="mt-1 text-yellow-400">
              <strong>Android Chrome:</strong> Notifications may need app interaction first
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
