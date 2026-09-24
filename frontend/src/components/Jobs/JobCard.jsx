import React from 'react';
import { MapPin, Bus, Clock, GraduationCap, Gift, Users, Power, Pencil } from 'lucide-react';

/** Tarjeta de vacante. `onEdit` y `onToggleActive` solo llegan desde el portal B2B (vacantes propias). */
export default function JobCard({ job, onEdit, onToggleActive }) {
  const activa = job.activa !== false;
  const extras = Number(job.bono_semanal || 0) + Number(job.vales_despensa_semanal || 0);
  const horario = job.hora_entrada && job.hora_salida ? `${job.hora_entrada} a ${job.hora_salida}` : null;
  const turno = job.tipo_turno || (job.turnos_fijos ? 'Turno fijo' : null);

  return (
    <div className={`bg-white rounded-2xl p-5 border shadow-sm transition flex flex-col justify-between space-y-4 ${
      activa ? 'border-slate-200 hover:border-emerald-500' : 'border-slate-200 opacity-70 grayscale-[35%]'
    }`}>
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <span className="text-xs font-extrabold text-emerald-700 uppercase tracking-wide">{job.empresa_nombre}</span>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 mt-0.5 leading-snug">{job.titulo}</h3>
            {job.categoria && <span className="text-[10px] text-slate-400 font-semibold">{job.categoria}</span>}
          </div>
          <div className="text-right shrink-0">
            <span className="text-base font-black text-emerald-600">${Number(job.sueldo_semanal_libre).toLocaleString('es-MX')}</span>
            <span className="text-[10px] text-slate-400 block font-medium">libre/sem</span>
            {extras > 0 && <span className="text-[10px] text-emerald-700 block font-bold">+${extras.toLocaleString('es-MX')} bonos/vales</span>}
          </div>
        </div>

        <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">{job.descripcion || 'Sin descripción adicional.'}</p>

        <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
          <span className="flex items-center gap-1 bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg font-medium">
            <MapPin className="w-3 h-3 text-sky-500" />
            {job.municipio}
          </span>
          {turno && (
            <span className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg font-semibold border border-blue-200">
              <Clock className="w-3 h-3" />
              {turno}{horario ? ` · ${horario}` : ''}
            </span>
          )}
          {job.transporte_incluido && (
            <span className="flex items-center gap-1 bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg font-medium">
              <Bus className="w-3 h-3 text-amber-500" />
              Transporte
            </span>
          )}
          {job.escolaridad_minima && (
            <span className="flex items-center gap-1 bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg font-medium">
              <GraduationCap className="w-3 h-3 text-violet-500" />
              {job.escolaridad_minima}
            </span>
          )}
          {Array.isArray(job.prestaciones) && job.prestaciones.length > 0 && (
            <span className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg font-medium border border-emerald-100">
              <Gift className="w-3 h-3" />
              {job.prestaciones.length} prestaciones
            </span>
          )}
          {job.vacantes_disponibles > 1 && (
            <span className="flex items-center gap-1 bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg font-medium">
              <Users className="w-3 h-3 text-slate-500" />
              {job.vacantes_disponibles} plazas
            </span>
          )}
        </div>
      </div>

      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
        <span className="text-[11px] text-slate-400">ID Vacante: #{job.id}</span>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
            activa ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-slate-500 bg-slate-100 border-slate-200'
          }`}>
            {activa ? 'Activa' : 'Inactiva'}
          </span>
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(job)}
              title="Editar vacante"
              className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 hover:border-emerald-200 transition"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
          {onToggleActive && (
            <button
              type="button"
              onClick={() => onToggleActive(job)}
              title={activa ? 'Desactivar vacante (dejará de ofrecerse)' : 'Activar vacante'}
              className={`p-1.5 rounded-lg border transition ${
                activa ? 'text-slate-400 border-slate-200 hover:text-rose-600 hover:bg-rose-50' : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
