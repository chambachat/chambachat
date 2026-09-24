import React, { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { getCompanyShifts } from '../../services/api';
import { TIPOS_TURNO, DIAS_LABORALES, tipoTurnoDesdeHorario } from '../../constants/jobCatalog';
import { inputClass } from './JobFormCompany';

/** Sección 2: horario. Se parte de los turnos configurados en la planta y se puede ajustar. */
export default function JobFormSchedule({ job, companyId, onChange, onApplyShift }) {
  const [shifts, setShifts] = useState([]);

  useEffect(() => {
    if (!companyId) { setShifts([]); return; }
    let cancelled = false;
    (async () => {
      try {
        const data = await getCompanyShifts(companyId);
        if (!cancelled) setShifts((data || []).filter(s => s.activo !== false));
      } catch (e) {
        if (!cancelled) setShifts([]);
      }
    })();
    return () => { cancelled = true; };
  }, [companyId]);

  const applyShift = (id) => {
    const shift = shifts.find(s => s.id === Number(id));
    if (!shift) { onApplyShift(null); return; }
    onApplyShift({
      shift_id: shift.id,
      hora_entrada: shift.hora_entrada,
      hora_salida: shift.hora_salida,
      dias_laborales: DIAS_LABORALES.includes(shift.dias) ? shift.dias : job.dias_laborales,
      tipo_turno: tipoTurnoDesdeHorario(shift.hora_entrada, shift.tipo),
    });
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-slate-700 font-semibold mb-1">Turno de la planta</label>
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-2.5 focus-within:border-emerald-500 focus-within:bg-white transition">
          <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
          <select value={job.shift_id || ''} onChange={(e) => applyShift(e.target.value)}
            className="w-full bg-transparent py-2.5 text-slate-800 focus:outline-none cursor-pointer">
            <option value="">Horario personalizado</option>
            {shifts.map(s => (
              <option key={s.id} value={s.id}>{s.nombre} · {s.hora_entrada} a {s.hora_salida} · {s.dias}</option>
            ))}
          </select>
        </div>
        <p className="text-[10px] text-slate-400 mt-1">Los turnos se administran en Equipo y Empresa. Al elegir uno se llenan horario, días y tipo de turno.</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-slate-700 font-semibold mb-1">Tipo de turno *</label>
          <select required value={job.tipo_turno} onChange={(e) => onChange('tipo_turno', e.target.value)} className={inputClass}>
            {TIPOS_TURNO.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-slate-700 font-semibold mb-1">Entrada</label>
          <input type="time" value={job.hora_entrada} onChange={(e) => onChange('hora_entrada', e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="block text-slate-700 font-semibold mb-1">Salida</label>
          <input type="time" value={job.hora_salida} onChange={(e) => onChange('hora_salida', e.target.value)} className={inputClass} />
        </div>
      </div>

      <div>
        <label className="block text-slate-700 font-semibold mb-1">Días laborales *</label>
        <select required value={job.dias_laborales} onChange={(e) => onChange('dias_laborales', e.target.value)} className={inputClass}>
          {DIAS_LABORALES.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>
    </div>
  );
}
