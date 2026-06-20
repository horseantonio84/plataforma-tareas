// ─────────────────────────────────────────
//  Chat con el profesor (vista de alumno)
// ─────────────────────────────────────────
import {
  db, collection, query, where, orderBy,
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp, onSnapshot,
} from '../lib/firebase.js';
import { state } from './state.js';
import { esc } from '../shared/format.js';
import { hide, show } from '../shared/dom.js';

let _unsubChat = null;
let _unsubChatNotif = null;

function getConvId() {
  return `${state.currentClass.id}_${state.currentUser.uid}`;
}

export function initChat() {
  if (_unsubChat) { _unsubChat(); _unsubChat = null; }
  hide(document.getElementById('badge-chat'));
  localStorage.setItem('ao_chatLastRead_' + state.currentClass.id, Date.now());

  _unsubChat = onSnapshot(
    query(collection(db, 'messages'), where('convId', '==', getConvId()), orderBy('createdAt', 'asc')),
    snap => {
      const el = document.getElementById('chat-messages');
      if (!el) return;
      snap.docs.forEach(d => {
        const m = d.data();
        if (m.fromRole === 'teacher' && !m.readAt)
          updateDoc(doc(db, 'messages', d.id), { readAt: serverTimestamp() }).catch(() => {});
      });
      if (snap.empty) {
        el.innerHTML = `<div class="empty-state"><i class="bi bi-chat-dots"></i><p>Sin mensajes aún. ¡Escribe al profesor!</p></div>`;
        return;
      }
      el.innerHTML = snap.docs.map(d => {
        const m      = d.data();
        const isMine = m.fromRole === 'student';
        const time   = m.createdAt?.toDate ? m.createdAt.toDate().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '';
        const read   = isMine ? (m.readAt ? `<span class="chat-read" title="Leído">✓✓</span>` : `<span class="chat-unread" title="Enviado">✓</span>`) : '';
        return `
        <div class="chat-msg ${isMine ? 'mine' : 'theirs'}">
          ${!isMine ? `<div class="chat-avatar"><i class="bi bi-person-fill"></i></div>` : ''}
          <div class="chat-bubble-wrap">
            ${!isMine ? `<div class="chat-sender">Profesor</div>` : ''}
            <div class="chat-bubble">${esc(m.text)}</div>
            <div class="chat-time">${time} ${read}${isMine ? ` <i class="bi bi-trash chat-delete-msg" data-msg-id="${d.id}"></i>` : ''}</div>
          </div>
        </div>`;
      }).join('');
      el.querySelectorAll('.chat-delete-msg').forEach(i => {
        i.addEventListener('click', () => deleteChatMessage(i.dataset.msgId));
      });
      el.scrollTop = el.scrollHeight;
    }
  );
}

async function sendChatMessage() {
  const input = document.getElementById('chat-input');
  const text  = input.value.trim();
  if (!text) return;
  input.value = '';
  await addDoc(collection(db, 'messages'), {
    convId: getConvId(), classId: state.currentClass.id,
    studentUid: state.currentUser.uid, fromUid: state.currentUser.uid,
    fromName: state.currentUser.displayName, fromRole: 'student',
    text, readAt: null, createdAt: serverTimestamp(),
  });
}

async function deleteChatMessage(msgId) {
  if (!confirm('¿Borrar este mensaje?')) return;
  await deleteDoc(doc(db, 'messages', msgId));
}

document.getElementById('btn-send-chat').addEventListener('click', sendChatMessage);
document.getElementById('chat-input').addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(); }
});

export function startChatNotifications() {
  if (_unsubChatNotif) _unsubChatNotif();
  _unsubChatNotif = onSnapshot(
    query(collection(db, 'messages'), where('convId', '==', getConvId()), where('fromRole', '==', 'teacher'), orderBy('createdAt', 'desc')),
    snap => {
      if (document.querySelector('.sidebar .nav-item.active')?.id === 'nav-chat') return;
      const lastRead = parseInt(localStorage.getItem('ao_chatLastRead_' + state.currentClass.id) || '0');
      const newMsgs  = snap.docs.filter(d => (d.data().createdAt?.toMillis?.() || 0) > lastRead);
      const badge    = document.getElementById('badge-chat');
      newMsgs.length ? show(badge) : hide(badge);
      badge.textContent = newMsgs.length;
    }
  );
}

export function stopChatListeners() {
  _unsubChat?.();
  _unsubChatNotif?.();
}
