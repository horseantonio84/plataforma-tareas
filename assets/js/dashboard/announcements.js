// ─────────────────────────────────────────
//  Anuncios (vista de alumno)
// ─────────────────────────────────────────
import { db, collection, query, where, orderBy, onSnapshot } from '../lib/firebase.js';
import { state } from './state.js';
import { esc, fmtDate } from '../shared/format.js';
import { hide, show } from '../shared/dom.js';
import { toast } from '../shared/toast.js';
import { renderHome } from './home.js';

let _unsubAnnouncements = null;
let _annCacheLoaded = false;

export function startAnnouncementsListener() {
  if (_unsubAnnouncements) _unsubAnnouncements();
  _unsubAnnouncements = onSnapshot(
    query(collection(db, 'announcements'), where('classId', '==', state.currentClass.id), orderBy('createdAt', 'desc')),
    snap => {
      const newAnns = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (_annCacheLoaded) {
        const oldIds = new Set(state.announcementsCache.map(a => a.id));
        const added  = newAnns.filter(a => !oldIds.has(a.id));
        if (added.length && document.querySelector('.sidebar .nav-item.active')?.id !== 'nav-anuncios') {
          const seen   = JSON.parse(localStorage.getItem('ao_seenAnns_' + state.currentClass.id) || '[]');
          const unseen = newAnns.filter(a => !seen.includes(a.id));
          const badge  = document.getElementById('badge-anuncios');
          unseen.length ? show(badge) : hide(badge);
          badge.textContent = unseen.length;
          added.forEach(a => toast(`📢 Nuevo anuncio: ${a.title}`, 'success'));
        }
      }
      state.announcementsCache = newAnns;
      _annCacheLoaded = true;
      const active = document.querySelector('.sidebar .nav-item.active')?.id;
      if (active === 'nav-anuncios') renderAnnouncementsFromCache();
      if (active === 'nav-inicio')   renderHome();
    }
  );
}

function renderAnnouncementsFromCache() {
  const el = document.getElementById('annc-container');
  el.innerHTML = !state.announcementsCache.length
    ? `<div class="empty-state"><i class="bi bi-megaphone"></i><p>No hay anuncios aún.</p></div>`
    : state.announcementsCache.map(a => `
      <div class="annc-card fade-in">
        <div class="annc-header"><div class="annc-title">${esc(a.title)}</div></div>
        <div class="annc-body">${esc(a.body)}</div>
        <div class="annc-meta"><i class="bi bi-clock me-1"></i>${fmtDate(a.createdAt)}</div>
      </div>`).join('');
}

export function enterAnnouncementsSection() {
  localStorage.setItem('ao_seenAnns_' + state.currentClass.id, JSON.stringify(state.announcementsCache.map(a => a.id)));
  hide(document.getElementById('badge-anuncios'));
  renderAnnouncementsFromCache();
}

export function resetAnnouncementsState() {
  state.announcementsCache = [];
  _annCacheLoaded = false;
}

export function stopAnnouncementsListener() {
  _unsubAnnouncements?.();
}
