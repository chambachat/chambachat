import React from 'react';
import { Building2, MapPin, AlertTriangle } from 'lucide-react';
import { CATEGORIAS, TIPOS_CONTRATO } from '../../constants/jobCatalog';

export const inputClass = 'w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white transition';

/** Sección 1: empresa que publica (la ubicación se hereda de la planta), puesto y contrato. */
export default function JobFormCompany({ job, companies, selectedCompany, onChange, onChangeCompany, onGoToTeam, lockCompany = false }) {
  if (companies.length === 0 && !lockCompany) {
    return (
      <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 space-y-1.5">
        <div className="flex items-center gap-1.5 font-bold">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Aún no tienes una empresa dada de alta</span>
        </div>
        <p>Registra tu planta con su Constancia de Situación Fiscal en <strong>Equipo y Empresa</strong> para poder publicar vacantes a su nombre.</p>
        {onGoToTeam && (
          <button type="button" onClick={onGoToTeam} className="font-bold text-emerald-700 hover:underline">Ir a Equipo y Empresa</button>
        )}
      </div>
    );
  }

  const ubicacion = [selectedCompany?.direccion, selectedCompany?.colonia, selectedCompany?.municipio]
    .filter(Boolean).join(', ') || selectedCompany?.municipio || 'Sin dirección registrada';

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-slate-700 font-semibold mb-1">Empresa / Planta que publica *</label>
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-2.5 focus-within:border-emerald-500 focus-within:bg-white transition">
          <Building2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <select required value={job.company_id} onChange={(e) => onChangeCompany(e.target.value)} disabled={lockCompany}
            className="w-full bg-transparent py-2.5 text-slate-800 focus:outline-none cursor-pointer disabled:cursor-not-allowed disabled:text-slate-500">
            {companies.map(c => (
              <option key={c.id} value={c.id}>{c.nombre}{c.municipio ? ` (${c.municipio})` : ''}</option>
            ))}
            {lockCompany && !companies.some(c => c.id === Number(job.company_id)) && (
              <option value={job.company_id}>{job.empresa_nombre}</option>
            )}
          </select>
        </div>
        <div className="mt-1.5 flex items-start gap-1.5 text-[11px] text-slate-500 bg-sky-50/70 border border-sky-100 rounded-lg px-2.5 py-1.5">
          <MapPin className="w-3.5 h-3.5 text-sky-500 shrink-0 mt-0.5" />
          <span>
            <strong className="text-slate-700">Ubicación de la vacante:</strong> {ubicacion}.
            {' '}Se toma de la planta seleccionada; edítala en Equipo y Empresa si cambió.
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-slate-700 font-semibold mb-1">Categoría del puesto *</label>
          <select required value={job.categoria} onChange={(e) => onChange('categoria', e.target.value)} className={inputClass}>
            <option value="">Selecciona...</option>
            {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-slate-700 font-semibold mb-1">Tipo de contrato *</label>
          <select required value={job.tipo_contrato} onChange={(e) => onChange('tipo_contrato', e.target.value)} className={inputClass}>
            {TIPOS_CONTRATO.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_110px] gap-3">
        <div>
          <label className="block text-slate-700 font-semibold mb-1">Título del puesto *</label>
          <input type="text" required placeholder="Ej: Operador de Prensa y Estampado" value={job.titulo}
            onChange={(e) => onChange('titulo', e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="block text-slate-700 font-semibold mb-1">Vacantes</label>
          <input type="number" min="1" max="500" required value={job.vacantes_disponibles}
            onChange={(e) => onChange('vacantes_disponibles', Math.max(1, Number(e.target.value)))} className={inputClass} />
        </div>
      </div>
    </div>
  );
}
