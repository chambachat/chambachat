import React from 'react';
import { Navigation, Search, Loader2, AlertCircle } from 'lucide-react';
import { QUICK_ZONES } from '../../../constants/municipios';

export default function PickerToolbar({
  onUseGPS,
  isLocatingGPS,
  searchQuery,
  onSearchQueryChange,
  onSearch,
  isGeocoding,
  error,
  onSelectZone
}) {
  return (
    <div className="space-y-2.5">
      <div className="flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          onClick={onUseGPS}
          disabled={isLocatingGPS}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-xs font-bold shadow-sm transition disabled:opacity-50 shrink-0"
        >
          {isLocatingGPS ? (
            <><Loader2 className="w-4 h-4 animate-spin" /><span>Detectando GPS...</span></>
          ) : (
            <><Navigation className="w-4 h-4 text-emerald-200" /><span>Usar mi ubicación actual (GPS)</span></>
          )}
        </button>

        <form onSubmit={onSearch} className="flex-1 flex gap-1.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              placeholder="Buscar colonia o avenida (ej. Huinalá, Apodaca)..."
              className="w-full text-xs py-2.5 pl-9 pr-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>
          <button
            type="submit"
            disabled={isGeocoding || !searchQuery.trim()}
            className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white text-xs font-bold transition flex items-center justify-center shrink-0"
          >
            {isGeocoding ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Buscar'}
          </button>
        </form>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-2.5 bg-amber-50 text-amber-900 border border-amber-200 rounded-xl text-xs">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-1.5">
        <span className="text-[11px] font-semibold text-slate-500 block">Zonas y colonias populares:</span>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_ZONES.map((zone) => (
            <button
              key={zone.label}
              type="button"
              onClick={() => onSelectZone(zone)}
              className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 border border-slate-200/80 text-slate-700 transition"
            >
              📍 {zone.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
