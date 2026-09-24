import React, { useState, useEffect, useRef } from 'react';
import GeminiChatLayout from './GeminiChatLayout';
import RecruiterChatLayout from './Recruiter/RecruiterChatLayout';
import { getChatMode, setChatMode, isCompanyUser } from '../../services/recruiterChat';

/**
 * Punto de entrada del chat.
 * - Cuentas de empresa (reclutador/admin): bandeja de candidatos con interfaz de mensajería.
 * - Candidatos e invitados: Chambot para buscar empleo.
 * La cuenta de empresa puede cambiar al chat de empleo y volver; al cambiar de usuario se vuelve al modo del rol.
 */
export default function ChatHome(props) {
  const { currentUser } = props;
  const [mode, setMode] = useState(() => getChatMode(currentUser));
  const prevEmail = useRef(currentUser?.email || null);

  useEffect(() => {
    const email = currentUser?.email || null;
    if (prevEmail.current !== email) {
      setChatMode(null);  // otra cuenta: olvidar la preferencia manual
      prevEmail.current = email;
    }
    setMode(getChatMode(currentUser));
  }, [currentUser?.email, currentUser?.role]);

  // Bloquear el desplazamiento de la página: el encabezado con el menú queda fijo y solo se mueven los mensajes
  useEffect(() => {
    document.documentElement.classList.add('chat-lock');
    return () => document.documentElement.classList.remove('chat-lock');
  }, []);

  const switchTo = (next) => {
    setChatMode(next);
    setMode(next);
  };

  if (mode === 'recruiter' && isCompanyUser(currentUser)) {
    return <RecruiterChatLayout {...props} onSwitchToCandidate={() => switchTo('candidate')} />;
  }
  return <GeminiChatLayout {...props} onSwitchToRecruiter={isCompanyUser(currentUser) ? () => switchTo('recruiter') : undefined} />;
}
