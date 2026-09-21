import React from 'react';
import { Building2 } from 'lucide-react';
import { MUNICIPIOS_NL } from '../../../constants/municipios';

export default function PlantLocationForm({ lat, lon, direccion, onDireccionChange, municipio, onMunicipioChange }) {
  return (
    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
          <Building2 className="w-4 h-4 text-emerald-600" />
          Datos de la Planta para Postulantes y Rutas
        </span>
        <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
          <span>Lat: <strong className="text-slate-800">{lat}</strong></span>
          <span>&bull;</span>
          <span>Lon: <strong className="text-slate-800">{lon}</strong></span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2">
          <label className="block text-[11px] font-bold text-slate-600 mb-1">Dirección o Referencia de Planta</label>
          <input
            type="text"
            value={direccion}
            onChange={(e) => onDireccionChange(e.target.value)}
            placeholder="Ej. Carretera a Huinalá Km 2.5, Parque Ind. Kronos"
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1">Municipio</label>
          <select
            value={municipio}
            onChange={(e) => onMunicipioChange(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            {MUNICIPIOS_NL.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
      </div>
      <p className="text-[10px] text-slate-500 leading-relaxed">
        💡 <strong>¿Para qué sirve?</strong> Estas coordenadas permitirán a los candidatos calcular su tiempo de traslado en el chat de ChambaChat y verificar si las rutas de transporte empresarial pasan cerca de sus domicilios.
      </p>
    </div>
  );
}
