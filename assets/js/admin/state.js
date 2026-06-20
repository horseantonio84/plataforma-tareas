// ─────────────────────────────────────────
//  Estado compartido del panel de profesor.
//  Se exporta un único objeto mutable: todos los módulos
//  importan esta misma referencia, así que cualquier cambio
//  en sus propiedades es visible para el resto de la app.
// ─────────────────────────────────────────
export const state = {
  currentUser: null,
  currentClass: null,
  allClasses: [],
  studentsCache: [],
};
