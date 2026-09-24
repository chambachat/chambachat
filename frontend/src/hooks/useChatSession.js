import { useState, useEffect, useCallback, useRef } from 'react';
import {
  loadAllSessions,
  getActiveSessionId,
  setActiveSessionId,
  createNewSession,
  deleteSession,
  updateSession,
  clearAllSessions
} from '../services/chatStorage';
import { startChat, sendChatMessage, getJobs, submitApplication, sendCandidateMessage, getApplicationById } from '../services/api';
import { createDirectSession, findDirectSession, mapApplicationMessage, formatBackendTime, missingMessages, metaFromApplication } from '../services/directChat';
import { useDirectChatsPolling } from './useDirectChatsPolling';

const nowTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const localId = () => Math.random().toString(36).slice(2);

/**
 * Conversaciones del candidato: la general con Chambot (kind 'bot') y una directa por cada
 * postulación (kind 'direct'), donde escribe con los reclutadores de la planta.
 */
export function useChatSession(currentUser) {
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [options, setOptions] = useState([]);
  const [showVacancies, setShowVacancies] = useState(true);

  const activeSessionId = activeSession?.id;

  useEffect(() => {
    const loaded = loadAllSessions();
    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const empresaParam = urlParams?.get('empresa');

    if (empresaParam) {
      const smartTitle = `Bolsa ${empresaParam}`;
      const existingSmart = loaded.find(s => s.title === smartTitle);
      if (existingSmart) {
        setSessions(loaded);
        setActiveSession(existingSmart);
        setActiveSessionId(existingSmart.id);
      } else {
        getJobs({ empresa: empresaParam }).then(jobs => {
          const freshSmart = createNewSession();
          freshSmart.title = smartTitle;
          freshSmart.matchedJobs = jobs || [];
          freshSmart.messages = [{
            id: 'smart_welcome_' + Date.now(),
            sender: 'bot',
            text: `¡Qué onda! 🤠 Bienvenido a la bolsa de trabajo oficial de **${empresaParam}** en Nuevo León.\n\nAquí tienes las vacantes activas y verificadas de la planta. Puedes revisarlas y darle clic a **"Postularme de Volada"** para apartar tu lugar, o preguntarme sobre transporte, turnos fijos o sueldos libres.`,
            time: nowTime()
          }];
          freshSmart.candidateProfile = { empresa_interes: empresaParam };
          updateSession(freshSmart.id, { title: freshSmart.title, matchedJobs: freshSmart.matchedJobs, messages: freshSmart.messages, candidateProfile: freshSmart.candidateProfile });
          setSessions(loadAllSessions());
          setActiveSession(freshSmart);
          setActiveSessionId(freshSmart.id);
          setShowVacancies(true);
        }).catch(err => {
          console.error('Error cargando vacantes de Smart Link:', err);
        });
      }
    } else if (loaded.length === 0) {
      const fresh = createNewSession();
      setSessions([fresh]);
      setActiveSession(fresh);
    } else {
      setSessions(loaded);
      const activeId = getActiveSessionId();
      const current = loaded.find(s => s.id === activeId) || loaded[0];
      setActiveSession(current);
      setActiveSessionId(current.id);
    }
  }, []);

  const handleNewSession = () => {
    const newSess = createNewSession();
    setSessions(loadAllSessions());
    setActiveSession(newSess);
    setOptions([]);
  };

  const handleSelectSession = (sess) => {
    if (sess.unread) updateSession(sess.id, { unread: 0 });
    setActiveSession({ ...sess, unread: 0 });
    setActiveSessionId(sess.id);
    setSessions(loadAllSessions());
    setOptions([]);
  };

  const handleDeleteSession = (e, id) => {
    e.stopPropagation();
    deleteSession(id);
    const updated = loadAllSessions();
    if (updated.length === 0) {
      const fresh = createNewSession();
      setSessions([fresh]);
      setActiveSession(fresh);
    } else {
      setSessions(updated);
      const currentActiveId = getActiveSessionId();
      setActiveSession(updated.find(s => s.id === currentActiveId) || updated[0]);
    }
  };

  const handleClearAll = (e) => {
    if (e?.stopPropagation) e.stopPropagation();
    clearAllSessions();
    const fresh = createNewSession();
    setSessions([fresh]);
    setActiveSession(fresh);
    setActiveSessionId(fresh.id);
  };

  /** Mensajes nuevos (reclutador / Chambot / sistema) en un chat directo, esté activo o no. */
  const activeIdRef = useRef(null);
  activeIdRef.current = activeSession?.id || null;
  const handleDirectMessages = useCallback((sessionId, newMsgs, meta = {}) => {
    const stored = loadAllSessions().find(s => s.id === sessionId);
    if (!stored) return;
    const known = new Set((stored.messages || []).map(m => m.id));
    const fresh = newMsgs.filter(m => !known.has(m.id));
    const metaKeys = (o) => JSON.stringify([o.status, o.botSilenced, o.screeningStatus, o.screening]);
    const metaChanged = Object.keys(meta).length > 0 && metaKeys(meta) !== metaKeys(stored);
    if (fresh.length === 0 && !metaChanged) return;

    const isActive = activeIdRef.current === sessionId;
    const unread = isActive ? 0 : (stored.unread || 0) + fresh.filter(m => m.sender !== 'user').length;
    const changes = {
      messages: [...(stored.messages || []), ...fresh],
      unread,
      status: meta.status || stored.status,
      botSilenced: meta.botSilenced ?? stored.botSilenced,
      screening: meta.screening !== undefined ? meta.screening : stored.screening,
      screeningStatus: meta.screeningStatus || stored.screeningStatus
    };
    updateSession(sessionId, changes);
    setSessions(loadAllSessions());
    if (isActive) {
      setActiveSession(prev => (prev && prev.id === sessionId ? { ...prev, ...changes, unread: 0 } : prev));
    }
  }, []);

  useDirectChatsPolling(sessions, currentUser, handleDirectMessages);

  /** Abre (o retoma) el chat directo con los reclutadores de la vacante. Devuelve la sesión. */
  const startDirectChat = async (job) => {
    const existing = findDirectSession(loadAllSessions(), { jobId: job.id });
    if (existing) {
      handleSelectSession(existing);
      return existing;
    }
    const application = await submitApplication({
      jobId: job.id,
      sessionId: activeSession?.backendSessionId,
      candidateName: currentUser?.name || 'Operario de NL',
      candidateEmail: currentUser?.email,
      candidatePhone: currentUser?.phone || '',
      municipio: job.municipio
    });
    const byApp = findDirectSession(loadAllSessions(), { applicationId: application.id });
    if (byApp) {
      handleSelectSession(byApp);
      return byApp;
    }
    const session = createDirectSession(application);
    setSessions(loadAllSessions());
    setActiveSession(session);
    setOptions([]);
    return session;
  };

  /** Mensaje del candidato en un chat directo: va al hilo de la postulación, no a Chambot. */
  const sendDirectMessage = async (text) => {
    const userMsg = { id: localId(), sender: 'user', text, time: nowTime() };
    const withUser = [...(activeSession.messages || []), userMsg];
    setActiveSession(prev => ({ ...prev, messages: withUser }));
    updateSession(activeSession.id, { messages: withUser });
    try {
      const saved = await sendCandidateMessage(activeSession.applicationId, text);
      const confirmed = withUser.map(m => (m.id === userMsg.id
        ? { ...mapApplicationMessage(saved, activeSession.companyName), time: formatBackendTime(saved.created_at) }
        : m));
      setActiveSession(prev => ({ ...prev, messages: confirmed }));
      updateSession(activeSession.id, { messages: confirmed });
      // Traer de inmediato la reacción de Chambot (siguiente pregunta de la entrevista) sin esperar al sondeo
      try {
        const app = await getApplicationById(activeSession.applicationId);
        const fresh = missingMessages({ ...activeSession, messages: confirmed }, app);
        const merged = { messages: [...confirmed, ...fresh], ...metaFromApplication(app) };
        setActiveSession(prev => ({ ...prev, ...merged }));
        updateSession(activeSession.id, merged);
      } catch (e) {
        // el sondeo periódico lo traerá
      }
    } catch (err) {
      console.error('Error enviando mensaje al reclutador:', err);
      const failed = [...withUser, {
        id: localId(), sender: 'system', time: nowTime(),
        text: 'No se pudo enviar tu mensaje al reclutador. Revisa tu conexión o vuelve a iniciar sesión e inténtalo de nuevo.'
      }];
      setActiveSession(prev => ({ ...prev, messages: failed }));
      updateSession(activeSession.id, { messages: failed });
    }
    setSessions(loadAllSessions());
  };

  const sendToBot = async ({ textToSend, optionVal = null, location = null }) => {
    if (!activeSession) return;
    if (activeSession.kind === 'direct') {
      const text = (optionVal || textToSend || '').trim();
      if (text) await sendDirectMessage(text);
      return;
    }

    const userText = optionVal
      ? (options.find(o => o.value === optionVal)?.label || optionVal)
      : (location ? `📍 Compartí mi ubicación en ${location.colonia}, ${location.municipio}` : textToSend);
    if (!userText) return;

    const userMsg = { id: localId(), sender: 'user', text: userText, time: nowTime() };
    const newMessages = [...(activeSession.messages || []), userMsg];
    let newTitle = activeSession.title;
    if (activeSession.messages.length === 0) {
      newTitle = userText.length > 30 ? userText.substring(0, 30) + '...' : userText;
    }

    setActiveSession({ ...activeSession, title: newTitle, messages: newMessages });
    updateSession(activeSession.id, { title: newTitle, messages: newMessages });
    setSessions(loadAllSessions());
    setOptions([]);
    setIsTyping(true);

    try {
      let currentSessionId = activeSession.backendSessionId;
      if (!currentSessionId && activeSession.messages.length === 0) {
        const startRes = await startChat();
        currentSessionId = startRes.session_id;
      }

      const res = await sendChatMessage({
        sessionId: currentSessionId,
        message: optionVal ? null : (location ? userText : textToSend),
        selectedOption: optionVal,
        userName: currentUser?.name,
        userPhone: currentUser?.phone,
        userEmail: currentUser?.email,
        candidateLat: location?.lat,
        candidateLon: location?.lon,
        candidateColonia: location?.colonia,
        candidateMunicipio: location?.municipio
      });
      if (res.session_id) currentSessionId = res.session_id;

      setTimeout(() => {
        setIsTyping(false);
        const botMsgs = (res.bot_messages || []).map(m => ({ id: localId(), sender: 'bot', text: m, time: nowTime() }));
        const finalMessages = [...newMessages, ...botMsgs];
        const finalSession = {
          ...activeSession,
          title: newTitle,
          messages: finalMessages,
          matchedJobs: res.matched_jobs?.length ? res.matched_jobs : activeSession.matchedJobs || [],
          nearbyRoutes: res.nearby_routes || [],  // solo se muestran en el turno en que el candidato las pidió
          candidateProfile: res.candidate_profile || activeSession.candidateProfile || null,
          backendSessionId: currentSessionId,
          shouldAskLogin: res.should_ask_login && !currentUser,
          askLocation: Boolean(res.ask_location)
        };
        setActiveSession(finalSession);
        updateSession(activeSession.id, {
          title: newTitle,
          messages: finalMessages,
          matchedJobs: finalSession.matchedJobs,
          nearbyRoutes: finalSession.nearbyRoutes,
          candidateProfile: finalSession.candidateProfile,
          backendSessionId: finalSession.backendSessionId,
          shouldAskLogin: finalSession.shouldAskLogin,
          askLocation: finalSession.askLocation
        });
        setSessions(loadAllSessions());
        setOptions(res.options || []);
        if (location) setShowVacancies(true);
      }, 400);
    } catch (err) {
      console.error('Error enviando mensaje al bot:', err);
      setIsTyping(false);
    }
  };

  return {
    sessions,
    activeSession,
    activeSessionId,
    isTyping,
    options,
    showVacancies,
    setShowVacancies,
    handleNewSession,
    handleSelectSession,
    handleDeleteSession,
    handleClearAll,
    sendToBot,
    startDirectChat,
    setActiveSession,
    setSessions
  };
}
