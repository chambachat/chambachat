import React from 'react';
import { MapPin, Bus } from 'lucide-react';

export default function JobCard({ job }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 hover:border-emerald-500 shadow-sm transition flex flex-col justify-between space-y-4">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-xs font-extrabold text-emerald-700 uppercase tracking-wide">{job.empresa_nombre}</span>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 mt-0.5 leading-snug">{job.titulo}</h3>
          </div>
          <div className="text-right shrink-0">
            <span className="text-base font-black text-emerald-600">${job.sueldo_semanal_libre.toLocaleString('es-MX')}</span>
            <span className="text-[10px] text-slate-400 block font-medium">libre/sem</span>
          </div>
        </div>

        <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">{job.descripcion || 'Sin descripción adicional.'}</p>

        <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
          <span className="flex items-center gap-1 bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg font-medium">
            <MapPin className="w-3 h-3 text-sky-500" />
            {job.municipio}
          </span>
          {job.transporte_incluido && (
            <span className="flex items-center gap-1 bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg font-medium">
              <Bus className="w-3 h-3 text-amber-500" />
              Transporte Incluido
            </span>
          )}
          {job.turnos_fijos && (
            <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg font-semibold border border-blue-200">Turno Fijo</span>
          )}
        </div>
      </div>

      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
        <span className="text-[11px] text-slate-400">ID Vacante: #{job.id}</span>
        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">Activa</span>
      </div>
    </div>
  );
}
