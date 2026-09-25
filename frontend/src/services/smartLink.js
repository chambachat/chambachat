/**
 * Smart Link de campaña: /?empresa=<razón social>&codigo=<CÓDIGO>
 * El código verificador identifica exactamente a la planta aunque haya empresas con nombres
 * parecidos; el nombre va solo para que el enlace sea legible. Los enlaces antiguos sin código
 * se siguen resolviendo por nombre.
 */
import { getJobs, getCompanyByCode } from './api';
import { loadAllSessions, createNewSession, updateSession, setActiveSessionId } from './chatStorage';

export function readSmartLinkParams(search) {
  const params = new URLSearchParams(search || '');
  return { empresa: params.get('empresa'), codigo: params.get('codigo') };
}

export function buildSmartLinkUrl(origin, company) {
  if (!company) return '';
  const params = new URLSearchParams();
  params.set('empresa', company.nombre || '');
  if (company.smart_code) params.set('codigo', company.smart_code);
  return `${origin}/?${params.toString()}`;
}

/** Resuelve la planta y sus vacantes. Devuelve null si la URL no trae parámetros de Smart Link. */
export async function loadSmartLink({ empresa, codigo }) {
  if (codigo) {
    try {
      const company = await getCompanyByCode(codigo);
      const jobs = await getJobs({ company_code: company.smart_code || codigo });
      return { key: `code:${company.smart_code || codigo.toUpperCase()}`, nombre: company.nombre, municipio: company.municipio, jobs: jobs || [], verified: true };
    } catch (e) {
      if (!empresa) return { error: 'Este enlace no es válido o la empresa ya no está registrada. Pregúntame por vacantes y te ayudo a encontrar chamba cerca de ti.' };
    }
  }
  if (empresa) {
    const jobs = await getJobs({ empresa });
    return { key: `name:${empresa.trim().toLowerCase()}`, nombre: empresa, jobs: jobs || [], verified: false };
  }
  return null;
}

export function smartWelcomeText(info) {
  const verified = info.verified ? ' ✅ Empresa verificada.' : '';
  const jobsText = info.jobs.length > 0
    ? 'Aquí están sus vacantes activas: toca una para ver detalles o abrir el chat con el reclutador.'
    : 'Por ahora no tiene vacantes publicadas; pregúntame y te muestro otras cerca de ti.';
  return `¡Qué onda! 🤠 Bienvenido a la bolsa de trabajo de **${info.nombre}**.${verified} ${jobsText}`;
}

const nowTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/**
 * Abre (o retoma) la conversación de un Smart Link. Mientras resuelve la planta muestra lo guardado;
 * si el enlace no es válido, lo dice en una conversación nueva.
 */
export function openSmartLinkSession(loaded, params, { setSessions, setActiveSession, setShowVacancies }) {
  if (loaded.length > 0) {
    setSessions(loaded);
    setActiveSession(loaded[0]);
  }
  const startFresh = (fields) => {
    const fresh = createNewSession();
    Object.assign(fresh, fields);
    updateSession(fresh.id, fields);
    setSessions(loadAllSessions());
    setActiveSession(fresh);
    setActiveSessionId(fresh.id);
    return fresh;
  };

  loadSmartLink(params).then(info => {
    if (!info) return;
    if (info.error) {
      startFresh({ messages: [{ id: 'smart_error_' + Date.now(), sender: 'bot', text: info.error, time: nowTime() }] });
      return;
    }
    const smartTitle = `Bolsa ${info.nombre}`;
    const existing = loaded.find(s => s.smartKey === info.key || s.title === smartTitle);
    if (existing) {
      const changes = { smartKey: info.key, matchedJobs: info.jobs.length ? info.jobs : existing.matchedJobs };
      updateSession(existing.id, changes);
      setSessions(loadAllSessions());
      setActiveSession({ ...existing, ...changes });
      setActiveSessionId(existing.id);
      setShowVacancies(true);
      return;
    }
    startFresh({
      title: smartTitle,
      smartKey: info.key,
      matchedJobs: info.jobs,
      messages: [{ id: 'smart_welcome_' + Date.now(), sender: 'bot', text: smartWelcomeText(info), time: nowTime() }],
      candidateProfile: { empresa_interes: info.nombre },
    });
    setShowVacancies(true);
  }).catch(err => {
    console.error('Error cargando el Smart Link:', err);
    if (loaded.length === 0) startFresh({});
  });
}
