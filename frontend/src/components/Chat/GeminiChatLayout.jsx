import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  MessageSquare, 
  Trash2, 
  Menu, 
  X, 
  ArrowUp, 
  Building2, 
  User, 
  MapPin, 
  Clock, 
  Briefcase, 
  ChevronRight,
  ShieldCheck,
  Sparkles,
  Settings,
  CheckCircle2
} from 'lucide-react';
import { 
  loadAllSessions, 
  saveAllSessions, 
  getActiveSessionId, 
  setActiveSessionId, 
  createNewSession, 
  deleteSession, 
  updateSession 
} from '../../services/chatStorage';
import { 
  startChat, 
  sendChatMessage, 
  submitApplication, 
  getApplicationsBySession,
  getJobs,
  sendRecruiterMessage,
  checkBotFallback
} from '../../services/api';
import { 
  getStoredUser, 
  signOut, 
  syncUserWithBackend 
} from '../../services/supabaseClient';
import AuthModal from '../Auth/AuthModal';
import JobDetailModal from '../Jobs/JobDetailModal';

export default function GeminiChatLayout({ 
  onOpenEmpresa, 
  onOpenPerfil, 
  onOpenAdmin,
  currentUser: propCurrentUser,
  onLogout: propOnLogout,
  onUserAuthenticated: propOnUserAuthenticated
}) {
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(() => 
    typeof window !== 'undefined' ? window.innerWidth >= 768 : false
  );
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [options, setOptions] = useState([]);
  const [currentUser, setCurrentUser] = useState(propCurrentUser || getStoredUser());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [showVacancies, setShowVacancies] = useState(true);
  const [appliedJobIds, setAppliedJobIds] = useState(new Set());
  const [selectedDetailJob, setSelectedDetailJob] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeSession?.messages, isTyping]);

  useEffect(() => {
    if (propCurrentUser !== undefined) {
      setCurrentUser(propCurrentUser);
    }
  }, [propCurrentUser]);

  useEffect(() => {
    const user = getStoredUser();
    if (user && !propCurrentUser) setCurrentUser(user);

    const loaded = loadAllSessions();

    // Verificar si el usuario ingresó por un Smart Link (ej. ?empresa=Whirlpool)
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
          freshSmart.messages = [
            {
              id: 'smart_welcome_' + Date.now(),
              sender: 'bot',
              text: `¡Qué onda! 🤠 Bienvenido a la bolsa de trabajo oficial de **${empresaParam}** en Nuevo León.\n\nAquí tienes las vacantes activas y verificadas de la planta. Puedes revisarlas y darle clic a **"Postularme de Volada"** para apartar tu lugar, o preguntarme sobre transporte, turnos fijos o sueldos libres.`,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          ];
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

  const handleNewChat = () => {
    const newSess = createNewSession();
    const updated = loadAllSessions();
    setSessions(updated);
    setActiveSession(newSess);
    setOptions([]);
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setSidebarOpen(false);
    }
    inputRef.current?.focus();
  };

  const handleSelectSession = (sess) => {
    setActiveSession(sess);
    setActiveSessionId(sess.id);
    setOptions([]);
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setSidebarOpen(false);
    }
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

  const handleClearAllSessions = (e) => {
    e.stopPropagation();
    if (window.confirm('¿Deseas eliminar todo tu historial de conversaciones?')) {
      localStorage.removeItem('chambachat_sessions_v2');
      const fresh = createNewSession();
      setSessions([fresh]);
      setActiveSession(fresh);
      setActiveSessionId(fresh.id);
    }
  };

  // Sondeo en segundo plano para recibir mensajes del chat grupal en tiempo real (Reclutador + Chambot + Sistema)
  useEffect(() => {
    if (!activeSession?.backendSessionId) return;

    const interval = setInterval(async () => {
      try {
        const apps = await getApplicationsBySession(activeSession.backendSessionId);
        if (!apps || apps.length === 0) return;

        const currentMessages = activeSession.messages || [];
        const existingTexts = new Set(currentMessages.map(m => m.text));

        const newIncomingMsgs = [];
        for (const app of apps) {
          // Evaluar si pasaron 2 min desde la última duda del candidato y activar fallback si procede
          if (!app.bot_silenced) {
            try {
              await checkBotFallback(app.id, false);
            } catch (e) {
              // Silencioso
            }
          }

          for (const m of app.messages || []) {
            if (!existingTexts.has(m.mensaje)) {
              let senderRole = 'bot';
              if (m.sender_type === 'recruiter') senderRole = 'recruiter';
              else if (m.sender_type === 'system') senderRole = 'system';
              else if (m.sender_type === 'candidate') senderRole = 'user';

              // No duplicar mensajes enviados por el usuario local
              if (senderRole !== 'user') {
                newIncomingMsgs.push({
                  id: `appmsg_${m.id}`,
                  sender: senderRole,
                  sender_name: m.sender_name || (m.sender_type === 'recruiter' ? `Reclutador ${app.empresa_nombre}` : 'Chambot (IA)'),
                  text: m.mensaje,
                  time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                });
                existingTexts.add(m.mensaje);
              }
            }
          }
        }

        if (newIncomingMsgs.length > 0) {
          const merged = [...currentMessages, ...newIncomingMsgs];
          setActiveSession(prev => ({ ...prev, messages: merged }));
          updateSession(activeSession.id, { messages: merged });
          setSessions(loadAllSessions());
        }
      } catch (err) {
        // Silencioso en sondeo
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [activeSession?.backendSessionId, activeSession?.id, activeSession?.messages?.length]);

  // Manejo de postulación e inicio de chat directo grupal
  const handleApplyJob = async (job) => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }

    try {
      await submitApplication({
        jobId: job.id,
        sessionId: activeSession?.backendSessionId,
        candidateName: currentUser.name || 'Operario de NL',
        candidateEmail: currentUser.email || 'candidato@correo.com',
        candidatePhone: currentUser.phone || '',
        municipio: job.municipio
      });

      setAppliedJobIds(prev => new Set(prev).add(job.id));

      const groupIntroMsg = {
        id: Math.random().toString(),
        sender: 'system',
        text: `👥 ¡Chat Grupal Oficial Conectado! Estás en comunicación directa con Reclutamiento ${job.empresa_nombre} (${job.titulo}). Participantes: Tú, Reclutador de Planta y Chambot (IA).`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      const recruiterIntroMsg = {
        id: Math.random().toString(),
        sender: 'recruiter',
        sender_name: `Reclutamiento ${job.empresa_nombre}`,
        text: `¡Hola ${currentUser.name || 'Compa'}! Recibimos tu interés en la vacante de ${job.titulo}. En breve un reclutador de nuestra planta revisará tus datos aquí mismo.`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      const botIntroMsg = {
        id: Math.random().toString(),
        sender: 'bot',
        sender_name: 'Chambot (IA)',
        text: `🤖 ¡Qué onda ${currentUser.name || 'Compa'}! Quedé integrado en este chat grupal. Puedes hacerme preguntas sobre el sueldo (${job.sueldo_semanal_libre ? `$${job.sueldo_semanal_libre.toLocaleString('es-MX')}/sem` : ''}), los turnos o el transporte de ${job.empresa_nombre}. Si el reclutador tarda más de 2 minutos en responder, con gusto te ayudo.`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      const finalMsgs = [...(activeSession?.messages || []), groupIntroMsg, recruiterIntroMsg, botIntroMsg];
      const updatedSess = {
        ...activeSession,
        messages: finalMsgs
      };

      setActiveSession(updatedSess);
      updateSession(activeSession.id, { messages: finalMsgs });
      setSessions(loadAllSessions());
    } catch (err) {
      console.error('Error al postularse a la vacante:', err);
    }
  };

  // Manejo de autenticación exitosa desde AuthModal
  const handleUserAuthenticated = async (user) => {
    if (!user) return;
    setCurrentUser(user);
    if (propOnUserAuthenticated) propOnUserAuthenticated(user);

    const displayName = user.name || 'Compa';
    const displayEmail = user.email || 'tu cuenta';
    const methodStr = user.provider === 'email' ? 'tu correo personal' : 'Google';

    await syncUserWithBackend(user, {
      sessionId: activeSession?.backendSessionId,
      municipio: activeSession?.candidateProfile?.municipio || 'Apodaca',
      puesto_deseado: activeSession?.candidateProfile?.puesto_deseado || 'Operario'
    });

    const confirmMsg = {
      id: Math.random().toString(),
      sender: 'bot',
      text: `¡Qué onda, ${displayName}! 🤠 Ya vinculamos tu cuenta con ${methodStr} (${displayEmail}). Tus datos y vacantes afines quedaron guardados con éxito. Ahora te avisaremos directo cuando salgan nuevas chambas cerca de tu zona.`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const finalMsgs = [...(activeSession?.messages || []), confirmMsg];
    const updated = {
      ...activeSession,
      messages: finalMsgs,
      shouldAskLogin: false
    };
    setActiveSession(updated);
    updateSession(activeSession.id, { messages: finalMsgs, shouldAskLogin: false });
  };

  const handleLogout = async () => {
    await signOut();
    setCurrentUser(null);
    if (propOnLogout) propOnLogout();
  };

  // Enviar mensaje al bot
  const handleSendMessage = async (textToSend, optionVal = null) => {
    const text = textToSend || inputMessage;
    if (!text && !optionVal) return;

    if (!activeSession) return;

    const userText = optionVal 
      ? (options.find(o => o.value === optionVal)?.label || optionVal) 
      : text;

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

    const updatedSession = {
      ...activeSession,
      title: newTitle,
      messages: newMessages
    };

    setActiveSession(updatedSession);
    updateSession(activeSession.id, { title: newTitle, messages: newMessages });
    setSessions(loadAllSessions());

    setInputMessage('');
    setOptions([]);
    setIsTyping(true);

    try {
      // Sincronizar mensaje con el chat de la empresa si existe postulación activa
      if (activeSession.backendSessionId && !optionVal) {
        getApplicationsBySession(activeSession.backendSessionId).then(apps => {
          if (apps && apps.length > 0) {
            sendRecruiterMessage(apps[0].id, {
              senderType: 'candidate',
              senderName: currentUser?.name || 'Candidato',
              mensaje: userText
            }).catch(e => console.warn('Sync candidate msg err:', e));
          }
        }).catch(e => console.warn('Get apps err:', e));
      }

      let res;
      if (!activeSession.backendSessionId && activeSession.messages.length === 0) {
        const startRes = await startChat();
        activeSession.backendSessionId = startRes.session_id;
      }

      res = await sendChatMessage({
        sessionId: activeSession.backendSessionId,
        message: optionVal ? null : text,
        selectedOption: optionVal,
        userName: currentUser?.name,
        userPhone: currentUser?.phone,
        userEmail: currentUser?.email
      });

      if (res.session_id) {
        activeSession.backendSessionId = res.session_id;
      }

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
          candidateProfile: res.candidate_profile || activeSession.candidateProfile || null,
          backendSessionId: res.session_id || activeSession.backendSessionId,
          shouldAskLogin: res.should_ask_login && !currentUser
        };

        setActiveSession(finalSession);
        updateSession(activeSession.id, {
          messages: finalMessages,
          matchedJobs: finalSession.matchedJobs,
          candidateProfile: finalSession.candidateProfile,
          backendSessionId: finalSession.backendSessionId,
          shouldAskLogin: finalSession.shouldAskLogin
        });
        setSessions(loadAllSessions());
        setOptions(res.options || []);
      }, 400);

    } catch (err) {
      console.error('Error enviando mensaje al bot:', err);
      setIsTyping(false);
    }
  };

  const starterPrompts = [
    {
      title: '🚜 Vacantes de Montacarguista',
      subtitle: 'Hombre sentado y parado con sueldos de hasta $3,400/sem',
      prompt: 'Habrá vacantes de montacarguista?'
    },
    {
      title: '🏭 Operario en Apodaca',
      subtitle: 'Ensamble y producción con ruta de transporte de personal',
      prompt: 'Busco vacantes de operario de producción en Apodaca con transporte'
    },
    {
      title: '⏱️ Turnos Fijos sin Rolar',
      subtitle: 'Mayor descanso y estabilidad para tu familia',
      prompt: 'Busco puestos que ofrezcan turnos fijos sin rolación'
    },
    {
      title: '💰 Sueldos mayores a $2,800/sem',
      subtitle: 'Puestos de montacargas, soldadura y maquinado CNC',
      prompt: '¿Cuáles son las vacantes con sueldo superior a $2,800 semanales libres?'
    }
  ];

  return (
    <div className="flex h-[100dvh] w-full max-w-full bg-[#fcfdfd] text-slate-800 font-sans overflow-hidden">
      {/* SIDEBAR IZQUIERDA */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-72 bg-[#f9fafb] border-r border-slate-200 flex flex-col transition-all duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:w-0 md:border-none md:overflow-hidden'
        }`}
      >
        <div className="p-3.5 flex items-center justify-between border-b border-slate-200/80 shrink-0">
          <button
            onClick={handleNewChat}
            className="flex-1 flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-semibold text-xs border border-slate-200 shadow-sm transition group"
          >
            <Plus className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
            <span>Nuevo chat</span>
          </button>

          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-2 text-slate-400 hover:text-slate-600 rounded-lg ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Lista de Historial */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <div className="flex items-center justify-between px-3 py-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Tus conversaciones
            </span>
            {sessions.length > 1 && (
              <button
                onClick={handleClearAllSessions}
                className="text-[10px] text-slate-400 hover:text-rose-600 font-bold transition"
                title="Borrar todo el historial"
              >
                Vaciar
              </button>
            )}
          </div>
          {sessions.map((sess) => {
            const isActive = sess.id === activeSession?.id;
            return (
              <div
                key={sess.id}
                onClick={() => handleSelectSession(sess)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs cursor-pointer transition ${
                  isActive
                    ? 'bg-slate-200/70 text-slate-900 font-bold'
                    : 'text-slate-600 hover:bg-slate-200/40 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate flex-1 mr-1">
                  <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <span className="truncate">{sess.title}</span>
                </div>

                <button
                  onClick={(e) => handleDeleteSession(e, sess.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition shrink-0"
                  title="Eliminar este chat"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer Sidebar: Perfil & Accesos */}
        <div className="p-3 border-t border-slate-200 bg-white/70 space-y-2 shrink-0">
          {currentUser ? (
            <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col gap-2">
              <div 
                onClick={onOpenPerfil}
                className="flex items-center gap-2.5 truncate min-w-0 cursor-pointer hover:opacity-85 transition"
                title="Ver mi perfil"
              >
                <img
                  src={currentUser.avatar_url}
                  alt={currentUser.name}
                  className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-300 shrink-0 object-cover"
                />
                <div className="truncate min-w-0">
                  <span className="text-xs font-bold text-slate-900 block truncate">{currentUser.name}</span>
                  <span className="text-[10px] text-slate-500 block truncate">{currentUser.email}</span>
                </div>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsAuthModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold border border-slate-200 shadow-xs transition"
            >
              <User className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Iniciar sesión / Registrarse</span>
            </button>
          )}

          <button
            onClick={() => {
              if (typeof window !== 'undefined' && window.innerWidth < 768) setSidebarOpen(false);
              onOpenEmpresa();
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-slate-800 hover:bg-emerald-50 hover:text-emerald-800 transition border border-transparent hover:border-emerald-200"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600">
                <Building2 className="w-4 h-4" />
              </div>
              <div className="text-left">
                <span className="block leading-none">Soy Empresa</span>
                <span className="text-[10px] text-slate-400 font-normal">Predictor & Vacantes</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>

          <button
            onClick={() => {
              if (typeof window !== 'undefined' && window.innerWidth < 768) setSidebarOpen(false);
              onOpenPerfil();
            }}
            className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
          >
            <div className="flex items-center gap-2.5">
              <User className="w-3.5 h-3.5 text-slate-500" />
              <span>Mi Perfil Guardado</span>
            </div>
          </button>

          <button
            onClick={() => {
              if (typeof window !== 'undefined' && window.innerWidth < 768) setSidebarOpen(false);
              onOpenAdmin();
            }}
            className="w-full flex items-center gap-2 px-3 py-1 text-xs text-slate-400 hover:text-slate-600 transition"
          >
            <Settings className="w-3 h-3" />
            <span className="text-[11px]">Admin Flujos</span>
          </button>
        </div>
      </aside>

      {/* OVERLAY MÓVIL */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-slate-900/30 z-30 md:hidden backdrop-blur-sm"
        />
      )}

      {/* ÁREA PRINCIPAL DE CHAT */}
      <main className="flex-1 flex flex-col h-full bg-white relative min-w-0 w-full overflow-hidden">
        {/* Top Navbar */}
        <header className="h-14 border-b border-slate-100 px-3 sm:px-4 flex items-center justify-between bg-white/95 backdrop-blur z-10 w-full min-w-0 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition shrink-0"
              title="Alternar barra lateral"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 truncate">
              <img
                src="/logo-chambachat.png"
                alt="ChambaChat Logo"
                className="h-8 sm:h-9 w-auto object-contain rounded-lg shadow-xs border border-slate-900/10 shrink-0"
              />
              <span className="text-base font-extrabold tracking-tight text-slate-900 truncate">
                Chamba<span className="text-emerald-600">chat</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!currentUser ? (
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-xs transition shrink-0"
              >
                <User className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Iniciar sesión</span>
              </button>
            ) : (
              <div
                onClick={onOpenPerfil}
                className="flex items-center gap-2 cursor-pointer p-1 pr-2 rounded-full hover:bg-slate-100 transition shrink-0 border border-transparent hover:border-slate-200"
                title="Ver mi perfil"
              >
                <img
                  src={currentUser.avatar_url}
                  alt={currentUser.name}
                  className="w-7 h-7 rounded-full bg-slate-200 border border-emerald-400 object-cover"
                />
                <span className="text-xs font-bold text-slate-800 hidden sm:inline truncate max-w-[120px]">
                  {currentUser.name}
                </span>
              </div>
            )}
          </div>
        </header>

        {/* Mensajes del Chat */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3.5 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 max-w-3xl mx-auto w-full min-w-0">
          {(!activeSession?.messages || activeSession.messages.length === 0) ? (
            /* Pantalla inicial vacía */
            <div className="py-8 sm:py-16 text-center space-y-6 sm:space-y-8 animate-fadeIn">
              <div className="flex justify-center">
                <img
                  src="/chambot.png"
                  alt="Chambot"
                  className="w-20 h-20 sm:w-24 sm:h-24 object-contain drop-shadow-md hover:scale-105 transition-transform"
                />
              </div>
              <div className="space-y-1.5 sm:space-y-2 px-2">
                <h1 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  ¡Qué onda! ¿En qué te ayudo hoy a jalar?
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                  Pregúntame sobre vacantes de montacarguistas, ensamble, almacén, turnos fijos o sueldos en Nuevo León.
                </p>
              </div>

              {/* Tarjetas de Sugerencias */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 text-left pt-2 sm:pt-4">
                {starterPrompts.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(item.prompt)}
                    className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/70 hover:border-emerald-300 transition text-left group shadow-sm"
                  >
                    <div className="font-bold text-xs text-slate-800 group-hover:text-emerald-700 transition">
                      {item.title}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {item.subtitle}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-6 min-w-0">
              {activeSession.messages.map((msg) => {
                if (msg.sender === 'system') {
                  return (
                    <div key={msg.id} className="w-full flex justify-center my-2">
                      <span className="text-[11px] bg-emerald-50 text-emerald-900 font-medium px-4 py-1.5 rounded-full border border-emerald-200/80 text-center max-w-lg shadow-2xs">
                        {msg.text}
                      </span>
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    className={`flex gap-2.5 sm:gap-3.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} min-w-0 w-full`}
                  >
                    {msg.sender === 'bot' && (
                      <img
                        src="/chambot.png"
                        alt="Chambot"
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-50 p-0.5 border border-emerald-300/80 object-contain shadow-xs shrink-0"
                      />
                    )}

                    {msg.sender === 'recruiter' && (
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs sm:text-sm shadow shrink-0 text-white font-bold">
                        👔
                      </div>
                    )}

                    <div className="space-y-1.5 max-w-[88%] sm:max-w-[80%] min-w-0">
                      <div
                        className={`px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-sm break-words overflow-hidden ${
                          msg.sender === 'user'
                            ? 'bg-slate-900 text-white rounded-tr-none'
                            : msg.sender === 'recruiter'
                            ? 'bg-blue-50 text-slate-800 rounded-tl-none border border-blue-200'
                            : 'bg-slate-50 text-slate-800 rounded-tl-none border border-slate-200/80'
                        }`}
                      >
                        {msg.sender === 'recruiter' && (
                          <div className="flex items-center gap-2 text-xs font-bold text-blue-700 mb-1">
                            <span>{msg.sender_name || 'Reclutador de Planta'}</span>
                            <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-semibold">Empresa</span>
                          </div>
                        )}
                        {msg.sender === 'bot' && msg.sender_name && msg.sender_name !== 'bot' && (
                          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 mb-1">
                            <span>{msg.sender_name}</span>
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-semibold">Asistente IA</span>
                          </div>
                        )}
                        <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                        <span className="text-[10px] block text-right mt-1 text-slate-400">
                          {msg.time}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Bot escribiendo */}
              {isTyping && (
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <img
                    src="/chambot.png"
                    alt="Chambot"
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-50 p-0.5 border border-emerald-300/80 object-contain shadow-xs shrink-0"
                  />
                  <div className="bg-slate-100 text-slate-500 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-2xl rounded-tl-none flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce" />
                    <span className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <span className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              )}

              {/* Botones de sugerencias rápidas (Chips dinámicos) */}
              {options.length > 0 && (
                <div className="pl-0 sm:pl-10 pt-1 space-y-1.5 w-full min-w-0">
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {options.map((opt, i) => (
                      <button
                        key={i}
                        onClick={() => handleSendMessage(null, opt.value)}
                        className="text-xs font-semibold px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl transition border shadow-sm bg-white hover:bg-slate-50 text-slate-800 border-slate-200 hover:border-emerald-500 text-left"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* IN-CHAT NUDGE: Guardar perfil sin fricción */}
              {(!currentUser && activeSession?.shouldAskLogin) && (
                <div className="pl-0 sm:pl-10 py-2 animate-fadeIn w-full min-w-0">
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/90 shadow-sm max-w-md space-y-2.5">
                    <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Guarda tu perfil para postularte a plantas</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Vincula tu cuenta para guardar tu municipio, ver las mejores vacantes y recibir avisos de contratación.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsAuthModalOpen(true)}
                      className="flex items-center justify-center gap-2.5 w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold border border-slate-300 shadow-xs transition"
                    >
                      <User className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Conectar Cuenta (Google o Correo)</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Vacantes Afines Desplegadas en el Chat (Diseño Compacto y Colapsable) */}
              {activeSession?.matchedJobs && activeSession.matchedJobs.length > 0 && (
                <div className="pl-0 sm:pl-10 pt-2 space-y-2 w-full max-w-full overflow-hidden">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                      <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Vacantes Afines ({activeSession.matchedJobs.length})</span>
                    </div>
                    <button
                      onClick={() => setShowVacancies(!showVacancies)}
                      className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 transition"
                    >
                      <span>{showVacancies ? 'Ocultar vacantes ▴' : 'Ver vacantes ▾'}</span>
                    </button>
                  </div>

                  {showVacancies && (
                    <div className="flex gap-3 overflow-x-auto snap-x py-1 px-0.5 no-scrollbar w-full max-w-full">
                      {activeSession.matchedJobs.map((job) => {
                        const isApplied = appliedJobIds.has(job.id);
                        return (
                          <div
                            key={job.id}
                            onClick={() => setSelectedDetailJob(job)}
                            className="w-[260px] sm:w-[280px] shrink-0 snap-start bg-white p-3.5 rounded-2xl border border-slate-200 hover:border-emerald-500 shadow-sm transition flex flex-col justify-between space-y-2.5 cursor-pointer group hover:shadow-md"
                            title="Haz clic para ver toda la información de la vacante y abrir chat directo"
                          >
                            <div>
                              <div className="flex items-start justify-between gap-1.5">
                                <span className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-wide truncate">
                                  {job.empresa_nombre}
                                </span>
                                <div className="text-right shrink-0">
                                  <span className="text-xs font-black text-emerald-600">
                                    ${job.sueldo_semanal_libre?.toLocaleString('es-MX')}
                                  </span>
                                  <span className="text-[9px] text-slate-400"> /sem</span>
                                </div>
                              </div>

                              <h4 className="text-xs font-bold text-slate-900 leading-tight line-clamp-1 mt-0.5 group-hover:text-emerald-700 transition-colors" title={job.titulo}>
                                {job.titulo}
                              </h4>

                              <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 leading-snug">
                                {job.descripcion}
                              </p>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedDetailJob(job);
                                }}
                                className="text-[10px] text-emerald-700 font-bold hover:underline mt-1.5 flex items-center gap-1"
                              >
                                <span>Ver información extendida</span>
                                <span>&rarr;</span>
                              </button>
                            </div>

                            <div className="space-y-2">
                              <div className="flex flex-wrap gap-1 text-[10px]">
                                <span className="flex items-center gap-1 bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                                  <MapPin className="w-3 h-3 text-sky-500 shrink-0" />
                                  {job.municipio} ({job.distancia_km} km)
                                </span>
                                <span className="flex items-center gap-1 bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                                  <Clock className="w-3 h-3 text-amber-500 shrink-0" />
                                  ~{job.tiempo_traslado_min} min
                                </span>
                              </div>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedDetailJob(job);
                                }}
                                className={`w-full text-center py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                                  isApplied
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-slate-900 hover:bg-emerald-600 text-white shadow-sm'
                                }`}
                              >
                                {isApplied ? (
                                  <>
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Chat Directo Activo ✓</span>
                                  </>
                                ) : (
                                  <span>{currentUser ? '💬 Chat Directo con Reclutador' : 'Ver Detalles & Chat'}</span>
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* BARRA INFERIOR DE INPUT */}
        <div className="p-3 sm:p-4 bg-gradient-to-t from-white via-white to-transparent w-full shrink-0">
          <div className="max-w-3xl mx-auto w-full">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="relative flex items-center bg-slate-50 border border-slate-300/80 rounded-2xl shadow-sm focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:bg-white transition"
            >
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Pregunta sobre vacantes, montacargas, sueldos..."
                className="w-full py-3 sm:py-3.5 pl-3.5 sm:pl-4 pr-11 sm:pr-12 text-base sm:text-sm text-slate-800 bg-transparent focus:outline-none placeholder-slate-400"
              />

              <button
                type="submit"
                disabled={!inputMessage.trim()}
                className="absolute right-2 sm:right-2.5 p-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-30 text-white transition shadow-sm"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
            </form>

            <p className="text-[10px] sm:text-[11px] text-center text-slate-400 mt-1.5 sm:mt-2 font-medium">
              Chambachat te orienta sobre oportunidades industriales y vacantes operativas en Nuevo León.
            </p>
          </div>
        </div>
      </main>

      {/* Modal de Autenticación sin Fricción */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthenticated={handleUserAuthenticated}
      />

      {/* Modal de Detalle de Vacante y Chat Grupal */}
      <JobDetailModal
        job={selectedDetailJob}
        isOpen={Boolean(selectedDetailJob)}
        onClose={() => setSelectedDetailJob(null)}
        onStartDirectChat={handleApplyJob}
        isApplied={selectedDetailJob ? appliedJobIds.has(selectedDetailJob.id) : false}
        currentUser={currentUser}
      />
    </div>
  );
}
