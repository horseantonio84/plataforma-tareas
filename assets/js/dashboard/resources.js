// ─────────────────────────────────────────
//  Recursos / materiales (vista de alumno)
// ─────────────────────────────────────────
import { db, collection, query, where, orderBy, onSnapshot } from '../lib/firebase.js';
import { state } from './state.js';
import { esc } from '../shared/format.js';
import { RES_ICON } from '../shared/constants.js';
import { hide, show } from '../shared/dom.js';
import { toast } from '../shared/toast.js';

let _unsubResources = null;
let _resCacheLoaded = false;

export function startResourcesListener() {
  if (_unsubResources) _unsubResources();
  _unsubResources = onSnapshot(
    query(collection(db, 'resources'), where('classId', '==', state.currentClass.id), orderBy('createdAt', 'desc')),
    snap => {
      const newRes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (_resCacheLoaded) {
        const oldIds = new Set(state.resourcesCache.map(r => r.id));
        const added  = newRes.filter(r => !oldIds.has(r.id));
        if (added.length && document.querySelector('.sidebar .nav-item.active')?.id !== 'nav-recursos') {
          const seen   = JSON.parse(localStorage.getItem('ao_seenRes_' + state.currentClass.id) || '[]');
          const unseen = newRes.filter(r => !seen.includes(r.id));
          const badge  = document.getElementById('badge-recursos');
          unseen.length ? show(badge) : hide(badge);
          badge.textContent = unseen.length;
          added.forEach(r => toast(`📁 Nuevo recurso: ${r.name}`, 'success'));
        }
      }
      state.resourcesCache = newRes;
      _resCacheLoaded = true;
      if (document.querySelector('.sidebar .nav-item.active')?.id === 'nav-recursos') renderResourcesFromCache();
    }
  );
}

function renderResourcesFromCache() {
  const el = document.getElementById('resources-container');
  el.innerHTML = !state.resourcesCache.length
    ? `<div class="empty-state"><i class="bi bi-folder-x"></i><p>El profesor no ha subido recursos aún.</p></div>`
    : state.resourcesCache.map(r => `
      <div class="res-card fade-in">
        <div class="res-icon"><i class="bi ${RES_ICON[r.type] || 'bi-box-seam'}"></i></div>
        <div class="res-info">
          <div class="res-name">${esc(r.name)}</div>
          ${r.desc ? `<div class="res-desc">${esc(r.desc)}</div>` : ''}
        </div>
        <a href="${esc(r.url)}" target="_blank" class="btn btn-sm btn-secondary">
          <i class="bi bi-box-arrow-up-right"></i> Abrir
        </a>
      </div>`).join('');
}

export function enterResourcesSection() {
  localStorage.setItem('ao_seenRes_' + state.currentClass.id, JSON.stringify(state.resourcesCache.map(r => r.id)));
  hide(document.getElementById('badge-recursos'));
  renderResourcesFromCache();
}

export function resetResourcesState() {
  state.resourcesCache = [];
  _resCacheLoaded = false;
}

export function stopResourcesListener() {
  _unsubResources?.();
}
