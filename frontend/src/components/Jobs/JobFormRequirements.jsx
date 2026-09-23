import React from 'react';
import { ToggleLeft, ToggleRight } from 'lucide-react';
import { ESCOLARIDADES, EXPERIENCIAS, CERTIFICACIONES, REQUISITOS_FISICOS } from '../../constants/jobCatalog';
import ChipMultiSelect from './ChipMultiSelect';
import { inputClass } from './JobFormCompany';

/** Sección 4: requisitos (educationRequirements, experienceRequirements, qualifications), descripción libre y estado. */
export default function JobFormRequirements({ job, onChange }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-slate-700 font-semibold mb-1">Escolaridad mínima *</label>
          <select required value={job.escolaridad_minima} onChange={(e) => onChange('escolaridad_minima', e.target.value)} className={inputClass}>
            {ESCOLARIDADES.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-slate-700 font-semibold mb-1">Experiencia mínima *</label>
          <select required value={job.experiencia_minima} onChange={(e) => onChange('experiencia_minima', e.target.value)} className={inputClass}>
            {EXPERIENCIAS.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
      </div>

      <ChipMultiSelect
        label="Certificaciones o habilidades requeridas"
        options={CERTIFICACIONES}
        value={job.certificaciones}
        onChange={(v) => onChange('certificaciones', v)}
      />

      <ChipMultiSelect
        label="Condiciones físicas del puesto"
        hint="Ayuda al candidato a saber si el trabajo le acomoda. No se piden edad, sexo ni estado civil (LFT art. 133)."
        options={REQUISITOS_FISICOS}
        value={job.requisitos_fisicos}
        onChange={(v) => onChange('requisitos_fisicos', v)}
      />

      <div>
        <label className="block text-slate-700 font-semibold mb-1">Descripción adicional (opcional)</label>
        <textarea rows="3" placeholder="Actividades específicas, área o línea, herramientas, proceso de contratación..." value={job.descripcion}
          onChange={(e) => onChange('descripcion', e.target.value)} className={inputClass} />
      </div>

      <button
        type="button"
        onClick={() => onChange('activa', !job.activa)}
        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition ${
          job.activa ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-slate-100 border-slate-200 text-slate-600'
        }`}
      >
        <span className="font-semibold">
          Estado de la vacante: <strong>{job.activa ? 'Activa' : 'Inactiva'}</strong>
          <span className="block text-[10px] font-normal opacity-80">
            {job.activa ? 'Visible para candidatos y para la IA del chat.' : 'Guardada pero oculta; no se ofrece a candidatos.'}
          </span>
        </span>
        {job.activa ? <ToggleRight className="w-7 h-7 text-emerald-600" /> : <ToggleLeft className="w-7 h-7 text-slate-400" />}
      </button>
    </div>
  );
}
