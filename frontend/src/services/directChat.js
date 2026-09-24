/**
 * Chat directo candidato ↔ reclutadores de una planta.
 * Cada postulación vive como una conversación aparte (kind: 'direct') en la barra lateral,
 * separada de la conversación con Chambot (kind: 'bot').
 */
import { loadAllSessions, saveAllSessions, setActiveSessionId } from './chatStorage';

/** El backend guarda fechas UTC sin zona; sin la 'Z' el navegador las leería como hora local. */
export function formatBackendTime(ts) {
  if (!ts) return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const iso = /Z$|[+-]\d\d:\d\d$/.test(ts) ? ts : `${ts}Z`;
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/** Convierte un mensaje del hilo de postulación al formato del chat. */
export function mapApplicationMessage(m, companyName) {
  const sender = m.sender_type === 'recruiter' ? 'recruiter'
    : m.sender_type === 'system' ? 'system'
    : m.sender_type === 'candidate' ? 'user'
    : 'bot';
  return {
    id: `appmsg_${m.id}`,
    sender,
    sender_name: m.sender_name || (sender === 'recruiter' ? `Reclutamiento ${companyName}` : 'Chambot (IA)'),
    text: m.mensaje,
    time: formatBackendTime(m.created_at),
  };
}

export function directChatTitle(companyName, jobTitle) {
  return `${companyName} · ${jobTitle}`;
}

/** Busca la conversación directa ya abierta para una postulación o vacante. */
export function findDirectSession(sessions, { applicationId, jobId }) {
  return (sessions || []).find(s => s.kind === 'direct' && !s.closed && (
    (applicationId && s.applicationId === applicationId) || (jobId && s.jobId === jobId)
  )) || null;
}

/** Estado que viaja con la postulación y se refleja en la conversación (encabezado, chips de la entrevista). */
export function metaFromApplication(application) {
  return {
    status: application.status,
    botSilenced: Boolean(application.bot_silenced),
    screening: application.screening || null,
    screeningStatus: application.screening_status || 'none',
    blockedByCompany: Boolean(application.blocked_by_company),
    blockedByCandidate: Boolean(application.blocked_by_candidate),
  };
}

/** Crea (y activa) la conversación directa a partir de la postulación devuelta por el backend. */
export function createDirectSession(application) {
  const companyName = application.empresa_nombre || application.job_details?.empresa_nombre || 'Empresa';
  const jobTitle = application.job_titulo || application.job_details?.titulo || 'Vacante';
  const session = {
    id: `direct_${application.id}`,
    kind: 'direct',
    applicationId: application.id,
    jobId: application.job_id,
    companyName,
    jobTitle,
    companyId: application.job_details?.empresa_id || null,
    title: directChatTitle(companyName, jobTitle),
    createdAt: new Date().toISOString(),
    messages: (application.messages || []).map(m => mapApplicationMessage(m, companyName)),
    matchedJobs: [],
    candidateProfile: null,
    backendSessionId: null,
    unread: 0,
    candidateEmail: application.candidate_email || null,
    closed: false,
    ...metaFromApplication(application),
  };
  const sessions = loadAllSessions().filter(s => s.id !== session.id);
  sessions.unshift(session);
  saveAllSessions(sessions);
  setActiveSessionId(session.id);
  return session;
}

/** Mensajes del hilo que la conversación local aún no tiene. */
export function missingMessages(session, application) {
  const known = new Set((session.messages || []).map(m => m.id));
  return (application.messages || [])
    .map(m => mapApplicationMessage(m, session.companyName))
    .filter(m => !known.has(m.id));
}
