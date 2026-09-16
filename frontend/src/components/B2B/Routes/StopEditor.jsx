import React from 'react';
import { MoveUp, MoveDown, Trash2 } from 'lucide-react';

export default function StopEditor({ stop, index, totalStops, onUpdate, onRemove, onMove, routeColor }) {
  return (
    <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span 
            className="w-5 h-5 rounded-full text-white font-extrabold text-[10px] flex items-center justify-center shrink-0"
            style={{ backgroundColor: routeColor || '#059669' }}
          >
            {index + 1}
          </span>
          <span className="font-bold text-slate-800">Parada #{index + 1}</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={index === 0}
            onClick={() => onMove(index, -1)}
            className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
            title="Subir orden"
          >
            <MoveUp className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            disabled={index === totalStops - 1}
            onClick={() => onMove(index, 1)}
            className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
            title="Bajar orden"
          >
            <MoveDown className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="p-1 text-slate-400 hover:text-rose-600"
            title="Quitar parada"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Nombre / Punto</label>
          <input
            type="text"
            value={stop.nombre}
            onChange={(e) => onUpdate(index, 'nombre', e.target.value)}
            placeholder="ej. Soriana Huinalá"
            className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 text-xs text-slate-800"
          />
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Horario de paso</label>
          <input
            type="text"
            value={stop.horario}
            onChange={(e) => onUpdate(index, 'horario', e.target.value)}
            placeholder="05:45 AM"
            className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-mono font-bold text-slate-800"
          />
        </div>
      </div>

      <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between">
        <span>GPS: {stop.latitud}, {stop.longitud}</span>
        <span className="text-emerald-700 font-semibold">&rarr; Destino: Planta</span>
      </div>
    </div>
  );
}
