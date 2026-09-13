import React, { useState } from 'react';
import GeminiChatLayout from './components/Chat/GeminiChatLayout';
import RetentionPredictor from './components/B2B/RetentionPredictor';
import JobsManager from './components/B2B/JobsManager';
import CandidatesList from './components/B2B/CandidatesList';
import AnalyticsDashboard from './components/B2B/AnalyticsDashboard';
import FlowOrchestrator from './components/Admin/FlowOrchestrator';
import UserProfileModal from './components/UserProfile/UserProfileModal';
import { 
  ArrowLeft, 
  Building2, 
  Calculator, 
  Briefcase, 
  Users, 
  BarChart3, 
  Settings2,
  MessageSquare
} from 'lucide-react';

export default function App() {
  // 'chat' es la pantalla principal por defecto (minimalista, tonos claros)
  const [currentView, setCurrentView] = useState('chat');
  const [empresaTab, setEmpresaTab] = useState('predictor');
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Perfil de operario activo en la sesión
  const [activeProfile, setActiveProfile] = useState(null);

  const b2bTabs = [
    { id: 'predictor', label: 'Predictor de Retención', icon: Calculator },
    { id: 'jobs', label: 'Bolsa de Vacantes', icon: Briefcase },
    { id: 'candidates', label: 'Operarios & INEA', icon: Users },
    { id: 'analytics', label: 'People Analytics', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-[#fcfdfd] text-slate-800 font-sans">
      {/* VISTA 1: CHAT PRINCIPAL MINIMALISTA (ChatGPT / Gemini Style) */}
      {currentView === 'chat' && (
        <GeminiChatLayout
          onOpenEmpresa={() => setCurrentView('empresa')}
          onOpenPerfil={() => setIsProfileOpen(true)}
          onOpenAdmin={() => setCurrentView('admin')}
        />
      )}

      {/* VISTA 2: PORTAL SOY EMPRESA (B2B SaaS) */}
      {currentView === 'empresa' && (
        <div className="min-h-screen bg-[#090e17] text-slate-100 flex flex-col">
          {/* Top Bar para volver al chat */}
          <div className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 py-3 shadow-md">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCurrentView('chat')}
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition group"
                >
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform text-emerald-400" />
                  <span>Volver al Chat</span>
                </button>

                <div className="h-5 w-[1px] bg-slate-700 hidden sm:block" />

                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-sm font-black text-white">Portal Empresa & Reclutamiento</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                    B2B SaaS
                  </span>
                </div>
              </div>

              {/* Pestañas internas de Empresa */}
              <nav className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
                {b2bTabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = empresaTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setEmpresaTab(tab.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                        isActive
                          ? 'bg-emerald-500 text-slate-950 shadow'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Contenido del módulo B2B seleccionado */}
          <div className="flex-1 pb-16">
            {empresaTab === 'predictor' && <RetentionPredictor />}
            {empresaTab === 'jobs' && <JobsManager />}
            {empresaTab === 'candidates' && <CandidatesList />}
            {empresaTab === 'analytics' && <AnalyticsDashboard />}
          </div>
        </div>
      )}

      {/* VISTA 3: PANEL ADMIN DE FLUJOS */}
      {currentView === 'admin' && (
        <div className="min-h-screen bg-[#090e17] text-slate-100 flex flex-col">
          <div className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 py-3 shadow-md">
            <div className="max-w-6xl mx-auto flex items-center justify-between">
              <button
                onClick={() => setCurrentView('chat')}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition"
              >
                <ArrowLeft className="w-4 h-4 text-emerald-400" />
                <span>Volver al Chat</span>
              </button>

              <div className="flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-black text-white">Panel de Administración de Prompts</span>
              </div>
            </div>
          </div>

          <div className="flex-1 pb-16">
            <FlowOrchestrator onTestChat={() => setCurrentView('chat')} />
          </div>
        </div>
      )}

      {/* MODAL DE PERFIL DE OPERARIO */}
      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        candidateProfile={activeProfile}
        onReturnToChat={() => {
          setIsProfileOpen(false);
          setCurrentView('chat');
        }}
      />
    </div>
  );
}
