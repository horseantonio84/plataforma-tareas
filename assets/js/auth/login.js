// ─────────────────────────────────────────
//  Página de acceso (index.html): login + registro + reset de contraseña
// ─────────────────────────────────────────
import {
  auth, db, onAuthStateChanged,
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  sendPasswordResetEmail, updateProfile,
  doc, getDoc, setDoc, collection, query, where, getDocs, serverTimestamp,
} from '../lib/firebase.js';

document.getElementById('yr').textContent = new Date().getFullYear();

// Si ya hay sesión iniciada, redirige según el rol/estado del usuario
onAuthStateChanged(auth, async user => {
  if (!user) return;
  const snap = await getDoc(doc(db, 'users', user.uid));
  if (!snap.exists()) return;
  const data = snap.data();
  if (data.role === 'teacher')  window.location.href = 'admin.html';
  else if (data.approved)       window.location.href = 'dashboard.html';
  else                          window.location.href = 'pending.html';
});

function showAlert(msg, type = 'error') {
  const el = document.getElementById('auth-alert');
  el.className = `alert alert-${type}`;
  el.innerHTML = `<i class="bi bi-${type === 'error' ? 'exclamation-circle' : 'check-circle'}"></i> ${msg}`;
  el.classList.remove('d-none');
}
function clearAlert() {
  document.getElementById('auth-alert').classList.add('d-none');
}

function setLoading(btnId, on) {
  const btn = document.getElementById(btnId);
  btn.classList.toggle('loading', on);
  btn.disabled = on;
}

function switchTab(tab) {
  clearAlert();
  document.getElementById('form-login').classList.toggle('d-none', tab !== 'login');
  document.getElementById('form-register').classList.toggle('d-none', tab !== 'register');
  document.getElementById('tab-login').classList.toggle('active', tab === 'login');
  document.getElementById('tab-register').classList.toggle('active', tab === 'register');
}

document.querySelectorAll('.auth-tab').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

function togglePass(inputId, btnId) {
  const input = document.getElementById(inputId);
  const icon = document.querySelector(`#${btnId} i`);
  if (!input || !icon) return;
  if (input.type === 'password') { input.type = 'text'; icon.className = 'bi bi-eye-slash'; }
  else { input.type = 'password'; icon.className = 'bi bi-eye'; }
}

document.getElementById('eye-login').addEventListener('click', () => togglePass('login-pass', 'eye-login'));
document.getElementById('eye-reg').addEventListener('click', () => togglePass('reg-pass', 'eye-reg'));

document.getElementById('reg-code').addEventListener('input', e => {
  e.target.value = e.target.value.toUpperCase();
});

document.getElementById('form-login').addEventListener('submit', async e => {
  e.preventDefault(); clearAlert();
  const email = document.getElementById('login-email').value.trim();
  const pass  = document.getElementById('login-pass').value;
  setLoading('btn-login', true);
  try {
    await signInWithEmailAndPassword(auth, email, pass);
    // onAuthStateChanged se encarga de redirigir
  } catch (err) {
    setLoading('btn-login', false);
    const msgs = {
      'auth/user-not-found':     'No existe una cuenta con ese correo.',
      'auth/wrong-password':     'Contraseña incorrecta.',
      'auth/invalid-credential': 'Correo o contraseña incorrectos.',
      'auth/too-many-requests':  'Demasiados intentos. Espera un momento.',
      'auth/user-disabled':      'Esta cuenta ha sido desactivada.',
    };
    showAlert(msgs[err.code] || `Error: ${err.message}`);
  }
});

document.getElementById('form-register').addEventListener('submit', async e => {
  e.preventDefault(); clearAlert();
  const name  = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const pass  = document.getElementById('reg-pass').value;
  const code  = document.getElementById('reg-code').value.trim().toUpperCase();

  if (pass.length < 6) { showAlert('La contraseña debe tener al menos 6 caracteres.'); return; }
  setLoading('btn-register', true);

  try {
    const classQ    = query(collection(db, 'classes'), where('code', '==', code));
    const classSnap = await getDocs(classQ);
    if (classSnap.empty) {
      showAlert('Código de clase no válido. Compruébalo con tu profesor.');
      setLoading('btn-register', false); return;
    }
    const classData = classSnap.docs[0].data();
    const classId   = classSnap.docs[0].id;

    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(cred.user, { displayName: name });
    await setDoc(doc(db, 'users', cred.user.uid), {
      uid: cred.user.uid, email, displayName: name,
      role: 'student', approved: false,
      classId, classIds: [classId], classCode: code, className: classData.name,
      createdAt: serverTimestamp(),
    });
    window.location.href = 'pending.html';
  } catch (err) {
    setLoading('btn-register', false);
    const msgs = {
      'auth/email-already-in-use': 'Ya existe una cuenta con ese correo.',
      'auth/invalid-email':        'El correo no tiene un formato válido.',
      'auth/weak-password':        'La contraseña es demasiado débil.',
    };
    showAlert(msgs[err.code] || `Error: ${err.message}`);
  }
});

document.getElementById('link-reset').addEventListener('click', async e => {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  if (!email) { showAlert('Introduce tu correo primero.'); return; }
  try {
    await sendPasswordResetEmail(auth, email);
    showAlert('Te hemos enviado un correo para restablecer tu contraseña.', 'success');
  } catch {
    showAlert('No se pudo enviar el correo. ¿El email es correcto?');
  }
});
