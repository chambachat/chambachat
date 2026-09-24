import React, { useEffect, useState } from 'react';
import { ClipboardList, Pencil, Sparkles } from 'lucide-react';
import { getMyProfile } from '../../services/api';

/** Resumen del currículum operativo dentro del perfil, con completitud y acceso a editarlo. */
export default function ResumeSummaryCard({ currentUser, onEdit, refreshKey = 0 }) {
  const [profile, setProfile] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    setFailed(false);
    getMyProfile().then(setProfile).catch(() => setFailed(true));
  }, [currentUser?.email, refreshKey]);

  if (!currentUser) {
    return (
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-500">
        Inicia sesión para guardar tu currículum operativo: Chambot lo va llenando con lo que le cuentes y tú puedes completarlo cuando quieras.
      </div>
    );
  }

  const facts = profile ? [
    profile.puesto_deseado && ['Busco', profile.puesto_deseado],
    profile.escolaridad && ['Escolaridad', profile.escolaridad],
    profile.experiencia_general && ['Experiencia', profile.experiencia_general],
    profile.certificaciones?.length ? ['Certificaciones', profile.certificaciones.join(', ')] : null,
    profile.disponibilidad && ['Disponible', profile.disponibilidad],
    profile.turno_preferido && ['Turno', profile.turno_preferido],
    profile.edad && ['Edad', `${profile.edad} años`],
  ].filter(Boolean) : [];

  return (
    <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs uppercase tracking-wide">
          <ClipboardList className="w-4 h-4 text-emerald-600" />
          <span>Mi currículum operativo</span>
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-white hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 transition"
        >
          <Pencil className="w-3 h-3" />
          <span>{profile && profile.completitud >= 70 ? 'Editar' : 'Completar'}</span>
        </button>
      </div>

      {failed ? (
        <p className="text-xs text-slate-500">No se pudo cargar tu currículum. Intenta de nuevo en un momento.</p>
      ) : !profile ? (
        <p className="text-xs text-slate-400">Cargando...</p>
      ) : (
        <>
          <div className="flex items-center gap-3 text-xs">
            <div className="flex-1 bg-white rounded-full h-2 overflow-hidden border border-emerald-100">
              <div className="bg-emerald-500 h-2 rounded-full transition-all" style={{ width: `${profile.completitud}%` }} />
            </div>
            <span className="font-black text-emerald-700">{profile.completitud}%</span>
          </div>

          {facts.length > 0 ? (
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px]">
              {facts.map(([label, value]) => (
                <li key={label} className="flex gap-1 min-w-0">
                  <span className="text-slate-500 shrink-0">{label}:</span>
                  <span className="font-semibold text-slate-800 truncate">{value}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-500">Aún no hay datos. Chambot te irá preguntando en el chat, o complétalo tú aquí.</p>
          )}

          {profile.faltantes?.length > 0 && (
            <p className="text-[10px] text-slate-500 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-600 shrink-0" />
              <span>Falta: {profile.faltantes.join(', ')}.</span>
            </p>
          )}
        </>
      )}
    </div>
  );
}
