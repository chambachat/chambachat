import React from 'react';
import { Search, Navigation, Loader2, Sparkles } from 'lucide-react';
import { INDUSTRIAL_PARKS_NL } from '../../../constants/municipios';

export default function PlantLocationToolbar({
  searchQuery,
  onSearchQueryChange,
  onSearch,
  isSearching,
  onUseGPS,
  isLocatingGps,
  onSelectZone
}) {
  return (
    <>
      <div className="flex flex-col sm:flex-row gap-2">
        <form onSubmit={onSearch} className="flex-1 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="Buscar parque industrial, calle o referencia (ej. Parque Huinalá, Stiva...)"
            className="w-full pl-10 pr-24 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 placeholder:text-slate-400 font-medium focus:outline-none focus:border-emerald-500 focus:bg-white transition"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <button
            type="submit"
            disabled={isSearching || !searchQuery.trim()}
            className="absolute right-1.5 top-1.5 bottom-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 flex items-center gap-1 shadow-xs"
          >
            {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Buscar'}
          </button>
        </form>

        <button
          type="button"
          onClick={onUseGPS}
          disabled={isLocatingGps}
          className="px-3.5 py-2.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 border border-slate-200 hover:border-emerald-300 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-1.5 shrink-0"
          title="Detectar ubicación actual mediante el GPS del dispositivo"
        >
          {isLocatingGps ? (
            <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
          ) : (
            <Navigation className="w-4 h-4 text-emerald-600" />
          )}
          <span>{isLocatingGps ? 'Localizando...' : 'Mi Ubicación GPS'}</span>
        </button>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            Zonas industriales frecuentes:
          </span>
          <span className="text-[11px] text-slate-400 font-medium">Clic para centrar</span>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {INDUSTRIAL_PARKS_NL.map((zone) => (
            <button
              key={zone.name}
              type="button"
              onClick={() => onSelectZone(zone)}
              className="px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 hover:border-emerald-300 text-slate-700 whitespace-nowrap shrink-0 transition"
            >
              📍 {zone.name}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
