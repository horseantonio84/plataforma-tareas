// ─────────────────────────────────────────
//  Ajustes de la clase (nombre, descripción, código, eliminar clase)
// ─────────────────────────────────────────
import { db, doc, updateDoc, collection, getDocs, deleteDoc, query, where } from '../lib/firebase.js';
import { state } from './state.js';
import { toast } from '../shared/toast.js';
import { renderClassSwitcher, switchClass } from './class-switcher.js';

export function loadSettings() {
  document.getElementById('set-classname').value = state.currentClass.name || '';
  document.getElementById('set-classdesc').value = state.currentClass.description || '';
  document.getElementById('settings-code').textContent = state.currentClass.code || '—';
}

document.getElementById('btn-save-settings').addEventListener('click', async () => {
  const name = document.getElementById('set-classname').value.trim();
  const desc = document.getElementById('set-classdesc').value.trim();
  if (!name) { toast('El nombre es obligatorio.', 'error'); return; }
  await updateDoc(doc(db, 'classes', state.currentClass.id), { name, description: desc });
  state.currentClass.name = name;
  state.currentClass.description = desc;
  const idx = state.allClasses.findIndex(c => c.id === state.currentClass.id);
  if (idx !== -1) state.allClasses[idx].name = name;
  renderClassSwitcher();
  toast('Ajustes guardados.', 'success');
});

document.getElementById('btn-copy-code').addEventListener('click', () => {
  navigator.clipboard.writeText(state.currentClass.code);
  toast('Código copiado al portapapeles.', 'success');
});

document.getElementById('btn-delete-class').addEventListener('click', async () => {
  if (state.allClasses.length <= 1) { toast('No puedes eliminar la única clase que tienes.', 'error'); return; }
  if (!confirm(`¿Eliminar la clase "${state.currentClass.name}"? Se eliminarán todas sus tareas, anuncios y recursos.`)) return;
  const id   = state.currentClass.id;
  const cols = ['tasks', 'announcements', 'resources', 'submissions', 'grades'];
  for (const col of cols) {
    const snap = await getDocs(query(collection(db, col), where('classId', '==', id)));
    for (const d of snap.docs) await deleteDoc(doc(db, col, d.id));
  }
  await deleteDoc(doc(db, 'classes', id));
  state.allClasses = state.allClasses.filter(c => c.id !== id);
  localStorage.removeItem('ao_activeClassId');
  switchClass(state.allClasses[0].id);
  toast('Clase eliminada.', 'success');
});
