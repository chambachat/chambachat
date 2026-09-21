import React from 'react';
import { Bus, Plus, X, MapPin, CheckCircle2, AlertCircle } from 'lucide-react';

function PlantSelector({ companies, selectedCompany, onSelectCompany, onOpenLocationModal }) {
  const hasGps = Boolean(selectedCompany?.latitud);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-bold text-slate-500 shrink-0">Planta / Empresa:</span>
      <div className="relative min-w-[220px]">
        <select
          value={selectedCompany?.id || ''}
          onChange={(e) => {
            const found = companies.find(c => c.id === parseInt(e.target.value, 10));
            if (found) onSelectCompany(found);
          }}
          className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500 cursor-pointer transition"
        >
          {companies.map(c => (
            <option key={c.id} value={c.id}>🏭 {c.nombre} ({c.municipio})</option>
          ))}
        </select>
      </div>

      <button
        type="button"
        onClick={onOpenLocationModal}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 hover:border-emerald-300 text-xs font-bold text-slate-700 transition shadow-2xs"
        title="Ajustar o mover la ubicación exacta de la planta en el mapa"
      >
        <MapPin className="w-3.5 h-3.5 text-emerald-600" />
        <span>{hasGps ? '📍 Reubicar Planta' : '📍 Ubicar Planta'}</span>
      </button>

      {hasGps ? (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          <span>GPS Listo ({Number(selectedCompany.latitud).toFixed(3)}, {Number(selectedCompany.longitud).toFixed(3)})</span>
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg">
          <AlertCircle className="w-3 h-3 text-amber-600" />
          <span>Ubicación aproximada</span>
        </span>
      )}
    </div>
  );
}

export default function RoutesHeader({
  companies,
  selectedCompany,
  onSelectCompany,
  onOpenLocationModal,
  routesCount,
  isEditing,
  onStartCreate,
  onCancelEdit
}) {
  const plural = routesCount === 1 ? '' : 's';
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-wider">
            <Bus className="w-4 h-4" />
            <span>Logística de Personal & Movilidad NL</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <span>Rutas de Transporte de Planta</span>
            <span className="text-xs bg-emerald-100 text-emerald-800 font-extrabold px-2.5 py-1 rounded-full">GPS & Horarios</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">
            Traza sobre el mapa los puntos de recogida de operarios, asigna horarios exactos de paso y calcula con precisión los tiempos de traslado a tu planta.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {!isEditing ? (
            <button
              type="button"
              onClick={onStartCreate}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider transition shadow-sm group"
            >
              <Plus className="w-4 h-4 text-emerald-200 group-hover:rotate-90 transition-transform" />
              <span>Nueva Ruta de Transporte</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onCancelEdit}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl border border-slate-300 text-slate-600 hover:bg-slate-100 text-xs font-bold transition"
            >
              <X className="w-4 h-4" />
              <span>Cancelar Edición</span>
            </button>
          )}
        </div>
      </div>

      <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <PlantSelector
          companies={companies}
          selectedCompany={selectedCompany}
          onSelectCompany={onSelectCompany}
          onOpenLocationModal={onOpenLocationModal}
        />
        <div className="text-[11px] text-slate-400 flex items-center gap-2">
          <span>{routesCount} ruta{plural} activa{plural}</span>
          <span>&bull;</span>
          <span className="font-semibold text-emerald-700">Conectado con Chambot IA</span>
        </div>
      </div>
    </div>
  );
}
