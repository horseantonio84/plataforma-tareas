// ─────────────────────────────────────────
//  Apertura/cierre de modales y diálogo de confirmación genérico
// ─────────────────────────────────────────
export function openModal(id) {
  document.getElementById(id)?.classList.add('open');
}

export function closeModal(id) {
  document.getElementById(id)?.classList.remove('open');
}

export function showConfirm({
  title = '¿Estás seguro?',
  message = '',
  confirmText = 'Confirmar',
  danger = true,
  icon = 'exclamation-triangle-fill',
} = {}) {
  return new Promise(resolve => {
    document.getElementById('confirm-title-text').textContent = title;
    document.getElementById('confirm-message').textContent = message;
    const iconEl = document.getElementById('confirm-icon');
    iconEl.className = `bi bi-${icon} ${danger ? 'icon-danger' : 'icon-warning'}`;
    const okBtn = document.getElementById('confirm-ok-btn');
    okBtn.textContent = confirmText;
    okBtn.className = `btn ${danger ? 'btn-danger' : 'btn-primary'}`;
    openModal('modal-confirm');
    const cleanup = result => {
      closeModal('modal-confirm');
      okBtn.onclick = null;
      document.getElementById('confirm-cancel-btn').onclick = null;
      resolve(result);
    };
    okBtn.onclick = () => cleanup(true);
    document.getElementById('confirm-cancel-btn').onclick = () => cleanup(false);
  });
}

// Cierre genérico: click en el fondo oscuro o en cualquier [data-close-modal]
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) closeModal(e.target.id);
  const closer = e.target.closest('[data-close-modal]');
  if (closer) closeModal(closer.dataset.closeModal);
});
