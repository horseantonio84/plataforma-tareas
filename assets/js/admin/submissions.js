// ─────────────────────────────────────────
//  Entregas de alumnos: listar, corregir, eliminar
// ─────────────────────────────────────────
import {
  db, collection, getDocs, getDoc, doc, updateDoc, deleteDoc,
  query, where, orderBy, serverTimestamp,
} from '../lib/firebase.js';
import { state } from './state.js';
import { esc, fmtDate, gradeBadge } from '../shared/format.js';
import { openModal, closeModal, showConfirm } from '../shared/modal.js';
import { show, hide } from '../shared/dom.js';
import { toast } from '../shared/toast.js';
import { logActivity } from './activity.js';

export async function renderSubmissions() {
  const filterTask = document.getElementById('filter-task-submissions').value;
  const tasksSnap  = await getDocs(query(collection(db, 'tasks'), where('classId', '==', state.currentClass.id)));
  const sel = document.getElementById('filter-task-submissions');
  const cur = sel.value;
  sel.innerHTML = '<option value="">Todas las tareas</option>' +
    tasksSnap.docs.map(d => `<option value="${d.id}" ${d.id === cur ? 'selected' : ''}>${esc(d.data().title)}</option>`).join('');

  const q = filterTask
    ? query(collection(db, 'submissions'), where('classId', '==', state.currentClass.id), where('taskId', '==', filterTask), orderBy('submittedAt', 'desc'))
    : query(collection(db, 'submissions'), where('classId', '==', state.currentClass.id), orderBy('submittedAt', 'desc'));
  const snap = await getDocs(q);
  const el   = document.getElementById('submissions-container');

  if (snap.empty) {
    el.innerHTML = `<div class="empty-state"><i class="bi bi-inbox"></i><p>No hay entregas aún.</p></div>`;
    return;
  }
  const taskMap = {};
  tasksSnap.docs.forEach(d => { taskMap[d.id] = d.data().title; });

  el.innerHTML = `<div class="table-wrap"><table>
    <thead><tr><th>Alumno</th><th>Tarea</th><th>Entregada</th><th>Comentario</th><th>Nota</th><th></th></tr></thead>
    <tbody>
      ${snap.docs.map(d => {
        const s = d.data();
        const taskLabel = taskMap[s.taskId]
          ? esc(taskMap[s.taskId])
          : s.taskDeleted
            ? `<span class="text-muted fst-italic">${esc(s.taskTitle || 'Tarea eliminada')}</span>`
            : '<span class="text-muted">—</span>';
        return `<tr>
          <td><span class="fw-semibold">${esc(s.studentName)}</span></td>
          <td class="text-sm">${taskLabel}</td>
          <td class="text-xs">${fmtDate(s.submittedAt)}</td>
          <td class="submission-comment">${esc(s.comment || '—')}</td>
          <td>${gradeBadge(s.grade)}</td>
          <td class="d-flex gap-1 flex-wrap">
            <button class="btn btn-sm btn-primary btn-open-grade-sub" data-sub-id="${d.id}">
              <i class="bi bi-pencil-square"></i> Corregir
            </button>
            <button class="btn btn-sm btn-ghost btn-delete-sub icon-danger" data-sub-id="${d.id}">
              <i class="bi bi-trash"></i>
            </button>
          </td>
        </tr>`;
      }).join('')}
    </tbody>
  </table></div>`;

  el.querySelectorAll('.btn-open-grade-sub').forEach(btn => {
    btn.addEventListener('click', () => openGradeSubmission(btn.dataset.subId));
  });
  el.querySelectorAll('.btn-delete-sub').forEach(btn => {
    btn.addEventListener('click', () => deleteSubmission(btn.dataset.subId));
  });
}

async function openGradeSubmission(subId) {
  const snap = await getDoc(doc(db, 'submissions', subId));
  const s = snap.data();
  document.getElementById('sub-edit-id').value    = subId;
  document.getElementById('sub-grade').value      = s.grade != null ? s.grade : '';
  document.getElementById('sub-feedback').value   = s.feedback || '';
  document.getElementById('sub-detail').innerHTML =
    `<i class="bi bi-person"></i> <strong>${esc(s.studentName)}</strong>${s.comment ? ` · <em>${esc(s.comment)}</em>` : ''}`;
  const removeBtn = document.getElementById('btn-remove-grade');
  s.grade != null ? show(removeBtn) : hide(removeBtn);
  openModal('modal-grade-submission');
}

async function deleteSubmission(id) {
  const ok = await showConfirm({ title: 'Eliminar entrega', message: 'Se eliminará la entrega y su nota si la tuviera.', confirmText: 'Eliminar' });
  if (!ok) return;
  await deleteDoc(doc(db, 'submissions', id));
  renderSubmissions();
  toast('Entrega eliminada.');
}

document.getElementById('btn-remove-grade').addEventListener('click', async () => {
  const ok = await showConfirm({ title: 'Quitar nota', message: 'El alumno dejará de ver esta calificación.', confirmText: 'Quitar nota' });
  if (!ok) return;
  const id = document.getElementById('sub-edit-id').value;
  await updateDoc(doc(db, 'submissions', id), { grade: null, feedback: null, gradedAt: null });
  closeModal('modal-grade-submission');
  renderSubmissions();
  toast('Nota eliminada.', 'success');
});

document.getElementById('btn-grade-submission').addEventListener('click', async () => {
  const id    = document.getElementById('sub-edit-id').value;
  const grade = parseFloat(document.getElementById('sub-grade').value);
  const fb    = document.getElementById('sub-feedback').value.trim();
  if (isNaN(grade) || grade < 0 || grade > 10) { toast('Introduce una nota entre 0 y 10.', 'error'); return; }
  const subSnap  = await getDoc(doc(db, 'submissions', id));
  const taskId   = subSnap.data()?.taskId;
  let taskTitle  = '';
  if (taskId) {
    const taskSnap = await getDoc(doc(db, 'tasks', taskId));
    if (taskSnap.exists()) taskTitle = taskSnap.data().title || '';
  }
  await updateDoc(doc(db, 'submissions', id), { grade, feedback: fb, gradedAt: serverTimestamp(), taskTitle });
  logActivity('grade', `Entrega corregida: ${subSnap.data()?.studentName || ''}`, { detail: `Nota: ${grade}${fb ? ' · ' + fb.slice(0, 60) : ''}` });
  closeModal('modal-grade-submission');
  renderSubmissions();
  toast('Corrección guardada.', 'success');
});

document.getElementById('filter-task-submissions').addEventListener('change', renderSubmissions);
