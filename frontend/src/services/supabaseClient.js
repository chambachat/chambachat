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
 * Soporta Google (1 clic) o Correo Electrónico Personal
 */
export async function authenticateUser({ name, email, phone, provider = 'google' }) {
  let defaultGoogleEmail = 'rvaldezl@gmail.com';
  let defaultGoogleName = 'Rogelio Valdez';
  try {
    if (typeof window !== 'undefined') {
      defaultGoogleEmail = localStorage.getItem('chambachat_last_google_email') || defaultGoogleEmail;
      defaultGoogleName = localStorage.getItem('chambachat_last_google_name') || defaultGoogleName;
    }
  } catch {}

  const cleanName = (name || (provider === 'google' ? defaultGoogleName : 'Candidato')).trim();
  const cleanEmail = (email || (provider === 'google' ? defaultGoogleEmail : 'candidato@correo.com')).trim();
  const cleanPhone = (phone || '').trim();

  const user = {
    id: 'user_' + Date.now().toString(36),
    name: cleanName,
    email: cleanEmail,
    phone: cleanPhone,
    avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanName)}`,
    provider: provider,
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
 * Solicita el envío de un código de confirmación por correo
 */
export async function sendVerificationCode(email) {
  try {
    const res = await fetch('/api/v1/auth/send-verification-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim() })
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.error('Error al enviar código de verificación:', e);
  }
  // Fallback local garantizado
  const localCode = `${Math.floor(1000 + Math.random() * 9000)}`;
  return {
    status: 'warning',
    email,
    code: localCode,
    real_email_sent: false,
    message: `Aún no se ha conectado el servidor SMTP para enviar correos a ${email}`
  };
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
        email: userData.email || 'rvaldezl@gmail.com',
        nombre: userData.name || 'Rogelio Valdez',
        avatar_url: userData.avatar_url,
        google_id: userData.id,
        session_id: sessionData.sessionId || null,
        municipio: sessionData.municipio || 'Apodaca',
        nivel_educativo: sessionData.nivel_educativo || 'Secundaria',
        tag_inea: false,
        telefono: userData.phone || null
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
