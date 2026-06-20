// ─────────────────────────────────────────
//  Guardia de autenticación del panel de profesor: comprueba sesión y
//  rol, carga (o crea) la clase del profesor y arranca el resto de la app.
// ─────────────────────────────────────────
import {
  auth, db, onAuthStateChanged, signOut,
  doc, getDoc, getDocs, addDoc, collection, query, where, serverTimestamp,
} from '../lib/firebase.js';
import { state } from './state.js';
import { generateCode } from '../shared/format.js';
import { renderClassSwitcher } from './class-switcher.js';
import { showSection } from './navigation.js';
import { startNotifications } from './notifications.js';
import { startChatNotifications } from './chat.js';

async function loadClass() {
  const q    = query(collection(db, 'classes'), where('teacherUid', '==', state.currentUser.uid));
  const snap = await getDocs(q);
  if (snap.empty) {
    const code = generateCode();
    const ref  = await addDoc(collection(db, 'classes'), {
      name: 'Mi Clase', description: '',
      teacherUid: state.currentUser.uid, teacherName: state.currentUser.displayName,
      code, createdAt: serverTimestamp(),
    });
    state.allClasses = [{ id: ref.id, name: 'Mi Clase', code, description: '' }];
  } else {
    state.allClasses = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    state.allClasses.sort((a, b) => (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0));
  }
  const savedId = localStorage.getItem('ao_activeClassId');
  state.currentClass = state.allClasses.find(c => c.id === savedId) || state.allClasses[0];
  renderClassSwitcher();
  document.getElementById('settings-code').textContent = state.currentClass.code;
}

function initUI() {
  const initials = (state.currentUser.displayName || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  document.getElementById('avatar-initials').textContent = initials;
  document.getElementById('menu-name').textContent  = state.currentUser.displayName || '—';
  document.getElementById('menu-email').textContent = state.currentUser.email || '—';
  const h = new Date().getHours();
  const greet = h < 13 ? 'Buenos días' : h < 20 ? 'Buenas tardes' : 'Buenas noches';
  document.getElementById('greeting-time').textContent = `· ${greet}, ${(state.currentUser.displayName || '').split(' ')[0]}`;
}

let _initialized = false;

export function initAuthGuard() {
  onAuthStateChanged(auth, async user => {
    if (_initialized) return;
    if (!user) { window.location.href = 'index.html'; return; }
    try {
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (!snap.exists() || snap.data().role !== 'teacher') {
        window.location.href = 'index.html'; return;
      }
      state.currentUser = { ...snap.data(), uid: user.uid };
      await loadClass();
      initUI();
      startNotifications();
      startChatNotifications();
      _initialized = true;
      const loader = document.getElementById('app-loading');
      if (loader) { loader.classList.add('hiding'); setTimeout(() => loader.remove(), 350); }
      showSection('inicio');
    } catch (err) {
      console.error('Error al inicializar:', err);
      document.getElementById('topbar-classname').textContent = 'Error de conexión';
    }
  });
}

document.getElementById('btn-logout').addEventListener('click', async () => {
  await signOut(auth);
  window.location.href = 'index.html';
});
