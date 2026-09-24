import React, { useState } from 'react';
import { useToast } from '../ui/Toast';
import { createBlock, getMyBlocks, removeBlock } from '../../services/api';
import { ShieldCheck, User, MapPin, Navigation, Building2, Bot, ClipboardList, CheckCircle2, Ban } from 'lucide-react';

/**
 * Encabezado fijo de una conversación directa con los reclutadores de una planta:
 * estado, avance de la entrevista y bloqueo de la empresa (por acoso o insistencia).
 */
export function DirectChatBanner({ session, onMetaChange }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const contacted = session?.status && session.status !== 'Pendiente';
  const canBlock = Boolean(session.companyId) && !session.closed && !session.blockedByCompany;

  const [badgeText, badgeClass] = session.closed ? ['Conversación cerrada', 'bg-slate-100 text-slate-600 border-slate-300']
    : session.blockedByCompany ? ['Cerrada por la empresa', 'bg-slate-100 text-slate-600 border-slate-300']
    : session.blockedByCandidate ? ['Empresa bloqueada', 'bg-rose-100 text-rose-700 border-rose-300']
    : contacted ? ['Reclutador en el chat', 'bg-emerald-100 text-emerald-800 border-emerald-300']
    : ['Esperando al reclutador', 'bg-amber-100 text-amber-800 border-amber-300'];

  const blockCompany = async () => {
    const ok = await toast.confirm(
      `¿Bloquear a ${session.companyName}? Sus reclutadores ya no podrán escribirte y no te propondremos sus vacantes. Puedes desbloquearla después desde aquí o desde tu perfil.`
    );
    if (!ok) return;
    setBusy(true);
    try {
      await createBlock({ blocker_type: 'candidate', company_id: session.companyId });
      onMetaChange?.({ blockedByCandidate: true });
      toast.success('Empresa bloqueada');
    } catch (err) {
      toast.error(err.message || 'No se pudo bloquear a la empresa');
    } finally {
      setBusy(false);
    }
  };

  const unblockCompany = async () => {
    setBusy(true);
    try {
      const blocks = await getMyBlocks();
      const block = blocks.find(b => b.blocker_type === 'candidate' && b.company_id === session.companyId);
      if (block) await removeBlock(block.id);
      onMetaChange?.({ blockedByCandidate: false });
      toast.success('Bloqueo retirado');
    } catch (err) {
      toast.error(err.message || 'No se pudo quitar el bloqueo');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pl-0 sm:pl-10 pb-1 w-full min-w-0 animate-fadeIn">
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-50 to-sky-50 border border-blue-200/80 shadow-sm space-y-1.5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 text-xs font-extrabold text-blue-950 min-w-0">
            <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="truncate">Línea directa con Reclutamiento {session.companyName}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${badgeClass}`}>{badgeText}</span>
            {canBlock && !session.blockedByCandidate && (
              <button
                type="button"
                onClick={blockCompany}
                disabled={busy}
                title="Bloquear a esta empresa (dejará de escribirte)"
                className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition disabled:opacity-40"
              >
                <Ban className="w-3.5 h-3.5" />
              </button>
            )}
            {session.blockedByCandidate && (
              <button type="button" onClick={unblockCompany} disabled={busy} className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 hover:underline disabled:opacity-40">
                <ShieldCheck className="w-3 h-3" />
                <span>Desbloquear</span>
              </button>
            )}
          </div>
        </div>
        <p className="text-[11px] text-blue-900/80 leading-snug">
          Vacante: <strong>{session.jobTitle}</strong>. Lo que escribas aquí lo reciben los reclutadores de la planta.
        </p>
        {session.screeningStatus === 'in_progress' && session.screening?.total > 0 && (
          <p className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 inline-flex items-center gap-1">
            <ClipboardList className="w-3 h-3 shrink-0" />
            <span>Entrevista rápida de Chambot: pregunta {session.screening.index} de {session.screening.total}</span>
          </p>
        )}
        {session.screeningStatus === 'done' && !session.blockedByCandidate && !session.blockedByCompany && (
          <p className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-1 inline-flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 shrink-0" />
            <span>Tu información ya se envió al reclutador</span>
          </p>
        )}
        {session.blockedByCandidate && (
          <p className="text-[10px] text-rose-700">Bloqueaste a esta empresa: sus reclutadores no pueden escribirte y no te propondremos sus vacantes.</p>
        )}
        {session.blockedByCompany && (
          <p className="text-[10px] text-slate-600">La empresa cerró esta conversación. Puedes seguir buscando otras vacantes con Chambot.</p>
        )}
        <p className="text-[10px] text-blue-800/70 flex items-center gap-1">
          <Bot className="w-3 h-3 shrink-0" />
          <span>Si tardan más de 2 minutos, Chambot te contesta con los datos de la vacante.</span>
        </p>
      </div>
    </div>
  );
}

/** Invitación a vincular cuenta cuando el bot lo sugiere y no hay sesión. */
export function LoginPromptCard({ onLogin }) {
  return (
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
          onClick={onLogin}
          className="flex items-center justify-center gap-2.5 w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold border border-slate-300 shadow-xs transition"
        >
          <User className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Conectar Cuenta (Google o Correo)</span>
        </button>
      </div>
    </div>
  );
}

/**
 * Tarjeta de ubicación del candidato. Se muestra mientras no haya ubicación registrada,
 * o cuando el bot vuelve a pedirla (`asking`) porque el candidato quiere cambiarla.
 */
export function LocationCard({ location, onOpen, asking = false }) {
  const changing = Boolean(location && asking);
  return (
    <div className="pl-0 sm:pl-10 py-1 animate-fadeIn w-full min-w-0">
      <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-emerald-50/80 via-teal-50/70 to-sky-50/80 border border-emerald-200/90 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <MapPin className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-extrabold text-slate-900">
                {changing ? '📍 ¿Cambiamos tu ubicación?' : location ? '📍 Tu Ubicación Registrada' : '📍 Ubicación para Transporte y Cercanía'}
              </span>
              {location && (
                <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300">
                  {location.colonia}, {location.municipio}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
              {changing
                ? 'Elige tu nueva zona con GPS o en el mapa y vuelvo a calcular las vacantes con menor tiempo de traslado.'
                : location
                  ? 'Calculamos las empresas con menor tiempo de traslado desde tu casa.'
                  : 'Comparte dónde vives (GPS o selecciona en el mapa) para ver qué plantas te quedan más cerca.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpen}
          className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-[0.98] text-white text-xs font-bold shadow-xs transition shrink-0 self-start sm:self-center"
        >
          <Navigation className="w-3.5 h-3.5 text-emerald-200" />
          <span>{changing ? 'Elegir nueva ubicación' : location ? 'Cambiar ubicación' : 'Compartir mi ubicación'}</span>
        </button>
      </div>
    </div>
  );
}
