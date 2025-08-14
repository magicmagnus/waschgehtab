// Firebase-Konfiguration und Initialisierung
import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getDatabase, connectDatabaseEmulator } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyC2pbDqUdTpfMYORDQMCAVp5x3gnRlOPwo",
  authDomain: "waschgehtab-61c62.firebaseapp.com",
  projectId: "waschgehtab-61c62",
  storageBucket: "waschgehtab-61c62.firebasestorage.app",
  messagingSenderId: "26465431600",
  appId: "1:26465431600:web:fa788390af7503ee907df5",
  measurementId: "G-X3B31NDT29",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(
  app,
  "https://waschgehtab-61c62-default-rtdb.europe-west1.firebasedatabase.app"
);

// Optional: connect to local emulators during development
if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === "true") {
  try {
    connectAuthEmulator(auth, "http://localhost:9099");
    connectDatabaseEmulator(db, "localhost", 9000);
    console.info("Firebase emulators connected (auth:9099, db:9000)");
  } catch (e) {
    console.warn("Failed to connect emulators", e);
  }
}
