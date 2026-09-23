/**
 * Servicio de autenticación para ChambaChat V2.
 * Maneja verificación de correo, JWT tokens, y estado de sesión.
 */

const USER_STORAGE_KEY = 'chambachat_auth_user';
const TOKEN_STORAGE_KEY = 'chambachat_auth_token';

// ─── Token Management ────────────────────────────────────────────────

export function getStoredToken() {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch (e) {
    console.error('Error leyendo token:', e);
    return null;
  }
}

export function setStoredToken(token) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch (e) {
    console.error('Error guardando token:', e);
  }
}

// ─── User Storage ────────────────────────────────────────────────────

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error leyendo usuario almacenado:', e);
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
    console.error('Error guardando usuario:', e);
  }
}

// ─── Verificación por correo ─────────────────────────────────────────

/**
 * Solicita el envío de un código de verificación al correo del usuario.
 * El código NUNCA se devuelve en la respuesta — solo se envía por email.
 */
export async function sendVerificationCode(email) {
  const res = await fetch('/api/v1/auth/send-verification-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim().toLowerCase() }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Error de red' }));
    throw new Error(error.detail || `Error ${res.status}`);
  }

  return await res.json();
}

/**
 * Verifica el código ingresado por el usuario contra el servidor.
 * Si es correcto, el servidor devuelve un JWT y datos del usuario.
 */
export async function verifyCode(email, code) {
  const res = await fetch('/api/v1/auth/verify-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      code: code.trim(),
    }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Error de red' }));
    throw new Error(error.detail || `Error ${res.status}`);
  }

  const data = await res.json();

  // Guardar token y usuario
  if (data.token) {
    setStoredToken(data.token);
  }
  if (data.user) {
    setStoredUser(data.user);
  }

  return data;
}

// ─── Google Sign-In ──────────────────────────────────────────────────

let _authConfigCache = null;

/** Configuración pública de acceso (si hay GOOGLE_CLIENT_ID en el servidor). */
export async function getAuthConfig() {
  if (_authConfigCache) return _authConfigCache;
  try {
    const res = await fetch('/api/v1/auth/config');
    _authConfigCache = res.ok ? await res.json() : { google_client_id: null };
  } catch (e) {
    _authConfigCache = { google_client_id: null };
  }
  return _authConfigCache;
}

/** Envía el ID token de Google al backend; si es válido devuelve JWT + usuario y los guarda. */
export async function signInWithGoogle(credential, role = 'candidate') {
  const res = await fetch('/api/v1/auth/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential, role }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Error de red' }));
    throw new Error(error.detail || `Error ${res.status}`);
  }
  const data = await res.json();
  if (data.token) setStoredToken(data.token);
  if (data.user) setStoredUser(data.user);
  return data;
}

// ─── Sesión ──────────────────────────────────────────────────────────

export async function signOut() {
  setStoredUser(null);
  setStoredToken(null);
}

/**
 * Sincroniza el perfil del usuario con el backend.
 * Requiere JWT válido.
 */
export async function syncUserWithBackend(userData, sessionData = {}) {
  const token = getStoredToken();
  if (!token) {
    console.warn('No hay token de autenticación para sincronizar perfil.');
    return null;
  }

  try {
    const res = await fetch('/api/v1/auth/sync-google-profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        email: userData.email,
        nombre: userData.name || userData.nombre,
        role: userData.role || 'candidate',
        empresa_nombre: userData.company_name || null,
        avatar_url: userData.avatar_url,
        google_id: userData.id,
        session_id: sessionData.sessionId || null,
        municipio: sessionData.municipio || 'Apodaca',
        nivel_educativo: sessionData.nivel_educativo || 'Secundaria',
        tag_inea: false,
        telefono: userData.phone || null,
      }),
    });
    if (res.ok) {
      return await res.json();
    }
    if (res.status === 401) {
      // Token expirado, limpiar sesión
      signOut();
    }
  } catch (e) {
    console.error('Error sincronizando perfil:', e);
  }
  return null;
}

/**
 * Verifica si el usuario actual tiene una sesión válida.
 */
export function isAuthenticated() {
  return !!(getStoredToken() && getStoredUser());
}

/**
 * Obtiene los datos del usuario actual del backend.
 */
export async function getCurrentUser() {
  const token = getStoredToken();
  if (!token) return null;

  try {
    const res = await fetch('/api/v1/auth/me', {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (res.ok) {
      const user = await res.json();
      setStoredUser(user);
      return user;
    }
    if (res.status === 401) {
      signOut();
    }
  } catch (e) {
    console.error('Error obteniendo usuario actual:', e);
  }
  return null;
}
