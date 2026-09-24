import { useState, useEffect, useCallback } from 'react';
import {
  getApplications,
  sendRecruiterMessage,
  toggleBotState,
  checkBotFallback,
  deleteApplication
} from '../services/api';

/**
 * Bandeja de postulaciones del reclutador: carga con polling, selección,
 * envío de mensajes y control de Chambot en el chat grupal.
 */
export function useApplicationsInbox(pollMs = 4000) {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState(null);
  const [sending, setSending] = useState(false);
  const [botActionLoading, setBotActionLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const data = await getApplications();
      setApplications(data);
      setSelectedApp(prev => {
        if (!prev) return data.length > 0 ? data[0] : null;
        // Si la seleccionada ya no existe (eliminada), pasar a la primera disponible
        return data.find(a => a.id === prev.id) || (data.length > 0 ? data[0] : null);
      });
    } catch (err) {
      console.error('Error cargando postulaciones:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, pollMs);
    return () => clearInterval(interval);
  }, [loadData, pollMs]);

  const sendMessage = async (mensaje, senderName) => {
    if (!mensaje.trim() || !selectedApp) return false;
    setSending(true);
    try {
      await sendRecruiterMessage(selectedApp.id, {
        senderType: 'recruiter',
        senderName: senderName || 'Equipo de Reclutamiento',
        mensaje: mensaje.trim()
      });
      await loadData();
      return true;
    } catch (err) {
      console.error('Error enviando mensaje al candidato:', err);
      return false;
    } finally {
      setSending(false);
    }
  };

  const runBotAction = async (action) => {
    if (!selectedApp) return;
    setBotActionLoading(true);
    try {
      await action(selectedApp.id);
      await loadData();
    } catch (err) {
      console.error('Error en acción de Chambot:', err);
    } finally {
      setBotActionLoading(false);
    }
  };

  /** Elimina la postulación y su conversación; la selección pasa a la siguiente. */
  const removeApplication = async (applicationId) => {
    setDeleting(true);
    try {
      await deleteApplication(applicationId);
      setApplications(prev => prev.filter(a => a.id !== applicationId));
      setSelectedApp(prev => (prev?.id === applicationId ? null : prev));
      await loadData();
    } finally {
      setDeleting(false);
    }
  };

  const toggleBot = (silenced) => runBotAction((id) => toggleBotState(id, silenced));
  const forceBotFallback = () => runBotAction((id) => checkBotFallback(id, true));

  return {
    applications,
    loading,
    selectedApp,
    setSelectedApp,
    sending,
    botActionLoading,
    deleting,
    removeApplication,
    sendMessage,
    toggleBot,
    forceBotFallback,
    reload: loadData
  };
}
