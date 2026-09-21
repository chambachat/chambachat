import React, { useState } from 'react';
import { Menu, MessageSquare, Users2, Bus, Briefcase, Calculator, Users, BarChart3 } from 'lucide-react';
import EmpresaSidebar from './EmpresaSidebar';
import CandidateApplications from './CandidateApplications';
import TeamManager from './TeamManager';
import TransportRoutesManager from './TransportRoutesManager';
import JobsManager from './JobsManager';
import RetentionPredictor from './RetentionPredictor';
import CandidatesList from './CandidatesList';
import AnalyticsDashboard from './AnalyticsDashboard';

export const B2B_TABS = [
  { id: 'applications', label: 'Postulaciones & Chat', icon: MessageSquare, desc: 'Mensajería con candidatos' },
  { id: 'team', label: 'Mi Equipo', icon: Users2, badge: 'Team', desc: 'Plantas y reclutadores' },
  { id: 'routes', label: 'Rutas de Transporte', icon: Bus, badge: 'GPS', desc: 'Trazado y horarios' },
  { id: 'jobs', label: 'Bolsa de Vacantes', icon: Briefcase, desc: 'Puestos vigentes' },
  { id: 'predictor', label: 'Predictor de Retención', icon: Calculator, desc: 'Predicción IA' },
  { id: 'candidates', label: 'Operarios Registrados', icon: Users, desc: 'Base de datos NL' },
  { id: 'analytics', label: 'People Analytics', icon: BarChart3, desc: 'Métricas de planta' },
];

function PortalContent({ tab, currentUser, activeCompany, onCompanyChanged }) {
  switch (tab) {
    case 'applications':
      return <CandidateApplications currentUser={currentUser} />;
    case 'team':
      return <TeamManager currentUser={currentUser} onCompanyChanged={onCompanyChanged} />;
    case 'routes':
      return <TransportRoutesManager currentUser={currentUser} selectedCompany={activeCompany} onCompanyChanged={onCompanyChanged} />;
    case 'jobs':
      return <JobsManager />;
    case 'predictor':
      return <RetentionPredictor />;
    case 'candidates':
      return <CandidatesList />;
    case 'analytics':
      return <AnalyticsDashboard />;
    default:
      return null;
  }
}

/** Portal B2B: menú lateral + módulo activo. */
export default function EmpresaPortal({ currentUser, activeTab, onSelectTab, activeCompany, onCompanyChanged, onBackToChat, onLogout }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const activeLabel = B2B_TABS.find(t => t.id === activeTab)?.label || 'Portal Empresa';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col md:flex-row">
      <EmpresaSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        currentUser={currentUser}
        tabs={B2B_TABS}
        activeTab={activeTab}
        onSelectTab={onSelectTab}
        onBackToChat={onBackToChat}
        onLogout={onLogout}
      />

      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 bg-slate-900/30 z-40 md:hidden backdrop-blur-xs" />
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <div className="sticky top-0 z-30 md:hidden bg-white/95 backdrop-blur border-b border-slate-200 px-4 py-2.5 flex items-center justify-between shadow-xs">
          <button onClick={() => setSidebarOpen(true)} className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-slate-900">{activeLabel}</span>
            <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.5 rounded">B2B</span>
          </div>
          <button onClick={onBackToChat} className="text-xs font-bold text-emerald-600 hover:text-emerald-700 px-2 py-1 rounded-lg">
            Chat
          </button>
        </div>

        <div className="flex-1 pb-16">
          <PortalContent tab={activeTab} currentUser={currentUser} activeCompany={activeCompany} onCompanyChanged={onCompanyChanged} />
        </div>
      </div>
    </div>
  );
}
