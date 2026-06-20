// ─────────────────────────────────────────
//  Página de inicio del panel de alumno
// ─────────────────────────────────────────
import { db, collection, getDocs, query, where, orderBy } from '../lib/firebase.js';
import { state } from './state.js';
import { esc, dueBadge, fmtDate } from '../shared/format.js';
import { PRIO } from '../shared/constants.js';
import { loadSubmissions } from './tasks.js';

export function updateHomeStats() {
  const pending   = state.tasksCache.filter(t => !state.submissionsCache[t.id]);
  const submitted = state.tasksCache.filter(t =>  state.submissionsCache[t.id]);
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const dueSoon = pending.filter(t => {
    if (!t.due) return false;
    const d = new Date(t.due + 'T00:00:00');
    return (d - now) / 86400000 <= 7 && d >= now;
  });
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('st-pending', pending.length);
  set('st-done', submitted.length);
  set('st-due-soon', dueSoon.length);
  const pct  = state.tasksCache.length ? Math.round(submitted.length / state.tasksCache.length * 100) : 0;
  const pBar = document.getElementById('progress-bar');
  const pPct = document.getElementById('progress-pct');
  if (pBar) pBar.style.width = pct + '%';
  if (pPct) pPct.textContent = pct + '%';
}

export async function renderHome() {
  await loadSubmissions();
  const tasksSnap = await getDocs(query(collection(db, 'tasks'), where('classId', '==', state.currentClass.id), orderBy('createdAt', 'desc')));
  const tasks = tasksSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const submitted = tasks.filter(t =>  state.submissionsCache[t.id]);
  const pending   = tasks.filter(t => !state.submissionsCache[t.id]);
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const dueSoon = pending.filter(t => { if (!t.due) return false; const d = new Date(t.due + 'T00:00:00'); return (d - now) / 86400000 <= 7 && d >= now; });

  document.getElementById('st-pending').textContent  = pending.length;
  document.getElementById('st-done').textContent     = submitted.length;
  document.getElementById('st-due-soon').textContent = dueSoon.length;

  const gradesSnap = await getDocs(query(collection(db, 'grades'), where('classId', '==', state.currentClass.id), where('studentUid', '==', state.currentUser.uid)));
  const grades = gradesSnap.docs.map(d => d.data().grade).filter(g => g != null);
  document.getElementById('st-avg').textContent = grades.length
    ? (grades.reduce((a, b) => a + b, 0) / grades.length).toFixed(1) : '—';

  const pct = tasks.length ? Math.round(submitted.length / tasks.length * 100) : 0;
  document.getElementById('progress-pct').textContent = pct + '%';
  document.getElementById('progress-bar').style.width = pct + '%';

  const upcoming = pending.filter(t => t.due).sort((a, b) => a.due.localeCompare(b.due)).slice(0, 5);
  document.getElementById('home-upcoming').innerHTML = !upcoming.length
    ? `<div class="empty-state p-4"><i class="bi bi-check-all fs-2"></i><p>¡Todo entregado!</p></div>`
    : upcoming.map(t => `
      <div class="home-list-row">
        <span class="badge ${PRIO[t.priority || 'media'].cls}">${PRIO[t.priority || 'media'].label}</span>
        <span class="home-list-title">${esc(t.title)}</span>
        ${dueBadge(t.due)}
      </div>`).join('');

  const annSnap = await getDocs(query(collection(db, 'announcements'), where('classId', '==', state.currentClass.id), orderBy('createdAt', 'desc')));
  document.getElementById('home-anncs').innerHTML = !annSnap.size
    ? `<div class="empty-state p-4"><i class="bi bi-megaphone fs-2"></i><p>Sin anuncios recientes</p></div>`
    : annSnap.docs.slice(0, 3).map(d => {
        const a = d.data();
        return `<div class="home-list-row flex-column align-items-start">
          <div class="fw-semibold text-sm">${esc(a.title)}</div>
          <div class="text-muted text-xs">${fmtDate(a.createdAt)}</div>
        </div>`;
      }).join('');
}
