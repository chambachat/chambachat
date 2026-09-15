import React from 'react';
import { Clock, Plus, Loader2, Settings, Trash2, Calendar } from 'lucide-react';

export default function ShiftsPanel({
  shifts,
  loadingShifts,
  onOpenCreateShift,
  onOpenEditShift,
  onDeleteShift
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden">
      <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-black text-slate-900">Turnos Laborales de la Planta</h2>
          </div>
          <p className="text-xs text-slate-500">
            Configura los horarios de producción y cuadrillas para esta planta. Se sincronizan automáticamente con las Rutas de Transporte.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenCreateShift}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Agregar Turno</span>
        </button>
      </div>

      {loadingShifts ? (
        <div className="p-8 flex flex-col items-center justify-center space-y-2 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
          <span className="text-xs font-medium">Cargando turnos de la planta...</span>
        </div>
      ) : shifts.length === 0 ? (
        <div className="p-8 text-center space-y-3">
          <div className="p-3 bg-slate-100 text-slate-400 rounded-2xl inline-flex">
            <Clock className="w-6 h-6" />
          </div>
          <h4 className="text-xs font-black text-slate-800">No hay turnos registrados</h4>
          <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
            Registra los turnos de trabajo de tu planta (ej. Matutino 06:00 a 14:00, Vespertino, etc.) para vincularlos a las rutas de transporte de personal.
          </p>
          <button
            type="button"
            onClick={onOpenCreateShift}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition"
          >
            Crear Primer Turno
          </button>
        </div>
      ) : (
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {shifts.map((shift) => (
            <div
              key={shift.id}
              className="bg-slate-50/80 hover:bg-white border border-slate-200 hover:border-emerald-300 rounded-2xl p-4 transition shadow-2xs space-y-3 relative group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1 min-w-0">
                  <span className="text-xs font-black text-slate-900 block truncate">
                    {shift.nombre}
                  </span>
                  <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100/70 text-emerald-800 border border-emerald-200">
                    {shift.tipo || 'Fijo'}
                  </span>
                </div>

                <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition shrink-0">
                  <button
                    type="button"
                    onClick={() => onOpenEditShift(shift)}
                    className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                    title="Editar turno"
                  >
                    <Settings className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`¿Seguro que deseas eliminar el turno "${shift.nombre}"?`)) {
                        onDeleteShift(shift.id, shift.nombre);
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    title="Eliminar turno"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200/60 space-y-1.5 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="font-bold text-slate-800">
                    {shift.hora_entrada} &mdash; {shift.hora_salida}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{shift.dias || 'Lunes a Sábado'}</span>
                </div>

                {shift.descripcion && (
                  <p className="text-[11px] text-slate-500 italic pt-1 leading-snug">
                    "{shift.descripcion}"
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
