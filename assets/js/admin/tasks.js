// ─────────────────────────────────────────
//  Gestión de tareas (crear, editar, eliminar, listar)
// ─────────────────────────────────────────
import {
  db, collection, getDocs, getDoc, doc, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, serverTimestamp,
} from '../lib/firebase.js';
import { state } from './state.js';
import { esc, dueBadge, fmtDate } from '../shared/format.js';
import { PRIO } from '../shared/constants.js';
import { openModal, closeModal } from '../shared/modal.js';
import { toast } from '../shared/toast.js';
import { logActivity } from './activity.js';

export async function renderTasks() {
  const pf   = document.getElementById('filter-priority').value;
  const snap = await getDocs(query(collection(db, 'tasks'), where('classId', '==', state.currentClass.id), orderBy('createdAt', 'desc')));
  let tasks  = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  if (pf) tasks = tasks.filter(t => (t.priority || 'media') === pf);

  const el = document.getElementById('tasks-container');
  if (!tasks.length) {
    el.innerHTML = `<div class="empty-state"><i class="bi bi-clipboard-x"></i><p>No hay tareas todavía. Crea la primera.</p></div>`;
    return;
  }
  el.innerHTML = tasks.map(t => {
    const p = PRIO[t.priority || 'media'];
    return `
    <div class="task-item priority-${t.priority || 'media'} fade-in">
      <div class="task-body">
        <div class="d-flex align-items-center gap-2 flex-wrap mb-1">
          <span class="task-title">${esc(t.title)}</span>
          <span class="badge ${p.cls}">${p.label}</span>
          ${dueBadge(t.due)}
        </div>
        ${t.desc ? `<div class="task-desc">${esc(t.desc)}</div>` : ''}
        <div class="task-meta">
          ${t.link ? `<a href="${esc(t.link)}" target="_blank" class="badge badge-brand"><i class="bi bi-link-45deg"></i> Enlace adjunto</a>` : ''}
          <span class="text-xs text-muted">Creada ${fmtDate(t.createdAt)}</span>
        </div>
      </div>
      <div class="task-actions">
        <button class="btn btn-ghost btn-icon btn-edit-task" data-task-id="${t.id}" title="Editar"><i class="bi bi-pencil"></i></button>
        <button class="btn btn-ghost btn-icon btn-delete-task icon-danger" data-task-id="${t.id}" title="Eliminar"><i class="bi bi-trash"></i></button>
      </div>
    </div>`;
  }).join('');

  el.querySelectorAll('.btn-edit-task').forEach(btn => {
    btn.addEventListener('click', () => editTask(btn.dataset.taskId));
  });
  el.querySelectorAll('.btn-delete-task').forEach(btn => {
    btn.addEventListener('click', () => deleteTask(btn.dataset.taskId));
  });
}

export function openTaskModal() {
  document.getElementById('task-edit-id').value = '';
  document.getElementById('modal-tarea-title').textContent = 'Nueva tarea';
  document.getElementById('task-title').value    = '';
  document.getElementById('task-desc').value     = '';
  document.getElementById('task-due').value      = '';
  document.getElementById('task-priority').value = 'media';
  document.getElementById('task-link').value     = '';
  openModal('modal-tarea');
}

async function editTask(id) {
  const snap = await getDoc(doc(db, 'tasks', id));
  const t = snap.data();
  document.getElementById('task-edit-id').value          = id;
  document.getElementById('modal-tarea-title').textContent = 'Editar tarea';
  document.getElementById('task-title').value            = t.title    || '';
  document.getElementById('task-desc').value             = t.desc     || '';
  document.getElementById('task-due').value              = t.due      || '';
  document.getElementById('task-priority').value         = t.priority || 'media';
  document.getElementById('task-link').value             = t.link     || '';
  openModal('modal-tarea');
}

async function deleteTask(id) {
  const subsSnap = await getDocs(query(collection(db, 'submissions'), where('taskId', '==', id)));
  const graded   = subsSnap.docs.filter(d => d.data().grade != null);
  const ungraded = subsSnap.docs.filter(d => d.data().grade == null);
  let msg = '¿Eliminar esta tarea?';
  if (graded.length)   msg += `\n\n⚠️ Hay ${graded.length} entrega(s) con nota. Se conservarán marcadas como tarea eliminada.`;
  if (ungraded.length) msg += `\n${ungraded.length} entrega(s) sin nota serán eliminadas.`;
  if (!confirm(msg)) return;
  for (const d of ungraded) await deleteDoc(doc(db, 'submissions', d.id));
  for (const d of graded)   await updateDoc(doc(db, 'submissions', d.id), { taskTitle: d.data().taskTitle || '(tarea eliminada)', taskDeleted: true });
  await deleteDoc(doc(db, 'tasks', id));
  logActivity('task', 'Tarea eliminada');
  renderTasks();
  toast('Tarea eliminada.');
}

document.getElementById('btn-save-task').addEventListener('click', async () => {
  const title = document.getElementById('task-title').value.trim();
  if (!title) { toast('El título es obligatorio.', 'error'); return; }
  const id   = document.getElementById('task-edit-id').value;
  const data = {
    classId:  state.currentClass.id, title,
    desc:     document.getElementById('task-desc').value.trim(),
    due:      document.getElementById('task-due').value,
    priority: document.getElementById('task-priority').value,
    link:     document.getElementById('task-link').value.trim(),
    updatedAt: serverTimestamp(),
  };
  if (id) {
    await updateDoc(doc(db, 'tasks', id), data);
    logActivity('task', `Tarea editada: "${title}"`);
  } else {
    data.createdAt = serverTimestamp();
    await addDoc(collection(db, 'tasks'), data);
    logActivity('task', `Nueva tarea creada: "${title}"`);
  }
  closeModal('modal-tarea');
  renderTasks();
  toast('Tarea guardada.', 'success');
});

document.getElementById('filter-priority').addEventListener('change', renderTasks);
document.getElementById('btn-nueva-tarea-inicio').addEventListener('click', () => openTaskModal());
document.getElementById('btn-nueva-tarea').addEventListener('click', () => openTaskModal());
