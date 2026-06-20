// ─────────────────────────────────────────
//  Modo oscuro / claro
// ─────────────────────────────────────────
function applyTheme(dark) {
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : '');
  const icon = document.getElementById('dark-icon');
  if (icon) icon.className = dark ? 'bi bi-sun-fill' : 'bi bi-moon-fill';
}

export function initTheme() {
  const toggle = document.getElementById('dark-toggle');
  toggle?.addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    localStorage.setItem('ao_theme', isDark ? 'light' : 'dark');
    applyTheme(!isDark);
  });
  applyTheme(localStorage.getItem('ao_theme') === 'dark');
}
