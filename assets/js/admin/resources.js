// ─────────────────────────────────────────
//  Recursos / materiales de la clase
// ─────────────────────────────────────────
import { db, collection, getDocs, addDoc, deleteDoc, doc, query, where, orderBy, serverTimestamp } from '../lib/firebase.js';
import { state } from './state.js';
import { esc } from '../shared/format.js';
import { RES_ICON } from '../shared/constants.js';
import { openModal, closeModal } from '../shared/modal.js';
import { toast } from '../shared/toast.js';
import { logActivity } from './activity.js';

export async function renderResources() {
  const snap = await getDocs(query(collection(db, 'resources'), where('classId', '==', state.currentClass.id), orderBy('createdAt', 'desc')));
  const el   = document.getElementById('resources-container');
  if (snap.empty) {
    el.innerHTML = `<div class="empty-state"><i class="bi bi-folder-x"></i><p>Añade materiales para tus alumnos.</p></div>`;
    return;
  }
  el.innerHTML = snap.docs.map(d => {
    const r = d.data();
    return `
    <div class="res-card fade-in">
      <div class="res-icon"><i class="bi ${RES_ICON[r.type] || 'bi-box-seam'}"></i></div>
      <div class="res-info">
        <div class="res-name">${esc(r.name)}</div>
        ${r.desc ? `<div class="res-desc">${esc(r.desc)}</div>` : ''}
      </div>
      <a href="${esc(r.url)}" target="_blank" class="btn btn-sm btn-secondary"><i class="bi bi-box-arrow-up-right"></i> Abrir</a>
      <button class="btn btn-ghost btn-icon btn-sm btn-delete-res icon-danger" data-res-id="${d.id}"><i class="bi bi-trash"></i></button>
    </div>`;
  }).join('');

  el.querySelectorAll('.btn-delete-res').forEach(btn => {
    btn.addEventListener('click', () => deleteResource(btn.dataset.resId));
  });
}

async function deleteResource(id) {
  if (!confirm('¿Eliminar este recurso?')) return;
  await deleteDoc(doc(db, 'resources', id));
  renderResources();
  toast('Recurso eliminado.');
}

document.getElementById('btn-save-recurso').addEventListener('click', async () => {
  const name = document.getElementById('res-name').value.trim();
  const url  = document.getElementById('res-url').value.trim();
  if (!name || !url) { toast('Nombre y URL son obligatorios.', 'error'); return; }
  await addDoc(collection(db, 'resources'), {
    classId: state.currentClass.id, name, url,
    type: document.getElementById('res-type').value,
    desc: document.getElementById('res-desc').value.trim(),
    createdAt: serverTimestamp(),
  });
  logActivity('resource', `Nuevo recurso: "${name}"`);
  closeModal('modal-recurso');
  ['res-name', 'res-url', 'res-desc'].forEach(i => document.getElementById(i).value = '');
  renderResources();
  toast('Recurso añadido.', 'success');
});

document.getElementById('btn-open-recurso').addEventListener('click', () => openModal('modal-recurso'));
