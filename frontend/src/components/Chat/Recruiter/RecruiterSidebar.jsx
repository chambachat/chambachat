import React, { useState } from 'react';
import { X, Search, Building2, User, ChevronRight, Settings, Headset, MessageSquare, Star, Ban, Info } from 'lucide-react';
import { unreadCount, lastMessage, initials } from '../../../services/recruiterChat';
import { formatBackendTime } from '../../../services/directChat';

function statusClass(status) {
  if (status === 'Contactado') return 'bg-emerald-100 text-emerald-800';
  if (status === 'En Proceso') return 'bg-blue-100 text-blue-800';
  if (status === 'Contratado') return 'bg-violet-100 text-violet-800';
  return 'bg-amber-100 text-amber-800';
}

function CandidateRow({ app, isActive, onSelect }) {
  const unread = unreadCount(app);
  const last = lastMessage(app);
  return (
    <button
      type="button"
      onClick={() => onSelect(app)}
      className={`w-full text-left flex items-start gap-2.5 px-3 py-2.5 rounded-xl transition ${
        isActive ? 'bg-slate-200/70' : 'hover:bg-slate-200/40'
      }`}
    >
      <div className="w-9 h-9 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-black flex items-center justify-center shrink-0">
        {initials(app.candidate_name)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className={`flex items-center gap-1 min-w-0 text-xs ${unread ? 'font-black text-slate-900' : 'font-bold text-slate-800'}`}>
            <span className="truncate">{app.candidate_name}</span>
            {app.favorite_id && <Star className="w-3 h-3 text-amber-500 shrink-0" fill="currentColor" />}
            {app.blocked_by_company && <Ban className="w-3 h-3 text-rose-500 shrink-0" title="Bloqueado por tu empresa" />}
          </span>
          <span className="text-[10px] text-slate-400 shrink-0">{last ? formatBackendTime(last.created_at) : ''}</span>
        </div>
        <span className="text-[11px] text-emerald-700 font-semibold block truncate">{app.job_titulo}</span>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <span className={`text-[11px] truncate ${unread ? 'text-slate-800 font-semibold' : 'text-slate-500'}`}>
            {last ? `${last.sender_type === 'recruiter' ? 'Tú: ' : ''}${last.mensaje}` : 'Sin mensajes'}
          </span>
          {unread > 0 ? (
            <span className="shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-600 text-white text-[10px] font-extrabold flex items-center justify-center">
              {unread > 9 ? '9+' : unread}
            </span>
          ) : (
            <span className={`shrink-0 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full ${statusClass(app.status)}`}>{app.status}</span>
          )}
        </div>
      </div>
    </button>
  );
}

/** Bandeja de candidatos de la empresa dentro del chat (estilo mensajería). */
export default function RecruiterSidebar({
  applications,
  loading,
  selectedId,
  onSelect,
  sidebarOpen,
  onToggleSidebar,
  currentUser,
  onOpenEmpresa,
  onOpenPerfil,
  onOpenAdmin,
  onSwitchToCandidate
}) {
  const [q, setQ] = useState('');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const term = q.trim().toLowerCase();
  const filtered = applications.filter(a =>
    (!onlyFavorites || a.favorite_id) &&
    (!term || a.candidate_name?.toLowerCase().includes(term) || a.job_titulo?.toLowerCase().includes(term) || a.empresa_nombre?.toLowerCase().includes(term))
  );
  const favoritesCount = applications.filter(a => a.favorite_id).length;
  const totalUnread = applications.reduce((n, a) => n + unreadCount(a), 0);
  const closeOnMobile = () => { if (typeof window !== 'undefined' && window.innerWidth < 768) onToggleSidebar(); };

  return (
    <>
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-[88vw] max-w-sm md:w-80 bg-[#f9fafb] border-r border-slate-200 flex flex-col transition-all duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:w-0 md:border-none md:overflow-hidden'
        }`}
      >
        <div className="p-3.5 border-b border-slate-200/80 shrink-0 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Headset className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="text-sm font-black text-slate-900">Candidatos</span>
              {totalUnread > 0 && (
                <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-600 text-white text-[10px] font-extrabold flex items-center justify-center">{totalUnread}</span>
              )}
            </div>
            <span className="text-[11px] text-slate-500 block truncate">{currentUser?.empresa_nombre || currentUser?.company_name || 'Tu empresa'}</span>
          </div>
          <button onClick={onToggleSidebar} className="md:hidden p-2 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-3 pt-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar candidato o vacante..."
              className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="px-3 pt-2 flex items-center gap-1.5">
          <button type="button" onClick={() => setOnlyFavorites(false)} className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${!onlyFavorites ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
            Todos
          </button>
          <button type="button" onClick={() => setOnlyFavorites(true)} className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${onlyFavorites ? 'bg-amber-400 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-amber-50'}`}>
            <Star className="w-3 h-3" fill={onlyFavorites ? 'currentColor' : 'none'} />
            <span>Preferidos{favoritesCount ? ` (${favoritesCount})` : ''}</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1.5 block">Tus conversaciones</span>
          {loading ? (
            <div className="py-10 text-center text-xs text-slate-400">Cargando candidatos...</div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400 space-y-2 px-4">
              <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
              <p>{applications.length === 0 ? 'Aún no hay postulaciones. Cuando un candidato abra el chat directo de tu vacante aparecerá aquí.' : onlyFavorites ? 'Aún no marcas candidatos preferidos: usa la ⭐ en su chat.' : 'Sin coincidencias.'}</p>
            </div>
          ) : (
            filtered.map(app => (
              <CandidateRow key={app.id} app={app} isActive={app.id === selectedId} onSelect={(a) => { onSelect(a); closeOnMobile(); }} />
            ))
          )}
        </div>

        <div className="p-3 border-t border-slate-200 bg-white/70 space-y-2 shrink-0">
          {currentUser && (
            <div onClick={onOpenPerfil} className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-2.5 cursor-pointer hover:opacity-85 transition min-w-0" title="Ver mi perfil">
              <img src={currentUser.avatar_url} alt={currentUser.name} className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-300 shrink-0 object-cover" />
              <div className="truncate min-w-0">
                <span className="text-xs font-bold text-slate-900 block truncate">{currentUser.name}</span>
                <span className="text-[10px] text-slate-500 block truncate">{currentUser.email}</span>
              </div>
            </div>
          )}

          <button
            onClick={() => { closeOnMobile(); onOpenEmpresa(); }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-slate-800 hover:bg-emerald-50 hover:text-emerald-800 transition border border-transparent hover:border-emerald-200"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600"><Building2 className="w-4 h-4" /></div>
              <div className="text-left">
                <span className="block leading-none">Portal Empresa</span>
                <span className="text-[10px] text-slate-400 font-normal">Vacantes, equipo y rutas</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>

          {onSwitchToCandidate && (
            <button
              onClick={() => { closeOnMobile(); onSwitchToCandidate(); }}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              <User className="w-3.5 h-3.5 text-slate-500" />
              <span>Ver el chat de empleo como candidato</span>
            </button>
          )}

          <a
            href="/web"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center gap-2 px-3 py-1 text-xs text-slate-400 hover:text-slate-600 transition"
          >
            <Info className="w-3 h-3" />
            <span className="text-[11px]">Acerca de ChambaChat</span>
          </a>

          {currentUser?.role === 'admin' && (
            <button onClick={() => { closeOnMobile(); onOpenAdmin(); }} className="w-full flex items-center gap-2 px-3 py-1 text-xs text-slate-400 hover:text-slate-600 transition">
              <Settings className="w-3 h-3" />
              <span className="text-[11px]">Admin Flujos</span>
            </button>
          )}
        </div>
      </aside>

      {sidebarOpen && (
        <div onClick={onToggleSidebar} className="fixed inset-0 bg-slate-900/30 z-30 md:hidden backdrop-blur-sm" />
      )}
    </>
  );
}
