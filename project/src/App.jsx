
import './index.css';
import { useState, useEffect } from 'react';

import { auth, db } from './firebase';
import { ref, onValue, set, push, remove, get } from 'firebase/database';
import { sendSignInLinkToEmail, onAuthStateChanged, signOut, isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';

const actionCodeSettings = {
  url: window.location.href,
  handleCodeInApp: true,
};

function App() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Waschmaschinen- und Trocknerstatus aus der DB
  const [currentStatus, setCurrentStatus] = useState('Frei');
  const [queue, setQueue] = useState([]);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [isInQueue, setIsInQueue] = useState(false);

  // IDs für Geräte
  const MACHINE_ID = 'washer';
  const DRYER_ID = 'dryer';
  // Aktuell nur Waschmaschine implementiert

  // Status und Queue aus der DB lesen
  useEffect(() => {
    if (!user) return;
    const statusRef = ref(db, `machines/${MACHINE_ID}/status`);
    const queueRef = ref(db, `machines/${MACHINE_ID}/queue`);
    const unsubStatus = onValue(statusRef, (snapshot) => {
      setCurrentStatus(snapshot.val() || 'Frei');
    });
    const unsubQueue = onValue(queueRef, (snapshot) => {
      const val = snapshot.val() || [];
      // Firebase speichert Arrays als Objekte, daher umwandeln
      const arr = Array.isArray(val) ? val : Object.values(val || {});
      setQueue(arr);
      setIsInQueue(arr.includes(user.email));
    });
    setIsLoadingStatus(false);
    return () => {
      unsubStatus();
      unsubQueue();
    };
  }, [user]);

  // Waschgang starten oder in Queue eintragen
  const handleMainButton = async () => {
    if (!user) return;
    const statusRef = ref(db, `machines/${MACHINE_ID}/status`);
    const queueRef = ref(db, `machines/${MACHINE_ID}/queue`);
    const statusSnap = await get(statusRef);
    const status = statusSnap.val();
    if (status === 'Frei') {
      // Maschine übernehmen
      await set(statusRef, user.email);
    } else if (!queue.includes(user.email)) {
      // In Queue eintragen
      await push(queueRef, user.email);
    }
  };

  // Waschgang beenden
  const handleDone = async () => {
    if (!user) return;
    const statusRef = ref(db, `machines/${MACHINE_ID}/status`);
    const queueRef = ref(db, `machines/${MACHINE_ID}/queue`);
    // Status auf frei setzen
    await set(statusRef, 'Frei');
    // Nächste Person aus der Queue entfernen
    const firstInQueue = queue[0];
    if (firstInQueue) {
      // Entferne die erste Person aus der Queue
      const queueSnap = await get(queueRef);
      const val = queueSnap.val();
      if (val) {
        const keyToRemove = Object.keys(val).find(key => val[key] === firstInQueue);
        if (keyToRemove) {
          await remove(ref(db, `machines/${MACHINE_ID}/queue/${keyToRemove}`));
        }
      }
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
    });
    // Magic Link: Prüfe, ob wir uns gerade per Link anmelden
    if (isSignInWithEmailLink(auth, window.location.href)) {
      let storedEmail = window.localStorage.getItem('emailForSignIn');
      if (!storedEmail) {
        storedEmail = window.prompt('Bitte gib deine E-Mail für den Login ein');
      }
      signInWithEmailLink(auth, storedEmail, window.location.href)
        .then((result) => {
          window.localStorage.removeItem('emailForSignIn');
          setMessage('Erfolgreich eingeloggt!');
        })
        .catch((error) => {
          setMessage('Fehler beim Login: ' + error.message);
        });
    }
    return () => unsubscribe();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem('emailForSignIn', email);
      setMessage('Magic Link wurde gesendet! Bitte prüfe dein E-Mail-Postfach.');
    } catch (err) {
      setMessage('Fehler: ' + err.message);
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await signOut(auth);
    setMessage('Abgemeldet.');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-gray-100">
      <h1 className="text-3xl font-bold mb-8">WaschGehtAb</h1>
      {message && <div className="mb-4 text-center text-sm text-blue-400">{message}</div>}
      {!user ? (
        <form onSubmit={handleLogin} className="bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-xs flex flex-col items-center">
          <p className="mb-4">Bitte einloggen, um die Waschmaschine zu nutzen.</p>
          <input
            type="email"
            className="mb-4 w-full px-3 py-2 rounded bg-gray-700 text-gray-100 focus:outline-none"
            placeholder="E-Mail-Adresse"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            disabled={loading}
          />
          <button
            type="submit"
            className="w-full py-2 px-4 rounded bg-blue-600 hover:bg-blue-700 transition font-semibold"
            disabled={loading}
          >
            {loading ? 'Sende...' : 'Login mit Magic Link'}
          </button>
        </form>
      ) : (
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-xs flex flex-col items-center">
          <div className="mb-4 text-center">
            <p className="text-lg font-semibold">Hallo, {user.email}!</p>
            <p className="text-sm text-gray-400 mt-1">Status: <span className="font-bold text-green-400">{currentStatus === 'Frei' ? 'Frei' : currentStatus}</span></p>
          </div>
          <button
            className="w-full py-4 px-4 rounded bg-green-600 hover:bg-green-700 transition font-bold text-xl mb-4"
            onClick={handleMainButton}
            disabled={isLoadingStatus}
          >
            {currentStatus === 'Frei' ? 'Waschgang starten' : isInQueue ? 'Du bist in der Warteschlange' : 'In Queue eintragen'}
          </button>
          {currentStatus === user.email && (
            <button
              className="w-full py-2 px-4 rounded bg-yellow-600 hover:bg-yellow-700 transition font-semibold mb-4"
              onClick={handleDone}
            >
              Waschgang beenden
            </button>
          )}
          <div className="w-full mt-2">
            <h2 className="text-md font-semibold mb-2">Warteschlange:</h2>
            {queue.length === 0 ? (
              <p className="text-gray-400">Niemand wartet.</p>
            ) : (
              <ul className="list-disc list-inside text-gray-200">
                {queue.map((person, idx) => (
                  <li key={idx}>{person}</li>
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
