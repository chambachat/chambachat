const API_BASE = '/api/v1';

export async function predictRetention(data) {
  const res = await fetch(`${API_BASE}/predict-retention`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Error al calcular predicción de retención');
  return res.json();
}

export async function startChat() {
  const res = await fetch(`${API_BASE}/chat/start`);
  if (!res.ok) throw new Error('Error al inicializar sesión de chat');
  return res.json();
}

export async function sendChatMessage({ sessionId, message, selectedOption, userName, userPhone, userEmail }) {
  const res = await fetch(`${API_BASE}/chat/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: sessionId,
      message,
      selected_option: selectedOption,
      user_name: userName,
      user_phone: userPhone,
      user_email: userEmail
    }),
  });
  if (!res.ok) throw new Error('Error al enviar mensaje');
  return res.json();
}

export async function submitApplication({ jobId, sessionId, candidateName, candidateEmail, candidatePhone, municipio }) {
  const res = await fetch(`${API_BASE}/applications/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      job_id: jobId,
      session_id: sessionId,
      candidate_name: candidateName,
      candidate_email: candidateEmail,
      candidate_phone: candidatePhone,
      municipio: municipio || 'Apodaca'
    }),
  });
  if (!res.ok) throw new Error('Error al enviar postulación');
  return res.json();
}

export async function getApplications() {
  const res = await fetch(`${API_BASE}/applications`);
  if (!res.ok) throw new Error('Error al obtener postulaciones');
  return res.json();
}

export async function getApplicationsBySession(sessionId) {
  if (!sessionId) return [];
  const res = await fetch(`${API_BASE}/applications/by-session/${sessionId}`);
  if (!res.ok) return [];
  return res.json();
}

export async function sendRecruiterMessage(applicationId, { senderType = 'recruiter', senderName, mensaje }) {
  const res = await fetch(`${API_BASE}/applications/${applicationId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ silenced }),
  });
  if (!res.ok) throw new Error('Error al cambiar estado del bot');
  return res.json();
}

export async function checkBotFallback(applicationId, force = false) {
  const res = await fetch(`${API_BASE}/applications/${applicationId}/check-bot-fallback?force=${force}`, {
    method: 'POST',
  });
  if (!res.ok) return { triggered: false };
  return res.json();
}

export async function getJobs(filters = {}) {
  const params = new URLSearchParams();
  if (filters.municipio) params.append('municipio', filters.municipio);
  if (filters.empresa) params.append('empresa', filters.empresa);
  if (filters.apoyo_inea !== undefined && filters.apoyo_inea !== null && filters.apoyo_inea !== '') {
    params.append('apoyo_inea', filters.apoyo_inea);
  }
  const url = `${API_BASE}/jobs${params.toString() ? `?${params.toString()}` : ''}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Error al obtener vacantes');
  return res.json();
}

export async function createJob(jobData) {
  const res = await fetch(`${API_BASE}/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(jobData),
  });
  if (!res.ok) throw new Error('Error al crear vacante');
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
  const res = await fetch(url);
  if (!res.ok) throw new Error('Error al obtener candidatos');
  return res.json();
}

export async function getPrompts() {
  const res = await fetch(`${API_BASE}/admin/prompts`);
  if (!res.ok) throw new Error('Error al obtener configuración de prompts');
  return res.json();
}

export async function updatePrompt(stepKey, promptData) {
  const res = await fetch(`${API_BASE}/admin/prompts/${stepKey}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(promptData),
  });
  if (!res.ok) throw new Error('Error al actualizar prompt');
  return res.json();
}

export async function getAnalytics() {
  const res = await fetch(`${API_BASE}/analytics/summary`);
  if (!res.ok) throw new Error('Error al obtener analíticas');
  return res.json();
}

// --- EMPRESAS & MI EQUIPO (B2B SaaS) ---

export async function getUserCompanies(userEmail, empresaHint) {
  const params = new URLSearchParams();
  if (userEmail) params.append('user_email', userEmail);
  if (empresaHint) params.append('empresa_hint', empresaHint);
  const url = `${API_BASE}/companies${params.toString() ? `?${params.toString()}` : ''}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Error al obtener empresas');
  return res.json();
}

export async function uploadConstanciaFiscal(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/companies/upload-csf`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Error al subir archivo de constancia' }));
    throw new Error(err.detail || 'Error al subir archivo de constancia');
  }
  return res.json();
}

export async function createCompany(data) {
  const res = await fetch(`${API_BASE}/companies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Error al actualizar datos de la empresa');
  return res.json();
}

export async function getCompanyTeam(companyId) {
  const res = await fetch(`${API_BASE}/companies/${companyId}/members`);
  if (!res.ok) throw new Error('Error al obtener equipo de la empresa');
  return res.json();
}

export async function inviteTeamMember(companyId, data) {
  const res = await fetch(`${API_BASE}/companies/${companyId}/invite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Error al enviar invitación' }));
    throw new Error(err.detail || 'Error al enviar invitación');
  }
  return res.json();
}

export async function acceptCompanyInvitation(token, userData = {}) {
  const res = await fetch(`${API_BASE}/companies/accept-invitation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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

export async function removeTeamMember(companyId, memberId) {
  const res = await fetch(`${API_BASE}/companies/${companyId}/members/${memberId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Error al remover miembro del equipo');
  return res.json();
}

// --- RUTAS DE TRANSPORTE & MAPAS (B2B) ---

export async function getCompanyRoutes(companyId) {
  const res = await fetch(`${API_BASE}/companies/${companyId}/routes`);
  if (!res.ok) throw new Error('Error al obtener rutas de transporte');
  return res.json();
}

export async function createCompanyRoute(companyId, routeData) {
  const res = await fetch(`${API_BASE}/companies/${companyId}/routes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
    headers: { 'Content-Type': 'application/json' },
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
  });
  if (!res.ok) throw new Error('Error al eliminar ruta de transporte');
  return res.json();
}

export async function getNearbyRoutes(lat, lon, maxDistanceKm = 6.0, companyId = null) {
  const params = new URLSearchParams({
    lat: lat.toString(),
    lon: lon.toString(),
    max_distance_km: maxDistanceKm.toString(),
  });
  if (companyId) params.append('company_id', companyId.toString());
  const res = await fetch(`${API_BASE}/routes/nearby?${params.toString()}`);
  if (!res.ok) throw new Error('Error al consultar rutas cercanas');
  return res.json();
}

