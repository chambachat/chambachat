import React, { useState, useEffect } from 'react';
import { Inbox, Briefcase, Users } from 'lucide-react';
import TopNavbar from '../TopNavbar';
import RecruiterSidebar from './RecruiterSidebar';
import RecruiterConversation from './RecruiterConversation';
import { useApplicationsInbox } from '../../../hooks/useApplicationsInbox';
import { useToast } from '../../ui/Toast';
import { deriveRecruiterName, markSeen, takeFocusApplication } from '../../../services/recruiterChat';

const isMobile = () => typeof window !== 'undefined' && window.innerWidth < 768;

function EmptyState({ loading, total, onOpenEmpresa, onOpenList }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400">
      <Inbox className="w-12 h-12 text-slate-300 mb-3" />
      {loading ? (
        <p className="text-xs">Cargando candidatos...</p>
      ) : total === 0 ? (
        <>
          <h3 className="text-sm font-bold text-slate-700">Aún no tienes postulaciones</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            Publica vacantes y comparte tu Smart Link. Cuando un candidato abra el chat directo de una vacante, su conversación aparecerá aquí.
          </p>
          <button type="button" onClick={onOpenEmpresa} className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-emerald-600 text-white text-xs font-bold transition">
            <Briefcase className="w-4 h-4" />
            <span>Ir al Portal Empresa</span>
          </button>
        </>
      ) : (
        <>
          <h3 className="text-sm font-bold text-slate-700">Elige un candidato</h3>
          <p className="text-xs text-slate-400 mt-1">Selecciona una conversación de la lista para responderle.</p>
          <button type="button" onClick={onOpenList} className="mt-4 md:hidden flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold">
            <Users className="w-4 h-4" />
            <span>Ver candidatos</span>
          </button>
        </>
      )}
    </div>
  );
}

/**
 * Chat en modo empresa: la barra lateral lista a los candidatos que se postularon a las
 * vacantes de la empresa y el panel principal es la conversación con el seleccionado.
 * En celular arranca en la lista y al elegir un candidato pasa a la conversación (estilo mensajería).
 */
export default function RecruiterChatLayout({ currentUser, onOpenEmpresa, onOpenPerfil, onOpenAdmin, onSwitchToCandidate }) {
  const toast = useToast();
  const [focusId] = useState(() => takeFocusApplication());  // "Retomar chat" desde Candidatos preferidos
  const inbox = useApplicationsInbox(4000, focusId);
  const [sidebarOpen, setSidebarOpen] = useState(() => !focusId);
  const recruiterName = deriveRecruiterName(currentUser);
  const selected = inbox.selectedApp;

  // Solo se marca como leído cuando la conversación realmente está a la vista
  useEffect(() => {
    if (selected && (!isMobile() || !sidebarOpen)) markSeen(selected);
  }, [selected?.id, selected?.messages?.length, sidebarOpen]);

  const handleSelect = (app) => {
    inbox.setSelectedApp(app);
    markSeen(app);
  };

  const handleSend = async (text) => {
    const ok = await inbox.sendMessage(text, recruiterName);
    if (!ok) toast.error('No se pudo enviar el mensaje. Revisa tu conexión e inténtalo de nuevo.');
  };

  const handleToggleFavorite = async (app) => {
    try {
      const added = await inbox.toggleFavorite(app);
      toast.success(added ? `${app.candidate_name} quedó en tus candidatos preferidos` : 'Quitado de candidatos preferidos');
    } catch (err) {
      toast.error(err.message || 'No se pudo actualizar');
    }
  };

  const handleToggleBlock = async (app) => {
    const blocking = !app.blocked_by_company;
    if (blocking && !(await toast.confirm(`¿Bloquear a ${app.candidate_name}? No podrá escribirte ni postularse a tus vacantes. Puedes quitar el bloqueo después.`))) return;
    try {
      await inbox.toggleBlock(app);
      toast.success(blocking ? 'Candidato bloqueado' : 'Bloqueo retirado');
    } catch (err) {
      toast.error(err.message || 'No se pudo actualizar el bloqueo');
    }
  };

  const handleDelete = async (app) => {
    const ok = await toast.confirm(
      `¿Eliminar la conversación con ${app.candidate_name} para "${app.job_titulo}"? Se borra la postulación y todos sus mensajes; el candidato verá el chat como cerrado.`
    );
    if (!ok) return;
    try {
      await inbox.removeApplication(app.id);
      toast.success('Conversación eliminada');
      if (isMobile()) setSidebarOpen(true);
    } catch (err) {
      toast.error(err.message || 'No se pudo eliminar la conversación');
    }
  };

  return (
    <div className="chat-app-root flex w-full max-w-full bg-[#fcfdfd] text-slate-800 font-sans overflow-hidden">
      <RecruiterSidebar
        applications={inbox.applications}
        loading={inbox.loading}
        selectedId={selected?.id}
        onSelect={handleSelect}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(o => !o)}
        currentUser={currentUser}
        onOpenEmpresa={onOpenEmpresa}
        onOpenPerfil={onOpenPerfil}
        onOpenAdmin={onOpenAdmin}
        onSwitchToCandidate={onSwitchToCandidate}
      />

      <main className="flex-1 flex flex-col h-full bg-white relative min-w-0 w-full overflow-hidden">
        <TopNavbar
          currentUser={currentUser}
          onOpenPerfil={onOpenPerfil}
          onLogin={() => {}}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />

        {selected ? (
          <RecruiterConversation
            app={selected}
            recruiterName={recruiterName}
            sending={inbox.sending}
            onSend={handleSend}
            onToggleBot={inbox.toggleBot}
            botActionLoading={inbox.botActionLoading}
            onDelete={handleDelete}
            onToggleFavorite={handleToggleFavorite}
            onToggleBlock={handleToggleBlock}
            actionLoading={inbox.actionLoading}
          />
        ) : (
          <EmptyState loading={inbox.loading} total={inbox.applications.length} onOpenEmpresa={onOpenEmpresa} onOpenList={() => setSidebarOpen(true)} />
        )}
      </main>
    </div>
  );
}
