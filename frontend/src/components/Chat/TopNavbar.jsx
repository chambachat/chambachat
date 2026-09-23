import React from 'react';
import { Menu, User } from 'lucide-react';

export default function TopNavbar({ 
  currentUser, 
  onOpenPerfil, 
  onLogin, 
  sidebarOpen, 
  setSidebarOpen 
}) {
  return (
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
            src="/globoch.png"
            alt="ChambaChat"
            className="h-8 sm:h-9 w-8 sm:w-9 object-contain shrink-0"
          />
          <span className="font-brand text-lg brand-navy truncate">
            Chamba<span className="brand-green">Chat</span>
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {!currentUser ? (
          <button
            type="button"
            onClick={onLogin}
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
  );
}
