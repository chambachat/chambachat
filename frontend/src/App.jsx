import React, { useState, useEffect } from 'react';
import GeminiChatLayout from './components/Chat/GeminiChatLayout';
import RetentionPredictor from './components/B2B/RetentionPredictor';
import JobsManager from './components/B2B/JobsManager';
import CandidatesList from './components/B2B/CandidatesList';
import AnalyticsDashboard from './components/B2B/AnalyticsDashboard';
import CandidateApplications from './components/B2B/CandidateApplications';
import TeamManager from './components/B2B/TeamManager';
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
  LogOut,
  Users2,
  Menu,
  X,
  ChevronRight,
  CheckCircle2,
  ShieldCheck
} from 'lucide-react';

import { getStoredUser, signOut } from './services/supabaseClient';
import { acceptCompanyInvitation } from './services/api';

export default function App() {
  // 'chat' es la pantalla principal por defecto (minimalista, tonos claros)
  const [currentView, setCurrentView] = useState('chat');
  const [empresaTab, setEmpresaTab] = useState('applications');
  const [empresaSidebarOpen, setEmpresaSidebarOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(getStoredUser());
  
  // Modal de autenticación protegido para Empresa o acciones restringidas
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authInitialRole, setAuthInitialRole] = useState('candidate');
  const [authPrompt, setAuthPrompt] = useState({ title: '', message: '' });
  const [pendingAction, setPendingAction] = useState(null);

  // Perfil de operario activo en la sesión
  const [activeProfile, setActiveProfile] = useState(null);

  // Apertura segura del Portal Empresa
  const handleOpenEmpresa = () => {
    const user = currentUser || getStoredUser();
    if (!user) {
      setAuthInitialRole('recruiter');
      setAuthPrompt({
        title: 'Acceso al Portal Empresa (B2B)',
        message: 'Inicia sesión con tu perfil de Reclutador / Empresa para gestionar vacantes de tu planta y comunicarte con los candidatos.'
      });
      setPendingAction(() => () => {
        setCurrentView('empresa');
        setEmpresaTab('team');
      });
      setIsAuthModalOpen(true);
      return;
    }
    if (!user.empresa_nombre) {
      setEmpresaTab('team');
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
        setAuthInitialRole('recruiter');
        setAuthPrompt({
          title: 'Acceso al Portal Empresa (B2B)',
          message: 'Inicia sesión con tu perfil de Reclutador / Empresa para gestionar vacantes de tu planta y comunicarte con los candidatos.'
        });
        setPendingAction(() => () => setCurrentView('empresa'));
        setIsAuthModalOpen(true);
      }
    }
  }, [currentView, currentUser]);

  // Detección de token de invitación (?invitacion=TOKEN o ?invite=TOKEN)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('invitacion') || params.get('invite');
      if (token) {
        const user = currentUser || getStoredUser();
        if (!user) {
          setAuthInitialRole('recruiter');
          setAuthPrompt({
            title: 'Invitación a Equipo de Reclutamiento',
            message: 'Has recibido una invitación para unirte a una empresa en Chambachat. Inicia sesión o regístrate para aceptarla.'
          });
          setPendingAction(() => async () => {
            const freshUser = getStoredUser();
            if (freshUser) {
              try {
                const res = await acceptCompanyInvitation(token, freshUser);
                alert(`¡Bienvenido! Te has unido a ${res.company?.nombre || 'la empresa'}.`);
                setCurrentView('empresa');
                setEmpresaTab('team');
              } catch (e) {
                console.error(e);
              }
            }
          });
          setIsAuthModalOpen(true);
        } else {
          acceptCompanyInvitation(token, user).then(res => {
            alert(`¡Te has unido exitosamente al equipo de ${res.company?.nombre || 'la empresa'}!`);
            setCurrentView('empresa');
            setEmpresaTab('team');
          }).catch(err => {
            console.error(err);
          });
        }
      }
    }
  }, []);

  const b2bTabs = [
    { id: 'applications', label: 'Postulaciones & Chat', icon: MessageSquare, desc: 'Mensajería con candidatos' },
    { id: 'team', label: 'Mi Equipo', icon: Users2, badge: 'Team', desc: 'Plantas y reclutadores' },
    { id: 'jobs', label: 'Bolsa de Vacantes', icon: Briefcase, desc: 'Puestos vigentes' },
    { id: 'predictor', label: 'Predictor de Retención', icon: Calculator, desc: 'Predicción IA' },
    { id: 'candidates', label: 'Operarios Registrados', icon: Users, desc: 'Base de datos NL' },
    { id: 'analytics', label: 'People Analytics', icon: BarChart3, desc: 'Métricas de planta' },
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

      {/* VISTA 2: PORTAL SOY EMPRESA (B2B SaaS) CON MENÚ LATERAL */}
      {currentView === 'empresa' && (
        <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col md:flex-row">
          {/* BARRA LATERAL / MENÚ LATERAL (DESKTOP & MÓVIL OVERLAY) */}
          <aside
            className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 md:static md:translate-x-0 ${
              empresaSidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            {/* Header del Sidebar */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <img
                  src="/logo-chambachat.png"
                  alt="ChambaChat Logo"
                  className="h-8 w-auto object-contain rounded-lg shadow-xs border border-slate-900/10"
                />
                <div>
                  <span className="text-sm font-black text-slate-900 block leading-tight">Chambachat</span>
                  <span className="text-[10px] text-emerald-700 font-extrabold uppercase tracking-wider bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    B2B Reclutamiento
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEmpresaSidebarOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 md:hidden rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Planta / Empresa Activa Card en Sidebar */}
            <div className={`p-3 mx-3 my-3 rounded-2xl border transition ${
              currentUser?.empresa_nombre
                ? 'bg-gradient-to-r from-emerald-50/70 to-teal-50/40 border-emerald-200/80'
                : 'bg-amber-50/70 border-amber-200/80'
            }`}>
              <div className="flex items-center justify-between gap-1 mb-1">
                <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${
                  currentUser?.empresa_nombre ? 'text-emerald-700' : 'text-amber-800'
                }`}>
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Empresa / Planta</span>
                </div>
                {currentUser?.empresa_nombre ? (
                  <span className="text-[9px] font-extrabold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                    <ShieldCheck className="w-2.5 h-2.5" />
                    <span>SAT</span>
                  </span>
                ) : (
                  <span className="text-[9px] font-extrabold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                    Pendiente
                  </span>
                )}
              </div>
              <span className="text-xs font-black text-slate-900 block truncate">
                {currentUser?.empresa_nombre || 'Sin empresa dada de alta'}
              </span>
              <button
                type="button"
                onClick={() => {
                  setEmpresaTab('team');
                  setEmpresaSidebarOpen(false);
                }}
                className={`mt-1.5 text-[10px] font-bold hover:underline flex items-center gap-1 ${
                  currentUser?.empresa_nombre ? 'text-emerald-700 hover:text-emerald-800' : 'text-amber-800 hover:text-amber-900'
                }`}
              >
                <span>{currentUser?.empresa_nombre ? 'Administrar plantas y equipo' : 'Subir Constancia Fiscal (CSF)'}</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {/* Navegación del Menú Lateral */}
            <div className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
              <span className="text-[10px] font-bold text-slate-400 px-3 uppercase tracking-wider block mb-1">
                Módulos del Portal
              </span>
              {b2bTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = empresaTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setEmpresaTab(tab.id);
                      setEmpresaSidebarOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition group ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20 font-black'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
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

            {/* Footer del Sidebar: Volver al chat & Usuario */}
            <div className="p-3 border-t border-slate-200 bg-white space-y-2 shrink-0">
              <button
                onClick={() => setCurrentView('chat')}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition group"
              >
                <div className="flex items-center gap-2">
                  <ArrowLeft className="w-4 h-4 text-emerald-600 group-hover:-translate-x-0.5 transition-transform" />
                  <span>Volver al Chat</span>
                </div>
                <span className="text-[10px] text-slate-400 font-normal">IA & Vacantes</span>
              </button>

              {currentUser && (
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <img
                      src={currentUser.avatar_url}
                      alt={currentUser.name}
                      className="w-8 h-8 rounded-full bg-slate-100 border border-emerald-300 object-cover shrink-0"
                    />
                    <div className="min-w-0 truncate">
                      <span className="text-xs font-bold text-slate-900 block truncate">{currentUser.name}</span>
                      <span className="text-[10px] text-slate-400 block truncate">{currentUser.email}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition shrink-0"
                    title="Cerrar sesión"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </aside>

          {/* OVERLAY MÓVIL PARA SIDEBAR */}
          {empresaSidebarOpen && (
            <div
              onClick={() => setEmpresaSidebarOpen(false)}
              className="fixed inset-0 bg-slate-900/30 z-40 md:hidden backdrop-blur-xs"
            />
          )}

          {/* ÁREA DE CONTENIDO PRINCIPAL */}
          <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
            {/* Topbar móvil para abrir menú lateral */}
            <div className="sticky top-0 z-30 md:hidden bg-white/95 backdrop-blur border-b border-slate-200 px-4 py-2.5 flex items-center justify-between shadow-xs">
              <button
                onClick={() => setEmpresaSidebarOpen(true)}
                className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-900">
                  {b2bTabs.find(t => t.id === empresaTab)?.label || 'Portal Empresa'}
                </span>
                <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.5 rounded">
                  B2B
                </span>
              </div>

              <button
                onClick={() => setCurrentView('chat')}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 px-2 py-1 rounded-lg"
              >
                Chat
              </button>
            </div>

            {/* Contenido del módulo B2B seleccionado */}
            <div className="flex-1 pb-16">
              {empresaTab === 'applications' && <CandidateApplications currentUser={currentUser} />}
              {empresaTab === 'team' && (
                <TeamManager 
                  currentUser={currentUser} 
                  onCompanyChanged={(comp) => {
                    if (currentUser && comp?.nombre) {
                      const updated = { 
                        ...currentUser, 
                        empresa_nombre: comp.nombre,
                        company_name: comp.nombre 
                      };
                      setCurrentUser(updated);
                      try {
                        localStorage.setItem('chambachat_auth_user', JSON.stringify(updated));
                      } catch (e) {}
                    }
                  }} 
                />
              )}
              {empresaTab === 'jobs' && <JobsManager />}
              {empresaTab === 'predictor' && <RetentionPredictor />}
              {empresaTab === 'candidates' && <CandidatesList />}
              {empresaTab === 'analytics' && <AnalyticsDashboard />}
            </div>
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

      {/* MODAL DE PERFIL */}
      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        candidateProfile={activeProfile}
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenEmpresa={() => {
          setIsProfileOpen(false);
          handleOpenEmpresa();
        }}
        onOpenAuth={() => {
          setIsProfileOpen(false);
          setAuthInitialRole('candidate');
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
        initialRole={authInitialRole}
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
