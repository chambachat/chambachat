import React, { useState, useEffect, useRef } from 'react';
import { getStoredUser, setStoredUser, signOut, syncUserWithBackend } from '../../services/authService';
import { updateMyLocation } from '../../services/api';
import { readStoredLocation, persistStoredLocation, locationFromUser, LOCATION_UPDATED_EVENT } from '../../services/candidateLocation';
import { directInputPlaceholder } from '../../services/directChat';
import { loadAllSessions, updateSession } from '../../services/chatStorage';
import PhotoJobPreview from './PhotoJobPreview';

import AuthModal from '../Auth/AuthModal';
import JobDetailModal from '../Jobs/JobDetailModal';
import LocationPickerModal from './LocationPickerModal';

import { useChatSession } from '../../hooks/useChatSession';
import { usePhotoJob } from '../../hooks/usePhotoJob';
import ChatSidebar from './ChatSidebar';
import TopNavbar from './TopNavbar';
import MessageList from './MessageList';
import ChatScrollArea from './ChatScrollArea';
import ChatInput from './ChatInput';
import VacanciesCarousel from './VacanciesCarousel';
import ChatWelcome from './ChatWelcome';
import { LoginPromptCard, LocationCard, DirectChatBanner } from './ChatCards';
import { buildAuthConfirmMessage, isShareLocationIntent } from './chatMessages';
import { useToast } from '../ui/Toast';

export default function GeminiChatLayout({
  onOpenEmpresa,
  onOpenPerfil,
  onOpenAdmin,
  currentUser: propCurrentUser,
  onLogout: propOnLogout,
  onUserAuthenticated: propOnUserAuthenticated,
  onSwitchToRecruiter
}) {
  const toast = useToast();
  const [currentUser, setCurrentUser] = useState(propCurrentUser || getStoredUser());
  const [sidebarOpen, setSidebarOpen] = useState(() => (typeof window !== 'undefined' ? window.innerWidth >= 768 : false));
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
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
    startDirectChat,
    setActiveSession,
    setSessions
  } = useChatSession(currentUser);

  // Vacantes con chat directo ya abierto (una conversación por postulación)
  const appliedJobIds = new Set(sessions.filter(s => s.kind === 'direct' && !s.closed).map(s => s.jobId));
  const isDirect = activeSession?.kind === 'direct';
  // Entrevista rápida de Chambot dentro del chat directo: sus opciones se muestran como chips
  const screening = isDirect ? activeSession?.screening : null;
  const screeningActive = screening?.status === 'in_progress';
  const screeningOptions = screeningActive && screening.options?.length ? screening.options.map(o => ({ label: o, value: o })) : [];
  const askingLocationInDirect = isDirect && screeningActive && screening.step_key === 'ubicacion';
  const directLocked = isDirect && (activeSession?.closed || activeSession?.blockedByCompany || activeSession?.blockedByCandidate);

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

  const {
    photoExtraction, isAnalyzingPhoto, isConfirmingPhoto,
    handlePhotoSelected, handleConfirmPhotoJob, handleDiscardPhoto,
  } = usePhotoJob({ currentUser, candidateLocation, appendToActiveSession, setIsAuthModalOpen, toast });

  /** "Chat directo con el reclutador": abre una conversación nueva y separada para esa planta y vacante. */
  const handleApplyJob = async (job) => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }
    try {
      const alreadyOpen = appliedJobIds.has(job.id);
      await startDirectChat(job);
      setSelectedDetailJob(null);
      if (typeof window !== 'undefined' && window.innerWidth < 768) setSidebarOpen(false);
      toast.success(alreadyOpen
        ? `Abrí tu chat con Reclutamiento ${job.empresa_nombre}`
        : `Listo: chat directo con Reclutamiento ${job.empresa_nombre} para ${job.titulo}`);
    } catch (err) {
      console.error('Error al abrir chat directo:', err);
      toast.error(err.message || 'No se pudo abrir el chat con el reclutador');
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
    if (!isDirect && isShareLocationIntent(text)) {
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
    if (isDirect) {
      // En el chat directo la ubicación es una respuesta de la entrevista, no un evento del bot general
      await sendToBot({ textToSend: `📍 Vivo en ${newLoc.colonia}, ${newLoc.municipio}` });
      return;
    }
    await sendToBot({ location: newLoc });
  };

  const hasMessages = Boolean(activeSession?.messages && activeSession.messages.length > 0);

  return (
    <div className="chat-app-root flex w-full max-w-full bg-[#fcfdfd] text-slate-800 font-sans overflow-hidden">
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
        onSwitchToRecruiter={onSwitchToRecruiter}
      />

      <main className="flex-1 flex flex-col h-full bg-white relative min-w-0 w-full overflow-hidden">
        <TopNavbar
          currentUser={currentUser}
          onOpenPerfil={onOpenPerfil}
          onLogin={() => setIsAuthModalOpen(true)}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />

        <ChatScrollArea sessionKey={activeSession?.id} messages={activeSession?.messages || []} isTyping={!isDirect && isTyping}>
          {!hasMessages ? (
            <ChatWelcome onPrompt={handleSendMessage} />
          ) : (
            <div className="space-y-4 sm:space-y-6 min-w-0">
              {isDirect && (
                <DirectChatBanner
                  session={activeSession}
                  onMetaChange={(changes) => {
                    setActiveSession(prev => ({ ...prev, ...changes }));
                    updateSession(activeSession.id, changes);
                  }}
                />
              )}

              <MessageList messages={activeSession.messages} isTyping={!isDirect && isTyping} />

              {!isDirect && !currentUser && activeSession?.shouldAskLogin && (
                <LoginPromptCard onLogin={() => setIsAuthModalOpen(true)} />
              )}

              {((!isDirect && (!candidateLocation || activeSession?.askLocation)) || askingLocationInDirect) && (
                <LocationCard
                  location={candidateLocation}
                  asking={Boolean(activeSession?.askLocation) || askingLocationInDirect}
                  onOpen={() => setIsLocationModalOpen(true)}
                />
              )}

              {!isDirect && (
                <VacanciesCarousel
                  jobs={activeSession?.matchedJobs}
                  nearbyRoutes={activeSession?.nearbyRoutes}
                  appliedJobIds={appliedJobIds}
                  onViewDetail={setSelectedDetailJob}
                  showVacancies={showVacancies}
                  setShowVacancies={setShowVacancies}
                  currentUser={currentUser}
                />
              )}

              {!isDirect && photoExtraction && (
                <PhotoJobPreview
                  extraction={photoExtraction}
                  onConfirm={handleConfirmPhotoJob}
                  onDiscard={handleDiscardPhoto}
                  isSubmitting={isConfirmingPhoto}
                />
              )}
            </div>
          )}
        </ChatScrollArea>

        <ChatInput
          value={inputMessage}
          onChange={setInputMessage}
          onSend={() => handleSendMessage()}
          options={isDirect ? screeningOptions : options}
          onSelectOption={handleOptionSelect}
          disabled={Boolean(directLocked) || isAnalyzingPhoto}
          placeholder={isDirect ? directInputPlaceholder(activeSession, screeningActive) : (isAnalyzingPhoto ? '📸 Analizando foto...' : undefined)}
          footer={isDirect ? 'Tus mensajes llegan a los reclutadores de la planta; si tardan, Chambot te apoya con los datos de la vacante.' : undefined}
          onPhotoSelected={!isDirect ? handlePhotoSelected : undefined}
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
