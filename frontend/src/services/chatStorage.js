const STORAGE_KEY = 'chambachat_chat_sessions';
const ACTIVE_SESSION_KEY = 'chambachat_active_session_id';

// Helper de cookies para persistencia básica
function setCookie(name, value, days = 30) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function getCookie(name) {
  return document.cookie.split('; ').reduce((r, v) => {
    const parts = v.split('=');
    return parts[0] === name ? decodeURIComponent(parts[1]) : r;
  }, '');
}

export function loadAllSessions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading localStorage:', e);
  }
  return [];
}

export function saveAllSessions(sessions) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    // Guardar lista resumida en cookie
    const ids = sessions.map(s => s.id).slice(0, 5).join(',');
    setCookie('chamba_recent_chats', ids);
  } catch (e) {
    console.error('Error saving to localStorage:', e);
  }
}

export function getActiveSessionId() {
  try {
    return localStorage.getItem(ACTIVE_SESSION_KEY) || getCookie('chamba_active_session') || null;
  } catch {
    return null;
  }
}

export function setActiveSessionId(id) {
  try {
    if (id) {
      localStorage.setItem(ACTIVE_SESSION_KEY, id);
      setCookie('chamba_active_session', id);
    } else {
      localStorage.removeItem(ACTIVE_SESSION_KEY);
    }
  } catch (e) {
    console.error('Error setting active session:', e);
  }
}

export function createNewSession() {
  const newId = 'chat_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
  const newSession = {
    id: newId,
    kind: 'bot',  // 'bot' = Chambot | 'direct' = línea directa con reclutadores (ver services/directChat.js)
    title: 'Nueva conversación',
    createdAt: new Date().toISOString(),
    messages: [],
    matchedJobs: [],
    candidateProfile: null,
    backendSessionId: null,
  };

  const sessions = loadAllSessions();
  sessions.unshift(newSession);
  saveAllSessions(sessions);
  setActiveSessionId(newId);
  return newSession;
}

export function deleteSession(id) {
  const sessions = loadAllSessions().filter(s => s.id !== id);
  saveAllSessions(sessions);
  const activeId = getActiveSessionId();
  if (activeId === id) {
    const nextId = sessions.length > 0 ? sessions[0].id : null;
    setActiveSessionId(nextId);
  }
}

export function updateSession(id, updates) {
  const sessions = loadAllSessions().map(s => {
    if (s.id === id) {
      return { ...s, ...updates, updatedAt: new Date().toISOString() };
    }
    return s;
  });
  saveAllSessions(sessions);
}

export function clearAllSessions() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(ACTIVE_SESSION_KEY);
  setCookie('chamba_recent_chats', '', -1);
  setCookie('chamba_active_session', '', -1);
}
