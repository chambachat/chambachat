/**
 * Constructores de mensajes locales del chat (se muestran de inmediato,
 * antes de que llegue la respuesta del backend por polling).
 */
const nowTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const newId = () => Math.random().toString(36).slice(2);

/** Tres mensajes que abren el chat grupal al postularse a una vacante. */
export function buildApplicationIntroMessages(job, userName) {
  const name = userName || 'Compa';
  const sueldo = job.sueldo_semanal_libre ? `$${job.sueldo_semanal_libre.toLocaleString('es-MX')}/sem` : '';
  return [
    {
      id: newId(),
      sender: 'system',
      text: `👥 ¡Chat Grupal Oficial Conectado! Estás en comunicación directa con Reclutamiento ${job.empresa_nombre} (${job.titulo}). Participantes: Tú, Reclutador de Planta y Chambot (IA).`,
      time: nowTime()
    },
    {
      id: newId(),
      sender: 'recruiter',
      sender_name: `Reclutamiento ${job.empresa_nombre}`,
      text: `¡Hola ${name}! Recibimos tu interés en la vacante de ${job.titulo}. En breve un reclutador de nuestra planta revisará tus datos aquí mismo.`,
      time: nowTime()
    },
    {
      id: newId(),
      sender: 'bot',
      sender_name: 'Chambot (IA)',
      text: `🤖 ¡Qué onda ${name}! Quedé integrado en este chat grupal. Puedes hacerme preguntas sobre el sueldo (${sueldo}), los turnos o el transporte de ${job.empresa_nombre}. Si el reclutador tarda más de 2 minutos en responder, con gusto te ayudo.`,
      time: nowTime()
    }
  ];
}

/** Confirmación del bot tras vincular la cuenta. */
export function buildAuthConfirmMessage(user) {
  const displayName = user.name || 'Compa';
  const displayEmail = user.email || 'tu cuenta';
  const method = user.provider === 'email' ? 'tu correo personal' : 'Google';
  return {
    id: newId(),
    sender: 'bot',
    text: `¡Qué onda, ${displayName}! 🤠 Ya vinculamos tu cuenta con ${method} (${displayEmail}). Tus datos y vacantes afines quedaron guardados con éxito. Ahora te avisaremos directo cuando salgan nuevas chambas cerca de tu zona.`,
    time: nowTime()
  };
}

/** ¿El texto/opción pide compartir ubicación? */
export function isShareLocationIntent(text) {
  if (typeof text !== 'string') return false;
  const t = text.toLowerCase();
  return t.includes('compartir mi ubicación') || t.includes('compartir ubicacion');
}
