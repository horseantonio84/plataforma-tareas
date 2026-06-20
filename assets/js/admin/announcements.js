// ─────────────────────────────────────────
//  Anuncios de la clase
// ─────────────────────────────────────────
import { db, collection, getDocs, addDoc, deleteDoc, doc, query, where, orderBy, serverTimestamp } from '../lib/firebase.js';
import { state } from './state.js';
import { esc, fmtDate } from '../shared/format.js';
import { openModal, closeModal } from '../shared/modal.js';
import { toast } from '../shared/toast.js';
import { logActivity } from './activity.js';

export async function renderAnnouncements() {
  const snap = await getDocs(query(collection(db, 'announcements'), where('classId', '==', state.currentClass.id), orderBy('createdAt', 'desc')));
  const el   = document.getElementById('annc-container');
  if (snap.empty) {
    el.innerHTML = `<div class="empty-state"><i class="bi bi-megaphone"></i><p>No hay anuncios aún. Comunícate con tu clase.</p></div>`;
    return;
  }
  el.innerHTML = snap.docs.map(d => {
    const a = d.data();
    return `
    <div class="annc-card fade-in">
      <div class="annc-header">
        <div class="annc-title">${esc(a.title)}</div>
        <button class="btn btn-ghost btn-icon btn-sm btn-delete-annc icon-danger" data-annc-id="${d.id}"><i class="bi bi-trash"></i></button>
      </div>
      <div class="annc-body">${esc(a.body)}</div>
      <div class="annc-meta"><i class="bi bi-clock me-1"></i>${fmtDate(a.createdAt)}</div>
    </div>`;
  }).join('');

  el.querySelectorAll('.btn-delete-annc').forEach(btn => {
    btn.addEventListener('click', () => deleteAnnouncement(btn.dataset.anncId));
  });
}

async function deleteAnnouncement(id) {
  if (!confirm('¿Eliminar este anuncio?')) return;
  await deleteDoc(doc(db, 'announcements', id));
  renderAnnouncements();
  toast('Anuncio eliminado.');
}

document.getElementById('btn-save-annc').addEventListener('click', async () => {
  const title = document.getElementById('annc-title').value.trim();
  const body  = document.getElementById('annc-body').value.trim();
  if (!title) { toast('El título es obligatorio.', 'error'); return; }
  await addDoc(collection(db, 'announcements'), {
    classId: state.currentClass.id, title, body,
    teacherName: state.currentUser.displayName, createdAt: serverTimestamp(),
  });
  logActivity('announcement', `Nuevo anuncio: "${title}"`);
  closeModal('modal-anuncio');
  document.getElementById('annc-title').value = '';
  document.getElementById('annc-body').value  = '';
  renderAnnouncements();
  toast('Anuncio publicado.', 'success');
});

document.getElementById('btn-open-anuncio').addEventListener('click', () => openModal('modal-anuncio'));
