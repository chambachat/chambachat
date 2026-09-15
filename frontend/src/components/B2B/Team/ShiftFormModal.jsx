import React, { useState, useEffect } from 'react';
import { X, Clock, AlertCircle, Loader2 } from 'lucide-react';

export default function ShiftFormModal({
  isOpen,
  onClose,
  onSave,
  savingShift,
  shiftError,
  editingShift,
  selectedCompany
}) {
  const [form, setForm] = useState({
    nombre: '',
    hora_entrada: '06:00',
    hora_salida: '14:00',
    dias: 'Lunes a Sábado',
    tipo: 'Fijo',
    descripcion: ''
  });

  useEffect(() => {
    if (isOpen) {
      if (editingShift) {
        setForm({
          nombre: editingShift.nombre || '',
          hora_entrada: editingShift.hora_entrada || '06:00',
          hora_salida: editingShift.hora_salida || '14:00',
          dias: editingShift.dias || 'Lunes a Sábado',
          tipo: editingShift.tipo || 'Fijo',
          descripcion: editingShift.descripcion || ''
        });
      } else {
        setForm({
          nombre: '',
          hora_entrada: '06:00',
          hora_salida: '14:00',
          dias: 'Lunes a Sábado',
          tipo: 'Fijo',
          descripcion: ''
        });
      }
    }
  }, [isOpen, editingShift]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-4 relative animate-fadeIn">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-200">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900">
              {editingShift ? 'Editar Turno Laboral' : 'Nuevo Turno de Planta'}
            </h3>
            <p className="text-xs text-slate-500">
              Planta: <strong>{selectedCompany?.nombre}</strong>
            </p>
          </div>
        </div>

        {shiftError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{shiftError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 pt-1">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Nombre del Turno *</label>
            <input
              type="text"
              required
              placeholder="ej. Turno 1 (Matutino) o Turno 12h Cuadrilla A"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 focus:outline-none focus:border-emerald-500 text-xs text-slate-800"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Hora de Entrada *</label>
              <input
                type="time"
                required
                value={form.hora_entrada}
                onChange={(e) => setForm({ ...form, hora_entrada: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 focus:outline-none focus:border-emerald-500 text-xs font-bold font-mono text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Hora de Salida *</label>
              <input
                type="time"
                required
                value={form.hora_salida}
                onChange={(e) => setForm({ ...form, hora_salida: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 focus:outline-none focus:border-emerald-500 text-xs font-bold font-mono text-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Días Laborales</label>
              <select
                value={form.dias}
                onChange={(e) => setForm({ ...form, dias: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 focus:outline-none focus:border-emerald-500 text-xs text-slate-800"
              >
                <option value="Lunes a Sábado">Lunes a Sábado</option>
                <option value="Lunes a Viernes">Lunes a Viernes</option>
                <option value="4x3 (Jornada 12 Horas)">4x3 (Jornada 12 Horas)</option>
                <option value="3x4 (Jornada 12 Horas)">3x4 (Jornada 12 Horas)</option>
                <option value="Fines de Semana">Fines de Semana</option>
                <option value="Rotativo según rol">Rotativo según rol</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tipo de Turno</label>
              <select
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 focus:outline-none focus:border-emerald-500 text-xs text-slate-800"
              >
                <option value="Fijo">Fijo</option>
                <option value="Rolado">Rolado</option>
                <option value="Administrativo">Administrativo</option>
                <option value="Nocturno">Nocturno</option>
                <option value="Especial">Especial</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Descripción o Notas (Opcional)</label>
            <input
              type="text"
              placeholder="ej. Incluye bono de puntualidad y transporte a puerta de planta"
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 focus:outline-none focus:border-emerald-500 text-xs text-slate-800"
            />
          </div>

          <div className="pt-3 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={savingShift || !form.nombre.trim()}
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-bold transition shadow-sm flex items-center justify-center gap-1.5"
            >
              {savingShift ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <span>{editingShift ? 'Actualizar Turno' : 'Guardar Turno'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
