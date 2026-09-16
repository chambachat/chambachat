import React from 'react';
import { Route as RouteIcon, Bus, Edit3, Trash2, MapPin, Clock } from 'lucide-react';

export default function RouteList({ routes, activeRoute, onSelectRoute, onEditRoute, onDeleteRoute, onCreateRoute }) {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RouteIcon className="w-4 h-4 text-emerald-600" />
          <h3 className="text-sm font-black text-slate-900">Rutas de esta Planta</h3>
        </div>
        <span className="text-xs font-bold text-slate-400">
          {routes.length} total
        </span>
      </div>

      {routes.length === 0 ? (
        <div className="py-12 px-4 text-center border-2 border-dashed border-slate-200 rounded-2xl space-y-3">
          <div className="p-3 bg-slate-100 text-slate-400 rounded-2xl inline-flex">
            <Bus className="w-8 h-8" />
          </div>
          <h4 className="text-xs font-black text-slate-800">No hay rutas registradas</h4>
          <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
            Agrega tu primera ruta de transporte haciendo clic en "Nueva Ruta" y seleccionando los puntos en el mapa.
          </p>
          <button
            type="button"
            onClick={onCreateRoute}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition"
          >
            Crear Primera Ruta
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {routes.map((r) => {
            const isSelected = activeRoute?.id === r.id;
            return (
              <div
                key={r.id}
                onClick={() => onSelectRoute(r)}
                className={`p-4 rounded-2xl border transition cursor-pointer text-left space-y-2.5 ${
                  isSelected
                    ? 'bg-slate-50/90 border-slate-400 ring-2 ring-emerald-500/20 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span 
                      className="w-3.5 h-3.5 rounded-full shrink-0 border border-white shadow-xs"
                      style={{ backgroundColor: r.color_hex || '#059669' }}
                    />
                    <span className="text-xs font-black text-slate-900 truncate block">
                      {r.nombre}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditRoute(r);
                      }}
                      className="p-1 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                      title="Editar ruta y paradas"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteRoute(r.id, r.nombre);
                      }}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      title="Eliminar ruta"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <span className="text-[11px] font-semibold text-slate-500 block">
                  {r.turno || 'Turno Matutino'}
                </span>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 text-[11px]">
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                    <span><strong>{r.stops?.length || 0}</strong> paradas</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Clock className="w-3 h-3 text-amber-500 shrink-0" />
                    <span>Inicia: <strong>{r.hora_inicio || '05:30 AM'}</strong></span>
                  </div>
                </div>

                {isSelected && (
                  <div className="pt-2 flex items-center justify-between text-[10px] text-emerald-700 font-bold border-t border-slate-100">
                    <span>Visualizando en el mapa &rarr;</span>
                    <span>{r.hora_llegada_planta ? `Llegada a nave: ${r.hora_llegada_planta}` : 'Destino: Planta'}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
