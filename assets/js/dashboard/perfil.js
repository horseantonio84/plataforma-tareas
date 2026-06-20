// ─────────────────────────────────────────
//  Página "Mi perfil" del alumno
// ─────────────────────────────────────────
import { state } from './state.js';
import { esc } from '../shared/format.js';
import { show, hide } from '../shared/dom.js';
import { switchClass } from './class-switcher.js';

export function renderPerfil() {
  const initials = (state.currentUser.displayName || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  document.getElementById('perfil-avatar').textContent    = initials;
  document.getElementById('perfil-name').textContent      = state.currentUser.displayName || '—';
  document.getElementById('perfil-email').textContent     = state.currentUser.email || '—';
  document.getElementById('perfil-classname').textContent = state.currentClass.name || '—';
  document.getElementById('perfil-classdesc').textContent = state.currentClass.description || 'Sin descripción';
  document.getElementById('perfil-code').textContent      = state.currentClass.code || '—';

  const el = document.getElementById('perfil-all-classes');
  if (!el) return;
  if (state.allMyClasses.length <= 1) { hide(el); return; }
  show(el);
  el.innerHTML = `
    <div class="perfil-all-label">Todas mis clases (${state.allMyClasses.length})</div>
    ${state.allMyClasses.map(c => `
      <div class="perfil-class-row">
        <div class="perfil-class-icon">${c.name[0].toUpperCase()}</div>
        <div class="perfil-class-info">
          <div class="perfil-class-name">${esc(c.name)}</div>
          <div class="perfil-class-code">${c.code || ''}</div>
        </div>
        ${c.id === state.currentClass.id
          ? '<span class="badge badge-brand">Activa</span>'
          : `<button class="btn btn-sm btn-secondary btn-switch-perfil" data-cid="${c.id}">Cambiar</button>`}
      </div>`).join('')}`;
  el.querySelectorAll('.btn-switch-perfil').forEach(btn => {
    btn.addEventListener('click', () => switchClass(btn.dataset.cid));
  });
}
