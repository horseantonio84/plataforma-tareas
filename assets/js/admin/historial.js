// ─────────────────────────────────────────
//  Historial de actividad de la clase
// ─────────────────────────────────────────
import { db, collection, query, where, orderBy, onSnapshot } from '../lib/firebase.js';
import { state } from './state.js';
import { esc } from '../shared/format.js';

const ACTIVITY_ICONS = {
  submission:   { icon: 'bi-upload',            color: 'var(--brand)',   bg: '#dbeafe' },
  grade:        { icon: 'bi-pencil-square',     color: 'var(--success)', bg: '#dcfce7' },
  approval:     { icon: 'bi-person-check-fill', color: 'var(--accent)',  bg: 'var(--accent-light)' },
  task:         { icon: 'bi-check2-square',     color: 'var(--brand)',   bg: '#dbeafe' },
  announcement: { icon: 'bi-megaphone-fill',    color: 'var(--warning)', bg: '#fef3c7' },
  resource:     { icon: 'bi-folder2-open',      color: 'var(--muted)',   bg: 'var(--surface)' },
  revoke:       { icon: 'bi-person-x-fill',     color: 'var(--danger)',  bg: '#fee2e2' },
};

let _unsubHistorial = null;

export function renderHistorial() {
  const filter = document.getElementById('filter-activity').value;
  const el     = document.getElementById('historial-container');
  if (_unsubHistorial) { _unsubHistorial(); _unsubHistorial = null; }

  _unsubHistorial = onSnapshot(
    query(collection(db, 'activity'), where('classId', '==', state.currentClass.id), orderBy('createdAt', 'desc')),
    snap => {
      let items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (filter) items = items.filter(i => i.type === filter);
      if (!items.length) {
        el.innerHTML = `<div class="empty-state"><i class="bi bi-clock-history"></i><p>No hay actividad registrada aún.</p></div>`;
        return;
      }
      el.innerHTML = `<div class="card">
        <div>
          ${items.map((item, idx) => {
            const cfg = ACTIVITY_ICONS[item.type] || { icon: 'bi-circle', color: 'var(--muted)', bg: 'var(--surface)' };
            const ts  = item.createdAt?.toDate ? item.createdAt.toDate() : null;
            const timeStr = ts ? ts.toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
            return `
            <div class="historial-row${idx < items.length - 1 ? ' historial-row-border' : ''}">
              <div class="historial-icon" style="background:${cfg.bg};color:${cfg.color}">
                <i class="bi ${cfg.icon}"></i>
              </div>
              <div class="flex-fill" style="min-width:0">
                <div class="text-sm">${esc(item.text)}</div>
                ${item.detail ? `<div class="text-muted text-xs mt-1">${esc(item.detail)}</div>` : ''}
              </div>
              <div class="historial-time">${timeStr}</div>
            </div>`;
          }).join('')}
        </div>
      </div>`;
    }
  );
}

export function stopHistorial() {
  if (_unsubHistorial) { _unsubHistorial(); _unsubHistorial = null; }
}

document.getElementById('filter-activity').addEventListener('change', renderHistorial);
