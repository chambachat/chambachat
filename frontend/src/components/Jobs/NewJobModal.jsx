import React, { useState, useEffect } from 'react';
import { Briefcase, Pencil, X } from 'lucide-react';
import { getMunicipioCoords } from '../../constants/municipios';
import { PRESTACION_TRANSPORTE, PRESTACION_INEA } from '../../constants/jobCatalog';
import JobFormCompany from './JobFormCompany';
import JobFormSchedule from './JobFormSchedule';
import JobFormPay from './JobFormPay';
import JobFormRequirements from './JobFormRequirements';

export const EMPTY_JOB = {
  company_id: '',
  empresa_nombre: '',
  categoria: '',
  titulo: '',
  tipo_contrato: 'Planta (tiempo indeterminado)',
  vacantes_disponibles: 1,
  shift_id: null,
  tipo_turno: 'Fijo matutino',
  hora_entrada: '06:00',
  hora_salida: '14:00',
  dias_laborales: 'Lunes a Sábado',
  sueldo_semanal_libre: 2400,
  bono_semanal: 0,
  vales_despensa_semanal: 0,
  prestaciones: ['Prestaciones de ley (IMSS, Infonavit, aguinaldo, vacaciones)', 'Pago semanal'],
  escolaridad_minima: 'Secundaria',
  experiencia_minima: 'Sin experiencia',
  certificaciones: [],
  requisitos_fisicos: [],
  descripcion: '',
  activa: true,
  // Ubicación: se hereda de la planta seleccionada (el backend la vuelve a tomar de la empresa)
  municipio: 'Apodaca',
  latitud: getMunicipioCoords('Apodaca')[0],
  longitud: getMunicipioCoords('Apodaca')[1],
};

const STEPS = [
  { id: 'company', label: '1. Empresa y puesto' },
  { id: 'schedule', label: '2. Horario' },
  { id: 'pay', label: '3. Sueldo y prestaciones' },
  { id: 'requirements', label: '4. Requisitos y estado' },
];

function locationFromCompany(company) {
  if (!company) return {};
  const [lat, lon] = getMunicipioCoords(company.municipio || 'Apodaca');
  return {
    municipio: company.municipio || 'Apodaca',
    latitud: company.latitud ?? lat,
    longitud: company.longitud ?? lon,
  };
}

/** Convierte una vacante guardada al estado del formulario (rellena faltantes con los valores por defecto). */
function formFromJob(saved) {
  const form = { ...EMPTY_JOB };
  for (const key of Object.keys(EMPTY_JOB)) {
    if (saved[key] !== undefined && saved[key] !== null) form[key] = saved[key];
  }
  form.company_id = saved.empresa_id || '';
  form.shift_id = saved.shift_id || null;
  form.activa = saved.activa !== false;
  return form;
}

/**
 * Alta y edición de vacante operativa con campos estructurados, en 4 secciones.
 * `editingJob` (opcional) precarga el formulario y cambia el modo a edición: la empresa no se puede cambiar.
 */
export default function NewJobModal({ isOpen, onClose, onSubmit, companies = [], defaultCompany = null, onGoToTeam, editingJob = null }) {
  const [job, setJob] = useState(EMPTY_JOB);
  const [step, setStep] = useState('company');
  const isEdit = Boolean(editingJob);

  useEffect(() => {
    if (!isOpen) return;
    setStep('company');
    if (editingJob) {
      setJob(formFromJob(editingJob));
      return;
    }
    const initial = defaultCompany || companies[0] || null;
    setJob(initial
      ? { ...EMPTY_JOB, company_id: initial.id, empresa_nombre: initial.nombre, ...locationFromCompany(initial) }
      : EMPTY_JOB);
  }, [isOpen, defaultCompany, companies, editingJob]);

  if (!isOpen) return null;

  const selectedCompany = companies.find(c => c.id === Number(job.company_id)) || null;
  const change = (field, value) => setJob(prev => ({ ...prev, [field]: value }));
  const changeCompany = (id) => {
    const found = companies.find(c => c.id === Number(id));
    setJob(prev => ({ ...prev, company_id: found ? found.id : '', empresa_nombre: found ? found.nombre : '', shift_id: null, ...locationFromCompany(found) }));
  };
  const applyShift = (data) => setJob(prev => ({ ...prev, shift_id: null, ...(data || {}) }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!job.company_id) return;
    const payload = {
      ...job,
      company_id: Number(job.company_id),
      shift_id: job.shift_id ? Number(job.shift_id) : null,
      transporte_incluido: job.prestaciones.includes(PRESTACION_TRANSPORTE),
      apoyo_inea: job.prestaciones.includes(PRESTACION_INEA),
      turnos_fijos: job.tipo_turno.startsWith('Fijo'),
    };
    const ok = await onSubmit(payload, editingJob?.id || null);
    if (ok) setJob(EMPTY_JOB);
  };

  const stepIndex = STEPS.findIndex(s => s.id === step);
  const isLast = stepIndex === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto relative">
        <button type="button" onClick={onClose} className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition">
          <X className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            {isEdit ? <Pencil className="w-5 h-5 text-emerald-600" /> : <Briefcase className="w-5 h-5 text-emerald-600" />}
            {isEdit ? `Editar Vacante #${editingJob.id}` : 'Publicar Nueva Vacante'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isEdit
              ? 'Los cambios aplican de inmediato a lo que ven candidatos y la IA. La empresa y su ubicación no se cambian aquí.'
              : 'Campos estructurados para que la IA proponga esta vacante a los candidatos correctos.'}
          </p>
        </div>

        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl text-[11px] font-bold">
          {STEPS.map((s, i) => (
            <button key={s.id} type="button" onClick={() => setStep(s.id)}
              className={`flex-1 py-1.5 rounded-lg transition ${step === s.id ? 'bg-white text-emerald-700 shadow-xs' : i < stepIndex ? 'text-emerald-600' : 'text-slate-500 hover:text-slate-800'}`}>
              {s.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          {step === 'company' && (
            <JobFormCompany job={job} companies={companies} selectedCompany={selectedCompany}
              onChange={change} onChangeCompany={changeCompany} onGoToTeam={onGoToTeam} lockCompany={isEdit} />
          )}
          {step === 'schedule' && <JobFormSchedule job={job} companyId={job.company_id} onChange={change} onApplyShift={applyShift} />}
          {step === 'pay' && <JobFormPay job={job} onChange={change} />}
          {step === 'requirements' && <JobFormRequirements job={job} onChange={change} />}

          <div className="flex justify-between gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={stepIndex === 0 ? onClose : () => setStep(STEPS[stepIndex - 1].id)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition font-medium">
              {stepIndex === 0 ? 'Cancelar' : 'Anterior'}
            </button>
            {isLast ? (
              <button type="submit" disabled={companies.length === 0 || !job.company_id || !job.categoria || !job.titulo.trim()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition font-bold shadow-sm">
                {isEdit ? 'Guardar Cambios' : 'Guardar Vacante'}
              </button>
            ) : (
              <button type="button" disabled={companies.length === 0} onClick={() => setStep(STEPS[stepIndex + 1].id)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white rounded-xl transition font-bold">
                Siguiente
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
