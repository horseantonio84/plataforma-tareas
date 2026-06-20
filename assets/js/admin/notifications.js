// ─────────────────────────────────────────
//  Escuchas en tiempo real para badges/contadores del panel de profesor
// ─────────────────────────────────────────
import { db, collection, query, where, onSnapshot } from '../lib/firebase.js';
import { state } from './state.js';
import { show, hide } from '../shared/dom.js';
import { renderSubmissions } from './submissions.js';
import { renderStudents, renderClassRequests } from './students.js';
import { renderTasks } from './tasks.js';

let _unsubNotif = null, _unsubPending = null, _unsubStudents = null, _unsubTasks = null, _unsubRequests = null;

export function startNotifications() {
  [_unsubNotif, _unsubPending, _unsubStudents, _unsubTasks, _unsubRequests].forEach(u => u && u());

  _unsubNotif = onSnapshot(
    query(collection(db, 'submissions'), where('classId', '==', state.currentClass.id), where('grade', '==', null)),
    snap => {
      const count = snap.size;
      const eb = document.getElementById('badge-entregas');
      count > 0 ? show(eb) : hide(eb);
      eb.textContent = count;
      const stEl = document.getElementById('st-entregas');
      if (stEl) stEl.textContent = count;
      if (document.querySelector('.sidebar .nav-item.active')?.id === 'nav-entregas') renderSubmissions();
    }
  );
  _unsubPending = onSnapshot(
    query(collection(db, 'users'), where('classId', '==', state.currentClass.id), where('approved', '==', false)),
    snap => {
      const count = snap.size;
      const pb = document.getElementById('badge-pending');
      count > 0 ? show(pb) : hide(pb);
      pb.textContent = count;
      const stEl = document.getElementById('st-pending-users');
      if (stEl) stEl.textContent = count;
      if (document.querySelector('.sidebar .nav-item.active')?.id === 'nav-alumnos') renderStudents();
    }
  );
  _unsubStudents = onSnapshot(
    query(collection(db, 'users'), where('classId', '==', state.currentClass.id), where('approved', '==', true)),
    snap => { const stEl = document.getElementById('st-alumnos'); if (stEl) stEl.textContent = snap.size; }
  );
  _unsubTasks = onSnapshot(
    query(collection(db, 'tasks'), where('classId', '==', state.currentClass.id)),
    snap => {
      const stEl = document.getElementById('st-tareas');
      if (stEl) stEl.textContent = snap.size;
      if (document.querySelector('.sidebar .nav-item.active')?.id === 'nav-tareas') renderTasks();
    }
  );
  _unsubRequests = onSnapshot(
    query(collection(db, 'classRequests'), where('classId', '==', state.currentClass.id), where('status', '==', 'pending')),
    snap => {
      const count = snap.size;
      const rb = document.getElementById('badge-requests');
      count > 0 ? show(rb) : hide(rb);
      rb.textContent = count;
      if (document.querySelector('.sidebar .nav-item.active')?.id === 'nav-alumnos') renderClassRequests();
    }
  );
}
