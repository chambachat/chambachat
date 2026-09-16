import React from 'react';
import { Edit3, X, Plus, Save } from 'lucide-react';
import { ROUTE_COLORS } from './constants';
import StopEditor from './StopEditor';

export default function RouteForm({ 
  formData, 
  stops, 
  shifts, 
  onFormChange, 
  onSave, 
  onCancel, 
  onRemoveStop, 
  onMoveStop, 
  onUpdateStop, 
  onOpenShiftModal, 
  saving,
  editingRouteId
}) {
  return (
    <form onSubmit={onSave} className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
            <Edit3 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900">
              {editingRouteId ? 'Editar Ruta de Transporte' : 'Registrar Nueva Ruta'}
            </h3>
            <span className="text-[10px] text-slate-400">Datos y paradas GPS</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1">
          Nombre de la Ruta *
        </label>
        <input
          type="text"
          required
          placeholder="ej. Ruta 1 - Huinalá / Pueblo Nuevo"
          value={formData.nombre}
          onChange={(e) => onFormChange('nombre', e.target.value)}
          className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 focus:outline-none focus:border-emerald-500 text-xs text-slate-800"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-xs font-bold text-slate-700">
            Turno Asociado *
          </label>
          <button
            type="button"
            onClick={onOpenShiftModal}
            className="text-[10px] text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-0.5"
          >
            <Plus className="w-3 h-3" />
            <span>Nuevo Turno</span>
          </button>
        </div>
        <select
          value={formData.turno}
          onChange={(e) => onFormChange('turno', e.target.value)}
          className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 focus:outline-none focus:border-emerald-500 text-xs text-slate-800"
        >
          {shifts && shifts.length > 0 ? (
            shifts.map(s => {
              const val = `${s.nombre} (${s.hora_entrada} - ${s.hora_salida})`;
              return (
                <option key={s.id} value={val}>
                  {s.nombre} &bull; {s.hora_entrada} a {s.hora_salida} ({s.dias || 'Lunes a Sábado'})
                </option>
              );
            })
          ) : (
            <option value="Turno 1 (06:00 - 14:00)">Turno 1 (06:00 - 14:00)</option>
          )}
        </select>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1">
          Color de Trazado en Mapa
        </label>
        <div className="flex items-center gap-2">
          {ROUTE_COLORS.map(c => (
            <button
              type="button"
              key={c.hex}
              onClick={() => onFormChange('color_hex', c.hex)}
              className={`w-7 h-7 rounded-full transition transform ${
                formData.color_hex === c.hex ? 'scale-125 ring-2 ring-slate-900 ring-offset-2' : 'hover:scale-110 opacity-70'
              }`}
              style={{ backgroundColor: c.hex }}
              title={c.name}
            />
          ))}
        </div>
      </div>

      <div className="pt-2 border-t border-slate-100 space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-black uppercase tracking-wider text-slate-700">
            Paradas Fijadas ({stops.length})
          </label>
          <span className="text-[10px] text-emerald-700 font-bold">
            Haz clic en el mapa para sumar
          </span>
        </div>

        {stops.length === 0 ? (
          <div className="p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center text-xs text-slate-500">
            Aún no hay paradas. Haz clic en una avenida en el mapa a la derecha para agregar el primer punto.
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {stops.map((stop, idx) => (
              <StopEditor
                key={stop.id || idx}
                stop={stop}
                index={idx}
                totalStops={stops.length}
                onUpdate={onUpdateStop}
                onRemove={onRemoveStop}
                onMove={onMoveStop}
                routeColor={formData.color_hex}
              />
            ))}
          </div>
        )}
      </div>

      <div className="pt-2 flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving || !formData.nombre?.trim() || stops.length === 0}
          className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-bold transition shadow-sm flex items-center justify-center gap-1.5"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{saving ? 'Guardando...' : 'Guardar Ruta'}</span>
        </button>
      </div>
    </form>
  );
}
