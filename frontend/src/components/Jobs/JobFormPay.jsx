import React from 'react';
import { PRESTACIONES } from '../../constants/jobCatalog';
import ChipMultiSelect from './ChipMultiSelect';
import { inputClass } from './JobFormCompany';

/** Sección 3: sueldo libre semanal, bonos, vales y prestaciones (jobBenefits / baseSalary). */
export default function JobFormPay({ job, onChange }) {
  const total = Number(job.sueldo_semanal_libre || 0) + Number(job.bono_semanal || 0) + Number(job.vales_despensa_semanal || 0);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-slate-700 font-semibold mb-1">Sueldo semanal libre *</label>
          <input type="number" min="1400" max="15000" step="50" required value={job.sueldo_semanal_libre}
            onChange={(e) => onChange('sueldo_semanal_libre', Number(e.target.value))} className={inputClass} />
        </div>
        <div>
          <label className="block text-slate-700 font-semibold mb-1">Bonos semanales</label>
          <input type="number" min="0" max="5000" step="50" value={job.bono_semanal}
            onChange={(e) => onChange('bono_semanal', Number(e.target.value))} className={inputClass} />
        </div>
        <div>
          <label className="block text-slate-700 font-semibold mb-1">Vales de despensa / sem</label>
          <input type="number" min="0" max="3000" step="50" value={job.vales_despensa_semanal}
            onChange={(e) => onChange('vales_despensa_semanal', Number(e.target.value))} className={inputClass} />
        </div>
      </div>
      <p className="text-[11px] text-slate-500">
        Ingreso semanal estimado con bonos y vales: <strong className="text-emerald-700">${total.toLocaleString('es-MX')} MXN</strong>.
        Los montos son netos (libres), como los entiende el operario.
      </p>

      <ChipMultiSelect
        label="Prestaciones y beneficios"
        hint="Marca todo lo que aplique. 'Transporte de personal' y 'Apoyo INEA' alimentan directamente el emparejamiento de la IA."
        options={PRESTACIONES}
        value={job.prestaciones}
        onChange={(v) => onChange('prestaciones', v)}
      />
    </div>
  );
}
