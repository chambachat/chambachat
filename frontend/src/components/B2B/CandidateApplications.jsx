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
  ShieldCheck
} from 'lucide-react';
import { getApplications, sendRecruiterMessage } from '../../services/api';

export default function CandidateApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [recruiterName, setRecruiterName] = useState('Reclutador Whirlpool');

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
              {/* Encabezado del Candidato */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-slate-900">{selectedApp.candidate_name}</h3>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                      Postulante
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium">
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
                    <span>Sin WhatsApp registrado (contacto por este chat)</span>
                  </div>
                )}
              </div>

              {/* Historial de Mensajes con el Candidato */}
              <div className="flex-1 min-h-[300px] max-h-[360px] overflow-y-auto space-y-3 p-3 bg-[#fafafa] rounded-2xl border border-slate-200/80">
                {selectedApp.messages && selectedApp.messages.length > 0 ? (
                  selectedApp.messages.map((m) => {
                    const isRecruiter = m.sender_type === 'recruiter';
                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${isRecruiter ? 'items-end' : 'items-start'}`}
                      >
                        <span className="text-[10px] text-slate-400 font-bold mb-1 px-1">
                          {isRecruiter ? `${m.sender_name} (Tú)` : `${selectedApp.candidate_name} (Candidato)`}
                        </span>
                        <div
                          className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed shadow-sm ${
                            isRecruiter
                              ? 'bg-emerald-600 text-white rounded-tr-none'
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
