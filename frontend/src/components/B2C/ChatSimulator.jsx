import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  RotateCcw, 
  GraduationCap, 
  MapPin, 
  Clock, 
  DollarSign, 
  Building2, 
  Sparkles, 
  CheckCircle,
  Smartphone,
  ShieldCheck,
  Award
} from 'lucide-react';
import { startChat, sendChatMessage } from '../../services/api';

export default function ChatSimulator() {
  const [sessionId, setSessionId] = useState('');
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [options, setOptions] = useState([]);
  const [matchedJobs, setMatchedJobs] = useState([]);
  const [candidateProfile, setCandidateProfile] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [completed, setCompleted] = useState(false);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Inicializar chat
  const initChat = async () => {
    setIsTyping(true);
    setMessages([]);
    setMatchedJobs([]);
    setCandidateProfile(null);
    setCompleted(false);
    setInputText('');

    try {
      const res = await startChat();
      setSessionId(res.session_id);
      
      setTimeout(() => {
        setIsTyping(false);
        setMessages(
          res.bot_messages.map((text) => ({
            id: Math.random(),
            sender: 'bot',
            text,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }))
        );
        setOptions(res.options || []);
      }, 500);
    } catch (err) {
      console.error('Error al iniciar el chat:', err);
      setIsTyping(false);
    }
  };

  useEffect(() => {
    initChat();
  }, []);

  const handleSend = async (textToSend, optionVal = null) => {
    const text = textToSend || inputText;
    if (!text && !optionVal) return;

    // Agregar mensaje del usuario
    const userMsg = {
      id: Math.random(),
      sender: 'user',
      text: optionVal ? (options.find(o => o.value === optionVal)?.label || optionVal) : text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setOptions([]);
    setIsTyping(true);

    try {
      const res = await sendChatMessage({
        sessionId,
        message: optionVal ? null : text,
        selectedOption: optionVal,
      });

      setTimeout(() => {
        setIsTyping(false);
        const newBotMsgs = res.bot_messages.map((m) => ({
          id: Math.random(),
          sender: 'bot',
          text: m,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }));
        setMessages((prev) => [...prev, ...newBotMsgs]);
        setOptions(res.options || []);
        
        if (res.completed) {
          setCompleted(true);
          setMatchedJobs(res.matched_jobs || []);
          setCandidateProfile(res.candidate_profile || null);
        }
      }, 650);
    } catch (err) {
      console.error('Error enviando mensaje:', err);
      setIsTyping(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs tracking-wider uppercase mb-1">
            <Smartphone className="w-4 h-4" />
            <span>Módulo B2C · Onboarding Operativo Inteligente</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Simulador de Chatbot Regiomontano
          </h1>
          <p className="text-sm text-slate-400 max-w-2xl mt-1">
            Flujo conversacional optimizado para WhatsApp: perfila operarios de manufactura, detecta rezago educativo en tiempo real e inyecta la canalización al programa INEA antes del matchmaking de vacantes.
          </p>
        </div>

        <button
          onClick={initChat}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 transition shadow-sm w-fit"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reiniciar Conversación
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Simulador Smartphone (7 cols) */}
        <div className="lg:col-span-7 flex justify-center">
          <div className="w-full max-w-[430px] bg-slate-950 rounded-[40px] border-[6px] border-slate-800 shadow-2xl overflow-hidden flex flex-col h-[700px] relative">
            {/* Speaker / Camera Notch */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-32 h-4 bg-slate-900 rounded-full z-20 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-slate-950 border border-slate-800" />
            </div>

            {/* Smartphone Header (WhatsApp style) */}
            <div className="bg-[#121b22] px-4 pt-8 pb-3 border-b border-slate-800/80 flex items-center justify-between text-white z-10">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <img
                    src="/chambot.png"
                    alt="Chambot"
                    className="w-10 h-10 rounded-full bg-emerald-800 p-0.5 object-contain shadow"
                  />
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 rounded-full border-2 border-slate-950" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-bold leading-none">Chambachat NL</h3>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <p className="text-[11px] text-emerald-400/90 font-medium mt-0.5">En línea · Reclutamiento Monterrey</p>
                </div>
              </div>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                Bot Oficial
              </span>
            </div>

            {/* Chat Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0b141a] relative">
              {/* WhatsApp background wallpaper subtle pattern */}
              <div className="text-center my-1">
                <span className="text-[10px] bg-slate-800/70 text-slate-400 px-3 py-1 rounded-md border border-slate-700/50">
                  🔒 Mensajes cifrados con protección laboral
                </span>
              </div>

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-md ${
                      msg.sender === 'user'
                        ? 'bg-emerald-700 text-white rounded-br-none'
                        : 'bg-[#1f2c34] text-slate-100 rounded-bl-none border border-slate-700/40'
                    }`}
                  >
                    {/* Alerta si es mensaje de INEA */}
                    {msg.text.includes('INEA') && msg.sender === 'bot' && (
                      <div className="flex items-center gap-1 text-[11px] font-bold text-amber-300 mb-1 bg-amber-500/20 px-2 py-0.5 rounded w-fit">
                        <GraduationCap className="w-3 h-3" />
                        Oportunidad de Certificación Oficial
                      </div>
                    )}
                    <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                    <span className="text-[10px] text-slate-400 block text-right mt-1 font-mono">
                      {msg.time}
                    </span>
                  </div>
                </div>
              ))}

              {/* Bot escribiendo */}
              {isTyping && (
                <div className="flex items-center gap-2 bg-[#1f2c34] text-slate-400 px-4 py-2.5 rounded-2xl rounded-bl-none w-fit border border-slate-700/40">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              )}

              {/* Quick Reply Chips (Opciones rápidas) */}
              {options.length > 0 && (
                <div className="pt-2 space-y-1.5">
                  <p className="text-[11px] text-slate-400 font-bold px-1">Selecciona una respuesta:</p>
                  <div className="flex flex-wrap gap-2">
                    {options.map((opt, i) => (
                      <button
                        key={i}
                        onClick={() => handleSend(null, opt.value)}
                        className={`text-xs font-semibold px-3 py-2 rounded-xl transition border shadow-sm ${
                          opt.value === 'SI_INEA'
                            ? 'bg-purple-600 hover:bg-purple-500 text-white border-purple-400 animate-pulse'
                            : 'bg-[#1f2c34] hover:bg-slate-700 text-emerald-300 border-slate-700'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="p-3 bg-[#121b22] border-t border-slate-800 flex items-center gap-2"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Escribe tu respuesta..."
                disabled={completed}
                className="flex-1 bg-[#1f2c34] text-white text-xs px-4 py-3 rounded-full border border-slate-700 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || completed}
                className="w-10 h-10 rounded-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:hover:bg-emerald-500 text-slate-950 flex items-center justify-center transition shadow"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Panel de Matchmaking & Perfil Generado (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Perfil del Operario Registrado */}
          {candidateProfile && (
            <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 shadow-xl">
              <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Perfil Operario Registrado
                </span>
                <span className="flex items-center gap-1 text-xs font-bold text-emerald-400">
                  <CheckCircle className="w-3.5 h-3.5" /> Registrado en PostgreSQL
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block">Nombre:</span>
                  <span className="font-bold text-white text-sm">{candidateProfile.nombre}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Municipio:</span>
                  <span className="font-bold text-white text-sm">{candidateProfile.municipio}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Nivel Educativo:</span>
                  <span className="font-bold text-slate-200">{candidateProfile.nivel_educativo}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Canalizado INEA:</span>
                  <span className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded text-[11px] ${
                    candidateProfile.tag_inea 
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' 
                      : 'bg-slate-800 text-slate-400'
                  }`}>
                    {candidateProfile.tag_inea ? '✅ tag_inea = TRUE' : '❌ tag_inea = FALSE'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Vacantes Afines Encontradas */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                Vacantes Cercanas (Matchmaking Geoespacial)
              </h2>
              {matchedJobs.length > 0 && (
                <span className="text-xs text-slate-400 font-semibold">
                  {matchedJobs.length} encontradas
                </span>
              )}
            </div>

            {matchedJobs.length === 0 ? (
              <div className="bg-slate-900/60 rounded-2xl p-8 border border-slate-800/80 text-center text-slate-400">
                <Building2 className="w-10 h-10 mx-auto text-slate-600 mb-3" />
                <p className="text-sm font-semibold text-slate-300">Esperando datos del operario...</p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Completa el flujo en el smartphone simulado a la izquierda para ver el match automático con las plantas de Nuevo León.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {matchedJobs.map((job) => (
                  <div
                    key={job.id}
                    className="bg-slate-900 rounded-xl p-4 border border-slate-800 hover:border-emerald-500/40 transition shadow-lg space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wide">
                          {job.empresa_nombre}
                        </span>
                        <h3 className="text-sm font-bold text-white leading-tight mt-0.5">
                          {job.titulo}
                        </h3>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-extrabold text-emerald-400 block">
                          ${job.sueldo_semanal_libre.toLocaleString('es-MX')}
                        </span>
                        <span className="text-[10px] text-slate-400">libre/sem</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 text-[11px]">
                      <span className="flex items-center gap-1 bg-slate-800/80 text-slate-300 px-2 py-0.5 rounded font-medium">
                        <MapPin className="w-3 h-3 text-sky-400" />
                        {job.municipio} ({job.distancia_km} km)
                      </span>
                      <span className="flex items-center gap-1 bg-slate-800/80 text-slate-300 px-2 py-0.5 rounded font-medium">
                        <Clock className="w-3 h-3 text-amber-400" />
                        ~{job.tiempo_traslado_min} min de viaje
                      </span>
                      {job.apoyo_inea && (
                        <span className="flex items-center gap-1 bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded font-bold border border-purple-500/30">
                          <GraduationCap className="w-3 h-3" />
                          Apoyo INEA
                        </span>
                      )}
                      {job.turnos_fijos && (
                        <span className="bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded font-semibold">
                          Turno Fijo
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-400 line-clamp-2">
                      {job.descripcion}
                    </p>

                    <div className="pt-1 flex items-center justify-between border-t border-slate-800/80">
                      <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                        <Award className="w-3.5 h-3.5" /> Match: {job.match_score}%
                      </span>
                      <button className="text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition">
                        Postular Candidato
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
