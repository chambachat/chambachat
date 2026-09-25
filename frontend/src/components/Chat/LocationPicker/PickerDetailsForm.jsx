import React from 'react';
import { Bus } from 'lucide-react';
import { MUNICIPIOS_NL_CANDIDATO } from '../../../constants/municipios';

export default function PickerDetailsForm({ colonia, onColoniaChange, municipio, onMunicipioChange, lat, lon }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
      <div>
        <label className="text-[11px] font-bold text-slate-700 block mb-1">Colonia o punto de referencia:</label>
        <input
          type="text"
          value={colonia}
          onChange={(e) => onColoniaChange(e.target.value)}
          placeholder="Ej. Huinalá 2do sector, cerca de Bodega Aurrerá"
          className="w-full text-xs py-2 px-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
        />
      </div>

      <div>
        <label className="text-[11px] font-bold text-slate-700 block mb-1">Municipio:</label>
        <select
          value={municipio}
          onChange={(e) => onMunicipioChange(e.target.value)}
          className="w-full text-xs py-2 px-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
        >
          {MUNICIPIOS_NL_CANDIDATO.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      <div className="sm:col-span-2 flex items-center justify-between text-[11px] text-slate-500 pt-1">
        <span>Coordenadas seleccionadas: <strong className="text-slate-700 font-mono">{lat}, {lon}</strong></span>
        <span className="text-emerald-700 font-semibold flex items-center gap-1">
          <Bus className="w-3.5 h-3.5" />
          Rutas calculadas al guardar
        </span>
      </div>
    </div>
  );
}
