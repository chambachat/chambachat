import { useEffect, useRef } from 'react';
import { getMyApplications, checkBotFallback } from '../services/api';
import { missingMessages, metaFromApplication } from '../services/directChat';

const POLL_MS = 4000;

/**
 * Sondea los chats directos del candidato autenticado (todas sus postulaciones en una sola llamada)
 * y entrega los mensajes nuevos de reclutadores, Chambot o sistema por conversación.
 * También dispara el respaldo de Chambot cuando el reclutador tarda más de 2 minutos.
 */
export function useDirectChatsPolling(sessions, currentUser, onNewMessages) {
  const sessionsRef = useRef(sessions);
  sessionsRef.current = sessions;
  const onNewRef = useRef(onNewMessages);
  onNewRef.current = onNewMessages;

  const hasDirect = (sessions || []).some(s => s.kind === 'direct');
  const enabled = Boolean(currentUser?.email) && hasDirect;

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;

    const tick = async () => {
      try {
        const apps = (await getMyApplications()) || [];
        if (cancelled) return;
        const byAppId = new Map(apps.map(a => [a.id, a]));
        const myEmail = (currentUser?.email || '').toLowerCase();

        for (const session of sessionsRef.current || []) {
          if (session.kind !== 'direct') continue;
          const app = byAppId.get(session.applicationId);
          if (!app) {
            // La postulación ya no existe (el reclutador la eliminó): cerrar la conversación una sola vez
            const mine = !session.candidateEmail || session.candidateEmail.toLowerCase() === myEmail;
            if (mine && !session.closed) onNewRef.current(session.id, [], { closed: true });
            continue;
          }

          const last = app.messages?.[app.messages.length - 1];
          if (!app.bot_silenced && last?.sender_type === 'candidate') {
            checkBotFallback(app.id, false).catch(() => {});
          }

          // Siempre se avisa: aunque no haya mensajes nuevos puede cambiar el estado de la entrevista
          onNewRef.current(session.id, missingMessages(session, app), metaFromApplication(app));
        }
      } catch (e) {
        // Silencioso: el sondeo reintenta en el siguiente ciclo
      }
    };

    tick();
    const interval = setInterval(tick, POLL_MS);
    return () => { cancelled = true; clearInterval(interval); };
  }, [enabled, currentUser?.email]);
}
