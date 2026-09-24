import React, { useState } from 'react';
import { Users, Search, Building2 } from 'lucide-react';

function scoreBadgeClass(score) {
  if (score >= 85) return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
  if (score >= 75) return 'bg-blue-100 text-blue-800 border border-blue-200';
  return 'bg-amber-100 text-amber-800 border border-amber-200';
}

function ApplicationCard({ app, isSelected, onSelect }) {
  const lastMessage = app.messages?.[app.messages.length - 1];
  const score = app.match_score ?? null;

  return (
    <div
      onClick={() => onSelect(app)}
      className={`p-3.5 rounded-2xl border text-left cursor-pointer transition space-y-2 ${
        isSelected
          ? 'bg-emerald-50/70 border-emerald-300 shadow-sm'
          : 'bg-white border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/70'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="text-xs font-black text-slate-900">{app.candidate_name}</h4>
          <span className="text-[11px] font-semibold text-emerald-700 block">{app.job_titulo}</span>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 shrink-0">
          {app.status}
        </span>
      </div>

      <div className="flex items-center gap-2 pt-0.5">
        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1 ${scoreBadgeClass(score ?? 0)}`}>
          ⚡ {score !== null ? `${score}%` : 'N/D'} {app.match_level ? `· ${app.match_level}` : 'estimado'}
        </span>
        <span className="text-[10px] text-slate-500 font-medium">📍 {app.municipio || 'Apodaca'}</span>
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
}

export default function ApplicationsList({ applications, loading, selectedApp, onSelect }) {
  const [searchTerm, setSearchTerm] = useState('');

  const q = searchTerm.toLowerCase();
  const filteredApps = applications.filter(app =>
    app.candidate_name.toLowerCase().includes(q) ||
    (app.job_titulo && app.job_titulo.toLowerCase().includes(q)) ||
    (app.empresa_nombre && app.empresa_nombre.toLowerCase().includes(q))
  );

  return (
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
          filteredApps.map((app) => (
            <ApplicationCard
              key={app.id}
              app={app}
              isSelected={selectedApp?.id === app.id}
              onSelect={onSelect}
            />
          ))
        )}
      </div>
    </div>
  );
}
