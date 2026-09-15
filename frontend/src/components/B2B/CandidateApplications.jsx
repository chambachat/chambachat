import React, { useState, useEffect } from 'react';
import { 
  Users, 
  MessageSquare, 
  Phone, 
  Mail, 
  Clock, 
  CheckCircle2, 
  Send, 
  Briefcase, 
  Building2, 
  Search, 
  ExternalLink,
  ShieldCheck,
  Copy,
  Sparkles
} from 'lucide-react';
import { 
  getApplications, 
  sendRecruiterMessage, 
  toggleBotState, 
  checkBotFallback,
  getUserCompanies
} from '../../services/api';

export default function CandidateApplications({ currentUser }) {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [botActionLoading, setBotActionLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [recruiterName, setRecruiterName] = useState(
    currentUser?.name ? (currentUser.role === 'recruiter' ? currentUser.name : `Reclutador ${currentUser.name}`) : 'Reclutador Industrial'
  );
  const [selectedCompany, setSelectedCompany] = useState(
    currentUser?.empresa_nombre || currentUser?.company_name || ''
  );
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (currentUser?.name) {
      setRecruiterName(currentUser.role === 'recruiter' ? currentUser.name : `Reclutador ${currentUser.name}`);
    }
    if (currentUser?.empresa_nombre || currentUser?.company_name) {
      setSelectedCompany(currentUser.empresa_nombre || currentUser.company_name);
    }
  }, [currentUser]);

  const [companiesList, setCompaniesList] = useState([]);

  useEffect(() => {
    if (currentUser?.email) {
      getUserCompanies(currentUser.email)
        .then(data => {
          if (data && data.companies) {
            const names = data.companies.map(c => c.nombre);
            if (names.length > 0) {
              setCompaniesList(names);
              // Only override selectedCompany if it hasn't been set by currentUser props
              // or if it's not in the loaded list
              setSelectedCompany(prev => (prev && names.includes(prev)) ? prev : names[0]);
            }
          }
        })
        .catch(err => console.error("Error fetching companies:", err));
    }
  }, [currentUser?.email]);

  const originUrl = typeof window !== 'undefined' ? window.location.origin : 'https://chambachat.onrender.com';
  const smartLinkUrl = `${originUrl}/?empresa=${encodeURIComponent(selectedCompany)}`;

  const handleCopySmartLink = async () => {
    try {
      await navigator.clipboard.writeText(smartLinkUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error('Error al copiar enlace:', err);
    }
  };

  const loadData = async () => {
    try {
      const data = await getApplications();
      setApplications(data);
      if (data.length > 0 && !selectedApp) {
        setSelectedApp(data[0]);
      } else if (selectedApp) {
        const refreshed = data.find(a => a.id === selectedApp.id);
        if (refreshed) setSelectedApp(refreshed);
      }
    } catch (err) {
      console.error('Error cargando postulaciones:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 4000);
    return () => clearInterval(interval);
  }, [selectedApp?.id]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedApp) return;

    setSending(true);
    try {
      await sendRecruiterMessage(selectedApp.id, {
        senderType: 'recruiter',
        senderName: recruiterName || 'Equipo de Reclutamiento',
        mensaje: replyText.trim()
      });

      setReplyText('');
      await loadData();
    } catch (err) {
      console.error('Error enviando mensaje al candidato:', err);
    } finally {
      setSending(false);
    }
  };

  const handleToggleBot = async (silenced) => {
    if (!selectedApp) return;
    setBotActionLoading(true);
    try {
      await toggleBotState(selectedApp.id, silenced);
      await loadData();
    } catch (err) {
      console.error('Error toggling bot state:', err);
    } finally {
      setBotActionLoading(false);
    }
  };

  const handleForceBotFallback = async () => {
    if (!selectedApp) return;
    setBotActionLoading(true);
    try {
      await checkBotFallback(selectedApp.id, true);
      await loadData();
    } catch (err) {
      console.error('Error checking bot fallback:', err);
    } finally {
      setBotActionLoading(false);
    }
  };

  const filteredApps = applications.filter(app => {
    const q = searchTerm.toLowerCase();
    return (
      app.candidate_name.toLowerCase().includes(q) ||
      (app.job_titulo && app.job_titulo.toLowerCase().includes(q)) ||
      (app.empresa_nombre && app.empresa_nombre.toLowerCase().includes(q))
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-wider mb-1">
            <MessageSquare className="w-4 h-4" />
            <span>Centro de Contacto & Postulaciones</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Postulaciones y Mensajería con Candidatos
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl mt-1">
            Revisa las solicitudes de operarios recibidas en tiempo real por el chat y comunícate con ellos directamente en esta plataforma o por WhatsApp.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-white border border-slate-200 rounded-2xl px-4 py-2 text-right shadow-sm">
            <span className="text-xs text-slate-400 block font-medium">Postulaciones Activas</span>
            <span className="text-xl font-black text-emerald-600">{applications.length}</span>
          </div>
        </div>
      </div>

      {/* SECCIÓN SMART LINK: El Enlace Vivo de chambachat.md */}
      <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-white border border-emerald-200 rounded-3xl p-5 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-lg bg-emerald-600 text-white text-xs">⚡</span>
              <h2 className="text-sm font-black text-slate-900">El Enlace Vivo (Smart Link) para Campañas</h2>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-full border border-emerald-200">
                chambachat.md
              </span>
            </div>
            <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
              Sustituye flyers estáticos de Facebook y Canva. Comparte este enlace único con tus vacantes vigentes. Todo el tráfico de redes sociales entra al chat enfocado en tu planta.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <label className="text-xs font-bold text-slate-700">Empresa:</label>
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500 shadow-sm"
            >
              {companiesList.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
          <div className="flex-1 w-full bg-white border border-slate-200 rounded-2xl px-4 py-2 text-xs font-mono text-slate-600 truncate flex items-center gap-2 shadow-inner">
            <span className="text-emerald-600 font-bold">URL:</span>
            <span className="truncate">{smartLinkUrl}</span>
          </div>

          <button
            onClick={handleCopySmartLink}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm shrink-0"
          >
            {copied ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-white" />
                <span>¡Copiado al portapapeles!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copiar Smart Link</span>
              </>
            )}
          </button>

          <a
            href={smartLinkUrl}
            target="_blank"
            rel="noreferrer"
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-bold transition shadow-sm shrink-0"
          >
            <span>Ver como Candidato</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </a>
        </div>
      </div>

      {/* Panel Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-white border border-slate-200 rounded-3xl p-4 sm:p-6 shadow-sm min-h-[580px]">
        {/* Columna Izquierda: Lista de Postulaciones */}
        <div className="lg:col-span-5 border-b lg:border-b-0 lg:border-r border-slate-200 pr-0 lg:pr-6 space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Buscar candidato o puesto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition"
            />
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {loading ? (
              <div className="py-12 text-center text-xs text-slate-400">Cargando postulaciones...</div>
            ) : filteredApps.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 space-y-2">
                <Users className="w-8 h-8 text-slate-300 mx-auto" />
                <p>No hay postulaciones registradas aún.</p>
              </div>
            ) : (
              filteredApps.map((app) => {
                const isSelected = selectedApp?.id === app.id;
                const lastMessage = app.messages?.[app.messages.length - 1];
                const score = app.match_score || 85;

                return (
                  <div
                    key={app.id}
                    onClick={() => setSelectedApp(app)}
                    className={`p-3.5 rounded-2xl border text-left cursor-pointer transition space-y-2 ${
                      isSelected
                        ? 'bg-emerald-50/70 border-emerald-300 shadow-sm'
                        : 'bg-white border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/70'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-black text-slate-900">{app.candidate_name}</h4>
                        <span className="text-[11px] font-semibold text-emerald-700 block">
                          {app.job_titulo}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 shrink-0">
                        {app.status}
                      </span>
                    </div>

                    {/* Match Score Badge en lista */}
                    <div className="flex items-center gap-2 pt-0.5">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1 ${
                        score >= 85
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : score >= 75
                          ? 'bg-blue-100 text-blue-800 border border-blue-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}>
                        ⚡ {score}% Match IA
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">
                        📍 {app.municipio || 'Apodaca'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[10px] text-slate-400">
                      <span className="flex items-center gap-1 text-slate-600">
                        <Building2 className="w-3 h-3 text-slate-400" />
                        {app.empresa_nombre}
                      </span>
                      <span>•</span>
                      <span>{new Date(app.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    {lastMessage && (
                      <p className="text-[11px] text-slate-500 line-clamp-1 italic bg-white/80 px-2 py-1 rounded-lg border border-slate-100">
                        💬 {lastMessage.mensaje}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Columna Derecha: Chat y Detalle del Candidato Seleccionado */}
        <div className="lg:col-span-7 flex flex-col justify-between pl-0 lg:pl-2 space-y-4">
          {selectedApp ? (
            <>
              {/* Encabezado del Candidato con Match Score */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black text-slate-900">{selectedApp.candidate_name}</h3>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                        Postulante
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 font-medium mt-0.5">
                      Vacante: <strong className="text-slate-800">{selectedApp.job_titulo}</strong> en {selectedApp.empresa_nombre}
                    </p>
                  </div>

                  {/* Botón WhatsApp Directo */}
                  {selectedApp.candidate_phone ? (
                    <a
                      href={`https://wa.me/52${selectedApp.candidate_phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${selectedApp.candidate_name}, te escribo de ${selectedApp.empresa_nombre} respecto a tu postulación para ${selectedApp.job_titulo}. ¿Podrías agendar llamada hoy?`)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm shrink-0"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>WhatsApp ({selectedApp.candidate_phone})</span>
                      <ExternalLink className="w-3 h-3 ml-0.5 opacity-70" />
                    </a>
                  ) : (
                    <div className="text-[11px] text-amber-700 bg-amber-50 px-2.5 py-1.5 rounded-xl border border-amber-200 flex items-center gap-1.5 shrink-0">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      <span>Sin WhatsApp (contacto por este chat)</span>
                    </div>
                  )}
                </div>

                {/* Match Score Bar y Píldoras de Factores */}
                <div className="bg-white rounded-xl p-3 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-slate-800">Match Score IA:</span>
                      <span className={`text-xs font-black px-2.5 py-0.5 rounded-lg ${
                        (selectedApp.match_score || 85) >= 85
                          ? 'bg-emerald-600 text-white'
                          : 'bg-blue-600 text-white'
                      }`}>
                        ⚡ {selectedApp.match_score || 85}%
                      </span>
                    </div>

                    <div className="w-24 sm:w-28 bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${selectedApp.match_score || 85}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1 text-[10px]">
                    <span className="bg-slate-50 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-md font-medium">
                      📍 {selectedApp.municipio || 'Apodaca'}
                    </span>
                    <span className="bg-slate-50 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-md font-medium">
                      ⏱️ Turno Compatible
                    </span>
                    <span className="bg-slate-50 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-md font-medium">
                      💼 Perfil Calificado
                    </span>
                  </div>
                </div>

                {/* Control del Chat Grupal y Estado de Chambot */}
                <div className="p-3 rounded-xl bg-slate-100/90 border border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    <img 
                      src="/chambot.png" 
                      alt="Chambot" 
                      className="w-5 h-5 rounded-full object-contain p-0.5 bg-emerald-100 border border-emerald-300 shrink-0" 
                    />
                    <div>
                      <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                        <span>Chat Grupal: Candidato + Reclutador + Chambot</span>
                      </span>
                      <p className="text-[11px] text-slate-500">
                        {selectedApp.bot_silenced ? (
                          <span className="text-amber-700 font-semibold">
                            🤫 Chambot silenciado (ya respondiste o pausaste al bot).
                          </span>
                        ) : (
                          <span className="text-emerald-700 font-semibold">
                            🤖 Chambot activo (responderá dudas si tardas más de 2 min).
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={botActionLoading}
                      onClick={() => handleToggleBot(!selectedApp.bot_silenced)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 ${
                        selectedApp.bot_silenced
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
                      }`}
                      title={selectedApp.bot_silenced ? 'Activar Chambot para apoyo' : 'Silenciar Chambot'}
                    >
                      <span>{selectedApp.bot_silenced ? '🔔 Reactivar Chambot' : '🤫 Silenciar Bot'}</span>
                    </button>

                    <button
                      type="button"
                      disabled={botActionLoading || selectedApp.bot_silenced}
                      onClick={handleForceBotFallback}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-200/70 hover:bg-slate-300 text-slate-700 text-[11px] font-bold transition flex items-center gap-1"
                      title="Simular que pasaron 2 min sin respuesta para que Chambot intervenga"
                    >
                      <Sparkles className="w-3 h-3 text-emerald-600" />
                      <span className="hidden sm:inline">Probar Fallback (2 min)</span>
                      <span className="sm:hidden">Test</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Historial de Mensajes con el Candidato */}
              <div className="flex-1 min-h-[300px] max-h-[360px] overflow-y-auto space-y-3 p-3 bg-[#fafafa] rounded-2xl border border-slate-200/80">
                {selectedApp.messages && selectedApp.messages.length > 0 ? (
                  selectedApp.messages.map((m) => {
                    const isRecruiter = m.sender_type === 'recruiter';
                    const isBot = m.sender_type === 'bot';
                    const isSystem = m.sender_type === 'system';

                    if (isSystem) {
                      return (
                        <div key={m.id} className="text-center my-2">
                          <span className="text-[10px] bg-slate-200/70 text-slate-600 px-3 py-1 rounded-full border border-slate-300/50 inline-block font-medium">
                            {m.mensaje}
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${isRecruiter ? 'items-end' : 'items-start'}`}
                      >
                        <div className="flex items-center gap-1.5 mb-1 px-1">
                          {isBot && (
                            <img
                              src="/chambot.png"
                              alt="Chambot"
                              className="w-4 h-4 rounded-full object-contain p-0.5 bg-emerald-100 border border-emerald-300"
                            />
                          )}
                          <span className={`text-[10px] font-bold ${isBot ? 'text-emerald-700' : 'text-slate-400'}`}>
                            {isRecruiter 
                              ? `${m.sender_name} (Tú)` 
                              : isBot 
                              ? 'Chambot (Asistente IA)' 
                              : `${selectedApp.candidate_name} (Candidato)`}
                          </span>
                        </div>

                        <div
                          className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed shadow-sm ${
                            isRecruiter
                              ? 'bg-emerald-600 text-white rounded-tr-none'
                              : isBot
                              ? 'bg-emerald-50 text-emerald-950 border border-emerald-200 rounded-tl-none font-medium'
                              : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{m.mensaje}</p>
                          <span className={`text-[9px] block text-right mt-1 ${isRecruiter ? 'text-emerald-100' : 'text-slate-400'}`}>
                            {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-10 text-xs text-slate-400">
                    No hay mensajes en esta conversación aún. Escríbele al candidato abajo.
                  </div>
                )}
              </div>

              {/* Formulario para Enviar Mensaje al Candidato */}
              <form onSubmit={handleSendMessage} className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={recruiterName}
                    onChange={(e) => setRecruiterName(e.target.value)}
                    placeholder="Tu nombre o planta (ej. Reclutamiento DHL)"
                    className="w-48 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-emerald-500"
                  />
                  <span className="text-[11px] text-slate-400">Este mensaje le aparecerá de inmediato en su ventana de chat.</span>
                </div>

                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={`Escribe un mensaje a ${selectedApp.candidate_name}...`}
                    className="w-full py-3 pl-4 pr-24 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white shadow-sm transition"
                  />
                  <button
                    type="submit"
                    disabled={sending || !replyText.trim()}
                    className="absolute right-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-emerald-600 disabled:opacity-40 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                  >
                    <span>{sending ? 'Enviando...' : 'Enviar'}</span>
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
              <MessageSquare className="w-12 h-12 text-slate-300 mb-2" />
              <h3 className="text-sm font-bold text-slate-700">Selecciona una postulación</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Haz clic en cualquier candidato de la lista izquierda para comunicarte con él o contactarlo por WhatsApp.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
