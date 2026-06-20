// ─────────────────────────────────────────
//  Selector de clase (cambiar entre clases del profesor / crear nueva)
// ─────────────────────────────────────────
import { db, collection, addDoc, serverTimestamp } from '../lib/firebase.js';
import { state } from './state.js';
import { esc, generateCode } from '../shared/format.js';
import { openModal, closeModal } from '../shared/modal.js';
import { toast } from '../shared/toast.js';
import { showSection } from './navigation.js';
import { startNotifications } from './notifications.js';
import { startChatNotifications } from './chat.js';

export function renderClassSwitcher() {
  document.getElementById('topbar-classname').textContent = state.currentClass.name;
  document.getElementById('csm-list').innerHTML = state.allClasses.map(c => `
    <button class="csm-item ${c.id === state.currentClass.id ? 'active' : ''}" data-switch-class="${c.id}">
      <div class="csm-item-icon">${c.name[0].toUpperCase()}</div>
      <div class="csm-item-info">
        <div class="csm-item-name">${esc(c.name)}</div>
        <div class="csm-item-code">${c.code}</div>
      </div>
      ${c.id === state.currentClass.id ? '<i class="bi bi-check2 ms-auto icon-brand"></i>' : ''}
    </button>`).join('');
  document.querySelectorAll('[data-switch-class]').forEach(btn => {
    btn.addEventListener('click', () => switchClass(btn.dataset.switchClass));
  });
}

function closeClassMenu() {
  document.getElementById('class-switcher-menu').classList.remove('open');
}

export function switchClass(classId) {
  if (state.currentClass?.id === classId) { closeClassMenu(); return; }
  state.currentClass = state.allClasses.find(c => c.id === classId);
  localStorage.setItem('ao_activeClassId', classId);
  renderClassSwitcher();
  document.getElementById('settings-code').textContent = state.currentClass.code;
  closeClassMenu();
  startNotifications();
  startChatNotifications();
  showSection('inicio');
  toast(`Cambiado a: ${state.currentClass.name}`, 'success');
}

document.getElementById('class-switcher-btn').addEventListener('click', () => {
  document.getElementById('class-switcher-menu').classList.toggle('open');
});
document.addEventListener('click', e => {
  const sw = document.getElementById('class-switcher');
  if (sw && !sw.contains(e.target)) closeClassMenu();
});

document.getElementById('btn-open-new-class').addEventListener('click', () => {
  closeClassMenu();
  document.getElementById('new-class-name').value = '';
  document.getElementById('new-class-desc').value = '';
  openModal('modal-nueva-clase');
});

document.getElementById('btn-create-class').addEventListener('click', async () => {
  const name = document.getElementById('new-class-name').value.trim();
  if (!name) { toast('El nombre es obligatorio.', 'error'); return; }
  const code = generateCode();
  const ref  = await addDoc(collection(db, 'classes'), {
    name, description: document.getElementById('new-class-desc').value.trim(),
    teacherUid: state.currentUser.uid, teacherName: state.currentUser.displayName,
    code, createdAt: serverTimestamp(),
  });
  state.allClasses.push({ id: ref.id, name, code, description: '' });
  closeModal('modal-nueva-clase');
  switchClass(ref.id);
});
