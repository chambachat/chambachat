import { useState, useEffect, useCallback } from 'react';
import {
  getApplications,
  sendRecruiterMessage,
  toggleBotState,
  checkBotFallback,
  deleteApplication,
  addFavorite,
  removeFavorite,
  getMyBlocks,
  createBlock,
  removeBlock
} from '../services/api';

/**
 * Bandeja de postulaciones del reclutador: carga con polling, selección,
 * envío de mensajes y control de Chambot en el chat grupal.
 */
export function useApplicationsInbox(pollMs = 4000, initialSelectedId = null) {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState(null);
  const [sending, setSending] = useState(false);
  const [botActionLoading, setBotActionLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const data = await getApplications();
      setApplications(data);
      setSelectedApp(prev => {
        if (!prev) return (initialSelectedId && data.find(a => a.id === initialSelectedId)) || (data.length > 0 ? data[0] : null);
        // Si la seleccionada ya no existe (eliminada), pasar a la primera disponible
        return data.find(a => a.id === prev.id) || (data.length > 0 ? data[0] : null);
      });
    } catch (err) {
      console.error('Error cargando postulaciones:', err);
    } finally {
      setLoading(false);
    }
  }, [initialSelectedId]);

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

  /** ⭐ Agrega o quita al candidato de los preferidos de la empresa. Devuelve true si quedó marcado. */
  const toggleFavorite = async (app) => {
    const companyId = app.job_details?.empresa_id;
    if (!companyId) throw new Error('Esta postulación no está ligada a una empresa');
    setActionLoading(true);
    try {
      if (app.favorite_id) await removeFavorite(companyId, app.favorite_id);
      else await addFavorite(companyId, { candidate_email: app.candidate_email, candidate_name: app.candidate_name, application_id: app.id });
      await loadData();
      return !app.favorite_id;
    } finally {
      setActionLoading(false);
    }
  };

  /** Bloquea o desbloquea al candidato para la empresa. Devuelve true si quedó bloqueado. */
  const toggleBlock = async (app) => {
    const companyId = app.job_details?.empresa_id;
    if (!companyId) throw new Error('Esta postulación no está ligada a una empresa');
    setActionLoading(true);
    try {
      if (app.blocked_by_company) {
        const blocks = await getMyBlocks();
        const block = blocks.find(b => b.blocker_type === 'company' && b.company_id === companyId && b.candidate_email === (app.candidate_email || '').toLowerCase());
        if (block) await removeBlock(block.id);
      } else {
        await createBlock({ blocker_type: 'company', company_id: companyId, candidate_email: app.candidate_email });
      }
      await loadData();
      return !app.blocked_by_company;
    } finally {
      setActionLoading(false);
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
    actionLoading,
    toggleFavorite,
    toggleBlock,
    sendMessage,
    toggleBot,
    forceBotFallback,
    reload: loadData
  };
}
