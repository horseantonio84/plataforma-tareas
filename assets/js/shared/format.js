// ─────────────────────────────────────────
//  Formateo de texto, fechas y badges
// ─────────────────────────────────────────
export function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function fmtDate(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function fmtDateShort(str) {
  if (!str) return '';
  return new Date(str + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

export function fmtLastSeen(ts) {
  if (!ts) return '<span class="last-seen">Nunca</span>';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const diffMs  = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH   = Math.floor(diffMs / 3600000);
  const diffD   = Math.floor(diffMs / 86400000);
  if (diffMin < 5)  return `<span class="last-seen online"><span class="dot"></span> En línea</span>`;
  if (diffMin < 60) return `<span class="last-seen"><span class="dot"></span> Hace ${diffMin} min</span>`;
  if (diffH < 24)   return `<span class="last-seen"><span class="dot"></span> Hace ${diffH}h</span>`;
  if (diffD < 7)    return `<span class="last-seen"><span class="dot"></span> Hace ${diffD}d</span>`;
  return `<span class="last-seen"><span class="dot"></span> ${d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</span>`;
}

export function dueBadge(due) {
  if (!due) return '';
  const d = new Date(due + 'T00:00:00');
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diff = Math.round((d - now) / 86400000);
  if (diff < 0)   return `<span class="badge badge-danger"><i class="bi bi-x-circle"></i> Vencida</span>`;
  if (diff === 0) return `<span class="badge badge-warning"><i class="bi bi-alarm"></i> Hoy</span>`;
  if (diff === 1) return `<span class="badge badge-warning"><i class="bi bi-clock"></i> Mañana</span>`;
  if (diff <= 3)  return `<span class="badge badge-warning"><i class="bi bi-clock"></i> ${diff} días</span>`;
  if (diff <= 7)  return `<span class="badge badge-accent"><i class="bi bi-calendar"></i> ${diff} días</span>`;
  return `<span class="badge badge-neutral"><i class="bi bi-calendar"></i> ${fmtDateShort(due)}</span>`;
}

export function gradeBadge(g) {
  if (g == null) return '<span class="grade-badge grade-na">—</span>';
  const n = parseFloat(g);
  const cls = n >= 9 ? 'grade-a' : n >= 7 ? 'grade-b' : n >= 5 ? 'grade-c' : 'grade-d';
  return `<span class="grade-badge ${cls}">${n.toFixed(1)}</span>`;
}

export function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}
