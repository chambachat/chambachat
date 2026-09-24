import React, { useState, useEffect } from 'react';
import { MessageSquare } from 'lucide-react';
import { useApplicationsInbox } from '../../hooks/useApplicationsInbox';
import { useToast } from '../ui/Toast';
import SmartLinkCard from './Applications/SmartLinkCard';
import ApplicationsList from './Applications/ApplicationsList';
import ApplicationDetail from './Applications/ApplicationDetail';
import ApplicationChat from './Applications/ApplicationChat';

function deriveRecruiterName(user) {
  if (!user?.name) return 'Reclutador Industrial';
  return user.role === 'recruiter' ? user.name : `Reclutador ${user.name}`;
}

export default function CandidateApplications({ currentUser }) {
  const inbox = useApplicationsInbox();
  const toast = useToast();
  const [recruiterName, setRecruiterName] = useState(deriveRecruiterName(currentUser));

  const handleDelete = async (app) => {
    const ok = await toast.confirm(
      `¿Eliminar la conversación con ${app.candidate_name} para "${app.job_titulo}"? Se borra la postulación y todos sus mensajes; el candidato verá el chat como cerrado.`
    );
    if (!ok) return;
    try {
      await inbox.removeApplication(app.id);
      toast.success('Conversación eliminada');
    } catch (err) {
      toast.error(err.message || 'No se pudo eliminar la conversación');
    }
  };

  useEffect(() => {
    if (currentUser?.name) setRecruiterName(deriveRecruiterName(currentUser));
  }, [currentUser]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-wider mb-1">
            <MessageSquare className="w-4 h-4" />
            <span>Centro de Contacto & Postulaciones</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Postulaciones y Mensajería con Candidatos
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl mt-1">
            Revisa las solicitudes de operarios recibidas en tiempo real por el chat y comunícate con ellos directamente en esta plataforma o por WhatsApp.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl px-4 py-2 text-right shadow-sm">
          <span className="text-xs text-slate-400 block font-medium">Postulaciones Activas</span>
          <span className="text-xl font-black text-emerald-600">{inbox.applications.length}</span>
        </div>
      </div>

      <SmartLinkCard currentUser={currentUser} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-white border border-slate-200 rounded-3xl p-4 sm:p-6 shadow-sm min-h-[580px]">
        <ApplicationsList
          applications={inbox.applications}
          loading={inbox.loading}
          selectedApp={inbox.selectedApp}
          onSelect={inbox.setSelectedApp}
          onDelete={handleDelete}
        />

        <div className="lg:col-span-7 flex flex-col justify-between pl-0 lg:pl-2 space-y-4">
          {inbox.selectedApp ? (
            <>
              <ApplicationDetail
                app={inbox.selectedApp}
                botActionLoading={inbox.botActionLoading}
                onToggleBot={inbox.toggleBot}
                onForceBotFallback={inbox.forceBotFallback}
                onDelete={handleDelete}
                deleting={inbox.deleting}
              />
              <ApplicationChat
                app={inbox.selectedApp}
                recruiterName={recruiterName}
                onRecruiterNameChange={setRecruiterName}
                onSend={inbox.sendMessage}
                sending={inbox.sending}
              />
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
              <MessageSquare className="w-12 h-12 text-slate-300 mb-2" />
              <h3 className="text-sm font-bold text-slate-700">Selecciona una postulación</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Haz clic en cualquier candidato de la lista izquierda para comunicarte con él o contactarlo por WhatsApp.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
