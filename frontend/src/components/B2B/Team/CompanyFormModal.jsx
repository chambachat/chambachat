import React, { useState, useEffect } from 'react';
import { X, Building2, Settings } from 'lucide-react';
import { useToast } from '../../ui/Toast';
import CsfUploader from './CsfUploader';
import CsfEditPanel from './CsfEditPanel';
import CompanyFormFields from './CompanyFormFields';
import { useCsfUpload } from '../../../hooks/useCsfUpload';
import { EMPTY_COMPANY_FORM, formFromCompany, buildCreatePayload, buildEditPayload } from './companyPayload';

export default function CompanyFormModal({
  isOpen,
  onClose,
  mode = 'create',
  companyData,
  onSave,
  savingCompany,
  onOpenLocation
}) {
  const toast = useToast();
  const csf = useCsfUpload();
  const [form, setForm] = useState(EMPTY_COMPANY_FORM);

  useEffect(() => {
    if (!isOpen) return;
    if (mode === 'edit' && companyData) {
      setForm(formFromCompany(companyData));
      if (companyData.constancia_fiscal_url) csf.setCsfUploadedUrl(companyData.constancia_fiscal_url);
    } else if (mode === 'create') {
      setForm(EMPTY_COMPANY_FORM);
      csf.clearCsf();
    }
  }, [isOpen, mode, companyData]);

  if (!isOpen) return null;

  const changeField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));
  const autoFill = (updates) => setForm(prev => ({ ...prev, ...updates }));
  const handleFile = (file) => csf.uploadCsf(file, autoFill);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim()) {
      toast.warning('Por favor ingresa el nombre de la empresa.');
      return;
    }
    if (mode === 'create' && !csf.csfUploadedUrl) {
      toast.error('Es obligatorio subir la Constancia de Situación Fiscal (CSF).');
      return;
    }
    try {
      const payload = mode === 'create'
        ? buildCreatePayload(form, csf.csfUploadedUrl, csf.satData, csf.satValidated)
        : buildEditPayload(form, csf.csfUploadedUrl, companyData);
      await onSave(payload);
    } catch (err) {
      toast.error(err.message || 'Error al guardar empresa');
    }
  };

  const isCreate = mode === 'create';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-4 relative animate-fadeIn max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition">
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-200">
            {isCreate ? <Building2 className="w-6 h-6" /> : <Settings className="w-6 h-6" />}
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900">
              {isCreate ? 'Registrar Nueva Empresa o Planta' : 'Configuración de Planta'}
            </h3>
            <p className="text-xs text-slate-500">
              {isCreate ? 'Agrega otra nave industrial con su Constancia Fiscal (SAT)' : form.nombre}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 pt-1">
          {isCreate ? (
            <CsfUploader
              onFileSelect={handleFile}
              csfUploadedUrl={csf.csfUploadedUrl}
              csfFileName={csf.csfFileName}
              csfUploading={csf.csfUploading}
              csfError={csf.csfError}
              satValidated={csf.satValidated}
              onClear={csf.clearCsf}
              satData={csf.satData}
              variant="modal"
            />
          ) : (
            <CsfEditPanel
              companyData={companyData}
              csfUploadedUrl={csf.csfUploadedUrl}
              csfUploading={csf.csfUploading}
              csfError={csf.csfError}
              onFile={handleFile}
            />
          )}

          <CompanyFormFields form={form} onChange={changeField} mode={mode} onOpenLocation={onOpenLocation} />

          <div className="pt-3 flex gap-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={savingCompany}
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-bold transition shadow-sm"
            >
              {savingCompany ? 'Guardando...' : (isCreate ? 'Guardar y Validar' : 'Guardar Cambios')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
