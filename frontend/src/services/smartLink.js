/**
 * Smart Link de campaña: /?empresa=<razón social>&codigo=<CÓDIGO>
 * El código verificador identifica exactamente a la planta aunque haya empresas con nombres
 * parecidos; el nombre va solo para que el enlace sea legible. Los enlaces antiguos sin código
 * se siguen resolviendo por nombre.
 */
import { getJobs, getCompanyByCode } from './api';

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
    ? 'Aquí tienes las vacantes activas de la planta. Revísalas y da clic en **"Abrir chat directo con el reclutador"** para apartar tu lugar, o pregúntame sobre transporte, turnos fijos o sueldos libres.'
    : 'Por ahora la planta no tiene vacantes publicadas. Pregúntame y te muestro otras opciones cerca de ti.';
  return `¡Qué onda! 🤠 Bienvenido a la bolsa de trabajo oficial de **${info.nombre}** en Nuevo León.${verified}\n\n${jobsText}`;
}
