import { useState, useEffect } from 'react';
import { getApplicationsBySession, checkBotFallback } from '../services/api';

export function useApplicationPolling(backendSessionId, onNewMessages) {
  useEffect(() => {
    if (!backendSessionId) return;

    const interval = setInterval(async () => {
      try {
        const apps = await getApplicationsBySession(backendSessionId);
        if (!apps || apps.length === 0) return;

        const newIncomingMsgs = [];
        for (const app of apps) {
          if (!app.bot_silenced) {
            try {
              await checkBotFallback(app.id, false);
            } catch (e) {
              // Silencioso
            }
          }

          for (const m of app.messages || []) {
            let senderRole = 'bot';
            if (m.sender_type === 'recruiter') senderRole = 'recruiter';
            else if (m.sender_type === 'system') senderRole = 'system';
            else if (m.sender_type === 'candidate') senderRole = 'user';

            if (senderRole !== 'user') {
              newIncomingMsgs.push({
                id: `appmsg_${m.id}`,
                sender: senderRole,
                sender_name: m.sender_name || (m.sender_type === 'recruiter' ? `Reclutador ${app.empresa_nombre}` : 'Chambot (IA)'),
                text: m.mensaje,
                time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              });
            }
          }
        }

        if (newIncomingMsgs.length > 0) {
          onNewMessages(newIncomingMsgs);
        }
      } catch (err) {
        // Silencioso en sondeo
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [backendSessionId, onNewMessages]);
}
