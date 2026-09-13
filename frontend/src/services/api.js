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

export async function getJobs(filters = {}) {
  const params = new URLSearchParams();
  if (filters.municipio) params.append('municipio', filters.municipio);
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
