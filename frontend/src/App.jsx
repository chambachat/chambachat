import React, { useState, useEffect } from 'react';
import GeminiChatLayout from './components/Chat/GeminiChatLayout';
import RetentionPredictor from './components/B2B/RetentionPredictor';
import JobsManager from './components/B2B/JobsManager';
import CandidatesList from './components/B2B/CandidatesList';
import AnalyticsDashboard from './components/B2B/AnalyticsDashboard';
import CandidateApplications from './components/B2B/CandidateApplications';
import FlowOrchestrator from './components/Admin/FlowOrchestrator';
import UserProfileModal from './components/UserProfile/UserProfileModal';
import AuthModal from './components/Auth/AuthModal';
import { 
  ArrowLeft, 
  Building2, 
  Calculator, 
  Briefcase, 
  Users, 
  BarChart3, 
  Settings2,
  MessageSquare,
  LogOut
} from 'lucide-react';

import { getStoredUser, signOut } from './services/supabaseClient';

export default function App() {
  // 'chat' es la pantalla principal por defecto (minimalista, tonos claros)
  const [currentView, setCurrentView] = useState('chat');
  const [empresaTab, setEmpresaTab] = useState('applications');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(getStoredUser());
  
  // Modal de autenticación protegido para Empresa o acciones restringidas
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authPrompt, setAuthPrompt] = useState({ title: '', message: '' });
  const [pendingAction, setPendingAction] = useState(null);

  // Perfil de operario activo en la sesión
  const [activeProfile, setActiveProfile] = useState(null);

  // Validación: Solo usuarios autenticados pueden acceder al portal de Empresa
  const handleOpenEmpresa = () => {
    const user = currentUser || getStoredUser();
    if (!user) {
      setAuthPrompt({
        title: 'Acceso Restringido al Portal Empresa',
        message: 'Debes iniciar sesión con Google o tu correo personal para acceder al Portal Empresa y gestionar vacantes de reclutamiento.'
      });
      setPendingAction(() => () => setCurrentView('empresa'));
      setIsAuthModalOpen(true);
      return;
    }
    setCurrentView('empresa');
  };

  // Cerrar sesión global
  const handleLogout = async () => {
    await signOut();
    setCurrentUser(null);
    if (currentView === 'empresa') {
      setCurrentView('chat');
    }
  };

  // Guard: Si por algún motivo cambia a empresa sin estar autenticado, redirigir al chat
  useEffect(() => {
    if (currentView === 'empresa') {
      const user = currentUser || getStoredUser();
      if (!user) {
        setCurrentView('chat');
        setAuthPrompt({
          title: 'Acceso Restringido al Portal Empresa',
          message: 'Debes iniciar sesión con Google o tu correo personal para acceder al Portal Empresa y gestionar vacantes de reclutamiento.'
        });
        setPendingAction(() => () => setCurrentView('empresa'));
        setIsAuthModalOpen(true);
      }
    }
  }, [currentView, currentUser]);

  const b2bTabs = [
    { id: 'applications', label: 'Postulaciones & Chat', icon: MessageSquare },
    { id: 'jobs', label: 'Bolsa de Vacantes', icon: Briefcase },
    { id: 'predictor', label: 'Predictor de Retención', icon: Calculator },
    { id: 'candidates', label: 'Operarios Registrados', icon: Users },
    { id: 'analytics', label: 'People Analytics', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-[#fcfdfd] text-slate-800 font-sans">
      {/* VISTA 1: CHAT PRINCIPAL MINIMALISTA (ChatGPT / Gemini Style) */}
      {currentView === 'chat' && (
        <GeminiChatLayout
          onOpenEmpresa={handleOpenEmpresa}
          onOpenPerfil={() => setIsProfileOpen(true)}
          onOpenAdmin={() => setCurrentView('admin')}
          currentUser={currentUser}
          onLogout={handleLogout}
          onUserAuthenticated={(user) => setCurrentUser(user)}
        />
      )}

      {/* VISTA 2: PORTAL SOY EMPRESA (B2B SaaS) - 100% ESTILO CLARO Y MINIMALISTA */}
      {currentView === 'empresa' && (
        <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
          {/* Top Bar para volver al chat */}
          <div className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-200 px-4 py-3 shadow-sm">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCurrentView('chat')}
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold border border-slate-200 transition group"
                >
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform text-emerald-600" />
                  <span>Volver al Chat</span>
                </button>

                <div className="h-5 w-[1px] bg-slate-200 hidden sm:block" />

                <div className="flex items-center gap-2">
                  <img
                    src="/logo-chambachat.png"
                    alt="ChambaChat Logo"
                    className="h-7 w-auto object-contain rounded-md shadow-xs border border-slate-900/10 shrink-0"
                  />
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-sm font-black text-slate-900">Portal Empresa & Reclutamiento</span>
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                    B2B SaaS
                  </span>
                </div>
              </div>

              {/* Pestañas internas de Empresa & Perfil con Logout */}
              <div className="flex items-center gap-2 max-w-full overflow-x-auto">
                <nav className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-x-auto max-w-full">
                  {b2bTabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = empresaTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setEmpresaTab(tab.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 ${
                          isActive
                            ? 'bg-white text-emerald-700 shadow-sm border border-slate-200/80 font-black'
                            : 'text-slate-500 hover:text-slate-900 hover:bg-white/50'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </nav>

                {/* Perfil y botón de Cerrar sesión en Portal Empresa */}
                {currentUser && (
                  <div className="flex items-center gap-2 pl-2 border-l border-slate-200 shrink-0">
                    <img
                      src={currentUser.avatar_url}
                      alt={currentUser.name}
                      className="w-7 h-7 rounded-full bg-slate-100 border border-emerald-300 object-cover"
                    />
                    <span className="text-xs font-bold text-slate-800 hidden lg:inline truncate max-w-[110px]">
                      {currentUser.name}
                    </span>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 font-bold px-2.5 py-1.5 rounded-xl hover:bg-rose-50 border border-rose-200 transition shrink-0"
                      title="Cerrar sesión"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Cerrar sesión</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Contenido del módulo B2B seleccionado */}
          <div className="flex-1 pb-16">
            {empresaTab === 'applications' && <CandidateApplications />}
            {empresaTab === 'jobs' && <JobsManager />}
            {empresaTab === 'predictor' && <RetentionPredictor />}
            {empresaTab === 'candidates' && <CandidatesList />}
            {empresaTab === 'analytics' && <AnalyticsDashboard />}
          </div>
        </div>
      )}

      {/* VISTA 3: PANEL ADMIN DE FLUJOS - ESTILO CLARO Y MINIMALISTA */}
      {currentView === 'admin' && (
        <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
          <div className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-200 px-4 py-3 shadow-sm">
            <div className="max-w-6xl mx-auto flex items-center justify-between">
              <button
                onClick={() => setCurrentView('chat')}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold border border-slate-200 transition"
              >
                <ArrowLeft className="w-4 h-4 text-emerald-600" />
                <span>Volver al Chat</span>
              </button>

              <div className="flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-black text-slate-900">Panel de Administración de Prompts</span>
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
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenAuth={() => {
          setIsProfileOpen(false);
          setAuthPrompt({
            title: 'Inicia Sesión o Regístrate',
            message: 'Accede con Google o tu correo personal para guardar tu perfil y postulaciones.'
          });
          setIsAuthModalOpen(true);
        }}
        onReturnToChat={() => {
          setIsProfileOpen(false);
          setCurrentView('chat');
        }}
      />

      {/* MODAL GLOBAL DE AUTENTICACIÓN (PROTECCIÓN DE ACCESO) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => {
          setIsAuthModalOpen(false);
          setAuthPrompt({ title: '', message: '' });
          setPendingAction(null);
        }}
        promptTitle={authPrompt.title}
        promptMessage={authPrompt.message}
        onAuthenticated={(user) => {
          setCurrentUser(user);
          setIsAuthModalOpen(false);
          setAuthPrompt({ title: '', message: '' });
          if (pendingAction) {
            pendingAction();
            setPendingAction(null);
          }
        }}
      />
    </div>
  );
}
