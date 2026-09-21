import { useState, useEffect, useCallback } from 'react';
import { 
  loadAllSessions, 
  getActiveSessionId, 
  setActiveSessionId, 
  createNewSession, 
  deleteSession, 
  updateSession,
  clearAllSessions
} from '../services/chatStorage';
import { startChat, sendChatMessage, getJobs, sendRecruiterMessage } from '../services/api';
import { useApplicationPolling } from './useApplicationPolling';

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
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }];
          freshSmart.candidateProfile = { empresa_interes: empresaParam };
          const updated = [freshSmart, ...loaded.filter(s => s.id !== freshSmart.id)];
          setSessions(updated);
          setActiveSession(freshSmart);
          setActiveSessionId(freshSmart.id);
          setShowVacancies(true);
        }).catch(err => {
          console.error('Error cargando vacantes de Smart Link:', err);
        });
      }
    } else {
      if (loaded.length === 0) {
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
    }
  }, []);

  const handleNewSession = () => {
    const newSess = createNewSession();
    const updated = loadAllSessions();
    setSessions(updated);
    setActiveSession(newSess);
    setOptions([]);
  };

  const handleSelectSession = (sess) => {
    setActiveSession(sess);
    setActiveSessionId(sess.id);
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
      const nextActive = updated.find(s => s.id === currentActiveId) || updated[0];
      setActiveSession(nextActive);
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

  const onNewMessages = useCallback((newIncomingMsgs) => {
    setActiveSession(prev => {
      if (!prev) return prev;
      const currentMessages = prev.messages || [];
      const existingIds = new Set(currentMessages.map(m => m.id));
      const filtered = newIncomingMsgs.filter(m => !existingIds.has(m.id));
      if (filtered.length === 0) return prev;
      const merged = [...currentMessages, ...filtered];
      updateSession(prev.id, { messages: merged });
      setSessions(loadAllSessions());
      return { ...prev, messages: merged };
    });
  }, []);

  useApplicationPolling(activeSession?.backendSessionId, onNewMessages);

  const sendToBot = async ({ textToSend, optionVal = null, location = null }) => {
    if (!activeSession) return;
    const userText = optionVal 
      ? (options.find(o => o.value === optionVal)?.label || optionVal) 
      : (location ? `📍 Compartí mi ubicación en ${location.colonia}, ${location.municipio}` : textToSend);

    if (!userText) return;

    const userMsg = {
      id: Math.random().toString(),
      sender: 'user',
      text: userText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const newMessages = [...(activeSession.messages || []), userMsg];
    let newTitle = activeSession.title;
    if (activeSession.messages.length === 0) {
      newTitle = userText.length > 30 ? userText.substring(0, 30) + '...' : userText;
    }

    const updatedSession = { ...activeSession, title: newTitle, messages: newMessages };
    setActiveSession(updatedSession);
    updateSession(activeSession.id, { title: newTitle, messages: newMessages });
    setSessions(loadAllSessions());
    setOptions([]);
    setIsTyping(true);

    try {
      if (activeSession.backendSessionId && !optionVal && !location) {
        // Sync message
      }

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
        const botMsgs = (res.bot_messages || []).map(m => ({
          id: Math.random().toString(),
          sender: 'bot',
          text: m,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }));

        const finalMessages = [...newMessages, ...botMsgs];
        const finalSession = {
          ...activeSession,
          messages: finalMessages,
          matchedJobs: res.matched_jobs?.length ? res.matched_jobs : activeSession.matchedJobs || [],
          nearbyRoutes: res.nearby_routes?.length ? res.nearby_routes : activeSession.nearbyRoutes || [],
          candidateProfile: res.candidate_profile || activeSession.candidateProfile || null,
          backendSessionId: currentSessionId,
          shouldAskLogin: res.should_ask_login && !currentUser
        };

        setActiveSession(finalSession);
        updateSession(activeSession.id, {
          messages: finalMessages,
          matchedJobs: finalSession.matchedJobs,
          nearbyRoutes: finalSession.nearbyRoutes,
          candidateProfile: finalSession.candidateProfile,
          backendSessionId: finalSession.backendSessionId,
          shouldAskLogin: finalSession.shouldAskLogin
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
    setActiveSession,
    setSessions
  };
}
