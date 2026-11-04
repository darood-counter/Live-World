import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const placeholders = Object.values(firebaseConfig).some(v => String(v).includes("PASTE_"));
if (placeholders) {
  console.warn("Live World: Firebase config is not set. Add your Firebase Web App config in js/firebase-config.js.");
}
export const firebaseReady = !placeholders;
export const app = firebaseReady ? initializeApp(firebaseConfig) : null;
export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;
