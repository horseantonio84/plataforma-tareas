// ─────────────────────────────────────────
//  Estadísticas por alumno
// ─────────────────────────────────────────
import { db, collection, getDocs, query, where } from '../lib/firebase.js';
import { state } from './state.js';
import { esc, gradeBadge } from '../shared/format.js';
import { getApprovedStudents } from './students.js';

export async function renderStats() {
  const studs = await getApprovedStudents();
  const sel   = document.getElementById('stats-student-filter');
  const cur   = sel.value;
  sel.innerHTML = '<option value="">Todos los alumnos</option>' +
    studs.map(s => `<option value="${s.uid}" ${s.uid === cur ? 'selected' : ''}>${esc(s.displayName)}</option>`).join('');

  const filtered = cur ? studs.filter(s => s.uid === cur) : studs;
  if (!filtered.length) {
    document.getElementById('stats-container').innerHTML = `<div class="empty-state"><i class="bi bi-people"></i><p>No hay alumnos aprobados aún.</p></div>`;
    return;
  }

  const [tasksSnap, subsSnap, gradesSnap] = await Promise.all([
    getDocs(query(collection(db, 'tasks'), where('classId', '==', state.currentClass.id))),
    getDocs(query(collection(db, 'submissions'), where('classId', '==', state.currentClass.id))),
    getDocs(query(collection(db, 'grades'), where('classId', '==', state.currentClass.id))),
  ]);
  const tasks  = tasksSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const subs   = subsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const grades = gradesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  const avgGrades  = grades.length ? (grades.reduce((a, g) => a + g.grade, 0) / grades.length).toFixed(1) : '—';
  const totalSubs  = subs.length;
  const gradedSubs = subs.filter(s => s.grade != null).length;

  document.getElementById('stats-overview').innerHTML = `
    <div class="stat-grid">
      <div class="stat-card fade-in">
        <div class="stat-icon stat-icon-blue"><i class="bi bi-people-fill icon-brand"></i></div>
        <div><div class="stat-value">${filtered.length}</div><div class="stat-label">Alumnos analizados</div></div>
      </div>
      <div class="stat-card fade-in fade-in-delay-1">
        <div class="stat-icon stat-icon-amber"><i class="bi bi-star-fill icon-accent"></i></div>
        <div><div class="stat-value">${avgGrades}</div><div class="stat-label">Nota media clase</div></div>
      </div>
      <div class="stat-card fade-in fade-in-delay-2">
        <div class="stat-icon stat-icon-green"><i class="bi bi-check2-square icon-success"></i></div>
        <div><div class="stat-value">${totalSubs}</div><div class="stat-label">Entregas totales</div></div>
      </div>
      <div class="stat-card fade-in fade-in-delay-3">
        <div class="stat-icon stat-icon-purple"><i class="bi bi-pencil-square icon-purple"></i></div>
        <div><div class="stat-value">${gradedSubs}/${totalSubs}</div><div class="stat-label">Entregas corregidas</div></div>
      </div>
    </div>`;

  document.getElementById('stats-container').innerHTML = filtered.map(student => {
    const studentSubs   = subs.filter(s => s.studentUid === student.uid);
    const studentGrades = grades.filter(g => g.studentUid === student.uid);
    const delivered     = studentSubs.length;
    const pending       = tasks.length - delivered;
    const gradedList    = studentSubs.filter(s => s.grade != null);
    const allGradeVals  = [...gradedList.map(s => s.grade), ...studentGrades.map(g => g.grade)];
    const avg           = allGradeVals.length ? (allGradeVals.reduce((a, b) => a + b, 0) / allGradeVals.length).toFixed(1) : null;
    const pct           = tasks.length ? Math.round(delivered / tasks.length * 100) : 0;
    const initials      = student.displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const recentGrades  = [...gradedList.map(s => ({ label: s.taskTitle || 'Tarea', val: s.grade })),
                           ...studentGrades.map(g => ({ label: g.concept, val: g.grade }))].slice(-6);
    const bars = recentGrades.length ? recentGrades.map(g => {
      const h   = Math.round((g.val / 10) * 60);
      const cls = g.val >= 9 ? 'var(--success)' : g.val >= 7 ? 'var(--brand)' : g.val >= 5 ? 'var(--accent)' : 'var(--danger)';
      return `<div class="stats-bar-col">
        <span class="stats-bar-val" style="color:${cls}">${g.val.toFixed(1)}</span>
        <div class="stats-bar-track">
          <div class="stats-bar-fill" style="height:${h}px;background:${cls}"></div>
        </div>
        <span class="stats-bar-label">${esc(g.label)}</span>
      </div>`;
    }).join('') : `<div class="text-muted text-sm p-2">Sin calificaciones aún</div>`;

    return `
    <div class="card fade-in mb-3">
      <div class="card-header">
        <div class="d-flex align-items-center gap-3">
          <div class="stats-student-avatar">${initials}</div>
          <div>
            <div class="fw-bold">${esc(student.displayName)}</div>
            <div class="text-xs text-muted">${esc(student.email)}</div>
          </div>
        </div>
        <div class="d-flex align-items-center gap-3">
          ${avg != null ? `${gradeBadge(avg)} <span class="text-muted text-xs">media</span>` : '<span class="badge badge-neutral">Sin notas</span>'}
        </div>
      </div>
      <div class="card-body">
        <div class="row g-4">
          <div class="col-12 col-md-6">
            <div class="stats-section-label">Progreso de entregas</div>
            <div class="d-flex gap-4 mb-3">
              <div class="text-center">
                <div class="stats-big-num" style="color:var(--success)">${delivered}</div>
                <div class="stats-num-label">Entregadas</div>
              </div>
              <div class="text-center">
                <div class="stats-big-num" style="color:var(--danger)">${pending < 0 ? 0 : pending}</div>
                <div class="stats-num-label">Pendientes</div>
              </div>
              <div class="text-center">
                <div class="stats-big-num" style="color:var(--brand)">${tasks.length}</div>
                <div class="stats-num-label">Total tareas</div>
              </div>
            </div>
            <div class="progress-bar-wrap">
              <div class="progress-bar-fill" style="width:${pct}%;background:${pct >= 80 ? 'var(--success)' : pct >= 50 ? 'var(--brand)' : 'var(--danger)'}"></div>
            </div>
            <div class="text-end mt-1 text-xs text-muted">${pct}% completado</div>
          </div>
          <div class="col-12 col-md-6">
            <div class="stats-section-label">Últimas calificaciones</div>
            <div class="stats-bars-wrap">${bars}</div>
          </div>
        </div>
      </div>
    </div>`;
  }).join('');
}

document.getElementById('stats-student-filter').addEventListener('change', renderStats);
