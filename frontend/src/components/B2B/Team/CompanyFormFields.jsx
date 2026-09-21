import React from 'react';
import { MapPin } from 'lucide-react';
import { MUNICIPIOS_NL, REGIMENES_SAT } from './constants';

const inputClass = 'w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-800';
const selectClass = 'w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-800';

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-700 mb-1">{label}</label>
      {children}
    </div>
  );
}

export default function CompanyFormFields({ form, onChange, mode, onOpenLocation }) {
  return (
    <>
      <Field label="Nombre de la Empresa">
        <input
          type="text" required placeholder="ej. Whirlpool Planta Horno o Ternium Churubusco"
          value={form.nombre} onChange={(e) => onChange('nombre', e.target.value)} className={inputClass}
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="RFC del SAT">
          <input
            type="text" required placeholder="ej. WPL990101XYZ"
            value={form.rfc} onChange={(e) => onChange('rfc', e.target.value.toUpperCase())}
            className={`${inputClass} uppercase font-mono`}
          />
        </Field>
        <Field label="Municipio">
          <select value={form.municipio} onChange={(e) => onChange('municipio', e.target.value)} className={selectClass}>
            {MUNICIPIOS_NL.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Régimen Fiscal (SAT)">
          <select value={form.regimen_fiscal} onChange={(e) => onChange('regimen_fiscal', e.target.value)} className={selectClass}>
            {REGIMENES_SAT.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </Field>
        <Field label="Industria o Giro">
          <input
            type="text" placeholder="ej. Automotriz, Logística, Ensamble"
            value={form.industria} onChange={(e) => onChange('industria', e.target.value)} className={inputClass}
          />
        </Field>
      </div>

      <Field label="Dirección">
        <input
          type="text" placeholder="ej. Parque Industrial Prologis Apodaca, Nave 4"
          value={form.direccion} onChange={(e) => onChange('direccion', e.target.value)} className={inputClass}
        />
      </Field>

      {mode === 'edit' && (
        <div className="p-3 bg-emerald-50/60 border border-emerald-200/80 rounded-2xl flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
            <div className="min-w-0">
              <span className="text-xs font-bold text-slate-800 block">Ubicación en Mapa & GPS</span>
              <span className="text-[10px] text-slate-500 truncate block">
                {form.latitud ? `Lat: ${Number(form.latitud).toFixed(4)}, Lon: ${Number(form.longitud).toFixed(4)}` : 'Sin coordenadas GPS fijadas'}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenLocation}
            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition flex items-center gap-1 shrink-0 shadow-2xs"
          >
            <MapPin className="w-3 h-3" />
            <span>{form.latitud ? 'Ajustar Pin' : 'Fijar en Mapa'}</span>
          </button>
        </div>
      )}
    </>
  );
}
