// ─────────────────────────────────────────
//  Notificaciones toast
// ─────────────────────────────────────────
export function toast(msg, type = '') {
  const el = document.createElement('div');
  el.className = `toast${type ? ' toast-' + type : ''}`;
  const icon = type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle';
  el.innerHTML = `<i class="bi bi-${icon}"></i> ${msg}`;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => el.remove(), 3500);
}
