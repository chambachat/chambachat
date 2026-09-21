import React from 'react';
import { Phone, Clock, ExternalLink, Sparkles } from 'lucide-react';

function WhatsAppButton({ app }) {
  if (!app.candidate_phone) {
    return (
      <div className="text-[11px] text-amber-700 bg-amber-50 px-2.5 py-1.5 rounded-xl border border-amber-200 flex items-center gap-1.5 shrink-0">
        <Clock className="w-3.5 h-3.5 text-amber-600" />
        <span>Sin WhatsApp (contacto por este chat)</span>
      </div>
    );
  }
  const phone = app.candidate_phone.replace(/\D/g, '');
  const text = encodeURIComponent(
    `Hola ${app.candidate_name}, te escribo de ${app.empresa_nombre} respecto a tu postulación para ${app.job_titulo}. ¿Podrías agendar llamada hoy?`
  );
  return (
    <a
      href={`https://wa.me/52${phone}?text=${text}`}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm shrink-0"
    >
      <Phone className="w-3.5 h-3.5" />
      <span>WhatsApp ({app.candidate_phone})</span>
      <ExternalLink className="w-3 h-3 ml-0.5 opacity-70" />
    </a>
  );
}

function MatchScoreBar({ app }) {
  const score = app.match_score;
  return (
    <div className="bg-white rounded-xl p-3 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-black text-slate-800" title="Estimación heurística por municipio, teléfono y turnos. No es una evaluación de IA.">
            Afinidad estimada:
          </span>
          <span className={`text-xs font-black px-2.5 py-0.5 rounded-lg ${(score ?? 0) >= 85 ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white'}`}>
            ⚡ {score != null ? `${score}%` : 'N/D'}
          </span>
        </div>
        <div className="w-24 sm:w-28 bg-slate-100 rounded-full h-2 overflow-hidden">
          <div className="bg-emerald-500 h-2 rounded-full transition-all duration-500" style={{ width: `${score ?? 0}%` }} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1 text-[10px]">
        <span className="bg-slate-50 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-md font-medium">📍 {app.municipio || 'Apodaca'}</span>
        <span className="bg-slate-50 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-md font-medium">⏱️ Turno Compatible</span>
        <span className="bg-slate-50 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-md font-medium">💼 Perfil Calificado</span>
      </div>
    </div>
  );
}

function BotControls({ app, loading, onToggleBot, onForceBotFallback }) {
  return (
    <div className="p-3 rounded-xl bg-slate-100/90 border border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
      <div className="flex items-center gap-2">
        <img src="/chambot.png" alt="Chambot" className="w-5 h-5 rounded-full object-contain p-0.5 bg-emerald-100 border border-emerald-300 shrink-0" />
        <div>
          <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
            <span>Chat Grupal: Candidato + Reclutador + Chambot</span>
          </span>
          <p className="text-[11px] text-slate-500">
            {app.bot_silenced ? (
              <span className="text-amber-700 font-semibold">🤫 Chambot silenciado (ya respondiste o pausaste al bot).</span>
            ) : (
              <span className="text-emerald-700 font-semibold">🤖 Chambot activo (responderá dudas si tardas más de 2 min).</span>
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          disabled={loading}
          onClick={() => onToggleBot(!app.bot_silenced)}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 ${
            app.bot_silenced
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
              : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
          }`}
          title={app.bot_silenced ? 'Activar Chambot para apoyo' : 'Silenciar Chambot'}
        >
          <span>{app.bot_silenced ? '🔔 Reactivar Chambot' : '🤫 Silenciar Bot'}</span>
        </button>

        <button
          type="button"
          disabled={loading || app.bot_silenced}
          onClick={onForceBotFallback}
          className="px-2.5 py-1.5 rounded-xl bg-slate-200/70 hover:bg-slate-300 text-slate-700 text-[11px] font-bold transition flex items-center gap-1"
          title="Simular que pasaron 2 min sin respuesta para que Chambot intervenga"
        >
          <Sparkles className="w-3 h-3 text-emerald-600" />
          <span className="hidden sm:inline">Probar Fallback (2 min)</span>
          <span className="sm:hidden">Test</span>
        </button>
      </div>
    </div>
  );
}

export default function ApplicationDetail({ app, botActionLoading, onToggleBot, onForceBotFallback }) {
  return (
    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col gap-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-black text-slate-900">{app.candidate_name}</h3>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">Postulante</span>
          </div>
          <p className="text-xs text-slate-600 font-medium mt-0.5">
            Vacante: <strong className="text-slate-800">{app.job_titulo}</strong> en {app.empresa_nombre}
          </p>
        </div>
        <WhatsAppButton app={app} />
      </div>

      <MatchScoreBar app={app} />
      <BotControls app={app} loading={botActionLoading} onToggleBot={onToggleBot} onForceBotFallback={onForceBotFallback} />
    </div>
  );
}
