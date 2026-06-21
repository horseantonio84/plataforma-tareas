// ─────────────────────────────────────────
//  Chat privado profesor ↔ alumno
// ─────────────────────────────────────────
import {
  db, collection, getDocs, query, where, orderBy,
  addDoc, updateDoc, doc, deleteDoc, serverTimestamp, onSnapshot,
} from '../lib/firebase.js';
import { state } from './state.js';
import { esc } from '../shared/format.js';
import { show, hide } from '../shared/dom.js';
import { showConfirm } from '../shared/modal.js';
import { toast } from '../shared/toast.js';
import { getApprovedStudents } from './students.js';

let _unsubChat = null;
let _chatStudentUid = null;
// Mismo control que en el chat del alumno: evita reescribir readAt en bucle.
const _markedRead = new Set();

function getConvId(studentUid) {
  return `${state.currentClass.id}_${studentUid}`;
}

export async function initChat() {
  if (_unsubChat) { _unsubChat(); _unsubChat = null; }
  hide(document.getElementById('badge-chat'));
  localStorage.setItem('ao_chatLastRead_' + state.currentClass.id, Date.now());

  const studs = await getApprovedStudents();
  const listEl = document.getElementById('chat-student-list');
  if (!studs.length) {
    listEl.innerHTML = `<div class="empty-state p-4"><i class="bi bi-people"></i><p>No hay alumnos aprobados.</p></div>`;
    return;
  }

  const preview = {};
  for (const s of studs) {
    const convId = getConvId(s.uid);
    const snap = await getDocs(query(collection(db, 'messages'), where('convId', '==', convId), orderBy('createdAt', 'desc')));
    if (!snap.empty) preview[s.uid] = snap.docs[0].data();
  }

  listEl.innerHTML = studs.map(s => {
    const last     = preview[s.uid];
    const initials = s.displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const lastText = last ? esc(last.text.slice(0, 35)) + (last.text.length > 35 ? '…' : '') : 'Sin mensajes';
    const lastTime = last?.createdAt?.toDate ? last.createdAt.toDate().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '';
    return `
    <button class="chat-student-item ${s.uid === _chatStudentUid ? 'active' : ''}" data-student-uid="${s.uid}" data-student-name="${esc(s.displayName)}">
      <div class="chat-avatar">${initials}</div>
      <div class="chat-student-info">
        <div class="chat-student-name">${esc(s.displayName)}</div>
        <div class="chat-student-last">${lastText}</div>
      </div>
      ${lastTime ? `<div class="chat-student-time">${lastTime}</div>` : ''}
    </button>`;
  }).join('');

  listEl.querySelectorAll('.chat-student-item').forEach(btn => {
    btn.addEventListener('click', () => openConversation(btn.dataset.studentUid, btn.dataset.studentName));
  });

  if (_chatStudentUid) {
    const s = studs.find(s => s.uid === _chatStudentUid);
    if (s) openConversation(s.uid, s.displayName);
  }
}

function openConversation(studentUid, studentName) {
  if (_unsubChat) { _unsubChat(); _unsubChat = null; }
  _chatStudentUid = studentUid;

  document.querySelectorAll('.chat-student-item').forEach(el => {
    el.classList.toggle('active', el.dataset.studentUid === studentUid);
  });

  hide(document.getElementById('chat-no-selection'));
  show(document.getElementById('chat-conversation'));

  const initials = studentName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  document.getElementById('chat-conv-header').innerHTML = `
    <div class="chat-avatar ao-avatar-md">${initials}</div>
    <div class="fw-semibold text-sm">${esc(studentName)}</div>`;

  const convId = getConvId(studentUid);
  _unsubChat = onSnapshot(
    query(collection(db, 'messages'), where('convId', '==', convId), orderBy('createdAt', 'asc')),
    snap => {
      const el = document.getElementById('chat-messages');
      if (!el) return;
      snap.docs.forEach(d => {
        const m = d.data();
        if (m.fromRole === 'student' && !m.readAt && !_markedRead.has(d.id)) {
          _markedRead.add(d.id);
          updateDoc(doc(db, 'messages', d.id), { readAt: serverTimestamp() }).catch(() => { _markedRead.delete(d.id); });
        }
      });
      if (snap.empty) {
        el.innerHTML = `<div class="empty-state"><i class="bi bi-chat-dots"></i><p>Sin mensajes aún. Escribe el primero.</p></div>`;
        return;
      }
      el.innerHTML = snap.docs.map(d => {
        const m      = d.data();
        const isMine = m.fromRole === 'teacher';
        const time   = m.createdAt?.toDate ? m.createdAt.toDate().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '';
        const read   = isMine ? (m.readAt ? `<span class="chat-read" title="Leído">✓✓</span>` : `<span class="chat-unread" title="Enviado">✓</span>`) : '';
        return `
        <div class="chat-msg ${isMine ? 'mine' : 'theirs'}">
          <div class="chat-bubble-wrap">
            <div class="chat-bubble">${esc(m.text)}</div>
            <div class="chat-time">${time} ${read}${isMine ? ` <i class="bi bi-trash chat-delete-msg" data-msg-id="${d.id}"></i>` : ''}</div>
          </div>
        </div>`;
      }).join('');
      el.querySelectorAll('.chat-delete-msg').forEach(icon => {
        icon.addEventListener('click', () => deleteChatMessage(icon.dataset.msgId));
      });
      el.scrollTop = el.scrollHeight;
    }
  );
}

async function sendChatMessage() {
  const input = document.getElementById('chat-input');
  const text  = input.value.trim();
  if (!text || !_chatStudentUid) return;
  input.value = '';
  await addDoc(collection(db, 'messages'), {
    convId:     getConvId(_chatStudentUid),
    classId:    state.currentClass.id,
    studentUid: _chatStudentUid,
    fromUid:    state.currentUser.uid,
    fromName:   state.currentUser.displayName,
    fromRole:   'teacher',
    text, readAt: null, createdAt: serverTimestamp(),
  });
}

async function deleteChatMessage(msgId) {
  const ok = await showConfirm({ title: 'Borrar mensaje', message: 'Este mensaje se eliminará para los dos.', confirmText: 'Borrar' });
  if (!ok) return;
  await deleteDoc(doc(db, 'messages', msgId));
}

document.getElementById('btn-send-chat').addEventListener('click', sendChatMessage);
document.getElementById('chat-input').addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(); }
});

let _unsubChatNotif = null;
const _chatNotifShown = new Set();

export function startChatNotifications() {
  if (_unsubChatNotif) _unsubChatNotif();
  _chatNotifShown.clear();
  _unsubChatNotif = onSnapshot(
    query(collection(db, 'messages'), where('classId', '==', state.currentClass.id), where('fromRole', '==', 'student'), orderBy('createdAt', 'desc')),
    snap => {
      const activeSection = document.querySelector('.sidebar .nav-item.active')?.id;
      const lastRead = parseInt(localStorage.getItem('ao_chatLastRead_' + state.currentClass.id) || '0');
      const newMsgs  = snap.docs.filter(d => (d.data().createdAt?.toMillis?.() || 0) > lastRead);
      const badge    = document.getElementById('badge-chat');
      newMsgs.length > 0 ? show(badge) : hide(badge);
      badge.textContent = newMsgs.length;
      if (activeSection !== 'nav-chat') {
        newMsgs.forEach(d => {
          if (!_chatNotifShown.has(d.id)) {
            _chatNotifShown.add(d.id);
            const m = d.data();
            toast(`💬 ${m.fromName}: ${m.text.slice(0, 40)}${m.text.length > 40 ? '…' : ''}`, 'success');
          }
        });
      }
    }
  );
}
