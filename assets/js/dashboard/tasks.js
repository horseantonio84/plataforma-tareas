// ─────────────────────────────────────────
//  Tareas del alumno: listar, entregar, escuchar cambios en tiempo real
// ─────────────────────────────────────────
import {
  db, collection, getDocs, getDoc, doc, addDoc,
  query, where, orderBy, onSnapshot, serverTimestamp,
} from '../lib/firebase.js';
import { state } from './state.js';
import { esc, dueBadge, gradeBadge } from '../shared/format.js';
import { PRIO } from '../shared/constants.js';
import { openModal, closeModal } from '../shared/modal.js';
import { toast } from '../shared/toast.js';
import { show, hide } from '../shared/dom.js';
import { updateHomeStats, renderHome } from './home.js';

let _unsubSubmissions = null;
let _unsubTasks = null;
let _submissionsCacheLoaded = false;
let _tasksCacheLoaded = false;

export async function loadSubmissions() {
  const snap = await getDocs(query(collection(db, 'submissions'), where('studentUid', '==', state.currentUser.uid)));
  state.submissionsCache = {};
  snap.docs.forEach(d => { const s = d.data(); state.submissionsCache[s.taskId] = { id: d.id, ...s }; });
}

export function startSubmissionsListener() {
  if (_unsubSubmissions) _unsubSubmissions();
  _unsubSubmissions = onSnapshot(
    query(collection(db, 'submissions'), where('studentUid', '==', state.currentUser.uid)),
    snap => {
      const newCache = {};
      snap.docs.forEach(d => { const s = d.data(); newCache[s.taskId] = { id: d.id, ...s }; });
      if (_submissionsCacheLoaded) {
        Object.values(newCache).forEach(sub => {
          const old = state.submissionsCache[sub.taskId];
          if (old && old.grade == null && sub.grade != null) {
            toast(`⭐ El profesor ha corregido tu tarea: ${sub.grade}/10`, 'success');
            const activeSection = document.querySelector('.sidebar .nav-item.active')?.id;
            if (activeSection !== 'nav-notas' && activeSection !== 'nav-tareas') {
              const badge = document.getElementById('badge-tareas');
              const cur = parseInt(badge.textContent || '0');
              show(badge);
              badge.textContent = cur > 0 ? cur : 1;
            }
            if (activeSection === 'nav-tareas') renderTasksFromCache();
          }
        });
      }
      state.submissionsCache = newCache;
      _submissionsCacheLoaded = true;
      const active = document.querySelector('.sidebar .nav-item.active')?.id;
      if (active === 'nav-tareas') renderTasks();
      if (active === 'nav-inicio') renderHome();
      updateHomeStats();
    }
  );
}

export function recalcTasksBadge() {
  const seen   = JSON.parse(localStorage.getItem('ao_seenTasks_' + state.currentClass.id) || '[]');
  const unseen = state.tasksCache.filter(t => !seen.includes(t.id) && !state.submissionsCache[t.id]);
  const badge  = document.getElementById('badge-tareas');
  unseen.length > 0 ? show(badge) : hide(badge);
  badge.textContent = unseen.length;
}

export function startTasksListener() {
  if (_unsubTasks) _unsubTasks();
  _unsubTasks = onSnapshot(
    query(collection(db, 'tasks'), where('classId', '==', state.currentClass.id), orderBy('createdAt', 'desc')),
    snap => {
      const newTasks = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (_tasksCacheLoaded) {
        const oldIds = new Set(state.tasksCache.map(t => t.id));
        newTasks.filter(t => !oldIds.has(t.id)).forEach(t => {
          if (document.querySelector('.sidebar .nav-item.active')?.id !== 'nav-tareas')
            toast(`📋 Nueva tarea: ${t.title}`, 'success');
        });
      }
      state.tasksCache = newTasks;
      _tasksCacheLoaded = true;
      const active = document.querySelector('.sidebar .nav-item.active')?.id;
      if (active !== 'nav-tareas') recalcTasksBadge();
      if (active === 'nav-tareas') renderTasksFromCache();
      if (active === 'nav-inicio') renderHome();
      updateHomeStats();
    }
  );
}

function renderTasksFromCache() {
  const filter = document.getElementById('filter-status').value;
  let tasks = [...state.tasksCache];
  if (filter === 'submitted') tasks = tasks.filter(t =>  state.submissionsCache[t.id]);
  if (filter === 'pending')   tasks = tasks.filter(t => !state.submissionsCache[t.id]);

  const el = document.getElementById('tasks-container');
  if (!tasks.length) {
    el.innerHTML = `<div class="empty-state"><i class="bi bi-clipboard"></i><p>No hay tareas en esta categoría.</p></div>`;
    return;
  }
  el.innerHTML = tasks.map(t => {
    const sub = state.submissionsCache[t.id];
    const p   = PRIO[t.priority || 'media'];
    return `
    <div class="task-item priority-${t.priority || 'media'} ${sub ? 'done' : ''} fade-in">
      <div class="task-body">
        <div class="d-flex align-items-center gap-2 flex-wrap mb-1">
          <span class="task-title">${esc(t.title)}</span>
          <span class="badge ${p.cls}">${p.label}</span>
          ${dueBadge(t.due)}
          ${sub ? `<span class="badge badge-success"><i class="bi bi-check-circle"></i> Entregada</span>` : ''}
        </div>
        ${t.desc ? `<div class="task-desc">${esc(t.desc)}</div>` : ''}
        <div class="task-meta">
          ${t.link ? `<a href="${esc(t.link)}" target="_blank" class="badge badge-brand"><i class="bi bi-link-45deg"></i> Material adjunto</a>` : ''}
        </div>
        ${sub ? `
        <div class="task-submission-detail">
          <div class="task-submission-label"><i class="bi bi-upload me-1"></i>Tu entrega:</div>
          <div>${esc(sub.comment || '(sin comentario)')}</div>
          ${sub.grade != null ? `<div class="mt-2">Nota: ${gradeBadge(sub.grade)}${sub.feedback ? `<span class="task-feedback">${esc(sub.feedback)}</span>` : ''}` : ''}
        </div>` : ''}
      </div>
      <div class="task-actions">
        ${!sub ? `<button class="btn btn-sm btn-primary btn-open-submit" data-task-id="${t.id}" data-task-title="${esc(t.title)}">
          <i class="bi bi-send-fill"></i> Entregar
        </button>` : ''}
      </div>
    </div>`;
  }).join('');

  el.querySelectorAll('.btn-open-submit').forEach(btn => {
    btn.addEventListener('click', () => openSubmit(btn.dataset.taskId, btn.dataset.taskTitle));
  });
}

export async function renderTasks() {
  if (!state.tasksCache.length) {
    const snap = await getDocs(query(collection(db, 'tasks'), where('classId', '==', state.currentClass.id), orderBy('createdAt', 'desc')));
    state.tasksCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }
  renderTasksFromCache();
}

export function enterTasksSection() {
  localStorage.setItem('ao_seenTasks_' + state.currentClass.id, JSON.stringify(state.tasksCache.map(t => t.id)));
  hide(document.getElementById('badge-tareas'));
  renderTasks();
}

export function resetTasksState() {
  state.tasksCache = [];
  _tasksCacheLoaded = false;
  state.submissionsCache = {};
  _submissionsCacheLoaded = false;
}

export function stopTasksListeners() {
  _unsubSubmissions?.();
  _unsubTasks?.();
}

function openSubmit(taskId, taskTitle) {
  document.getElementById('sub-task-id').value = taskId;
  document.getElementById('sub-task-title').innerHTML = `<i class="bi bi-check2-square"></i> <strong>${taskTitle}</strong>`;
  document.getElementById('sub-comment').value = '';
  openModal('modal-entrega');
}

document.getElementById('btn-submit-task').addEventListener('click', async () => {
  const taskId  = document.getElementById('sub-task-id').value;
  const comment = document.getElementById('sub-comment').value.trim();
  if (!comment) { toast('Escribe un comentario o enlace a tu trabajo.', 'error'); return; }
  if (state.submissionsCache[taskId]) { toast('Ya has entregado esta tarea.', 'error'); closeModal('modal-entrega'); return; }
  const existing = await getDocs(query(collection(db, 'submissions'), where('taskId', '==', taskId), where('studentUid', '==', state.currentUser.uid)));
  if (!existing.empty) { toast('Ya has entregado esta tarea.', 'error'); closeModal('modal-entrega'); return; }
  closeModal('modal-entrega');
  const taskSnap  = await getDoc(doc(db, 'tasks', taskId));
  const taskTitle = taskSnap.exists() ? taskSnap.data().title : '';
  await addDoc(collection(db, 'submissions'), {
    classId: state.currentClass.id, taskId, studentUid: state.currentUser.uid,
    studentName: state.currentUser.displayName, comment, grade: null, feedback: null, submittedAt: serverTimestamp(),
  });
  await addDoc(collection(db, 'activity'), {
    classId: state.currentClass.id, type: 'submission',
    text: `${state.currentUser.displayName} entregó: "${taskTitle}"`,
    detail: comment.slice(0, 80), createdAt: serverTimestamp(),
  });
  state.submissionsCache[taskId] = { taskId, comment, grade: null };
  toast('¡Tarea entregada!', 'success');
});

document.getElementById('filter-status').addEventListener('change', renderTasks);
