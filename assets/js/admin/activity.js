// ─────────────────────────────────────────
//  Registro de actividad de la clase (historial)
// ─────────────────────────────────────────
import { db, collection, addDoc, serverTimestamp } from '../lib/firebase.js';
import { state } from './state.js';

export async function logActivity(type, text, meta = {}) {
  try {
    await addDoc(collection(db, 'activity'), {
      classId: state.currentClass.id,
      type,
      text,
      ...meta,
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    // No interrumpimos el flujo principal si falla el registro de actividad
  }
}
