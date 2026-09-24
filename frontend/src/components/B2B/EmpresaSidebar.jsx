import React from 'react';
import { X, Building2, ShieldCheck, ChevronRight, ArrowLeft, LogOut } from 'lucide-react';

function ActivePlantCard({ currentUser, onManage }) {
  const hasCompany = Boolean(currentUser?.empresa_nombre);
  return (
    <div className={`p-3 mx-3 my-3 rounded-2xl border transition ${
      hasCompany ? 'bg-gradient-to-r from-emerald-50/70 to-teal-50/40 border-emerald-200/80' : 'bg-amber-50/70 border-amber-200/80'
    }`}>
      <div className="flex items-center justify-between gap-1 mb-1">
        <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${hasCompany ? 'text-emerald-700' : 'text-amber-800'}`}>
          <Building2 className="w-3.5 h-3.5" />
          <span>Empresa / Planta</span>
        </div>
        {hasCompany ? (
          <span className="text-[9px] font-extrabold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
            <ShieldCheck className="w-2.5 h-2.5" />
            <span>SAT</span>
          </span>
        ) : (
          <span className="text-[9px] font-extrabold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full">Pendiente</span>
        )}
      </div>
      <span className="text-xs font-black text-slate-900 block truncate">
        {currentUser?.empresa_nombre || 'Sin empresa dada de alta'}
      </span>
      <button
        type="button"
        onClick={onManage}
        className={`mt-1.5 text-[10px] font-bold hover:underline flex items-center gap-1 ${
          hasCompany ? 'text-emerald-700 hover:text-emerald-800' : 'text-amber-800 hover:text-amber-900'
        }`}
      >
        <span>{hasCompany ? 'Administrar plantas y equipo' : 'Subir Constancia Fiscal (CSF)'}</span>
        <ChevronRight className="w-3 h-3" />
      </button>
    </div>
  );
}

export default function EmpresaSidebar({ open, onClose, currentUser, tabs, activeTab, onSelectTab, onBackToChat, onLogout }) {
  const select = (tabId) => {
    onSelectTab(tabId);
    onClose();
  };

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 md:static md:h-screen md:shrink-0 md:translate-x-0 ${
        open ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img src="/globoch.png" alt="ChambaChat" className="h-9 w-9 object-contain" />
          <div>
            <span className="font-brand text-base brand-navy block leading-tight">Chamba<span className="brand-green">Chat</span></span>
            <span className="text-[10px] text-emerald-700 font-extrabold uppercase tracking-wider bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
              B2B Reclutamiento
            </span>
          </div>
        </div>
        <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700 md:hidden rounded-lg">
          <X className="w-5 h-5" />
        </button>
      </div>

      <ActivePlantCard currentUser={currentUser} onManage={() => select('team')} />

      <div className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        <span className="text-[10px] font-bold text-slate-400 px-3 uppercase tracking-wider block mb-1">Módulos del Portal</span>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => select(tab.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition group ${
                isActive ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20 font-black' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-700'}`} />
                <span className="truncate">{tab.label}</span>
              </div>
              {tab.badge && (
                <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-wider shrink-0 ${
                  isActive ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="p-3 border-t border-slate-200 bg-white space-y-2 shrink-0">
        <button onClick={onBackToChat} className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition group">
          <div className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4 text-emerald-600 group-hover:-translate-x-0.5 transition-transform" />
            <span>Chat con candidatos</span>
          </div>
          <span className="text-[10px] text-slate-400 font-normal">Mensajes y postulaciones</span>
        </button>

        {currentUser && (
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <img src={currentUser.avatar_url} alt={currentUser.name} className="w-8 h-8 rounded-full bg-slate-100 border border-emerald-300 object-cover shrink-0" />
              <div className="min-w-0 truncate">
                <span className="text-xs font-bold text-slate-900 block truncate">{currentUser.name}</span>
                <span className="text-[10px] text-slate-400 block truncate">{currentUser.email}</span>
              </div>
            </div>
            <button type="button" onClick={onLogout} className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition shrink-0" title="Cerrar sesión">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
