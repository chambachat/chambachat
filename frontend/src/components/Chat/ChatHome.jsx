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

  // Bloquear el desplazamiento de la página: el encabezado con el menú queda fijo y solo se mueven los mensajes.
  // En iPhone, Safari desplaza la página al abrir/cerrar el teclado aunque el scroll esté bloqueado:
  // se regresa arriba y la raíz del chat toma la altura realmente visible (visualViewport).
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('chat-lock');
    const resetScroll = () => {
      if (window.scrollY !== 0 || window.scrollX !== 0) window.scrollTo(0, 0);
    };
    const onFocusOut = () => setTimeout(resetScroll, 80);
    const vv = window.visualViewport;
    const onViewport = () => {
      if (vv) root.style.setProperty('--chat-vh', `${Math.round(vv.height)}px`);
      resetScroll();
    };
    if (vv) {
      vv.addEventListener('resize', onViewport);
      vv.addEventListener('scroll', onViewport);
      onViewport();
    }
    window.addEventListener('scroll', resetScroll, { passive: true });
    document.addEventListener('focusout', onFocusOut);
    return () => {
      if (vv) {
        vv.removeEventListener('resize', onViewport);
        vv.removeEventListener('scroll', onViewport);
      }
      window.removeEventListener('scroll', resetScroll);
      document.removeEventListener('focusout', onFocusOut);
      root.style.removeProperty('--chat-vh');
      root.classList.remove('chat-lock');
    };
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
