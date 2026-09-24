import React from 'react';
import { Plus, X, MessageSquare, Trash2, Building2, User, ChevronRight, Settings, Headset } from 'lucide-react';
import { useToast } from '../ui/Toast';

export default function ChatSidebar({
  sessions,
  activeSessionId,
  sidebarOpen,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  onClearAll,
  onToggleSidebar,
  currentUser,
  onOpenEmpresa,
  onOpenPerfil,
  onOpenAdmin,
  setIsAuthModalOpen,
  onSwitchToRecruiter
}) {
  const toast = useToast();
  return (
    <>
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-72 bg-[#f9fafb] border-r border-slate-200 flex flex-col transition-all duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:w-0 md:border-none md:overflow-hidden'
        }`}
      >
        <div className="p-3.5 flex items-center justify-between border-b border-slate-200/80 shrink-0">
          <button
            onClick={onNewSession}
            className="flex-1 flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-semibold text-xs border border-slate-200 shadow-sm transition group"
          >
            <Plus className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
            <span>Nuevo chat</span>
          </button>
          <button
            onClick={onToggleSidebar}
            className="md:hidden p-2 text-slate-400 hover:text-slate-600 rounded-lg ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <div className="flex items-center justify-between px-3 py-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Tus conversaciones
            </span>
            {sessions.length > 1 && (
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  if (await toast.confirm('¿Deseas eliminar todo tu historial de conversaciones?')) onClearAll();
                }}
                className="text-[10px] text-slate-400 hover:text-rose-600 font-bold transition"
                title="Borrar todo el historial"
              >
                Vaciar
              </button>
            )}
          </div>
          {sessions.map((sess) => {
            const isActive = sess.id === activeSessionId;
            return (
              <div
                key={sess.id}
                onClick={() => onSelectSession(sess)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs cursor-pointer transition ${
                  isActive
                    ? 'bg-slate-200/70 text-slate-900 font-bold'
                    : 'text-slate-600 hover:bg-slate-200/40 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate flex-1 mr-1 min-w-0">
                  {sess.kind === 'direct' ? (
                    <Headset className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-blue-600' : 'text-blue-400'}`} title="Chat directo con reclutadores" />
                  ) : (
                    <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                  )}
                  <div className="min-w-0 truncate">
                    <span className="truncate block">{sess.title}</span>
                    {sess.kind === 'direct' && (
                      <span className="text-[9px] uppercase tracking-wider font-extrabold text-blue-600 block leading-none mt-0.5">Directo con reclutador</span>
                    )}
                  </div>
                  {sess.unread > 0 && (
                    <span className="ml-auto shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-blue-600 text-white text-[10px] font-extrabold flex items-center justify-center">
                      {sess.unread > 9 ? '9+' : sess.unread}
                    </span>
                  )}
                </div>
                <button
                  onClick={(e) => onDeleteSession(e, sess.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition shrink-0"
                  title="Eliminar este chat"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>

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

          {onSwitchToRecruiter && (
            <button
              onClick={() => {
                if (typeof window !== 'undefined' && window.innerWidth < 768) onToggleSidebar();
                onSwitchToRecruiter();
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-blue-900 bg-blue-50 hover:bg-blue-100 transition border border-blue-200"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-blue-600/10 text-blue-700">
                  <Headset className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <span className="block leading-none">Mis candidatos</span>
                  <span className="text-[10px] text-blue-700/70 font-normal">Volver al chat de empresa</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-blue-400" />
            </button>
          )}

          <button
            onClick={() => {
              if (typeof window !== 'undefined' && window.innerWidth < 768) onToggleSidebar();
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
              if (typeof window !== 'undefined' && window.innerWidth < 768) onToggleSidebar();
              onOpenPerfil();
            }}
            className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
          >
            <div className="flex items-center gap-2.5">
              <User className="w-3.5 h-3.5 text-slate-500" />
              <span>Mi Perfil Guardado</span>
            </div>
          </button>

          {currentUser?.role === 'admin' && (
            <button
              onClick={() => {
                if (typeof window !== 'undefined' && window.innerWidth < 768) onToggleSidebar();
                onOpenAdmin();
              }}
              className="w-full flex items-center gap-2 px-3 py-1 text-xs text-slate-400 hover:text-slate-600 transition"
            >
              <Settings className="w-3 h-3" />
              <span className="text-[11px]">Admin Flujos</span>
            </button>
          )}
        </div>
      </aside>

      {sidebarOpen && (
        <div
          onClick={onToggleSidebar}
          className="fixed inset-0 bg-slate-900/30 z-30 md:hidden backdrop-blur-sm"
        />
      )}
    </>
  );
}
