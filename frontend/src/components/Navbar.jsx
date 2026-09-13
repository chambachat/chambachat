import React from 'react';
import { MessageSquare, Calculator, Briefcase, Users, BarChart3, Settings2 } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab }) {
  const navItems = [
    { id: 'b2c-chat', label: 'Chatbot Operarios (B2C)', icon: MessageSquare, badge: 'WhatsApp' },
    { id: 'predictor', label: 'Predictor de Retención', icon: Calculator, badge: 'Modelo ML' },
    { id: 'jobs', label: 'Vacantes & Match', icon: Briefcase },
    { id: 'candidates', label: 'Operarios & INEA', icon: Users, badge: '100 perfiles' },
    { id: 'analytics', label: 'People Analytics', icon: BarChart3 },
    { id: 'admin-flow', label: 'Admin Flujos', icon: Settings2, badge: 'No-Code' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur border-b border-slate-800 shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('predictor')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-xl shadow-lg shadow-emerald-500/20">
              🤠
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-extrabold tracking-tight text-white">Chamba<span className="text-emerald-400">chat</span></span>
                <span className="px-2 py-0.5 text-xs font-bold bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-500/30">V2</span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Manufactura & People Analytics · Nuevo León</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 bg-slate-950/60 p-1.5 rounded-xl border border-slate-800">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/25 font-bold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium ${
                      isActive ? 'bg-slate-900/30 text-slate-950' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Mobile switcher */}
          <div className="lg:hidden flex items-center">
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value)}
              className="bg-slate-800 text-white text-xs font-semibold px-3 py-2 rounded-lg border border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {navItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </header>
  );
}
