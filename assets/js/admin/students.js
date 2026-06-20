// ─────────────────────────────────────────
//  Gestión de alumnos: aprobados / pendientes / solicitudes de unión a clase
// ─────────────────────────────────────────
import { db, collection, getDocs, query, where, doc, updateDoc, arrayUnion } from '../lib/firebase.js';
import { state } from './state.js';
import { show, hide } from '../shared/dom.js';
import { esc, fmtDate, fmtLastSeen } from '../shared/format.js';
import { toast } from '../shared/toast.js';
import { logActivity } from './activity.js';
import { renderHome } from './home.js';

// Un alumno pertenece a la clase actual si:
//  - su campo "classId" (clase con la que se registró) coincide, o
//  - la clase está en su array "classIds" (clases a las que se unió después)
// Hacemos las dos consultas y las combinamos, porque Firestore no permite
// mezclar "==" y "array-contains" sobre campos distintos en una sola query.
async function queryMembers(approved) {
  const [byClassId, byClassIds] = await Promise.all([
    getDocs(query(collection(db, 'users'), where('classId', '==', state.currentClass.id), where('approved', '==', approved))),
    getDocs(query(collection(db, 'users'), where('classIds', 'array-contains', state.currentClass.id), where('approved', '==', approved))),
  ]);
  const map = new Map();
  byClassId.docs.forEach(d => map.set(d.id, { id: d.id, ...d.data() }));
  byClassIds.docs.forEach(d => map.set(d.id, { id: d.id, ...d.data() }));
  return [...map.values()];
}

export async function getApprovedStudents() {
  return queryMembers(true);
}

export function switchStudentTab(tab) {
  document.querySelectorAll('[data-student-tab]').forEach(b => {
    b.classList.toggle('active', b.dataset.studentTab === tab);
  });
  const approvedEl = document.getElementById('students-approved-container');
  const pendingEl  = document.getElementById('students-pending-container');
  const requestsEl = document.getElementById('students-requests-container');
  tab === 'approved' ? show(approvedEl) : hide(approvedEl);
  tab === 'pending'  ? show(pendingEl)  : hide(pendingEl);
  tab === 'requests' ? show(requestsEl) : hide(requestsEl);
}

export async function renderStudents() {
  const [approved, pending] = await Promise.all([queryMembers(true), queryMembers(false)]);

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

// ─── Solicitudes de unión a esta clase (alumno ya registrado en otra clase) ──
export async function renderClassRequests() {
  const snap = await getDocs(query(
    collection(db, 'classRequests'),
    where('classId', '==', state.currentClass.id),
    where('status', '==', 'pending'),
  ));
  const el    = document.getElementById('students-requests-container');
  const badge = document.getElementById('badge-requests');
  if (badge) {
    snap.size > 0 ? show(badge) : hide(badge);
    badge.textContent = snap.size;
  }
  if (snap.empty) {
    el.innerHTML = `<div class="empty-state"><i class="bi bi-inbox"></i><p>No hay solicitudes de unión pendientes.</p></div>`;
    return;
  }
  const reqs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  el.innerHTML = `<div class="table-wrap"><table>
    <thead><tr><th>Alumno</th><th>Correo</th><th>Solicitado</th><th></th></tr></thead>
    <tbody>
      ${reqs.map(r => `<tr>
        <td>
          <div class="d-flex align-items-center gap-3">
            <div class="student-avatar">${(r.studentName || '?')[0].toUpperCase()}</div>
            <span class="fw-semibold">${esc(r.studentName)}</span>
          </div>
        </td>
        <td class="text-muted text-sm">${esc(r.email)}</td>
        <td class="text-xs">${fmtDate(r.createdAt)}</td>
        <td class="d-flex gap-1 flex-wrap">
          <button class="btn btn-sm btn-success btn-approve-req" data-req-id="${r.id}" data-student-uid="${r.studentUid}">
            <i class="bi bi-check-lg"></i> Aprobar
          </button>
          <button class="btn btn-sm btn-danger btn-reject-req" data-req-id="${r.id}">
            <i class="bi bi-x-lg"></i> Rechazar
          </button>
        </td>
      </tr>`).join('')}
    </tbody>
  </table></div>`;

  el.querySelectorAll('.btn-approve-req').forEach(btn => {
    btn.addEventListener('click', () => approveClassRequest(btn.dataset.reqId, btn.dataset.studentUid));
  });
  el.querySelectorAll('.btn-reject-req').forEach(btn => {
    btn.addEventListener('click', () => rejectClassRequest(btn.dataset.reqId));
  });
}

async function approveClassRequest(reqId, studentUid) {
  await updateDoc(doc(db, 'users', studentUid), { classIds: arrayUnion(state.currentClass.id) });
  await updateDoc(doc(db, 'classRequests', reqId), { status: 'approved' });
  logActivity('approval', 'Alumno añadido a la clase desde una solicitud de unión');
  renderClassRequests();
  renderStudents();
  renderHome();
  toast('Solicitud aprobada: el alumno ya tiene acceso a la clase.', 'success');
}

async function rejectClassRequest(reqId) {
  if (!confirm('¿Rechazar esta solicitud de unión?')) return;
  await updateDoc(doc(db, 'classRequests', reqId), { status: 'rejected' });
  renderClassRequests();
  toast('Solicitud rechazada.');
}

document.querySelectorAll('[data-student-tab]').forEach(btn => {
  btn.addEventListener('click', () => switchStudentTab(btn.dataset.studentTab));
});
