// ─────────────────────────────────────────
//  Helpers genéricos para mostrar/ocultar elementos (usa d-none de Bootstrap)
// ─────────────────────────────────────────
export function show(el) {
  el?.classList.remove('d-none');
}

export function hide(el) {
  el?.classList.add('d-none');
}
