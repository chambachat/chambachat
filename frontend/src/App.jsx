import React, { useState, useEffect } from 'react';
import GeminiChatLayout from './components/Chat/GeminiChatLayout';
import EmpresaPortal from './components/B2B/EmpresaPortal';
import AdminView from './components/Admin/AdminView';
import UserProfileModal from './components/UserProfile/UserProfileModal';
import AuthModal from './components/Auth/AuthModal';
import { getStoredUser, setStoredUser, signOut } from './services/authService';
import { acceptCompanyInvitation } from './services/api';
import { useToast } from './components/ui/Toast';

const EMPRESA_AUTH_PROMPT = {
  title: 'Acceso al Portal Empresa (B2B)',
  message: 'Inicia sesión con tu perfil de Reclutador / Empresa para gestionar vacantes de tu planta y comunicarte con los candidatos.'
};

export default function App() {
  const toast = useToast();

  // 'chat' es la pantalla principal por defecto
  const [currentView, setCurrentView] = useState('chat');
  const [empresaTab, setEmpresaTab] = useState('applications');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(getStoredUser());
  const [activeCompany, setActiveCompany] = useState(null);

  // Modal de autenticación protegido para Empresa o acciones restringidas
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authInitialRole, setAuthInitialRole] = useState('candidate');
  const [authPrompt, setAuthPrompt] = useState({ title: '', message: '' });
  const [pendingAction, setPendingAction] = useState(null);

  /** Abre el modal de login como reclutador y guarda la acción a ejecutar al autenticarse. */
  const requireRecruiterAuth = (prompt, action) => {
    setAuthInitialRole('recruiter');
    setAuthPrompt(prompt);
    setPendingAction(() => action);
    setIsAuthModalOpen(true);
  };

  const handleOpenEmpresa = () => {
    const user = currentUser || getStoredUser();
    if (!user) {
      requireRecruiterAuth(EMPRESA_AUTH_PROMPT, () => {
        setCurrentView('empresa');
        setEmpresaTab('team');
      });
      return;
    }
    if (!user.empresa_nombre) setEmpresaTab('team');
    setCurrentView('empresa');
  };

  const handleLogout = async () => {
    await signOut();
    setCurrentUser(null);
    if (currentView === 'empresa') setCurrentView('chat');
  };

  /** Una planta fue seleccionada/creada en el portal: sincronizar usuario y empresa activa. */
  const handleCompanyChanged = (comp) => {
    setActiveCompany(comp);
    if (currentUser && comp?.nombre) {
      const updated = { ...currentUser, empresa_nombre: comp.nombre, company_name: comp.nombre };
      setCurrentUser(updated);
      setStoredUser(updated);
    }
  };

  // Guard: el portal empresa exige sesión
  useEffect(() => {
    if (currentView !== 'empresa') return;
    const user = currentUser || getStoredUser();
    if (!user) {
      setCurrentView('chat');
      requireRecruiterAuth(EMPRESA_AUTH_PROMPT, () => setCurrentView('empresa'));
    }
  }, [currentView, currentUser]);

  // Detección de token de invitación (?invitacion=TOKEN o ?invite=TOKEN)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const token = params.get('invitacion') || params.get('invite');
    if (!token) return;

    const acceptInvitation = async (user) => {
      try {
        const res = await acceptCompanyInvitation(token, user);
        toast.success(`¡Te has unido exitosamente al equipo de ${res.company?.nombre || 'la empresa'}!`);
        setCurrentView('empresa');
        setEmpresaTab('team');
      } catch (e) {
        console.error(e);
        toast.error(e.message || 'No se pudo aceptar la invitación.');
      }
    };

    const user = currentUser || getStoredUser();
    if (user) {
      acceptInvitation(user);
    } else {
      requireRecruiterAuth(
        {
          title: 'Invitación a Equipo de Reclutamiento',
          message: 'Has recibido una invitación para unirte a una empresa en Chambachat. Inicia sesión o regístrate para aceptarla.'
        },
        async () => {
          const freshUser = getStoredUser();
          if (freshUser) await acceptInvitation(freshUser);
        }
      );
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#fcfdfd] text-slate-800 font-sans">
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

      {currentView === 'empresa' && (
        <EmpresaPortal
          currentUser={currentUser}
          activeTab={empresaTab}
          onSelectTab={setEmpresaTab}
          activeCompany={activeCompany}
          onCompanyChanged={handleCompanyChanged}
          onBackToChat={() => setCurrentView('chat')}
          onLogout={handleLogout}
        />
      )}

      {currentView === 'admin' && <AdminView onBack={() => setCurrentView('chat')} />}

      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        candidateProfile={null}
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
