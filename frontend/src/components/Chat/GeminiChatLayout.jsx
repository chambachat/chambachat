import React, { useState, useEffect } from 'react';
import { ShieldCheck, User, MapPin, Navigation } from 'lucide-react';
import { getStoredUser, signOut, syncUserWithBackend } from '../../services/authService';
import { submitApplication } from '../../services/api';
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

export default function GeminiChatLayout({ 
  onOpenEmpresa, 
  onOpenPerfil, 
  onOpenAdmin,
  currentUser: propCurrentUser,
  onLogout: propOnLogout,
  onUserAuthenticated: propOnUserAuthenticated
}) {
  const [currentUser, setCurrentUser] = useState(propCurrentUser || getStoredUser());
  const [sidebarOpen, setSidebarOpen] = useState(() => 
    typeof window !== 'undefined' ? window.innerWidth >= 768 : false
  );
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [appliedJobIds, setAppliedJobIds] = useState(new Set());
  const [selectedDetailJob, setSelectedDetailJob] = useState(null);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [candidateLocation, setCandidateLocation] = useState(() => {
    try {
      const stored = localStorage.getItem('candidate_location');
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  });
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
    if (propCurrentUser !== undefined) {
      setCurrentUser(propCurrentUser);
    }
  }, [propCurrentUser]);

  useEffect(() => {
    if (currentUser?.latitud && currentUser?.longitud) {
      setCandidateLocation({
        lat: currentUser.latitud,
        lon: currentUser.longitud,
        colonia: currentUser.colonia || '',
        municipio: currentUser.municipio || 'Apodaca'
      });
    }
  }, [currentUser]);

  useEffect(() => {
    const user = getStoredUser();
    if (user && !propCurrentUser) setCurrentUser(user);
  }, [propCurrentUser]);

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

      const groupIntroMsg = {
        id: Math.random().toString(),
        sender: 'system',
        text: `👥 ¡Chat Grupal Oficial Conectado! Estás en comunicación directa con Reclutamiento ${job.empresa_nombre} (${job.titulo}). Participantes: Tú, Reclutador de Planta y Chambot (IA).`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      const recruiterIntroMsg = {
        id: Math.random().toString(),
        sender: 'recruiter',
        sender_name: `Reclutamiento ${job.empresa_nombre}`,
        text: `¡Hola ${currentUser.name || 'Compa'}! Recibimos tu interés en la vacante de ${job.titulo}. En breve un reclutador de nuestra planta revisará tus datos aquí mismo.`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      const botIntroMsg = {
        id: Math.random().toString(),
        sender: 'bot',
        sender_name: 'Chambot (IA)',
        text: `🤖 ¡Qué onda ${currentUser.name || 'Compa'}! Quedé integrado en este chat grupal. Puedes hacerme preguntas sobre el sueldo (${job.sueldo_semanal_libre ? `$${job.sueldo_semanal_libre.toLocaleString('es-MX')}/sem` : ''}), los turnos o el transporte de ${job.empresa_nombre}. Si el reclutador tarda más de 2 minutos en responder, con gusto te ayudo.`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      const finalMsgs = [...(activeSession?.messages || []), groupIntroMsg, recruiterIntroMsg, botIntroMsg];
      const updatedSess = { ...activeSession, messages: finalMsgs };

      setActiveSession(updatedSess);
      updateSession(activeSession.id, { messages: finalMsgs });
      setSessions(loadAllSessions());
    } catch (err) {
      console.error('Error al postularse a la vacante:', err);
    }
  };

  const handleUserAuthenticated = async (user) => {
    if (!user) return;
    setCurrentUser(user);
    if (propOnUserAuthenticated) propOnUserAuthenticated(user);

    const displayName = user.name || 'Compa';
    const displayEmail = user.email || 'tu cuenta';
    const methodStr = user.provider === 'email' ? 'tu correo personal' : 'Google';

    await syncUserWithBackend(user, {
      sessionId: activeSession?.backendSessionId,
      municipio: activeSession?.candidateProfile?.municipio || 'Apodaca',
      puesto_deseado: activeSession?.candidateProfile?.puesto_deseado || 'Operario'
    });

    const confirmMsg = {
      id: Math.random().toString(),
      sender: 'bot',
      text: `¡Qué onda, ${displayName}! 🤠 Ya vinculamos tu cuenta con ${methodStr} (${displayEmail}). Tus datos y vacantes afines quedaron guardados con éxito. Ahora te avisaremos directo cuando salgan nuevas chambas cerca de tu zona.`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const finalMsgs = [...(activeSession?.messages || []), confirmMsg];
    const updated = {
      ...activeSession,
      messages: finalMsgs,
      shouldAskLogin: false
    };
    setActiveSession(updated);
    updateSession(activeSession.id, { messages: finalMsgs, shouldAskLogin: false });
  };

  const handleLogout = async () => {
    await signOut();
    setCurrentUser(null);
    if (propOnLogout) propOnLogout();
  };

  const handleSendMessage = (text = inputMessage) => {
    if (!text.trim()) return;
    if (
      text.toLowerCase().includes('compartir mi ubicación') ||
      text.toLowerCase().includes('compartir ubicacion')
    ) {
      setIsLocationModalOpen(true);
      setInputMessage('');
      return;
    }
    sendToBot({ textToSend: text });
    setInputMessage('');
  };

  const handleOptionSelect = (optionVal) => {
    if (
      optionVal === 'Quiero compartir mi ubicación para ver rutas de transporte' ||
      (typeof optionVal === 'string' && optionVal.toLowerCase().includes('compartir mi ubicación'))
    ) {
      setIsLocationModalOpen(true);
      return;
    }
    sendToBot({ optionVal });
  };

  const handleLocationConfirmed = async (newLoc) => {
    setCandidateLocation(newLoc);
    try {
      localStorage.setItem('candidate_location', JSON.stringify(newLoc));
    } catch (e) {}
    await sendToBot({ location: newLoc });
  };

  const starterPrompts = [
    {
      title: '🚜 Vacantes de Montacarguista',
      subtitle: 'Hombre sentado y parado con sueldos de hasta $3,400/sem',
      prompt: 'Habrá vacantes de montacarguista?'
    },
    {
      title: '🏭 Operario en Apodaca',
      subtitle: 'Ensamble y producción con ruta de transporte de personal',
      prompt: 'Busco vacantes de operario de producción en Apodaca con transporte'
    },
    {
      title: '⏱️ Turnos Fijos sin Rolar',
      subtitle: 'Mayor descanso y estabilidad para tu familia',
      prompt: 'Busco puestos que ofrezcan turnos fijos sin rolación'
    },
    {
      title: '💰 Sueldos mayores a $2,800/sem',
      subtitle: 'Puestos de montacargas, soldadura y maquinado CNC',
      prompt: '¿Cuáles son las vacantes con sueldo superior a $2,800 semanales libres?'
    }
  ];

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
          {(!activeSession?.messages || activeSession.messages.length === 0) ? (
            <div className="py-8 sm:py-16 text-center space-y-6 sm:space-y-8 animate-fadeIn">
              <div className="flex justify-center">
                <img src="/chambot.png" alt="Chambot" className="w-20 h-20 sm:w-24 sm:h-24 object-contain drop-shadow-md hover:scale-105 transition-transform" />
              </div>
              <div className="space-y-1.5 sm:space-y-2 px-2">
                <h1 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  ¡Qué onda! ¿En qué te ayudo hoy a jalar?
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                  Pregúntame sobre vacantes de montacarguistas, ensamble, almacén, turnos fijos o sueldos en Nuevo León.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 text-left pt-2 sm:pt-4">
                {starterPrompts.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(item.prompt)}
                    className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/70 hover:border-emerald-300 transition text-left group shadow-sm"
                  >
                    <div className="font-bold text-xs text-slate-800 group-hover:text-emerald-700 transition">{item.title}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{item.subtitle}</div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-6 min-w-0">
              <MessageList messages={activeSession.messages} isTyping={isTyping} />

              {(!currentUser && activeSession?.shouldAskLogin) && (
                <div className="pl-0 sm:pl-10 py-2 animate-fadeIn w-full min-w-0">
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/90 shadow-sm max-w-md space-y-2.5">
                    <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Guarda tu perfil para postularte a plantas</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Vincula tu cuenta para guardar tu municipio, ver las mejores vacantes y recibir avisos de contratación.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsAuthModalOpen(true)}
                      className="flex items-center justify-center gap-2.5 w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold border border-slate-300 shadow-xs transition"
                    >
                      <User className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Conectar Cuenta (Google o Correo)</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="pl-0 sm:pl-10 py-1 animate-fadeIn w-full min-w-0">
                <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-emerald-50/80 via-teal-50/70 to-sky-50/80 border border-emerald-200/90 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <MapPin className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-extrabold text-slate-900">
                          {candidateLocation ? '📍 Tu Ubicación Registrada' : '📍 Ubicación para Transporte y Cercanía'}
                        </span>
                        {candidateLocation && (
                          <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300">
                            {candidateLocation.colonia}, {candidateLocation.municipio}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                        {candidateLocation 
                          ? 'Calculamos las empresas con menor tiempo de traslado y las rutas de camión con paradas por tu casa.'
                          : 'Comparte dónde vives (GPS o selecciona en el mapa) para ver qué plantas y camiones de personal pasan por tu colonia.'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsLocationModalOpen(true)}
                    className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-[0.98] text-white text-xs font-bold shadow-xs transition shrink-0 self-start sm:self-center"
                  >
                    <Navigation className="w-3.5 h-3.5 text-emerald-200" />
                    <span>{candidateLocation ? 'Cambiar ubicación' : 'Compartir mi ubicación'}</span>
                  </button>
                </div>
              </div>

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

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthenticated={handleUserAuthenticated}
      />

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
