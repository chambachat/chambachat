import React, { useState, useEffect, useRef } from 'react';
import { getStoredUser, setStoredUser, signOut, syncUserWithBackend } from '../../services/authService';
import { submitApplication, updateMyLocation } from '../../services/api';
import { readStoredLocation, persistStoredLocation, locationFromUser, LOCATION_UPDATED_EVENT } from '../../services/candidateLocation';
import { loadAllSessions, updateSession } from '../../services/chatStorage';

import AuthModal from '../Auth/AuthModal';
import JobDetailModal from '../Jobs/JobDetailModal';
import LocationPickerModal from './LocationPickerModal';

import { useChatSession } from '../../hooks/useChatSession';
import ChatSidebar from './ChatSidebar';
import TopNavbar from './TopNavbar';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import VacanciesCarousel from './VacanciesCarousel';
import ChatWelcome from './ChatWelcome';
import { LoginPromptCard, LocationCard } from './ChatCards';
import { buildApplicationIntroMessages, buildAuthConfirmMessage, isShareLocationIntent } from './chatMessages';

export default function GeminiChatLayout({
  onOpenEmpresa,
  onOpenPerfil,
  onOpenAdmin,
  currentUser: propCurrentUser,
  onLogout: propOnLogout,
  onUserAuthenticated: propOnUserAuthenticated
}) {
  const [currentUser, setCurrentUser] = useState(propCurrentUser || getStoredUser());
  const [sidebarOpen, setSidebarOpen] = useState(() => (typeof window !== 'undefined' ? window.innerWidth >= 768 : false));
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [appliedJobIds, setAppliedJobIds] = useState(new Set());
  const [selectedDetailJob, setSelectedDetailJob] = useState(null);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [candidateLocation, setCandidateLocation] = useState(readStoredLocation);
  const [inputMessage, setInputMessage] = useState('');

  const {
    sessions,
    activeSession,
    activeSessionId,
    isTyping,
    options,
    showVacancies,
    setShowVacancies,
    handleNewSession,
    handleSelectSession,
    handleDeleteSession,
    handleClearAll,
    sendToBot,
    setActiveSession,
    setSessions
  } = useChatSession(currentUser);

  useEffect(() => {
    if (propCurrentUser !== undefined) setCurrentUser(propCurrentUser);
  }, [propCurrentUser]);

  useEffect(() => {
    const user = getStoredUser();
    if (user && !propCurrentUser) setCurrentUser(user);
  }, [propCurrentUser]);

  // Ubicación confirmada en el perfil del usuario (GPS/mapa): manda sobre la guardada localmente
  useEffect(() => {
    const fromUser = locationFromUser(currentUser);
    if (fromUser) {
      setCandidateLocation(fromUser);
      persistStoredLocation(fromUser);
    }
  }, [currentUser?.latitud, currentUser?.longitud, currentUser?.ubicacion_confirmada]);

  // Ubicación actualizada desde el perfil: reflejarla en el chat y avisarle al bot (una sola vez)
  const sendToBotRef = useRef(sendToBot);
  sendToBotRef.current = sendToBot;
  useEffect(() => {
    const onUpdated = (e) => {
      const loc = e.detail || readStoredLocation();
      setCandidateLocation(loc);
      if (loc) sendToBotRef.current({ location: loc });
    };
    window.addEventListener(LOCATION_UPDATED_EVENT, onUpdated);
    return () => window.removeEventListener(LOCATION_UPDATED_EVENT, onUpdated);
  }, []);

  /** Agrega mensajes locales a la sesión activa y los persiste. */
  const appendToActiveSession = (newMessages, extra = {}) => {
    if (!activeSession) return;
    const finalMsgs = [...(activeSession.messages || []), ...newMessages];
    setActiveSession({ ...activeSession, messages: finalMsgs, ...extra });
    updateSession(activeSession.id, { messages: finalMsgs, ...extra });
  };

  const handleApplyJob = async (job) => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }
    try {
      await submitApplication({
        jobId: job.id,
        sessionId: activeSession?.backendSessionId,
        candidateName: currentUser.name || 'Operario de NL',
        candidateEmail: currentUser.email,
        candidatePhone: currentUser.phone || '',
        municipio: job.municipio
      });
      setAppliedJobIds(prev => new Set(prev).add(job.id));
      appendToActiveSession(buildApplicationIntroMessages(job, currentUser.name));
      setSessions(loadAllSessions());
    } catch (err) {
      console.error('Error al postularse a la vacante:', err);
    }
  };

  const handleUserAuthenticated = async (user) => {
    if (!user) return;
    setCurrentUser(user);
    if (propOnUserAuthenticated) propOnUserAuthenticated(user);

    await syncUserWithBackend(user, {
      sessionId: activeSession?.backendSessionId,
      municipio: activeSession?.candidateProfile?.municipio || 'Apodaca',
      puesto_deseado: activeSession?.candidateProfile?.puesto_deseado || 'Operario'
    });

    appendToActiveSession([buildAuthConfirmMessage(user)], { shouldAskLogin: false });
  };

  const handleLogout = async () => {
    await signOut();
    setCurrentUser(null);
    if (propOnLogout) propOnLogout();
  };

  const handleSendMessage = (text = inputMessage) => {
    if (!text.trim()) return;
    setInputMessage('');
    if (isShareLocationIntent(text)) {
      setIsLocationModalOpen(true);
      return;
    }
    sendToBot({ textToSend: text });
  };

  const handleOptionSelect = (optionVal) => {
    if (isShareLocationIntent(optionVal)) {
      setIsLocationModalOpen(true);
      return;
    }
    sendToBot({ optionVal });
  };

  const handleLocationConfirmed = async (newLoc) => {
    setCandidateLocation(newLoc);
    persistStoredLocation(newLoc);
    if (currentUser) {
      // Con sesión, la ubicación vive en el perfil para reutilizarla en cualquier dispositivo
      try {
        const saved = await updateMyLocation(newLoc);
        const merged = {
          ...currentUser,
          latitud: saved.latitud, longitud: saved.longitud,
          colonia: saved.colonia, municipio: saved.municipio, ubicacion_confirmada: true
        };
        setCurrentUser(merged);
        setStoredUser(merged);
        if (propOnUserAuthenticated) propOnUserAuthenticated(merged);
      } catch (e) {
        console.error('No se pudo guardar la ubicación en el perfil:', e);
      }
    }
    await sendToBot({ location: newLoc });
  };

  const hasMessages = Boolean(activeSession?.messages && activeSession.messages.length > 0);

  return (
    <div className="flex h-[100dvh] w-full max-w-full bg-[#fcfdfd] text-slate-800 font-sans overflow-hidden">
      <ChatSidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        sidebarOpen={sidebarOpen}
        onSelectSession={handleSelectSession}
        onNewSession={handleNewSession}
        onDeleteSession={handleDeleteSession}
        onClearAll={handleClearAll}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        currentUser={currentUser}
        onOpenEmpresa={onOpenEmpresa}
        onOpenPerfil={onOpenPerfil}
        onOpenAdmin={onOpenAdmin}
        setIsAuthModalOpen={setIsAuthModalOpen}
      />

      <main className="flex-1 flex flex-col h-full bg-white relative min-w-0 w-full overflow-hidden">
        <TopNavbar
          currentUser={currentUser}
          onOpenPerfil={onOpenPerfil}
          onLogin={() => setIsAuthModalOpen(true)}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />

        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3.5 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 max-w-3xl mx-auto w-full min-w-0">
          {!hasMessages ? (
            <ChatWelcome onPrompt={handleSendMessage} />
          ) : (
            <div className="space-y-4 sm:space-y-6 min-w-0">
              <MessageList messages={activeSession.messages} isTyping={isTyping} />

              {!currentUser && activeSession?.shouldAskLogin && (
                <LoginPromptCard onLogin={() => setIsAuthModalOpen(true)} />
              )}

              {(!candidateLocation || activeSession?.askLocation) && (
                <LocationCard
                  location={candidateLocation}
                  asking={Boolean(activeSession?.askLocation)}
                  onOpen={() => setIsLocationModalOpen(true)}
                />
              )}

              <VacanciesCarousel
                jobs={activeSession?.matchedJobs}
                nearbyRoutes={activeSession?.nearbyRoutes}
                appliedJobIds={appliedJobIds}
                onViewDetail={setSelectedDetailJob}
                showVacancies={showVacancies}
                setShowVacancies={setShowVacancies}
                currentUser={currentUser}
              />
            </div>
          )}
        </div>

        <ChatInput
          value={inputMessage}
          onChange={setInputMessage}
          onSend={() => handleSendMessage()}
          options={options}
          onSelectOption={handleOptionSelect}
        />
      </main>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} onAuthenticated={handleUserAuthenticated} />

      <JobDetailModal
        job={selectedDetailJob}
        isOpen={Boolean(selectedDetailJob)}
        onClose={() => setSelectedDetailJob(null)}
        onStartDirectChat={handleApplyJob}
        isApplied={selectedDetailJob ? appliedJobIds.has(selectedDetailJob.id) : false}
        currentUser={currentUser}
      />

      <LocationPickerModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        onLocationConfirmed={handleLocationConfirmed}
        initialLocation={candidateLocation}
      />
    </div>
  );
}
