import "./index.css";
import { useState, useEffect } from "react";
import { AuthForm } from "./components/AuthForm";
import { StatusPanel } from "./components/StatusPanel";
import { QueueList } from "./components/QueueList";
import { auth, db } from "./firebase";
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
    await set(statusRef, { phase: "busy", uid: user.uid, name: username });
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
          next: { id: first.id, uid: first.uid, name: first.name },
        });
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
    await update(ref(db), {
      [`machines/${MACHINE_ID}/status`]: { phase: "busy", uid: next.uid, name: next.name },
      [`machines/${MACHINE_ID}/queue/${next.id}`]: null,
    });
  };

  // Eigenen Eintrag aus der Queue entfernen
  const handleRemoveQueueEntry = async (id) => {
    await remove(ref(db, `machines/${MACHINE_ID}/queue/${id}`));
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    setMessage("Abgemeldet.");
  };

  return (
    <div className="min-w-screen flex min-h-screen flex-col items-center justify-between bg-zinc-900 p-6 pt-4 text-gray-100 shadow-lg">
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
        <div className="flex w-full flex-col items-center">
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
          />
          <QueueList
            queue={queue}
            user={user}
            currentStatus={currentStatus}
            onRemove={handleRemoveQueueEntry}
            onJoin={handleJoinQueue}
          />
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
