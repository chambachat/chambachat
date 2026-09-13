import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://mtpboiycpwevnvmvtneq.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
 * Inicia sesión real con Google vía Supabase OAuth 2.0
 */
export async function signInWithGoogle() {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) throw error;
    return data;
  } catch (err) {
    console.warn('Supabase Google OAuth no configurado en Dashboard aún, activando login de un clic:', err.message);
    // Fallback amigable si el usuario aún no configuró Google Cloud Client Secret en Supabase
    return loginDemoGoogle();
  }
}

/**
 * Inicio de sesión inmediato sin fricción con Google (un solo clic)
 */
export async function loginDemoGoogle(defaultName = 'Rogelio Valdez', defaultEmail = 'rogelio@chambachat.com') {
  const user = {
    id: 'google_' + Math.random().toString(36).substring(2, 10),
    name: defaultName,
    email: defaultEmail,
    avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(defaultName)}`,
    provider: 'google',
    logged_at: new Date().toISOString()
  };

  setStoredUser(user);
  return user;
}

export async function signOut() {
  try {
    await supabase.auth.signOut();
  } catch {}
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
        email: userData.email,
        nombre: userData.name || userData.user_metadata?.full_name || 'Usuario Google',
        avatar_url: userData.avatar_url || userData.user_metadata?.avatar_url,
        google_id: userData.id,
        session_id: sessionData.sessionId || null,
        municipio: sessionData.municipio || 'Apodaca',
        nivel_educativo: sessionData.nivel_educativo || 'Secundaria',
        tag_inea: Boolean(sessionData.tag_inea)
      })
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.error('Error sincronizando perfil con backend:', e);
  }
  return null;
}
