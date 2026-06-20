// ─────────────────────────────────────────
//  Gestión de alumnos: aprobados / pendientes
// ─────────────────────────────────────────
import { db, collection, getDocs, query, where, doc, updateDoc } from '../lib/firebase.js';
import { state } from './state.js';
import { show, hide } from '../shared/dom.js';
import { esc, fmtDate, fmtLastSeen } from '../shared/format.js';
import { toast } from '../shared/toast.js';
import { logActivity } from './activity.js';
import { renderHome } from './home.js';

export async function getApprovedStudents() {
  const snap = await getDocs(query(
    collection(db, 'users'),
    where('classId', '==', state.currentClass.id),
    where('approved', '==', true)
  ));
  return snap.docs.map(d => ({ ...d.data() }));
}

export function switchStudentTab(tab) {
  document.querySelectorAll('[data-student-tab]').forEach(b => {
    b.classList.toggle('active', b.dataset.studentTab === tab);
  });
  const approvedEl = document.getElementById('students-approved-container');
  const pendingEl  = document.getElementById('students-pending-container');
  tab === 'approved' ? show(approvedEl) : hide(approvedEl);
  tab === 'pending'  ? show(pendingEl)  : hide(pendingEl);
}

export async function renderStudents() {
  const snap = await getDocs(query(collection(db, 'users'), where('classId', '==', state.currentClass.id)));
  const all      = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const approved = all.filter(u => u.approved);
  const pending  = all.filter(u => !u.approved);

  const pb = document.getElementById('badge-pending');
  pending.length > 0 ? show(pb) : hide(pb);
  pb.textContent = pending.length;

  renderStudentList('students-approved-container', approved, true);
  renderStudentList('students-pending-container', pending, false);
}

function renderStudentList(containerId, students, isApproved) {
  const el = document.getElementById(containerId);
  if (!students.length) {
    el.innerHTML = `<div class="empty-state"><i class="bi bi-person-${isApproved ? 'check' : 'x'}"></i><p>${isApproved ? 'No hay alumnos aprobados aún.' : 'No hay solicitudes pendientes.'}</p></div>`;
    return;
  }
  el.innerHTML = `<div class="table-wrap"><table>
    <thead><tr><th>Nombre</th><th>Correo</th><th>Registro</th><th>Última conexión</th><th>Estado</th><th></th></tr></thead>
    <tbody>
      ${students.map(u => `<tr>
        <td>
          <div class="d-flex align-items-center gap-3">
            <div class="student-avatar">${(u.displayName || '?')[0].toUpperCase()}</div>
            <span class="fw-semibold">${esc(u.displayName)}</span>
          </div>
        </td>
        <td class="text-muted text-sm">${esc(u.email)}</td>
        <td class="text-xs">${fmtDate(u.createdAt)}</td>
        <td>${fmtLastSeen(u.lastSeen)}</td>
        <td>${isApproved
          ? '<span class="badge badge-success"><i class="bi bi-check-circle"></i> Aprobado</span>'
          : '<span class="badge badge-warning"><i class="bi bi-clock"></i> Pendiente</span>'}</td>
        <td class="d-flex gap-1 flex-wrap">
          ${!isApproved ? `<button class="btn btn-sm btn-success btn-approve-s" data-uid="${u.uid}"><i class="bi bi-check-lg"></i> Aprobar</button>` : ''}
          <button class="btn btn-sm btn-danger btn-revoke-s" data-uid="${u.uid}">
            <i class="bi bi-person-x"></i> ${isApproved ? 'Revocar' : 'Rechazar'}
          </button>
        </td>
      </tr>`).join('')}
    </tbody>
  </table></div>`;

  el.querySelectorAll('.btn-approve-s').forEach(btn => {
    btn.addEventListener('click', () => approveStudent(btn.dataset.uid));
  });
  el.querySelectorAll('.btn-revoke-s').forEach(btn => {
    btn.addEventListener('click', () => removeStudent(btn.dataset.uid));
  });
}

export async function approveStudent(uid) {
  await updateDoc(doc(db, 'users', uid), { approved: true });
  const studs   = await getApprovedStudents();
  const student = studs.find(s => s.uid === uid);
  logActivity('approval', `Alumno aprobado: ${student?.displayName || uid}`);
  renderStudents();
  renderHome();
  toast('Alumno aprobado.', 'success');
}

export async function removeStudent(uid) {
  if (!confirm('¿Revocar el acceso a este alumno?')) return;
  await updateDoc(doc(db, 'users', uid), { approved: false });
  logActivity('revoke', 'Acceso revocado a alumno');
  renderStudents();
  renderHome();
  toast('Acceso revocado.');
}

document.querySelectorAll('[data-student-tab]').forEach(btn => {
  btn.addEventListener('click', () => switchStudentTab(btn.dataset.studentTab));
});
