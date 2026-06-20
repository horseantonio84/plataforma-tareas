// ─────────────────────────────────────────
//  Selector de clase del alumno (cambiar / unirse a otra clase)
// ─────────────────────────────────────────
import { db, collection, addDoc, getDocs, query, where, serverTimestamp } from '../lib/firebase.js';
import { state } from './state.js';
import { esc } from '../shared/format.js';
import { openModal, closeModal } from '../shared/modal.js';
import { show, hide } from '../shared/dom.js';
import { toast } from '../shared/toast.js';
import { showSection } from './navigation.js';
import {
  resetTasksState, stopTasksListeners, startSubmissionsListener, startTasksListener, loadSubmissions,
} from './tasks.js';
import { resetAnnouncementsState, stopAnnouncementsListener, startAnnouncementsListener } from './announcements.js';
import { resetResourcesState, stopResourcesListener, startResourcesListener } from './resources.js';
import { resetGradesState, stopGradesListener, startGradesListener } from './grades.js';
import { stopChatListeners, startChatNotifications } from './chat.js';

export function renderClassSwitcher() {
  document.getElementById('topbar-classname').textContent = state.currentClass.name;
  document.getElementById('csm-list').innerHTML = state.allMyClasses.map(c => `
    <button class="csm-item ${c.id === state.currentClass.id ? 'active' : ''}" data-switch-class="${c.id}">
      <div class="csm-item-icon">${c.name[0].toUpperCase()}</div>
      <div class="csm-item-info">
        <div class="csm-item-name">${esc(c.name)}</div>
        <div class="csm-item-code">${c.code || ''}</div>
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

export async function switchClass(classId) {
  if (state.currentClass?.id === classId) { closeClassMenu(); return; }
  state.currentClass = state.allMyClasses.find(c => c.id === classId);
  localStorage.setItem('ao_activeClassId_student', classId);
  renderClassSwitcher();
  closeClassMenu();

  resetTasksState();
  resetAnnouncementsState();
  resetResourcesState();
  resetGradesState();

  stopTasksListeners();
  stopAnnouncementsListener();
  stopResourcesListener();
  stopGradesListener();
  stopChatListeners();

  await loadSubmissions();
  startSubmissionsListener();
  startTasksListener();
  startAnnouncementsListener();
  startResourcesListener();
  startGradesListener();
  startChatNotifications();
  showSection('inicio');
  toast(`Cambiado a: ${state.currentClass.name}`, 'success');
}

document.getElementById('class-switcher-btn').addEventListener('click', () => {
  document.getElementById('class-switcher-menu').classList.toggle('open');
});
document.addEventListener('click', e => {
  if (!document.getElementById('class-switcher').contains(e.target))
    document.getElementById('class-switcher-menu').classList.remove('open');
});

document.getElementById('btn-open-join-class').addEventListener('click', () => {
  closeClassMenu();
  document.getElementById('join-code').value = '';
  hide(document.getElementById('join-alert'));
  openModal('modal-join-class');
});
document.getElementById('join-code').addEventListener('input', e => { e.target.value = e.target.value.toUpperCase(); });
document.getElementById('join-code').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); joinClass(); } });
document.getElementById('btn-join-class').addEventListener('click', joinClass);

async function joinClass() {
  const code    = document.getElementById('join-code').value.trim().toUpperCase();
  const alertEl = document.getElementById('join-alert');
  if (!code) {
    alertEl.className = 'alert alert-error';
    alertEl.innerHTML = '<i class="bi bi-exclamation-circle"></i> Introduce un código.';
    show(alertEl); return;
  }
  const classSnap = await getDocs(query(collection(db, 'classes'), where('code', '==', code)));
  if (classSnap.empty) {
    alertEl.className = 'alert alert-error';
    alertEl.innerHTML = '<i class="bi bi-exclamation-circle"></i> Código no válido.';
    show(alertEl); return;
  }
  const newClass = { id: classSnap.docs[0].id, ...classSnap.docs[0].data() };
  if (state.allMyClasses.some(c => c.id === newClass.id)) {
    alertEl.className = 'alert alert-warning';
    alertEl.innerHTML = '<i class="bi bi-info-circle"></i> Ya perteneces a esta clase.';
    show(alertEl); return;
  }
  await addDoc(collection(db, 'classRequests'), {
    classId: newClass.id, studentUid: state.currentUser.uid,
    studentName: state.currentUser.displayName, email: state.currentUser.email,
    status: 'pending', createdAt: serverTimestamp(),
  });
  closeModal('modal-join-class');
  toast(`✅ Solicitud enviada a "${newClass.name}". El profesor debe aprobarte.`, 'success');
}
