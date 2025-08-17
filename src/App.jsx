import "./index.css";
import { useState, useEffect } from "react";
import { AuthForm } from "./components/AuthForm";
import { StatusPanel } from "./components/StatusPanel";
import { QueueList } from "./components/QueueList";
import { NotificationSettings } from "./components/NotificationSettings";
import { TimerSettings } from "./components/TimerSettings";
import { auth, db } from "./firebase";
import {
  initClientNotifications,
  cleanupClientNotifications,
  sendFinishedNotification,
  sendTimerExpiredNotification,
} from "./clientNotifications";
import { DebugPanel } from "./components/DebugPanel";
import { ref, onValue, set, push, remove, get, update } from "firebase/database";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";

const actionCodeSettings = {
  url: window.location.href,
  handleCodeInApp: true,
};

function App() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);

  // Waschmaschinen- und Trocknerstatus aus der DB
  // Status-Objekt mit Phasen: free | busy | paused
  const [currentStatus, setCurrentStatus] = useState({ phase: "free", uid: null, name: "Frei" });
  const [queue, setQueue] = useState([]);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [isInQueue, setIsInQueue] = useState(false);
  const [username, setUsername] = useState("");
  const [showUsernameDialog, setShowUsernameDialog] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");
  const [showTimerSettings, setShowTimerSettings] = useState(false);
  const [pendingQueueAcceptance, setPendingQueueAcceptance] = useState(null);

  // IDs für Geräte
  const MACHINE_ID = "washer";
  const DRYER_ID = "dryer";
  // Aktuell nur Waschmaschine implementiert

  // Status und Queue aus der DB lesen
  // Lade Username und Status/Queue
  useEffect(() => {
    if (!user) return;
    // Username laden
    const userRef = ref(db, `users/${user.uid}/name`);
    const unsubUser = onValue(userRef, (snapshot) => {
      const name = snapshot.val();
      if (name) {
        setUsername(name);
        setShowUsernameDialog(false);
      } else {
        setShowUsernameDialog(true);
      }
    });
    // Status/Queue laden
    const statusRef = ref(db, `machines/${MACHINE_ID}/status`);
    const queueRef = ref(db, `machines/${MACHINE_ID}/queue`);
    const unsubStatus = onValue(statusRef, (snapshot) => {
      const val = snapshot.val();
      // Normalisierung alter Statuswerte
      if (!val || val === "Frei") {
        setCurrentStatus({ phase: "free", uid: null, name: "Frei" });
      } else if (val && !val.phase) {
        // Altes Schema: { uid, name }
        setCurrentStatus({
          phase: val.uid ? "busy" : "free",
          uid: val.uid ?? null,
          name: val.name ?? "Frei",
        });
      } else {
        setCurrentStatus(val);
      }
    });
    const unsubQueue = onValue(queueRef, (snapshot) => {
      const val = snapshot.val() || {};
      // Queue als Array von Objekten [{id, uid, name, ts}]
      const arr = Object.entries(val)
        .map(([id, entry]) => ({ id, ...entry }))
        .sort((a, b) => (a.ts ?? 0) - (b.ts ?? 0));
      setQueue(arr);
      setIsInQueue(arr.some((e) => e.uid === user.uid));
    });
    setIsLoadingStatus(false);
    return () => {
      unsubUser();
      unsubStatus();
      unsubQueue();
    };
  }, [user]);

  // Waschgang starten oder in Queue eintragen
  // Username speichern
  const handleSaveUsername = async (e) => {
    e.preventDefault();
    if (!user || !usernameInput.trim()) return;
    await set(ref(db, `users/${user.uid}/name`), usernameInput.trim());
    setShowUsernameDialog(false);
  };

  // Registrierung
  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      // Username direkt speichern
      await set(ref(db, `users/${cred.user.uid}/name`), usernameInput.trim());
      setShowUsernameDialog(false);
      setUsername(usernameInput.trim());
    } catch (err) {
      setMessage("Fehler bei Registrierung: " + err.message);
    }
    setLoading(false);
  };

  // Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setMessage("Fehler beim Login: " + err.message);
    }
    setLoading(false);
  };

  // Waschgang starten (nur wenn frei)
  const handleStartWash = async () => {
    if (!user || !username) return;
    const statusRef = ref(db, `machines/${MACHINE_ID}/status`);
    const statusSnap = await get(statusRef);
    const status = statusSnap.val();
    const phase = !status || status === "Frei" || !status.uid ? "free" : status.phase || "busy";
    if (phase !== "free") return; // safeguard

    // Show timer selection dialog
    setShowTimerSettings(true);
  };

  // Start wash with timer (called from TimerSettings component)
  const handleStartWashWithTimer = async (durationMs) => {
    if (!user || !username) return;

    const statusData = {
      phase: "busy",
      uid: user.uid,
      name: username,
    };

    // Add timer data if duration is provided
    if (durationMs) {
      statusData.timer = {
        startTime: Date.now(),
        duration: durationMs,
      };
    }

    // Check if this is from queue acceptance
    if (pendingQueueAcceptance) {
      // Accept from queue with timer
      await update(ref(db), {
        [`machines/${MACHINE_ID}/status`]: statusData,
        [`machines/${MACHINE_ID}/queue/${pendingQueueAcceptance.id}`]: null,
      });
      setPendingQueueAcceptance(null);
    } else {
      // Regular start wash
      await set(ref(db, `machines/${MACHINE_ID}/status`), statusData);
    }
  };

  // Handle timer expiration
  const handleTimerEnd = async () => {
    if (!user || currentStatus.uid !== user.uid) return;

    // Send comprehensive timer expired notifications
    await sendTimerExpiredNotification({ uid: user.uid, name: username }, queue);
  };

  // Sich in die Queue eintragen (immer möglich, auch mehrfach)
  const handleJoinQueue = async () => {
    if (!user || !username) return;
    const queueRef = ref(db, `machines/${MACHINE_ID}/queue`);
    await push(queueRef, { uid: user.uid, name: username, ts: Date.now() });
  };

  // Waschgang beenden -> auf paused setzen und Next vorschlagen
  const handleDone = async () => {
    if (!user) return;
    const statusRef = ref(db, `machines/${MACHINE_ID}/status`);
    const queueRef = ref(db, `machines/${MACHINE_ID}/queue`);

    // Store current user info as "previous" user for the notification
    const previousUser = {
      uid: user.uid,
      name: username,
    };

    // Prüfe Queue und setze paused mit nächstem Kandidaten, sonst frei setzen
    const queueSnap = await get(queueRef);
    const val = queueSnap.val();
    if (val) {
      const entries = Object.entries(val)
        .map(([id, entry]) => ({ id, ...entry }))
        .sort((a, b) => (a.ts ?? 0) - (b.ts ?? 0));
      if (entries.length > 0) {
        const first = entries[0];
        await set(statusRef, {
          phase: "paused",
          previous: previousUser, // Add previous user info for notifications
          next: { id: first.id, uid: first.uid, name: first.name },
        });

        // Send notification to the user who just finished about who's next
        await sendFinishedNotification(first, { uid: user.uid, name: username });

        return; // Eintrag bleibt in der Queue bis Annahme
      }
    }
    // Keine Queue: frei setzen
    await set(statusRef, { phase: "free", uid: null, name: "Frei" });
  };

  // Nächster übernimmt explizit von paused -> busy und Queue-Eintrag löschen
  const handleAcceptNext = async () => {
    if (!user || currentStatus.phase !== "paused" || !currentStatus.next) return;
    const next = currentStatus.next;
    // Nur der vorgesehene Nutzer darf übernehmen
    if (next.uid !== user.uid) return;

    // Store pending queue acceptance and show timer dialog
    setPendingQueueAcceptance(next);
    setShowTimerSettings(true);
  };

  // Eigenen Eintrag aus der Queue entfernen
  const handleRemoveQueueEntry = async (id) => {
    await remove(ref(db, `machines/${MACHINE_ID}/queue/${id}`));
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Initialize client-side notifications
        initClientNotifications(firebaseUser);
      } else {
        // Clean up when user logs out
        cleanupClientNotifications();
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    // Clean up client notifications
    cleanupClientNotifications();
    await signOut(auth);
    setMessage("Abgemeldet.");
  };

  const handleTokenUpdate = () => {
    // Placeholder for future use
  };

  return (
    <div className="min-w-screen flex min-h-[100dvh] flex-col items-center justify-between bg-zinc-900 p-6 pt-4 text-gray-100 shadow-lg">
      {message && <div className="mb-4 text-center text-sm text-blue-400">{message}</div>}
      {!user || showUsernameDialog ? (
        <AuthForm
          isRegister={isRegister}
          setIsRegister={setIsRegister}
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          usernameInput={usernameInput}
          setUsernameInput={setUsernameInput}
          loading={loading}
          handleRegister={handleRegister}
          handleLogin={handleLogin}
          showUsernameDialog={showUsernameDialog}
          handleSaveUsername={handleSaveUsername}
        />
      ) : (
        <div className="flex w-full max-w-xl flex-col items-center">
          <StatusPanel
            user={user}
            username={username}
            currentStatus={currentStatus}
            queue={queue}
            isLoadingStatus={isLoadingStatus}
            handleStartWash={handleStartWash}
            handleJoinQueue={handleJoinQueue}
            handleDone={handleDone}
            handleAcceptNext={handleAcceptNext}
            handleRemoveQueueEntry={handleRemoveQueueEntry}
            handleLogout={handleLogout}
            onTimerEnd={handleTimerEnd}
          />
          <TimerSettings
            isVisible={showTimerSettings}
            onStartWithTimer={handleStartWashWithTimer}
            onClose={() => {
              setShowTimerSettings(false);
              setPendingQueueAcceptance(null);
            }}
          />
          <QueueList
            queue={queue}
            user={user}
            currentStatus={currentStatus}
            onRemove={handleRemoveQueueEntry}
            onJoin={handleJoinQueue}
          />
          <div className="mt-6 w-full max-w-xl">
            <NotificationSettings onTokenUpdate={handleTokenUpdate} />
          </div>
          <DebugPanel user={user} />
        </div>
      )}
      <div className="mt-2 flex flex-col items-center text-gray-400">
        <button onClick={handleLogout} className="mt-8 text-xs text-gray-400 underline">
          Logout
        </button>
        <footer className="mt-4 text-xs text-gray-500">&copy; 2025 WaschGehtAb</footer>
      </div>
    </div>
  );
}

export default App;
