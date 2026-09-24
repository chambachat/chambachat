import React from 'react';
import { Star, Ban, ShieldCheck } from 'lucide-react';

/**
 * Acciones del reclutador sobre un candidato dentro del chat:
 * ⭐ agregar/quitar de candidatos preferidos y bloquear/desbloquear.
 */
export default function CandidateActionButtons({ app, onToggleFavorite, onToggleBlock, loading = false }) {
  const isFavorite = Boolean(app.favorite_id);
  const blockedByUs = Boolean(app.blocked_by_company);
  const noCompany = !app.job_details?.empresa_id;

  return (
    <>
      {onToggleFavorite && (
        <button
          type="button"
          onClick={() => onToggleFavorite(app)}
          disabled={loading || noCompany}
          title={isFavorite ? 'Quitar de candidatos preferidos' : 'Agregar a candidatos preferidos'}
          className={`p-1.5 rounded-lg border transition disabled:opacity-40 ${
            isFavorite
              ? 'bg-amber-400 border-amber-400 text-white hover:bg-amber-500'
              : 'border-slate-200 text-slate-400 hover:text-amber-500 hover:bg-amber-50 hover:border-amber-200'
          }`}
        >
          <Star className="w-4 h-4" fill={isFavorite ? 'currentColor' : 'none'} />
        </button>
      )}

      {onToggleBlock && (
        <button
          type="button"
          onClick={() => onToggleBlock(app)}
          disabled={loading || noCompany}
          title={blockedByUs ? 'Quitar el bloqueo a este candidato' : 'Bloquear candidato: no podrá escribir ni postularse'}
          className={`p-1.5 rounded-lg border transition disabled:opacity-40 ${
            blockedByUs
              ? 'bg-rose-600 border-rose-600 text-white hover:bg-rose-700'
              : 'border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200'
          }`}
        >
          {blockedByUs ? <ShieldCheck className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
        </button>
      )}

      {app.blocked_by_candidate && (
        <span
          title="El candidato bloqueó a tu empresa: no es posible escribirle"
          className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 shrink-0"
        >
          Te bloqueó
        </span>
      )}
    </>
  );
}
