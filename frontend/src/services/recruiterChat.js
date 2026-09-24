/**
 * Chat en modo empresa: las cuentas de reclutador ven su bandeja de candidatos (postulaciones)
 * con la misma interfaz de chat, en lugar del buscador de empleo de Chambot.
 */
import { formatBackendTime } from './directChat';

const MODE_KEY = 'chambachat_chat_mode';   // 'recruiter' | 'candidate' (preferencia manual)
const SEEN_KEY = 'chambachat_recruiter_seen';  // { [applicationId]: último id de mensaje visto }

export function isCompanyUser(user) {
  return Boolean(user && ['recruiter', 'admin'].includes(user.role));
}

export function deriveRecruiterName(user) {
  if (!user?.name) return 'Reclutador Industrial';
  return user.role === 'recruiter' ? user.name : `Reclutador ${user.name}`;
}

/** Modo del chat: las cuentas de empresa arrancan en su bandeja salvo que hayan elegido ver el chat de empleo. */
export function getChatMode(user) {
  if (!isCompanyUser(user)) return 'candidate';
  try {
    return localStorage.getItem(MODE_KEY) || 'recruiter';
  } catch (e) {
    return 'recruiter';
  }
}

export function setChatMode(mode) {
  try {
    if (mode) localStorage.setItem(MODE_KEY, mode);
    else localStorage.removeItem(MODE_KEY);
  } catch (e) {}
}

function readSeen() {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) || '{}');
  } catch (e) {
    return {};
  }
}

/** Marca como vistos todos los mensajes actuales de la conversación (en este dispositivo). */
export function markSeen(app) {
  if (!app) return;
  const last = (app.messages || []).reduce((max, m) => Math.max(max, m.id || 0), 0);
  const seen = readSeen();
  if ((seen[app.id] || 0) >= last) return;
  seen[app.id] = last;
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
  } catch (e) {}
}

/** Mensajes del candidato que el reclutador aún no ha visto. */
export function unreadCount(app) {
  const seen = readSeen()[app.id] || 0;
  return (app.messages || []).filter(m => m.sender_type === 'candidate' && m.id > seen).length;
}

export function lastMessage(app) {
  const msgs = app.messages || [];
  return msgs.length ? msgs[msgs.length - 1] : null;
}

export function initials(name) {
  return (name || '?').split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase();
}

/** El reclutador ve sus mensajes a la derecha ('user'); el candidato a la izquierda ('candidate'). */
export function mapRecruiterMessage(m, candidateName) {
  const sender = m.sender_type === 'recruiter' ? 'user'
    : m.sender_type === 'candidate' ? 'candidate'
    : m.sender_type === 'system' ? 'system'
    : 'bot';
  return {
    id: `appmsg_${m.id}`,
    sender,
    sender_name: sender === 'candidate' ? (candidateName || m.sender_name) : m.sender_name,
    text: m.mensaje,
    time: formatBackendTime(m.created_at),
  };
}

const FOCUS_KEY = 'chambachat_focus_application';

/** "Retomar chat" desde Candidatos preferidos: la conversación que debe abrirse al entrar al chat de empresa. */
export function setFocusApplication(applicationId) {
  try { localStorage.setItem(FOCUS_KEY, String(applicationId)); } catch (e) {}
}

export function takeFocusApplication() {
  try {
    const value = localStorage.getItem(FOCUS_KEY);
    if (value) localStorage.removeItem(FOCUS_KEY);
    return value ? Number(value) : null;
  } catch (e) {
    return null;
  }
}
