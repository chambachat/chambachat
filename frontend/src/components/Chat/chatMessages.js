/**
 * Constructores de mensajes locales del chat (se muestran de inmediato,
 * antes de que llegue la respuesta del backend por polling).
 */
const nowTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const newId = () => Math.random().toString(36).slice(2);

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

/** ¿El texto/opción pide compartir, registrar o cambiar la ubicación? Abre el mapa directamente. */
export function isShareLocationIntent(text) {
  if (typeof text !== 'string') return false;
  const t = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return /(compartir|cambiar|actualizar|elegir|registrar)\s+(mi\s+|una\s+|la\s+)?(nueva\s+)?ubicacion/.test(t);
}
