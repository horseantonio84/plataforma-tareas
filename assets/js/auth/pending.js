// ─────────────────────────────────────────
//  Página de espera de aprobación (pending.html)
// ─────────────────────────────────────────
import { auth, db, onAuthStateChanged, signOut, doc, getDoc } from '../lib/firebase.js';

onAuthStateChanged(auth, user => {
  if (!user) window.location.href = 'index.html';
});

document.getElementById('btn-check').addEventListener('click', async () => {
  const user = auth.currentUser;
  if (!user) return;
  const snap = await getDoc(doc(db, 'users', user.uid));
  if (snap.exists() && snap.data().approved) {
    window.location.href = 'dashboard.html';
  } else {
    const t = document.createElement('div');
    t.className = 'toast toast-warning';
    t.innerHTML = '<i class="bi bi-clock"></i> Aún pendiente. El profesor todavía no ha aprobado tu acceso.';
    document.getElementById('toast-container').appendChild(t);
    setTimeout(() => t.remove(), 4000);
  }
});

document.getElementById('btn-logout').addEventListener('click', async () => {
  await signOut(auth);
  window.location.href = 'index.html';
});
