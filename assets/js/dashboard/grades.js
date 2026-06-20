// ─────────────────────────────────────────
//  Calificaciones (vista de alumno)
// ─────────────────────────────────────────
import { db, collection, query, where, orderBy, onSnapshot } from '../lib/firebase.js';
import { state } from './state.js';
import { esc, fmtDate, gradeBadge } from '../shared/format.js';
import { hide, show } from '../shared/dom.js';
import { toast } from '../shared/toast.js';

let _unsubGrades = null;
let _gradesCacheLoaded = false;

export function startGradesListener() {
  if (_unsubGrades) _unsubGrades();
  _unsubGrades = onSnapshot(
    query(collection(db, 'grades'), where('classId', '==', state.currentClass.id), where('studentUid', '==', state.currentUser.uid), orderBy('createdAt', 'desc')),
    snap => {
      const newGrades = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (_gradesCacheLoaded) {
        const oldIds = new Set(state.gradesCache.map(g => g.id));
        const added  = newGrades.filter(g => !oldIds.has(g.id));
        if (added.length && document.querySelector('.sidebar .nav-item.active')?.id !== 'nav-notas') {
          const seen   = JSON.parse(localStorage.getItem('ao_seenGrades_' + state.currentClass.id) || '[]');
          const unseen = newGrades.filter(g => !seen.includes(g.id));
          const badge  = document.getElementById('badge-notas');
          unseen.length ? show(badge) : hide(badge);
          badge.textContent = unseen.length;
          added.forEach(g => toast(`⭐ Nueva nota: ${g.concept} — ${g.grade}`, 'success'));
        }
      }
      state.gradesCache = newGrades;
      _gradesCacheLoaded = true;
      if (document.querySelector('.sidebar .nav-item.active')?.id === 'nav-notas') renderGradesFromCache();
    }
  );
}

function renderGradesFromCache() {
  const el = document.getElementById('grades-container');
  if (!state.gradesCache.length) {
    el.innerHTML = `<div class="empty-state"><i class="bi bi-star"></i><p>Todavía no tienes calificaciones.</p></div>`;
    return;
  }
  const avg = (state.gradesCache.reduce((a, g) => a + g.grade, 0) / state.gradesCache.length).toFixed(1);
  el.innerHTML = `
    <div class="card mb-3 p-4 d-flex flex-row align-items-center gap-4">
      <div>
        <div class="grades-avg-label">Nota media</div>
        <div class="grades-avg-value">${avg}</div>
      </div>
      <div class="text-muted text-sm">
        ${state.gradesCache.length} calificación${state.gradesCache.length > 1 ? 'es' : ''} registrada${state.gradesCache.length > 1 ? 's' : ''}
      </div>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Concepto</th><th>Nota</th><th>Comentario del profesor</th><th>Fecha</th></tr></thead>
        <tbody>
          ${state.gradesCache.map(g => `<tr>
            <td class="fw-semibold">${esc(g.concept)}</td>
            <td>${gradeBadge(g.grade)}</td>
            <td class="text-muted text-xs">${esc(g.comment || '—')}</td>
            <td class="text-xs">${fmtDate(g.createdAt)}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

export function enterGradesSection() {
  localStorage.setItem('ao_seenGrades_' + state.currentClass.id, JSON.stringify(state.gradesCache.map(g => g.id)));
  hide(document.getElementById('badge-notas'));
  renderGradesFromCache();
}

export function resetGradesState() {
  state.gradesCache = [];
  _gradesCacheLoaded = false;
}

export function stopGradesListener() {
  _unsubGrades?.();
}
