// ─────────────────────────────────────────
//  Calificaciones manuales por alumno
// ─────────────────────────────────────────
import { db, collection, getDocs, addDoc, deleteDoc, doc, query, where, orderBy, serverTimestamp } from '../lib/firebase.js';
import { state } from './state.js';
import { esc, fmtDate, gradeBadge } from '../shared/format.js';
import { openModal, closeModal } from '../shared/modal.js';
import { toast } from '../shared/toast.js';
import { getApprovedStudents } from './students.js';

export async function openGradeModal() {
  const studs = await getApprovedStudents();
  state.studentsCache = studs;
  document.getElementById('grade-student').innerHTML = studs.map(s => `<option value="${s.uid}">${esc(s.displayName)}</option>`).join('');
  openModal('modal-nota');
}

export async function renderGrades() {
  const studs = await getApprovedStudents();
  state.studentsCache = studs;
  document.getElementById('grade-student').innerHTML = studs.map(s => `<option value="${s.uid}">${esc(s.displayName)}</option>`).join('');

  const snap = await getDocs(query(collection(db, 'grades'), where('classId', '==', state.currentClass.id), orderBy('createdAt', 'desc')));
  const el   = document.getElementById('grades-container');

  if (snap.empty && !studs.length) {
    el.innerHTML = `<div class="empty-state"><i class="bi bi-star"></i><p>Añade alumnos y empieza a registrar calificaciones.</p></div>`;
    return;
  }
  const byStudent = {};
  studs.forEach(s => { byStudent[s.uid] = { name: s.displayName, grades: [] }; });
  snap.docs.forEach(d => {
    const g = { id: d.id, ...d.data() };
    if (byStudent[g.studentUid]) byStudent[g.studentUid].grades.push(g);
  });

  el.innerHTML = Object.entries(byStudent).map(([uid, data]) => {
    const avg = data.grades.length
      ? (data.grades.reduce((a, g) => a + g.grade, 0) / data.grades.length).toFixed(1)
      : null;
    return `
    <div class="card mb-3">
      <div class="card-header">
        <div class="d-flex align-items-center gap-3">
          <div class="grade-student-avatar">${data.name[0].toUpperCase()}</div>
          <span>${esc(data.name)}</span>
        </div>
        <div class="d-flex align-items-center gap-3">
          ${avg != null ? `<span class="text-muted text-xs">Media:</span> ${gradeBadge(avg)}` : '<span class="badge badge-neutral">Sin notas</span>'}
        </div>
      </div>
      ${data.grades.length ? `
      <div class="card-body p-0">
        <table style="width:100%">
          <thead><tr><th>Concepto</th><th>Nota</th><th>Comentario</th><th>Fecha</th><th></th></tr></thead>
          <tbody>
            ${data.grades.map(g => `<tr>
              <td class="fw-semibold">${esc(g.concept)}</td>
              <td>${gradeBadge(g.grade)}</td>
              <td class="text-muted text-xs">${esc(g.comment || '—')}</td>
              <td class="text-xs">${fmtDate(g.createdAt)}</td>
              <td><button class="btn btn-ghost btn-icon btn-sm btn-delete-grade icon-danger" data-grade-id="${g.id}"><i class="bi bi-trash"></i></button></td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>` : ''}
    </div>`;
  }).join('');

  el.querySelectorAll('.btn-delete-grade').forEach(btn => {
    btn.addEventListener('click', () => deleteGrade(btn.dataset.gradeId));
  });
}

async function deleteGrade(id) {
  if (!confirm('¿Eliminar esta nota?')) return;
  await deleteDoc(doc(db, 'grades', id));
  renderGrades();
  toast('Nota eliminada.');
}

document.getElementById('btn-save-grade').addEventListener('click', async () => {
  const studentUid = document.getElementById('grade-student').value;
  const concept    = document.getElementById('grade-concept').value.trim();
  const grade      = parseFloat(document.getElementById('grade-value').value);
  const comment    = document.getElementById('grade-comment').value.trim();
  if (!studentUid || !concept) { toast('Alumno y concepto son obligatorios.', 'error'); return; }
  if (isNaN(grade) || grade < 0 || grade > 10) { toast('Nota entre 0 y 10.', 'error'); return; }
  const student = state.studentsCache.find(s => s.uid === studentUid);
  await addDoc(collection(db, 'grades'), {
    classId: state.currentClass.id, studentUid, studentName: student?.displayName || '—',
    concept, grade, comment, createdAt: serverTimestamp(),
  });
  closeModal('modal-nota');
  renderGrades();
  toast('Nota guardada.', 'success');
});

document.getElementById('btn-open-nota').addEventListener('click', openGradeModal);
