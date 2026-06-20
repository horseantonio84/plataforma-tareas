// ─────────────────────────────────────────
//  Página de inicio del panel de profesor
// ─────────────────────────────────────────
import { db, collection, getDocs, query, where } from '../lib/firebase.js';
import { state } from './state.js';
import { show, hide } from '../shared/dom.js';
import { esc, dueBadge } from '../shared/format.js';
import { PRIO } from '../shared/constants.js';
import { approveStudent } from './students.js';

export async function renderHome() {
  const [studentsSnap, tasksSnap, submissionsSnap, pendingSnap] = await Promise.all([
    getDocs(query(collection(db, 'users'), where('classId', '==', state.currentClass.id), where('approved', '==', true))),
    getDocs(query(collection(db, 'tasks'), where('classId', '==', state.currentClass.id))),
    getDocs(query(collection(db, 'submissions'), where('classId', '==', state.currentClass.id), where('grade', '==', null))),
    getDocs(query(collection(db, 'users'), where('classId', '==', state.currentClass.id), where('approved', '==', false))),
  ]);

  document.getElementById('st-alumnos').textContent       = studentsSnap.size;
  document.getElementById('st-tareas').textContent        = tasksSnap.size;
  document.getElementById('st-entregas').textContent      = submissionsSnap.size;
  document.getElementById('st-pending-users').textContent = pendingSnap.size;

  const pb = document.getElementById('badge-pending');
  const eb = document.getElementById('badge-entregas');
  pendingSnap.size > 0 ? show(pb) : hide(pb);
  pb.textContent = pendingSnap.size;
  submissionsSnap.size > 0 ? show(eb) : hide(eb);
  eb.textContent = submissionsSnap.size;

  const tasks = tasksSnap.docs.map(d => ({ id: d.id, ...d.data() }))
    .filter(t => t.due).sort((a, b) => a.due.localeCompare(b.due)).slice(0, 5);
  document.getElementById('home-upcoming').innerHTML = !tasks.length
    ? `<div class="empty-state p-4"><i class="bi bi-calendar-check fs-2"></i><p>Sin tareas próximas</p></div>`
    : tasks.map(t => `
      <div class="home-list-row">
        <span class="badge ${PRIO[t.priority || 'media'].cls}">${PRIO[t.priority || 'media'].label}</span>
        <span class="home-list-title">${esc(t.title)}</span>
        ${dueBadge(t.due)}
      </div>`).join('');

  const pendingUsers = pendingSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const puEl = document.getElementById('home-pending-users');
  puEl.innerHTML = !pendingUsers.length
    ? `<div class="empty-state p-4"><i class="bi bi-person-check fs-2"></i><p>Sin alumnos pendientes</p></div>`
    : pendingUsers.map(u => `
      <div class="home-list-row">
        <div class="home-user-avatar">${(u.displayName || '?')[0].toUpperCase()}</div>
        <div class="flex-fill" style="min-width:0">
          <div class="text-sm fw-semibold">${esc(u.displayName)}</div>
          <div class="text-xs text-muted">${esc(u.email)}</div>
        </div>
        <button class="btn btn-sm btn-success btn-approve-student" data-uid="${u.uid}">
          <i class="bi bi-check-lg"></i>
        </button>
      </div>`).join('');

  puEl.querySelectorAll('.btn-approve-student').forEach(btn => {
    btn.addEventListener('click', () => approveStudent(btn.dataset.uid));
  });
}
