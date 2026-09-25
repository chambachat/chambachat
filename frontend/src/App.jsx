import React, { useState, useEffect } from 'react';
import ChatHome from './components/Chat/ChatHome';
import EmpresaPortal from './components/B2B/EmpresaPortal';
import AdminView from './components/Admin/AdminView';
import ScraperTool from './components/Admin/ScraperTool';
import UserProfileModal from './components/UserProfile/UserProfileModal';
import AuthModal from './components/Auth/AuthModal';
import LocationPickerModal from './components/Chat/LocationPickerModal';
import CandidateResumeModal from './components/UserProfile/CandidateResumeModal';
import { getStoredUser, setStoredUser, signOut } from './services/authService';
import { acceptCompanyInvitation, getInvitationByToken, updateMyLocation } from './services/api';
import { readStoredLocation, saveStoredLocation, locationFromUser, formatLocation } from './services/candidateLocation';
import { useToast } from './components/ui/Toast';

const EMPRESA_AUTH_PROMPT = {
  title: 'Acceso al Portal Empresa (B2B)',
  message: 'Inicia sesión con tu perfil de Reclutador / Empresa para gestionar vacantes de tu planta y comunicarte con los candidatos.'
};

export default function App() {
  const toast = useToast();

  // 'chat' es la pantalla principal por defecto
  const initialView = (typeof window !== 'undefined' && window.location.pathname.includes('/admin/scraper')) ? 'scraper' : 'chat';
  const [currentView, setCurrentView] = useState(initialView);
  const [empresaTab, setEmpresaTab] = useState('team');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(getStoredUser());
  const [activeCompany, setActiveCompany] = useState(null);

  // Modal de autenticación protegido para Empresa o acciones restringidas
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authInitialRole, setAuthInitialRole] = useState('candidate');
  const [authPrompt, setAuthPrompt] = useState({ title: '', message: '' });
  const [pendingAction, setPendingAction] = useState(null);
  const [invitationInfo, setInvitationInfo] = useState(null);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isResumeOpen, setIsResumeOpen] = useState(false);
  const [resumeVersion, setResumeVersion] = useState(0);

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

  /** Ubicación registrada desde el perfil: se guarda en el perfil (con sesión) y en este dispositivo; el chat se entera por evento. */
  const handleProfileLocationConfirmed = async (loc) => {
    if (currentUser) {
      try {
        const saved = await updateMyLocation(loc);
        const merged = {
          ...currentUser,
          latitud: saved.latitud, longitud: saved.longitud,
          colonia: saved.colonia, municipio: saved.municipio, ubicacion_confirmada: true
        };
        setCurrentUser(merged);
        setStoredUser(merged);
      } catch (e) {
        toast.error(e.message || 'No se pudo guardar tu ubicación');
        return;
      }
    }
    saveStoredLocation(loc);
    toast.success(`Ubicación actualizada: ${formatLocation(loc)}`);
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

  // Enlace de invitación (?invitacion=TOKEN o ?invite=TOKEN)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const token = params.get('invitacion') || params.get('invite');
    if (!token) return;

    const clearInviteParam = () => {
      const url = new URL(window.location.href);
      url.searchParams.delete('invitacion');
      url.searchParams.delete('invite');
      window.history.replaceState({}, '', url.pathname + url.search + url.hash);
    };

    const acceptInvitation = async (user) => {
      try {
        const res = await acceptCompanyInvitation(token, user);
        const updated = { ...user, empresa_nombre: res.company?.nombre, company_name: res.company?.nombre, role: 'recruiter' };
        setCurrentUser(updated);
        setStoredUser(updated);
        toast.success(`¡Te has unido exitosamente al equipo de ${res.company?.nombre || 'la empresa'}!`);
        setCurrentView('empresa');
        setEmpresaTab('team');
      } catch (e) {
        console.error(e);
        toast.error(e.message || 'No se pudo aceptar la invitación.');
      } finally {
        clearInviteParam();
      }
    };

    (async () => {
      let info;
      try {
        info = await getInvitationByToken(token);
      } catch (e) {
        toast.error(e.message || 'Invitación no válida.');
        clearInviteParam();
        return;
      }
      if (info.expired || info.status !== 'pending') {
        toast.error(info.status === 'accepted'
          ? 'Esta invitación ya fue aceptada. Inicia sesión para entrar al portal.'
          : 'Esta invitación expiró o fue revocada. Pide al administrador que la vuelva a enviar.');
        clearInviteParam();
        return;
      }

      const user = currentUser || getStoredUser();
      if (user) {
        if ((user.email || '').toLowerCase() === info.email) {
          await acceptInvitation(user);
          return;
        }
        const keepSession = await toast.confirm(
          `Tu sesión actual es de ${user.email}, pero la invitación a ${info.company?.nombre} es para ${info.email}. ` +
          `¿Quieres unirte con tu cuenta actual (${user.email})? Si eliges Cancelar, cerraremos tu sesión para que entres con ${info.email}.`
        );
        if (keepSession) {
          await acceptInvitation(user);
          return;
        }
        await signOut();
        setCurrentUser(null);
      }

      setInvitationInfo(info);
      requireRecruiterAuth(
        {
          title: `Invitación de ${info.inviter_name || info.inviter_email}`,
          message: `Te invitaron a colaborar en ${info.company?.nombre}. Confirma tu correo ${info.email} para aceptar.`
        },
        async () => {
          const freshUser = getStoredUser();
          if (freshUser) await acceptInvitation(freshUser);
          setInvitationInfo(null);
        }
      );
    })();
  }, []);

  return (
    <div className="min-h-screen bg-[#fcfdfd] text-slate-800 font-sans">
      {currentView === 'chat' && (
        <ChatHome
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

      {currentView === 'scraper' && <ScraperTool onBack={() => setCurrentView('chat')} />}

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
        onUpdateLocation={() => {
          setIsProfileOpen(false);
          setIsLocationModalOpen(true);
        }}
        onEditResume={() => {
          setIsProfileOpen(false);
          setIsResumeOpen(true);
        }}
        resumeVersion={resumeVersion}
      />

      <CandidateResumeModal
        isOpen={isResumeOpen}
        onClose={() => { setIsResumeOpen(false); setIsProfileOpen(true); }}
        onSaved={() => {
          setResumeVersion(v => v + 1);
          setIsResumeOpen(false);
          setIsProfileOpen(true);
        }}
      />

      <LocationPickerModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        onLocationConfirmed={handleProfileLocationConfirmed}
        initialLocation={locationFromUser(currentUser) || readStoredLocation()}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => {
          setIsAuthModalOpen(false);
          setAuthPrompt({ title: '', message: '' });
          setPendingAction(null);
          setInvitationInfo(null);
        }}
        initialRole={authInitialRole}
        invitation={invitationInfo}
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
