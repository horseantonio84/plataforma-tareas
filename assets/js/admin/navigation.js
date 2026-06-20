// ─────────────────────────────────────────
//  Navegación entre secciones del panel de profesor
// ─────────────────────────────────────────
import { renderHome } from './home.js';
import { renderTasks } from './tasks.js';
import { renderSubmissions } from './submissions.js';
import { renderGrades } from './grades.js';
import { renderAnnouncements } from './announcements.js';
import { renderResources } from './resources.js';
import { initChat } from './chat.js';
import { renderStats } from './stats.js';
import { renderHistorial, stopHistorial } from './historial.js';
import { renderStudents, renderClassRequests } from './students.js';
import { loadSettings } from './settings.js';
import { show, hide } from '../shared/dom.js';

export function showSection(id) {
  document.querySelectorAll('.app-layout > section').forEach(s => s.classList.add('d-none'));
  document.getElementById('s-' + id).classList.remove('d-none');
  document.querySelectorAll('.sidebar .nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('nav-' + id)?.classList.add('active');

  if (id === 'inicio')       renderHome();
  if (id === 'tareas')       renderTasks();
  if (id === 'entregas')     renderSubmissions();
  if (id === 'notas')        renderGrades();
  if (id === 'anuncios')     renderAnnouncements();
  if (id === 'recursos')     renderResources();
  if (id === 'chat')         initChat();
  if (id === 'estadisticas') renderStats();
  if (id === 'historial')    renderHistorial();
  else                       stopHistorial();
  if (id === 'alumnos')      { renderStudents(); renderClassRequests(); }
  if (id === 'ajustes')      loadSettings();

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
function updateSidebarToggle() {
  window.innerWidth < 768 ? show(sidebarToggle) : hide(sidebarToggle);
}
updateSidebarToggle();
window.addEventListener('resize', updateSidebarToggle);

document.getElementById('avatar-btn').addEventListener('click', () => {
  document.getElementById('avatar-menu').classList.toggle('open');
});
document.addEventListener('click', e => {
  if (!document.getElementById('avatar-btn').contains(e.target))
    document.getElementById('avatar-menu').classList.remove('open');
});

document.getElementById('menu-link-ajustes').addEventListener('click', e => {
  e.preventDefault();
  showSection('ajustes');
  document.getElementById('avatar-menu').classList.remove('open');
});
