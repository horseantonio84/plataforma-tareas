// ─────────────────────────────────────────
//  Guardia de autenticación del panel de alumno
// ─────────────────────────────────────────
import {
  auth, db, onAuthStateChanged, signOut,
  doc, getDoc, updateDoc, serverTimestamp,
} from '../lib/firebase.js';
import { state } from './state.js';
import { renderClassSwitcher } from './class-switcher.js';
import { showSection } from './navigation.js';
import { startSubmissionsListener, startTasksListener, loadSubmissions } from './tasks.js';
import { startAnnouncementsListener } from './announcements.js';
import { startResourcesListener } from './resources.js';
import { startGradesListener } from './grades.js';
import { startChatNotifications } from './chat.js';

function initUI() {
  const initials = (state.currentUser.displayName || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  document.getElementById('avatar-initials').textContent = initials;
  document.getElementById('menu-name').textContent  = state.currentUser.displayName || '—';
  document.getElementById('menu-email').textContent = state.currentUser.email || '—';
  const h = new Date().getHours();
  const greet = h < 13 ? '☀️ Buenos días' : h < 20 ? '👋 Buenas tardes' : '🌙 Buenas noches';
  document.getElementById('greeting-sub').textContent = `· ${greet}, ${(state.currentUser.displayName || '').split(' ')[0]}`;
}

export function initAuthGuard() {
  onAuthStateChanged(auth, async user => {
    if (!user) { window.location.href = 'index.html'; return; }
    const snap = await getDoc(doc(db, 'users', user.uid));
    if (!snap.exists()) { window.location.href = 'index.html'; return; }
    const data = snap.data();
    if (data.role === 'teacher') { window.location.href = 'admin.html'; return; }
    if (!data.approved)          { window.location.href = 'pending.html'; return; }
    state.currentUser = { ...data, uid: user.uid };

    if (!state.currentUser.classIds?.length) {
      state.currentUser.classIds = state.currentUser.classId ? [state.currentUser.classId] : [];
      await updateDoc(doc(db, 'users', user.uid), { classIds: state.currentUser.classIds }).catch(() => {});
    }

    state.allMyClasses = [];
    for (const cid of state.currentUser.classIds) {
      try {
        const cs = await getDoc(doc(db, 'classes', cid));
        if (cs.exists()) state.allMyClasses.push({ id: cs.id, ...cs.data() });
      } catch (e) {}
    }
    if (!state.allMyClasses.length) { window.location.href = 'index.html'; return; }

    const savedId = localStorage.getItem('ao_activeClassId_student');
    state.currentClass = state.allMyClasses.find(c => c.id === savedId) || state.allMyClasses[0];

    renderClassSwitcher();
    initUI();
    updateDoc(doc(db, 'users', user.uid), { lastSeen: serverTimestamp() }).catch(() => {});
    await loadSubmissions();
    startSubmissionsListener();
    startTasksListener();
    startAnnouncementsListener();
    startResourcesListener();
    startGradesListener();
    startChatNotifications();

    const loader = document.getElementById('app-loading');
    if (loader) { loader.classList.add('hiding'); setTimeout(() => loader.remove(), 350); }
    showSection('inicio');
  });
}

document.getElementById('btn-logout').addEventListener('click', async () => {
  await signOut(auth);
  window.location.href = 'index.html';
});
