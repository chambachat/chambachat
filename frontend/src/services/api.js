import { getStoredToken } from './authService';

/**
 * Construye headers con autenticación JWT.
 */
function authHeaders(extra = {}) {
  const headers = { 'Content-Type': 'application/json', ...extra };
  const token = getStoredToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

const API_BASE = '/api/v1';

// ─── 401 global handler ─────────────────────────────────────────────
// Emite un evento custom para que la app abra el modal de login
export const AUTH_EXPIRED_EVENT = 'chambachat:auth-expired';

function emitAuthExpired() {
  window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
}

/**
 * Extrae un mensaje legible de la respuesta de error del backend.
 * Maneja tanto `detail: "string"` como `detail: [{msg: "...", ...}]` de Pydantic.
 */
function parseErrorDetail(errBody, fallback = 'Error desconocido') {
  if (!errBody || !errBody.detail) return fallback;
  if (typeof errBody.detail === 'string') return errBody.detail;
  if (Array.isArray(errBody.detail)) {
    return errBody.detail.map(d => d.msg || JSON.stringify(d)).join('. ');
  }
  return fallback;
}

export async function predictRetention(data) {
  const res = await fetch(`${API_BASE}/predict-retention`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Error al calcular predicción de retención');
  return res.json();
}

export async function startChat() {
  const res = await fetch(`${API_BASE}/chat/start`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Error al inicializar sesión de chat');
  return res.json();
}

export async function sendChatMessage({ 
  sessionId, 
  message, 
  selectedOption, 
  userName, 
  userPhone, 
  userEmail,
  userGender,
  candidateLat,
  candidateLon,
  candidateColonia,
  candidateMunicipio 
}) {
  const res = await fetch(`${API_BASE}/chat/message`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      session_id: sessionId,
      message,
      selected_option: selectedOption,
      user_name: userName,
      user_phone: userPhone,
      user_email: userEmail,
      user_gender: userGender,
      candidate_lat: candidateLat,
      candidate_lon: candidateLon,
      candidate_colonia: candidateColonia,
      candidate_municipio: candidateMunicipio
    }),
  });
  if (!res.ok) throw new Error('Error al enviar mensaje');
  return res.json();
}

export async function submitApplication({ jobId, sessionId, candidateName, candidateEmail, candidatePhone, municipio }) {
  const res = await fetch(`${API_BASE}/applications/apply`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      job_id: jobId,
      session_id: sessionId,
      candidate_name: candidateName,
      candidate_email: candidateEmail,
      candidate_phone: candidatePhone,
      municipio: municipio || 'Apodaca'
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Error al enviar postulación' }));
    throw new Error(err.detail || 'Error al enviar postulación');
  }
  return res.json();
}

export async function getApplications() {
  const res = await fetch(`${API_BASE}/applications`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Error al obtener postulaciones');
  return res.json();
}

/** Chats directos (postulaciones) del candidato autenticado, con historial. */
export async function getMyApplications() {
  const res = await fetch(`${API_BASE}/applications/mine`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Error al obtener tus chats directos');
  return res.json();
}

export async function getApplicationById(applicationId) {
  const res = await fetch(`${API_BASE}/applications/${applicationId}`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Error al obtener la postulación');
  return res.json();
}

/** Mensaje del candidato hacia los reclutadores de la vacante (el nombre lo pone el backend). */
export async function sendCandidateMessage(applicationId, mensaje) {
  const res = await fetch(`${API_BASE}/applications/${applicationId}/messages`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ sender_type: 'candidate', mensaje }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Error al enviar mensaje' }));
    throw new Error(err.detail || 'Error al enviar mensaje');
  }
  return res.json();
}

/** Elimina una postulación y su conversación (solo reclutadores de la empresa). */
export async function deleteApplication(applicationId) {
  const res = await fetch(`${API_BASE}/applications/${applicationId}`, { method: 'DELETE', headers: authHeaders() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'No se pudo eliminar la conversación' }));
    throw new Error(err.detail || 'No se pudo eliminar la conversación');
  }
  return res.json();
}

export async function getApplicationsBySession(sessionId) {
  if (!sessionId) return [];
  const res = await fetch(`${API_BASE}/applications/by-session/${sessionId}`, { headers: authHeaders() });
  if (!res.ok) return [];
  return res.json();
}

export async function sendRecruiterMessage(applicationId, { senderType = 'recruiter', senderName, mensaje }) {
  const res = await fetch(`${API_BASE}/applications/${applicationId}/messages`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      sender_type: senderType,
      sender_name: senderName,
      mensaje: mensaje
    }),
  });
  if (!res.ok) throw new Error('Error al enviar mensaje');
  return res.json();
}

export async function toggleBotState(applicationId, silenced = null) {
  const res = await fetch(`${API_BASE}/applications/${applicationId}/toggle-bot`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ silenced }),
  });
  if (!res.ok) throw new Error('Error al cambiar estado del bot');
  return res.json();
}

export async function checkBotFallback(applicationId, force = false) {
  const res = await fetch(`${API_BASE}/applications/${applicationId}/check-bot-fallback?force=${force}`, {
    method: 'POST',
    headers: authHeaders(),
  });
  if (!res.ok) return { triggered: false };
  return res.json();
}

export async function getJobs(filters = {}) {
  const params = new URLSearchParams();
  if (filters.municipio) params.append('municipio', filters.municipio);
  if (filters.q) params.append('q', filters.q);
  if (filters.empresa) params.append('empresa', filters.empresa);
  if (filters.company_id) params.append('company_id', filters.company_id);
  if (filters.company_code) params.append('company_code', filters.company_code);
  if (filters.mine) params.append('mine', 'true');
  if (filters.include_inactive) params.append('include_inactive', 'true');
  if (filters.apoyo_inea !== undefined && filters.apoyo_inea !== null && filters.apoyo_inea !== '') {
    params.append('apoyo_inea', filters.apoyo_inea);
  }
  const url = `${API_BASE}/jobs${params.toString() ? `?${params.toString()}` : ''}`;
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) throw new Error('Error al obtener vacantes');
  return res.json();
}

export async function createJob(jobData) {
  const res = await fetch(`${API_BASE}/jobs`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(jobData),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Error al crear vacante' }));
    throw new Error(err.detail || 'Error al crear vacante');
  }
  return res.json();
}

/** Registra/actualiza la ubicación confirmada del usuario autenticado (perfil). */
export async function updateMyLocation({ lat, lon, colonia, municipio }) {
  const res = await fetch(`${API_BASE}/auth/me/location`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ latitud: lat, longitud: lon, colonia: colonia || null, municipio: municipio || null }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'No se pudo guardar tu ubicación' }));
    throw new Error(err.detail || 'No se pudo guardar tu ubicación');
  }
  return res.json();
}

/** Planta del Smart Link por su código verificador (público). */
export async function getCompanyByCode(code) {
  const res = await fetch(`${API_BASE}/companies/by-code/${encodeURIComponent(code)}`);
  if (!res.ok) throw new Error('Código de empresa no válido');
  return res.json();
}

// ─── Candidatos preferidos ───────────────────────────────────────────
async function _json(res, fallback) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: fallback }));
    throw new Error(err.detail || fallback);
  }
  return res.json();
}

export async function getFavorites(companyId) {
  return _json(await fetch(`${API_BASE}/companies/${companyId}/favorites`, { headers: authHeaders() }), 'No se pudieron cargar los preferidos');
}

export async function addFavorite(companyId, data) {
  return _json(await fetch(`${API_BASE}/companies/${companyId}/favorites`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(data) }), 'No se pudo agregar a preferidos');
}

export async function removeFavorite(companyId, favoriteId) {
  return _json(await fetch(`${API_BASE}/companies/${companyId}/favorites/${favoriteId}`, { method: 'DELETE', headers: authHeaders() }), 'No se pudo quitar de preferidos');
}

// ─── Bloqueos (empresa ↔ candidato) ──────────────────────────────────
export async function getMyBlocks() {
  return _json(await fetch(`${API_BASE}/blocks/mine`, { headers: authHeaders() }), 'No se pudieron cargar los bloqueos');
}

export async function createBlock(data) {
  return _json(await fetch(`${API_BASE}/blocks`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(data) }), 'No se pudo registrar el bloqueo');
}

export async function removeBlock(blockId) {
  return _json(await fetch(`${API_BASE}/blocks/${blockId}`, { method: 'DELETE', headers: authHeaders() }), 'No se pudo quitar el bloqueo');
}

// ─── Currículum operativo del candidato ──────────────────────────────
export async function getMyProfile() {
  return _json(await fetch(`${API_BASE}/profile/me`, { headers: authHeaders() }), 'No se pudo cargar tu currículum');
}

export async function updateMyProfile(data) {
  return _json(await fetch(`${API_BASE}/profile/me`, { method: 'PATCH', headers: authHeaders(), body: JSON.stringify(data) }), 'No se pudo guardar tu currículum');
}

export async function getJobCatalog() {
  const res = await fetch(`${API_BASE}/jobs/catalogo`);
  if (!res.ok) throw new Error('Error al obtener catálogo de vacantes');
  return res.json();
}

export async function updateJob(jobId, data) {
  const res = await fetch(`${API_BASE}/jobs/${jobId}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Error al actualizar vacante' }));
    throw new Error(err.detail || 'Error al actualizar vacante');
  }
  return res.json();
}

export async function getCandidates(filters = {}) {
  const params = new URLSearchParams();
  if (filters.tag_inea !== undefined && filters.tag_inea !== null && filters.tag_inea !== '') {
    params.append('tag_inea', filters.tag_inea);
  }
  if (filters.municipio) params.append('municipio', filters.municipio);
  if (filters.nivel_educativo) params.append('nivel_educativo', filters.nivel_educativo);
  const url = `${API_BASE}/candidates${params.toString() ? `?${params.toString()}` : ''}`;
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) throw new Error('Error al obtener candidatos');
  return res.json();
}

export async function getPrompts() {
  const res = await fetch(`${API_BASE}/admin/prompts`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Error al obtener configuración de prompts');
  return res.json();
}

export async function updatePrompt(stepKey, promptData) {
  const res = await fetch(`${API_BASE}/admin/prompts/${stepKey}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(promptData),
  });
  if (!res.ok) throw new Error('Error al actualizar prompt');
  return res.json();
}

export async function getAnalytics() {
  const res = await fetch(`${API_BASE}/analytics/summary`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Error al obtener analíticas');
  return res.json();
}

// --- EMPRESAS & MI EQUIPO (B2B SaaS) ---

export async function getUserCompanies() {
  // El backend filtra por el usuario del JWT; no se envía user_email.
  const res = await fetch(`${API_BASE}/companies`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Error al obtener empresas');
  return res.json();
}

export async function uploadConstanciaFiscal(file) {
  const formData = new FormData();
  formData.append('file', file);
  // Solo Authorization: el navegador debe fijar el Content-Type multipart con su boundary.
  const headers = {};
  const token = getStoredToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}/companies/upload-csf`, {
    method: 'POST',
    headers,
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Error al subir archivo de constancia' }));
    if (res.status === 401) throw new Error('Tu sesión expiró. Vuelve a iniciar sesión para subir la constancia.');
    throw new Error(err.detail || 'Error al subir archivo de constancia');
  }
  return res.json();
}

export async function createCompany(data) {
  const res = await fetch(`${API_BASE}/companies`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Error al registrar empresa' }));
    throw new Error(err.detail || 'Error al registrar empresa');
  }
  return res.json();
}

export async function updateCompany(companyId, data) {
  const res = await fetch(`${API_BASE}/companies/${companyId}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Error al actualizar datos de la empresa');
  return res.json();
}

export async function getCompanyTeam(companyId) {
  const res = await fetch(`${API_BASE}/companies/${companyId}/members`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Error al obtener equipo de la empresa');
  return res.json();
}

export async function inviteTeamMember(companyId, data) {
  const res = await fetch(`${API_BASE}/companies/${companyId}/invite`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Error al enviar invitación' }));
    throw new Error(err.detail || 'Error al enviar invitación');
  }
  return res.json();
}

export async function getInvitationByToken(token) {
  const res = await fetch(`${API_BASE}/companies/invitations/${encodeURIComponent(token)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Invitación no válida' }));
    throw new Error(err.detail || 'Invitación no válida');
  }
  return res.json();
}

export async function acceptCompanyInvitation(token, userData = {}) {
  const res = await fetch(`${API_BASE}/companies/accept-invitation`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      token,
      user_email: userData.email,
      user_name: userData.name
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Error al procesar invitación' }));
    throw new Error(err.detail || 'Error al procesar invitación');
  }
  return res.json();
}

export async function removeTeamMember(companyId, memberId, type = 'member') {
  const res = await fetch(`${API_BASE}/companies/${companyId}/members/${memberId}?type=${type}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || 'Error al remover miembro del equipo');
  }
  return res.json();
}

// --- RUTAS DE TRANSPORTE & MAPAS (B2B) ---

export async function getCompanyRoutes(companyId) {
  const res = await fetch(`${API_BASE}/companies/${companyId}/routes`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Error al obtener rutas de transporte');
  return res.json();
}

export async function createCompanyRoute(companyId, routeData) {
  const res = await fetch(`${API_BASE}/companies/${companyId}/routes`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(routeData),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Error al registrar ruta de transporte' }));
    throw new Error(err.detail || 'Error al registrar ruta de transporte');
  }
  return res.json();
}

export async function updateCompanyRoute(companyId, routeId, routeData) {
  const res = await fetch(`${API_BASE}/companies/${companyId}/routes/${routeId}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(routeData),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Error al actualizar ruta' }));
    throw new Error(err.detail || 'Error al actualizar ruta');
  }
  return res.json();
}

export async function deleteCompanyRoute(companyId, routeId) {
  const res = await fetch(`${API_BASE}/companies/${companyId}/routes/${routeId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Error al eliminar ruta de transporte' }));
    throw new Error(err.detail || 'Error al eliminar ruta de transporte');
  }
  return res.json();
}

export async function getNearbyRoutes(lat, lon, maxDistanceKm = 6.0, companyId = null) {
  const params = new URLSearchParams({
    lat: lat.toString(),
    lon: lon.toString(),
    max_distance_km: maxDistanceKm.toString(),
  });
  if (companyId) params.append('company_id', companyId.toString());
  const res = await fetch(`${API_BASE}/routes/nearby?${params.toString()}`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Error al consultar rutas cercanas');
  return res.json();
}

export async function updateCompanyLocation(companyId, locationData) {
  const res = await fetch(`${API_BASE}/companies/${companyId}/location`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(locationData),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Error al actualizar ubicación de la empresa' }));
    throw new Error(err.detail || 'Error al actualizar ubicación de la empresa');
  }
  return res.json();
}

// --- GESTIÓN DE TURNOS LABORALES DE PLANTA (B2B) ---

export async function getCompanyShifts(companyId) {
  if (!companyId) throw new Error('Se requiere el ID de la empresa');
  const res = await fetch(`${API_BASE}/companies/${companyId}/shifts`, { headers: authHeaders() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Error al consultar turnos laborales' }));
    throw new Error(err.detail || 'Error al consultar turnos laborales');
  }
  return res.json();
}

export async function createCompanyShift(companyId, shiftData) {
  if (!companyId) throw new Error('Se requiere el ID de la empresa');
  const res = await fetch(`${API_BASE}/companies/${companyId}/shifts`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(shiftData),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Error al registrar turno' }));
    throw new Error(err.detail || 'Error al registrar turno');
  }
  return res.json();
}

export async function updateCompanyShift(companyId, shiftId, shiftData) {
  if (!companyId || !shiftId) throw new Error('Se requiere el ID de la empresa y del turno');
  const res = await fetch(`${API_BASE}/companies/${companyId}/shifts/${shiftId}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(shiftData),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Error al actualizar turno' }));
    throw new Error(err.detail || 'Error al actualizar turno');
  }
  return res.json();
}

export async function deleteCompanyShift(companyId, shiftId) {
  if (!companyId || !shiftId) throw new Error('Se requiere el ID de la empresa y del turno');
  const res = await fetch(`${API_BASE}/companies/${companyId}/shifts/${shiftId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Error al eliminar turno' }));
    throw new Error(err.detail || 'Error al eliminar turno');
  }
  return res.json();
}

export async function analyzeJobPhoto(imageBase64, gpsCoords = {}) {
  const res = await fetch(`${API_BASE}/jobs/from-photo`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image_base64: imageBase64,
      latitud: gpsCoords.latitud || null,
      longitud: gpsCoords.longitud || null,
      municipio: gpsCoords.municipio || null,
    }),
  });
  if (!res.ok) {
    if (res.status === 401) { emitAuthExpired(); throw new Error('Token expirado. Inicia sesión nuevamente.'); }
    const err = await res.json().catch(() => ({}));
    throw new Error(parseErrorDetail(err, 'Error al analizar la foto'));
  }
  return res.json();
}

export async function confirmPhotoJob(jobData) {
  const res = await fetch(`${API_BASE}/jobs/from-photo/confirm`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(jobData),
  });
  if (!res.ok) {
    if (res.status === 401) { emitAuthExpired(); throw new Error('Token expirado. Inicia sesión nuevamente.'); }
    const err = await res.json().catch(() => ({}));
    throw new Error(parseErrorDetail(err, 'Error al publicar la vacante'));
  }
  return res.json();
}


// ─── Comentarios comunitarios en vacantes ────────────────────────────

export async function getJobComments(jobId) {
  const res = await fetch(`${API_BASE}/jobs/${jobId}/comments`);
  if (!res.ok) return [];
  return res.json();
}

export async function addJobComment(jobId, texto) {
  const res = await fetch(`${API_BASE}/jobs/${jobId}/comments`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ texto }),
  });
  if (!res.ok) {
    if (res.status === 401) { emitAuthExpired(); throw new Error('Token expirado. Inicia sesión nuevamente.'); }
    const err = await res.json().catch(() => ({}));
    throw new Error(parseErrorDetail(err, 'No se pudo agregar el comentario'));
  }
  return res.json();
}


// ─── Feed Explorar ──────────────────────────────────────────────────

export async function getFeedJobs(offset = 0, limit = 10, q = '') {
  const params = new URLSearchParams({ offset: String(offset), limit: String(limit) });
  if (q.trim()) params.set('q', q.trim());
  const res = await fetch(`${API_BASE}/feed?${params}`, { headers: authHeaders() });
  if (!res.ok) return [];
  return res.json();
}

export async function toggleJobLike(jobId) {
  const res = await fetch(`${API_BASE}/feed/${jobId}/like`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    if (res.status === 401) { emitAuthExpired(); throw new Error('Token expirado. Inicia sesión nuevamente.'); }
    const err = await res.json().catch(() => ({}));
    throw new Error(parseErrorDetail(err, 'No se pudo dar like'));
  }
  return res.json();
}

// ─── Reclamar Vacantes Comunitarias ─────────────────────────────────

export async function discoverClaimableVacancies() {
  const res = await fetch(`${API_BASE}/claims/discover`, { headers: authHeaders() });
  if (!res.ok) {
    if (res.status === 401) { emitAuthExpired(); throw new Error('Token expirado.'); }
    const err = await res.json().catch(() => ({}));
    throw new Error(parseErrorDetail(err, 'Error buscando vacantes reclamables'));
  }
  return res.json();
}

export async function startVacancyClaim(jobId, method = 'email') {
  const res = await fetch(`${API_BASE}/claims/${jobId}/start`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ verification_method: method }),
  });
  if (!res.ok) {
    if (res.status === 401) { emitAuthExpired(); throw new Error('Token expirado.'); }
    const err = await res.json().catch(() => ({}));
    throw new Error(parseErrorDetail(err, 'Error al iniciar la verificación'));
  }
  return res.json();
}

export async function verifyVacancyClaim(jobId, code) {
  const res = await fetch(`${API_BASE}/claims/${jobId}/verify`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  if (!res.ok) {
    if (res.status === 401) { emitAuthExpired(); throw new Error('Token expirado.'); }
    const err = await res.json().catch(() => ({}));
    throw new Error(parseErrorDetail(err, 'Error al verificar'));
  }
  return res.json();
}

// ─── Reportar Vacante ───────────────────────────────────────────────

export async function reportJob(jobId, motivo = 'falsa', detalle = '') {
  const params = new URLSearchParams({ motivo, detalle });
  const res = await fetch(`${API_BASE}/feed/${jobId}/report?${params}`, {
    method: 'POST',
    headers: authHeaders(),
  });
  if (!res.ok) {
    if (res.status === 401) { emitAuthExpired(); throw new Error('Token expirado.'); }
    const err = await res.json().catch(() => ({}));
    throw new Error(parseErrorDetail(err, 'Error al reportar'));
  }
  return res.json();
}

// ─── Upload Logo / Foto Vacante ─────────────────────────────────────

export async function uploadCompanyLogo(companyId, file) {
  const form = new FormData();
  form.append('file', file);
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_BASE}/companies/${companyId}/logo`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) {
    if (res.status === 401) { emitAuthExpired(); throw new Error('Token expirado.'); }
    const err = await res.json().catch(() => ({}));
    throw new Error(parseErrorDetail(err, 'Error al subir logo'));
  }
  return res.json();
}

export async function uploadJobPhoto(jobId, file) {
  const form = new FormData();
  form.append('file', file);
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_BASE}/jobs/${jobId}/photo`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) {
    if (res.status === 401) { emitAuthExpired(); throw new Error('Token expirado.'); }
    const err = await res.json().catch(() => ({}));
    throw new Error(parseErrorDetail(err, 'Error al subir foto'));
  }
  return res.json();
}

// ─── Analytics Tracking & Admin ─────────────────────────────────────

export function trackActiveUser() {
  const token = localStorage.getItem('token');
  if (!token) return;
  fetch(`${API_BASE}/admin/analytics/track-active`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
  }).catch(() => {});
}

export function trackJobView(jobId) {
  const token = localStorage.getItem('token');
  if (!token || !jobId) return;
  fetch(`${API_BASE}/admin/analytics/track-view?job_id=${jobId}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
  }).catch(() => {});
}

export async function getAnalyticsOverview() {
  return _json(await fetch(`${API_BASE}/admin/analytics/overview`, { headers: authHeaders() }), 'Error al cargar overview');
}

export async function getAnalyticsDAU(days = 30) {
  return _json(await fetch(`${API_BASE}/admin/analytics/dau?days=${days}`, { headers: authHeaders() }), 'Error al cargar DAU');
}

export async function getAnalyticsJobs(days = 30) {
  return _json(await fetch(`${API_BASE}/admin/analytics/jobs?days=${days}`, { headers: authHeaders() }), 'Error al cargar jobs');
}

export async function getAnalyticsViews(days = 30) {
  return _json(await fetch(`${API_BASE}/admin/analytics/views?days=${days}`, { headers: authHeaders() }), 'Error al cargar views');
}

export async function getAnalyticsDAUMonthly(months = 12) {
  return _json(await fetch(`${API_BASE}/admin/analytics/dau-monthly?months=${months}`, { headers: authHeaders() }), 'Error al cargar DAU mensual');
}

export async function getAnalyticsJobsMonthly(months = 12) {
  return _json(await fetch(`${API_BASE}/admin/analytics/jobs-monthly?months=${months}`, { headers: authHeaders() }), 'Error al cargar jobs mensuales');
}

export async function getAnalyticsViewsMonthly(months = 12) {
  return _json(await fetch(`${API_BASE}/admin/analytics/views-monthly?months=${months}`, { headers: authHeaders() }), 'Error al cargar vistas mensuales');
}

export async function getAnalyticsAppsMonthly(months = 12) {
  return _json(await fetch(`${API_BASE}/admin/analytics/applications-monthly?months=${months}`, { headers: authHeaders() }), 'Error al cargar postulaciones mensuales');
}
