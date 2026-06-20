// ─────────────────────────────────────────
//  Navegación entre secciones del panel de alumno
// ─────────────────────────────────────────
import { renderHome } from './home.js';
import { enterTasksSection } from './tasks.js';
import { enterAnnouncementsSection } from './announcements.js';
import { enterResourcesSection } from './resources.js';
import { enterGradesSection } from './grades.js';
import { initChat } from './chat.js';
import { renderPerfil } from './perfil.js';
import { show, hide } from '../shared/dom.js';

export function showSection(id) {
  document.querySelectorAll('.app-layout > section').forEach(s => s.classList.add('d-none'));
  document.getElementById('s-' + id).classList.remove('d-none');
  document.querySelectorAll('.sidebar .nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('nav-' + id)?.classList.add('active');

  if (id === 'inicio')    renderHome();
  if (id === 'tareas')    enterTasksSection();
  if (id === 'anuncios')  enterAnnouncementsSection();
  if (id === 'recursos')  enterResourcesSection();
  if (id === 'notas')     enterGradesSection();
  if (id === 'chat')      initChat();
  if (id === 'perfil')    renderPerfil();

  if (window.innerWidth < 768) document.getElementById('sidebar').classList.remove('open');
}

document.querySelectorAll('.sidebar .nav-item[data-section]').forEach(btn => {
  btn.addEventListener('click', () => showSection(btn.dataset.section));
});
document.querySelectorAll('[data-nav-to]').forEach(btn => {
  btn.addEventListener('click', () => showSection(btn.dataset.navTo));
});

const sidebarToggle = document.getElementById('sidebar-toggle');
sidebarToggle.addEventListener('click', () => document.getElementById('sidebar').classList.toggle('open'));
function updateToggle() {
  window.innerWidth < 768 ? show(sidebarToggle) : hide(sidebarToggle);
}
updateToggle();
window.addEventListener('resize', updateToggle);

document.getElementById('avatar-btn').addEventListener('click', () => {
  document.getElementById('avatar-menu').classList.toggle('open');
});
document.addEventListener('click', e => {
  if (!document.getElementById('avatar-btn').contains(e.target))
    document.getElementById('avatar-menu').classList.remove('open');
});
