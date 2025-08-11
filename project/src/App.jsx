
import './index.css';
import { useState, useEffect } from 'react';

import { auth, db } from './firebase';
import { ref, onValue, set, push, remove, get, update, serverTimestamp } from 'firebase/database';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';

const actionCodeSettings = {
  url: window.location.href,
  handleCodeInApp: true,
};

function App() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);

  // Waschmaschinen- und Trocknerstatus aus der DB
  // Status-Objekt mit Phasen: free | busy | paused
  const [currentStatus, setCurrentStatus] = useState({ phase: 'free', uid: null, name: 'Frei' });
  const [queue, setQueue] = useState([]);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [isInQueue, setIsInQueue] = useState(false);
  const [username, setUsername] = useState('');
  const [showUsernameDialog, setShowUsernameDialog] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');

  // IDs für Geräte
  const MACHINE_ID = 'washer';
  const DRYER_ID = 'dryer';
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
      if (!val || val === 'Frei') {
        setCurrentStatus({ phase: 'free', uid: null, name: 'Frei' });
      } else if (val && !val.phase) {
        // Altes Schema: { uid, name }
        setCurrentStatus({ phase: val.uid ? 'busy' : 'free', uid: val.uid ?? null, name: val.name ?? 'Frei' });
      } else {
        setCurrentStatus(val);
      }
    });
    const unsubQueue = onValue(queueRef, (snapshot) => {
      const val = snapshot.val() || {};
      // Queue als Array von Objekten [{id, uid, name, ts}]
      const arr = Object.entries(val).map(([id, entry]) => ({ id, ...entry }))
        .sort((a, b) => (a.ts ?? 0) - (b.ts ?? 0));
      setQueue(arr);
      setIsInQueue(arr.some(e => e.uid === user.uid));
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
    setMessage('');
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      // Username direkt speichern
      await set(ref(db, `users/${cred.user.uid}/name`), usernameInput.trim());
      setShowUsernameDialog(false);
      setUsername(usernameInput.trim());
    } catch (err) {
      setMessage('Fehler bei Registrierung: ' + err.message);
    }
    setLoading(false);
  };

  // Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setMessage('Fehler beim Login: ' + err.message);
    }
    setLoading(false);
  };

  // Waschgang starten oder in Queue eintragen (mehrfache Einträge möglich)
  const handleMainButton = async () => {
    if (!user || !username) return;
    const statusRef = ref(db, `machines/${MACHINE_ID}/status`);
    const queueRef = ref(db, `machines/${MACHINE_ID}/queue`);
    const statusSnap = await get(statusRef);
    const status = statusSnap.val();
    const phase = (!status || status === 'Frei' || !status.uid) ? 'free' : (status.phase || 'busy');
    if (phase === 'free') {
      // Maschine übernehmen
      await set(statusRef, { phase: 'busy', uid: user.uid, name: username });
    } else {
      // In Queue eintragen (mehrfach möglich)
      await push(queueRef, { uid: user.uid, name: username, ts: Date.now() });
    }
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
        await set(statusRef, { phase: 'paused', next: { id: first.id, uid: first.uid, name: first.name } });
        return; // Eintrag bleibt in der Queue bis Annahme
      }
    }
    // Keine Queue: frei setzen
    await set(statusRef, { phase: 'free', uid: null, name: 'Frei' });
  };

  // Nächster übernimmt explizit von paused -> busy und Queue-Eintrag löschen
  const handleAcceptNext = async () => {
    if (!user || currentStatus.phase !== 'paused' || !currentStatus.next) return;
    const next = currentStatus.next;
    // Nur der vorgesehene Nutzer darf übernehmen
    if (next.uid !== user.uid) return;
    await update(ref(db), {
      [`machines/${MACHINE_ID}/status`]: { phase: 'busy', uid: next.uid, name: next.name },
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
    setMessage('Abgemeldet.');
  };

  return (
    <div className="min-h-screen flex flex-col items-center min-w-screen justify-center bg-gray-900 text-gray-100">
      <h1 className="text-3xl font-bold mb-8">WaschGehtAb</h1>
      {message && <div className="mb-4 text-center text-sm text-blue-400">{message}</div>}
      {!user || showUsernameDialog ? (
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-xs flex flex-col items-center">
          <div className="flex w-full mb-4">
            <button
              className={`flex-1 py-2 rounded-l ${!isRegister ? 'bg-blue-700' : 'bg-gray-700'} text-white`}
              onClick={() => setIsRegister(false)}
              type="button"
            >Login</button>
            <button
              className={`flex-1 py-2 rounded-r ${isRegister ? 'bg-blue-700' : 'bg-gray-700'} text-white`}
              onClick={() => setIsRegister(true)}
              type="button"
            >Registrieren</button>
          </div>
          <form onSubmit={isRegister ? handleRegister : handleLogin} className="w-full flex flex-col items-center">
            <input
              type="email"
              className="mb-2 w-full px-3 py-2 rounded bg-gray-700 text-gray-100 focus:outline-none"
              placeholder="E-Mail-Adresse"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              disabled={loading}
            />
            <input
              type="password"
              className="mb-2 w-full px-3 py-2 rounded bg-gray-700 text-gray-100 focus:outline-none"
              placeholder="Passwort"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              disabled={loading}
              minLength={6}
            />
            {isRegister && (
              <input
                type="text"
                className="mb-2 w-full px-3 py-2 rounded bg-gray-700 text-gray-100 focus:outline-none"
                placeholder="Anzeigename"
                value={usernameInput}
                onChange={e => setUsernameInput(e.target.value)}
                required
                maxLength={24}
              />
            )}
            <button
              type="submit"
              className="w-full py-2 px-4 rounded bg-blue-600 hover:bg-blue-700 transition font-semibold"
              disabled={loading}
            >
              {loading ? (isRegister ? 'Registriere...' : 'Logge ein...') : (isRegister ? 'Registrieren' : 'Login')}
            </button>
          </form>
          {showUsernameDialog && !isRegister && (
            <form onSubmit={handleSaveUsername} className="w-full flex flex-col items-center mt-4">
              <input
                type="text"
                className="mb-2 w-full px-3 py-2 rounded bg-gray-700 text-gray-100 focus:outline-none"
                placeholder="Anzeigename"
                value={usernameInput}
                onChange={e => setUsernameInput(e.target.value)}
                required
                maxLength={24}
              />
              <button
                type="submit"
                className="w-full py-2 px-4 rounded bg-blue-600 hover:bg-blue-700 transition font-semibold"
              >
                Anzeigename speichern
              </button>
            </form>
          )}
        </div>
      ) : (
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-xs flex flex-col items-center">
          <div className="mb-4 text-center">
            <p className="text-xl font-bold">Hallo, {username || user.email}!</p>
            <p className="text-sm text-gray-400 mt-1">
              Status: <span className="font-bold text-green-400">
                {currentStatus.phase === 'free' && 'Frei'}
                {currentStatus.phase === 'busy' && currentStatus.name}
                {currentStatus.phase === 'paused' && `Pausiert – wartet auf ${currentStatus.next?.name}`}
              </span>
            </p>
          </div>
          <button
            className="w-full py-4 px-4 rounded bg-green-600 hover:bg-green-700 transition font-bold text-xl mb-4"
            onClick={handleMainButton}
            disabled={isLoadingStatus}
          >
            {currentStatus.phase === 'free' ? 'Waschgang starten' : 'In Queue eintragen'}
          </button>
          {currentStatus.phase === 'busy' && currentStatus.uid === user.uid && (
            <button
              className="w-full py-2 px-4 rounded bg-yellow-600 hover:bg-yellow-700 transition font-semibold mb-4"
              onClick={handleDone}
            >
              Waschgang beenden
            </button>
          )}
          {currentStatus.phase === 'paused' && currentStatus.next?.uid === user.uid && (
            <button
              className="w-full py-2 px-4 rounded bg-blue-600 hover:bg-blue-700 transition font-semibold mb-4"
              onClick={handleAcceptNext}
            >
              Ich wasche jetzt
            </button>
          )}
          <div className="w-full mt-2">
            <h2 className="text-md font-semibold mb-2">Warteschlange:</h2>
            {queue.length === 0 ? (
              <p className="text-gray-400">Niemand wartet.</p>
            ) : (
              <ul className="list-disc list-inside text-gray-200">
                {queue.map((entry, idx) => (
                  <li key={entry.id} className="flex items-center justify-between">
                    <span>{entry.name}</span>
                    {entry.uid === user.uid && (
                      <button
                        className="ml-2 text-xs text-red-400 underline"
                        onClick={() => handleRemoveQueueEntry(entry.id)}
                      >Entfernen</button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button onClick={handleLogout} className="mt-4 text-xs text-gray-400 underline">Logout</button>
        </div>
      )}
      <footer className="mt-10 text-xs text-gray-500">&copy; 2025 WaschGehtAb</footer>
    </div>
  );
}

export default App;
