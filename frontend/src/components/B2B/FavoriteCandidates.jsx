import React, { useEffect, useState } from 'react';
import { Star, MessageSquare, Trash2, Ban, Phone, Sparkles, Building2 } from 'lucide-react';
import { useToast } from '../ui/Toast';
import { getUserCompanies, getFavorites, removeFavorite, createBlock } from '../../services/api';
import { initials } from '../../services/recruiterChat';

function levelClass(level) {
  if (level === 'Alta') return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  if (level === 'Media') return 'bg-amber-100 text-amber-800 border-amber-200';
  if (level === 'Baja') return 'bg-rose-100 text-rose-700 border-rose-200';
  return 'bg-slate-100 text-slate-600 border-slate-200';
}

/** Candidatos marcados con ⭐ desde el chat: se retoma la conversación cuando haga falta. */
export default function FavoriteCandidates({ activeCompany, onOpenChat }) {
  const toast = useToast();
  const [companies, setCompanies] = useState([]);
  const [companyId, setCompanyId] = useState(activeCompany?.id || '');
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUserCompanies()
      .then((data) => {
        const list = data || [];
        setCompanies(list);
        setCompanyId(prev => prev || (list.some(c => c.id === activeCompany?.id) ? activeCompany.id : list[0]?.id || ''));
        if (list.length === 0) setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const load = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      setFavorites(await getFavorites(companyId));
    } catch (err) {
      toast.error(err.message || 'No se pudieron cargar los candidatos preferidos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [companyId]);

  const handleRemove = async (fav) => {
    if (!(await toast.confirm(`¿Quitar a ${fav.candidate_name || fav.candidate_email} de tus candidatos preferidos?`))) return;
    try {
      await removeFavorite(companyId, fav.id);
      toast.success('Quitado de preferidos');
      load();
    } catch (err) {
      toast.error(err.message || 'No se pudo quitar');
    }
  };

  const handleBlock = async (fav) => {
    if (!(await toast.confirm(`¿Bloquear a ${fav.candidate_name || fav.candidate_email}? No podrá escribirte ni postularse a tus vacantes. Puedes quitar el bloqueo después desde su chat.`))) return;
    try {
      await createBlock({ blocker_type: 'company', company_id: companyId, candidate_email: fav.candidate_email });
      toast.success('Candidato bloqueado');
      load();
    } catch (err) {
      toast.error(err.message || 'No se pudo bloquear');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-600 font-bold text-xs tracking-wider uppercase mb-1">
            <Star className="w-4 h-4" fill="currentColor" />
            <span>Talento guardado</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Candidatos preferidos</h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl mt-1">
            Los candidatos que marcaste con la estrella en el chat. Retoma la conversación cuando abras una vacante nueva o quieras darles seguimiento.
          </p>
        </div>
        {companies.length > 1 && (
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-600" />
            <select value={companyId} onChange={(e) => setCompanyId(Number(e.target.value))} className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500">
              {companies.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
        )}
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">Cargando candidatos preferidos...</div>
      ) : favorites.length === 0 ? (
        <div className="py-14 text-center bg-white border border-dashed border-slate-200 rounded-3xl space-y-2">
          <Star className="w-10 h-10 text-amber-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700">Aún no tienes candidatos preferidos</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            En el chat con un candidato toca la ⭐ para guardarlo aquí. Así lo encuentras rápido y retomas la plática cuando haga falta.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {favorites.map(fav => (
            <div key={fav.id} className={`bg-white rounded-2xl p-5 border shadow-sm flex flex-col justify-between gap-4 ${fav.blocked ? 'border-rose-200 opacity-80' : 'border-slate-200 hover:border-amber-300'}`}>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-amber-100 border border-amber-300 text-amber-800 text-sm font-black flex items-center justify-center shrink-0">
                    {initials(fav.candidate_name || fav.candidate_email)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-black text-slate-900 truncate">{fav.candidate_name || fav.candidate_email}</h3>
                      {fav.blocked && <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200">Bloqueado</span>}
                    </div>
                    <span className="text-[11px] text-slate-500 block truncate">{fav.candidate_email}</span>
                    {fav.candidate_phone && (
                      <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1"><Phone className="w-3 h-3" />{fav.candidate_phone}</span>
                    )}
                  </div>
                </div>

                {fav.application ? (
                  <div className="text-[11px] bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-800 truncate">{fav.application.job_titulo || 'Vacante'}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 shrink-0">{fav.application.status}</span>
                    </div>
                    {fav.application.match_score != null && (
                      <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-md border ${levelClass(fav.application.match_level)}`}>
                        <Sparkles className="w-3 h-3" />
                        {fav.application.match_score}%{fav.application.match_level ? ` · ${fav.application.match_level}` : ' estimado'}
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400">Sin postulaciones registradas con esta planta.</p>
                )}

                {fav.nota && <p className="text-xs text-slate-600 italic">“{fav.nota}”</p>}
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={!fav.application || fav.blocked}
                  onClick={() => onOpenChat?.(fav.application.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-emerald-600 disabled:opacity-40 text-white text-xs font-bold transition"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Retomar chat</span>
                </button>
                <button type="button" onClick={() => handleRemove(fav)} title="Quitar de preferidos" className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition">
                  <Trash2 className="w-4 h-4" />
                </button>
                {!fav.blocked && (
                  <button type="button" onClick={() => handleBlock(fav)} title="Bloquear candidato" className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition">
                    <Ban className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
