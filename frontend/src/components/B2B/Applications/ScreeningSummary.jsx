import React, { useState } from 'react';
import { Sparkles, ChevronDown, ChevronUp, ClipboardList, CheckCircle2, Clock } from 'lucide-react';

const ORDER = ['experiencia', 'escolaridad', 'cert:', 'condiciones', 'turno', 'ubicacion', 'disponibilidad'];
const rank = (key) => {
  const i = ORDER.findIndex(p => key === p || (p.endsWith(':') && key.startsWith(p)));
  return i === -1 ? ORDER.length : i;
};

function levelClass(level) {
  if (level === 'Alta') return 'bg-emerald-600 text-white';
  if (level === 'Media') return 'bg-amber-500 text-white';
  if (level === 'Baja') return 'bg-rose-500 text-white';
  return 'bg-slate-500 text-white';
}

function barClass(level) {
  if (level === 'Alta') return 'bg-emerald-500';
  if (level === 'Media') return 'bg-amber-400';
  if (level === 'Baja') return 'bg-rose-400';
  return 'bg-slate-400';
}

/**
 * Compatibilidad del candidato con la vacante, calculada con la entrevista rápida de Chambot.
 * Antes de la entrevista solo hay una estimación; durante, se muestra el avance.
 */
export default function ScreeningSummary({ app }) {
  const [open, setOpen] = useState(false);
  const done = app.screening_status === 'done';
  const inProgress = app.screening_status === 'in_progress';
  const score = app.match_score ?? null;
  const level = done ? app.match_level : null;
  const answers = Object.entries(app.screening_answers || {}).sort(([a], [b]) => rank(a) - rank(b));
  const breakdown = app.match_breakdown || [];

  return (
    <div className="bg-white rounded-xl p-3 border border-slate-200/80 space-y-2.5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="text-xs font-black text-slate-800">Compatibilidad con la vacante</span>
          </div>
          <span className={`text-xs font-black px-2.5 py-0.5 rounded-lg ${levelClass(level)}`}>
            {score != null ? `${score}%` : 'N/D'}{level ? ` · ${level}` : ''}
          </span>
          <div className="w-24 sm:w-28 bg-slate-100 rounded-full h-2 overflow-hidden">
            <div className={`${barClass(level)} h-2 rounded-full transition-all duration-500`} style={{ width: `${score ?? 0}%` }} />
          </div>
        </div>

        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border flex items-center gap-1 shrink-0 ${
          done ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
            : inProgress ? 'bg-amber-50 text-amber-800 border-amber-200'
            : 'bg-slate-50 text-slate-600 border-slate-200'
        }`}>
          {done ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
          <span>
            {done ? 'Entrevista de Chambot completada'
              : inProgress ? `Entrevista en curso (${app.screening?.index || 1}/${app.screening?.total || '?'})`
              : 'Sin entrevista · afinidad estimada'}
          </span>
        </span>
      </div>

      {done && breakdown.length > 0 && (
        <div className="flex flex-wrap gap-1 text-[10px]">
          {breakdown.map(b => (
            <span
              key={b.criterio}
              title={b.detalle}
              className={`px-2 py-0.5 rounded-md border font-medium ${
                b.puntos >= b.max * 0.8 ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : b.puntos >= b.max * 0.4 ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}
            >
              {b.criterio} {b.puntos}/{b.max}
            </span>
          ))}
        </div>
      )}

      {(done || answers.length > 0) && (
        <div>
          <button
            type="button"
            onClick={() => setOpen(o => !o)}
            className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 hover:text-emerald-700 transition"
          >
            <ClipboardList className="w-3.5 h-3.5" />
            <span>{open ? 'Ocultar respuestas del candidato' : `Ver respuestas del candidato (${answers.length})`}</span>
            {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          {open && (
            <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
              {answers.map(([key, a]) => (
                <li key={key} className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
                  <span className="text-slate-500 block truncate" title={a.pregunta}>{a.pregunta}</span>
                  <span className="font-bold text-slate-900">{a.respuesta || 'Sin respuesta'}</span>
                  {a.fuente === 'perfil' && <span className="ml-1 text-[9px] text-slate-400">(del perfil)</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
