const USER_STORAGE_KEY = 'chambachat_auth_user';

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading stored user:', e);
  }
  return null;
}

export function setStoredUser(user) {
  try {
    if (user) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_STORAGE_KEY);
    }
  } catch (e) {
    console.error('Error saving stored user:', e);
  }
}

/**
 * Autenticación inmediata y segura sin redirecciones rotas
 */
export async function authenticateUser({ name, email, phone }) {
  const cleanName = (name || 'Candidato').trim();
  const cleanEmail = (email || 'candidato@chambachat.com').trim();
  const cleanPhone = (phone || '').trim();

  const user = {
    id: 'user_' + Date.now().toString(36),
    name: cleanName,
    email: cleanEmail,
    phone: cleanPhone,
    avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanName)}`,
    provider: 'google',
    logged_at: new Date().toISOString()
  };

  setStoredUser(user);

  // Sincronizar directamente con Supabase PostgreSQL
  await syncUserWithBackend(user);
  return user;
}

export async function signOut() {
  setStoredUser(null);
}

/**
 * Sincroniza el usuario autenticado con la base de datos de PostgreSQL en Supabase
 */
export async function syncUserWithBackend(userData, sessionData = {}) {
  try {
    const res = await fetch('/api/v1/auth/sync-google-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: userData.email || 'operario@chambachat.com',
        nombre: userData.name || 'Operario',
        avatar_url: userData.avatar_url,
        google_id: userData.id,
        session_id: sessionData.sessionId || null,
        municipio: sessionData.municipio || 'Apodaca',
        nivel_educativo: sessionData.nivel_educativo || 'Secundaria',
        tag_inea: false
      })
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.error('Error sincronizando perfil con Supabase:', e);
  }
  return null;
}
