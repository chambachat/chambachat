import React, { useState, useEffect } from 'react';
import { Briefcase, Building2, AlertTriangle } from 'lucide-react';
import { MUNICIPIOS_NL_CANDIDATO, getMunicipioCoords } from '../../constants/municipios';

const [APODACA_LAT, APODACA_LON] = getMunicipioCoords('Apodaca');

export const EMPTY_JOB = {
  company_id: '',
  empresa_nombre: '',
  titulo: '',
  descripcion: '',
  sueldo_semanal_libre: 2400,
  turnos_fijos: true,
  apoyo_inea: true,
  transporte_incluido: true,
  municipio: 'Apodaca',
  latitud: APODACA_LAT,
  longitud: APODACA_LON,
};

const inputClass = 'w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white transition';

/**
 * Alta de vacante en modo empresa: la empresa se elige entre las plantas
 * donde el usuario es miembro (no se captura a mano).
 */
export default function NewJobModal({ isOpen, onClose, onSubmit, companies = [], defaultCompany = null, onGoToTeam }) {
  const [job, setJob] = useState(EMPTY_JOB);

  // Al abrir: preseleccionar la planta activa y su municipio
  useEffect(() => {
    if (!isOpen) return;
    const initial = defaultCompany || companies[0] || null;
    if (initial) {
      const municipio = MUNICIPIOS_NL_CANDIDATO.includes(initial.municipio) ? initial.municipio : EMPTY_JOB.municipio;
      const [latitud, longitud] = getMunicipioCoords(municipio);
      setJob({ ...EMPTY_JOB, company_id: initial.id, empresa_nombre: initial.nombre, municipio, latitud, longitud });
    } else {
      setJob(EMPTY_JOB);
    }
  }, [isOpen, defaultCompany, companies]);

  if (!isOpen) return null;

  const change = (field, value) => setJob(prev => ({ ...prev, [field]: value }));

  const changeCompany = (id) => {
    const found = companies.find(c => c.id === Number(id));
    setJob(prev => ({ ...prev, company_id: found ? found.id : '', empresa_nombre: found ? found.nombre : '' }));
  };

  // Las coordenadas de la vacante siguen al municipio elegido
  const changeMunicipio = (municipio) => {
    const [latitud, longitud] = getMunicipioCoords(municipio);
    setJob(prev => ({ ...prev, municipio, latitud, longitud }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!job.company_id) return;
    const ok = await onSubmit({ ...job, company_id: Number(job.company_id) });
    if (ok) setJob(EMPTY_JOB);
  };

  const noCompanies = companies.length === 0;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-emerald-600" />
          Publicar Nueva Vacante
        </h2>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Empresa / Planta que publica *</label>
            {noCompanies ? (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Aún no tienes una empresa dada de alta</span>
                </div>
                <p>Registra tu planta con su Constancia de Situación Fiscal en <strong>Mi Equipo</strong> para poder publicar vacantes a su nombre.</p>
                {onGoToTeam && (
                  <button type="button" onClick={onGoToTeam} className="font-bold text-emerald-700 hover:underline">
                    Ir a Mi Equipo
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-2.5 focus-within:border-emerald-500 focus-within:bg-white transition">
                <Building2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <select required value={job.company_id} onChange={(e) => changeCompany(e.target.value)}
                  className="w-full bg-transparent py-2.5 text-slate-800 focus:outline-none cursor-pointer">
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre}{c.municipio ? ` (${c.municipio})` : ''}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Título del Puesto *</label>
            <input type="text" required placeholder="Ej: Operador de Prensa y Estampado" value={job.titulo}
              onChange={(e) => change('titulo', e.target.value)} className={inputClass} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Sueldo Semanal Libre (MXN)</label>
              <input type="number" min="1400" max="6000" required value={job.sueldo_semanal_libre}
                onChange={(e) => change('sueldo_semanal_libre', Number(e.target.value))} className={inputClass} />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Municipio</label>
              <select value={job.municipio} onChange={(e) => changeMunicipio(e.target.value)} className={inputClass}>
                {MUNICIPIOS_NL_CANDIDATO.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Descripción del Puesto</label>
            <textarea rows="3" placeholder="Detalles de turnos, actividades y prestaciones..." value={job.descripcion}
              onChange={(e) => change('descripcion', e.target.value)} className={inputClass} />
          </div>

          <div className="flex gap-4 pt-2">
            <label className="flex items-center gap-2 cursor-pointer text-slate-700">
              <input type="checkbox" checked={job.turnos_fijos} onChange={(e) => change('turnos_fijos', e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500" />
              <span>Turnos Fijos (Sin rolar)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-slate-700">
              <input type="checkbox" checked={job.transporte_incluido} onChange={(e) => change('transporte_incluido', e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500" />
              <span>Transporte de personal</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition font-medium">
              Cancelar
            </button>
            <button type="submit" disabled={noCompanies || !job.company_id}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition font-bold shadow-sm">
              Guardar Vacante
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
