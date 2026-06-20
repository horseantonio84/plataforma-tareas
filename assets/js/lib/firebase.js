// ─────────────────────────────────────────
//  AulaOnline · Punto único de acceso al SDK de Firebase
//  Todos los módulos importan auth/db y las funciones de
//  Firestore/Auth que necesiten desde aquí, en vez de repetir
//  las URLs del CDN en cada archivo.
// ─────────────────────────────────────────
export { auth, db } from '../firebase-config.js';

export {
  onAuthStateChanged,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

export {
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  serverTimestamp,
  onSnapshot,
  arrayUnion,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
