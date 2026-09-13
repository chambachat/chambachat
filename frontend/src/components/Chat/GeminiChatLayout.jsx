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
  GraduationCap, 
  MapPin, 
  Clock, 
  DollarSign, 
  Briefcase, 
  ChevronRight,
  ShieldCheck,
  Sparkles,
  Settings,
  Share2
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
import { startChat, sendChatMessage } from '../../services/api';

export default function GeminiChatLayout({ onOpenEmpresa, onOpenPerfil, onOpenAdmin }) {
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [options, setOptions] = useState([]);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeSession?.messages, isTyping]);

  // Cargar sesiones al montar
  useEffect(() => {
    const loaded = loadAllSessions();
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
  }, []);

  // Iniciar nuevo chat
  const handleNewChat = () => {
    const newSess = createNewSession();
    const updated = loadAllSessions();
    setSessions(updated);
    setActiveSession(newSess);
    setOptions([]);
    inputRef.current?.focus();
  };

  // Cambiar de chat
  const handleSelectSession = (sess) => {
    setActiveSession(sess);
    setActiveSessionId(sess.id);
    setOptions([]);
  };

  // Eliminar chat
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

  // Enviar mensaje
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

    // Actualizar sesión con mensaje del usuario
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
      // Si la sesión no tiene backendSessionId, iniciamos una o usamos el backend
      let res;
      if (!activeSession.backendSessionId && activeSession.messages.length === 0) {
        const startRes = await startChat();
        activeSession.backendSessionId = startRes.session_id;
      }

      res = await sendChatMessage({
        sessionId: activeSession.backendSessionId,
        message: optionVal ? null : text,
        selectedOption: optionVal
      });

      // Asegurar guardar backendSessionId
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
          matchedJobs: res.matched_jobs || activeSession.matchedJobs || [],
          candidateProfile: res.candidate_profile || activeSession.candidateProfile || null,
          backendSessionId: res.session_id || activeSession.backendSessionId
        };

        setActiveSession(finalSession);
        updateSession(activeSession.id, {
          messages: finalMessages,
          matchedJobs: finalSession.matchedJobs,
          candidateProfile: finalSession.candidateProfile,
          backendSessionId: finalSession.backendSessionId
        });
        setSessions(loadAllSessions());
        setOptions(res.options || []);
      }, 500);

    } catch (err) {
      console.error('Error enviando mensaje al bot:', err);
      setIsTyping(false);
      // Respuesta de fallback
      const fallbackMsg = {
        id: Math.random().toString(),
        sender: 'bot',
        text: '¡Entendido! Déjame buscarte las mejores vacantes operativas de Nuevo León cerca de tu zona. ¿En qué municipio te gustaría laborar?',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      const finalMessages = [...newMessages, fallbackMsg];
      setActiveSession({ ...activeSession, messages: finalMessages });
      updateSession(activeSession.id, { messages: finalMessages });
      setOptions([
        { label: 'Apodaca', value: 'Apodaca' },
        { label: 'Pesquería', value: 'Pesquería' },
        { label: 'San Nicolás', value: 'San Nicolás' },
        { label: 'Monterrey', value: 'Monterrey' }
      ]);
    }
  };

  const starterPrompts = [
    {
      title: '🏭 Buscar jale en Apodaca',
      subtitle: 'Vacantes de operario de ensamble y prensas',
      prompt: 'Hola, busco vacantes de operario en Apodaca con transporte'
    },
    {
      title: '🎓 Terminar estudios con INEA',
      subtitle: 'Trabaja y saca tu certificado oficial',
      prompt: 'Quiero información sobre vacantes con apoyo para certificar primaria o secundaria con el INEA'
    },
    {
      title: '⏱️ Turnos Fijos sin Rotar',
      subtitle: 'Mayor estabilidad y mejor descanso',
      prompt: 'Busco puestos operativos que ofrezcan turnos fijos'
    },
    {
      title: '💰 Sueldos mayores a $2,500/sem',
      subtitle: 'Puestos de soldadura o maquinado CNC',
      prompt: '¿Cuáles son las vacantes con sueldo superior a $2,500 semanales?'
    }
  ];

  return (
    <div className="flex h-screen bg-[#fcfdfd] text-slate-800 font-sans overflow-hidden">
      {/* SIDEBAR IZQUIERDA (Estilo ChatGPT / Gemini) */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-72 bg-[#f9fafb] border-r border-slate-200 flex flex-col transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:w-0 md:border-none'
        }`}
      >
        <div className="p-3.5 flex items-center justify-between border-b border-slate-200/80">
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

        {/* Lista de Historial de Chats */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Tus conversaciones
          </div>
          {sessions.map((sess) => {
            const isActive = sess.id === activeSession?.id;
            return (
              <div
                key={sess.id}
                onClick={() => handleSelectSession(sess)}
                className={`group flex items-center justify-between px-3 py-2.5 rounded-xl text-xs cursor-pointer transition ${
                  isActive
                    ? 'bg-slate-200/70 text-slate-900 font-bold'
                    : 'text-slate-600 hover:bg-slate-200/40 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <span className="truncate">{sess.title}</span>
                </div>

                <button
                  onClick={(e) => handleDeleteSession(e, sess.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-600 rounded transition"
                  title="Eliminar chat"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer Sidebar: Accesos Directos a Empresa y Perfil */}
        <div className="p-3 border-t border-slate-200 bg-white/70 space-y-1">
          <button
            onClick={onOpenEmpresa}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold text-slate-800 hover:bg-emerald-50 hover:text-emerald-800 transition border border-transparent hover:border-emerald-200"
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
            onClick={onOpenPerfil}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
          >
            <div className="flex items-center gap-2.5">
              <User className="w-4 h-4 text-slate-500" />
              <span>Mi Perfil de Operario</span>
            </div>
            {activeSession?.candidateProfile?.tag_inea && (
              <span className="text-[10px] bg-purple-100 text-purple-700 font-bold px-1.5 py-0.2 rounded">
                INEA
              </span>
            )}
          </button>

          <button
            onClick={onOpenAdmin}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Admin Flujos (Prompts)</span>
          </button>
        </div>
      </aside>

      {/* OVERLAY MÓVIL */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-slate-900/20 z-30 md:hidden backdrop-blur-sm"
        />
      )}

      {/* ÁREA PRINCIPAL DE CHAT (Luz / Minimalista) */}
      <main className="flex-1 flex flex-col h-full bg-white relative">
        {/* Top Navbar Minimalista */}
        <header className="h-14 border-b border-slate-100 px-4 flex items-center justify-between bg-white/95 backdrop-blur z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
              title="Alternar barra lateral"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              <span className="text-base font-extrabold tracking-tight text-slate-900">
                Chamba<span className="text-emerald-600">chat</span>
              </span>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
                Nuevo León 🤠
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenEmpresa}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Portal Empresa</span>
            </button>
          </div>
        </header>

        {/* Contenedor de Mensajes */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 max-w-3xl mx-auto w-full">
          {(!activeSession?.messages || activeSession.messages.length === 0) ? (
            /* Empty State: Gemini / ChatGPT Style */
            <div className="py-12 sm:py-16 text-center space-y-8 animate-fadeIn">
              <div className="inline-flex p-4 rounded-3xl bg-emerald-50 text-3xl shadow-sm border border-emerald-100">
                🤠
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  ¡Qué onda! ¿En qué te ayudo hoy a jalar?
                </h1>
                <p className="text-sm text-slate-500 max-w-md mx-auto">
                  Pregúntame sobre vacantes de manufactura en Monterrey, turnos fijos, transporte o cómo terminar tus estudios con el INEA mientras trabajas.
                </p>
              </div>

              {/* Tarjetas de Sugerencias Rápidas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left pt-4">
                {starterPrompts.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(item.prompt)}
                    className="p-4 rounded-2xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/70 hover:border-emerald-300 transition text-left group shadow-sm"
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
            /* Lista de Mensajes */
            <div className="space-y-6">
              {activeSession.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.sender === 'bot' && (
                    <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-sm shadow shrink-0 text-white font-bold">
                      🤠
                    </div>
                  )}

                  <div className={`space-y-2 max-w-[82%]`}>
                    <div
                      className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                        msg.sender === 'user'
                          ? 'bg-slate-900 text-white rounded-tr-none'
                          : 'bg-slate-50 text-slate-800 rounded-tl-none border border-slate-200/80'
                      }`}
                    >
                      {/* Destacar mensaje especial de INEA si aplica */}
                      {msg.text.includes('INEA') && msg.sender === 'bot' && (
                        <div className="flex items-center gap-1.5 text-xs font-bold text-purple-800 bg-purple-100 px-2.5 py-1 rounded-lg mb-2 w-fit">
                          <GraduationCap className="w-4 h-4 text-purple-600" />
                          Programa de Acreditación Oficial INEA
                        </div>
                      )}
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                      <span className={`text-[10px] block text-right mt-1 ${msg.sender === 'user' ? 'text-slate-400' : 'text-slate-400'}`}>
                        {msg.time}
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {/* Indicador de escribiendo */}
              {isTyping && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-sm text-white font-bold">
                    🤠
                  </div>
                  <div className="bg-slate-100 text-slate-500 px-4 py-2.5 rounded-2xl rounded-tl-none flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce" />
                    <span className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <span className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              )}

              {/* Chips de Respuestas Rápidas */}
              {options.length > 0 && (
                <div className="pl-11 pt-1 space-y-1.5">
                  <div className="flex flex-wrap gap-2">
                    {options.map((opt, i) => (
                      <button
                        key={i}
                        onClick={() => handleSendMessage(null, opt.value)}
                        className={`text-xs font-semibold px-3.5 py-2 rounded-xl transition border shadow-sm ${
                          opt.value === 'SI_INEA'
                            ? 'bg-purple-600 hover:bg-purple-700 text-white border-purple-600 animate-pulse font-bold'
                            : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200 hover:border-emerald-500'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Vacantes Afines Desplegadas en el Chat */}
              {activeSession.matchedJobs && activeSession.matchedJobs.length > 0 && (
                <div className="pl-11 pt-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span>Vacantes Recomendadas para ti en Nuevo León</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {activeSession.matchedJobs.map((job) => (
                      <div
                        key={job.id}
                        className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-emerald-500 shadow-sm transition space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-wide">
                              {job.empresa_nombre}
                            </span>
                            <h4 className="text-xs font-bold text-slate-900 leading-tight">
                              {job.titulo}
                            </h4>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-xs font-black text-emerald-600">
                              ${job.sueldo_semanal_libre.toLocaleString('es-MX')}
                            </span>
                            <span className="text-[9px] text-slate-400 block">/sem</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1.5 text-[10px]">
                          <span className="flex items-center gap-1 bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">
                            <MapPin className="w-3 h-3 text-sky-500" />
                            {job.municipio} ({job.distancia_km} km)
                          </span>
                          <span className="flex items-center gap-1 bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">
                            <Clock className="w-3 h-3 text-amber-500" />
                            ~{job.tiempo_traslado_min} min
                          </span>
                          {job.apoyo_inea && (
                            <span className="flex items-center gap-1 bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-bold">
                              <GraduationCap className="w-3 h-3" />
                              Aula INEA
                            </span>
                          )}
                        </div>

                        <button className="w-full text-center py-1.5 bg-slate-900 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition">
                          Postularme de Volada
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* BARRA INFERIOR DE INPUT FLOTANTE (ChatGPT / Gemini Style) */}
        <div className="p-4 bg-gradient-to-t from-white via-white to-transparent">
          <div className="max-w-3xl mx-auto">
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
                placeholder="Escribe tu mensaje a Chambachat..."
                className="w-full py-3.5 pl-4 pr-12 text-sm text-slate-800 bg-transparent focus:outline-none placeholder-slate-400"
              />

              <button
                type="submit"
                disabled={!inputMessage.trim()}
                className="absolute right-2.5 p-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-30 text-white transition shadow-sm"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
            </form>

            <p className="text-[11px] text-center text-slate-400 mt-2 font-medium">
              Chambachat te conecta con plantas de manufactura y programas de acreditación oficial en Nuevo León.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
