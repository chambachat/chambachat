import React, { useState, useEffect } from 'react';
import { X, Building2, Settings, UploadCloud, MapPin, ExternalLink } from 'lucide-react';
import { useToast } from '../../ui/Toast';
import CsfUploader from './CsfUploader';
import { MUNICIPIOS_NL, REGIMENES_SAT } from './constants';
import { useCsfUpload } from '../../../hooks/useCsfUpload';

export default function CompanyFormModal({
  isOpen,
  onClose,
  mode = 'create',
  companyData,
  onSave,
  savingCompany,
  currentUser,
  onOpenLocation
}) {
  const toast = useToast();
  const {
    csfUploading,
    csfUploadedUrl,
    csfFileName,
    csfError,
    satData,
    satValidated,
    uploadCsf,
    clearCsf,
    setCsfUploadedUrl
  } = useCsfUpload();

  const [form, setForm] = useState({
    nombre: '',
    municipio: 'Apodaca',
    industria: 'Manufactura y Logística',
    rfc: '',
    regimen_fiscal: REGIMENES_SAT[0],
    direccion: '',
    telefono_contacto: '',
    latitud: null,
    longitud: null
  });

  useEffect(() => {
    if (isOpen && mode === 'edit' && companyData) {
      setForm({
        nombre: companyData.nombre || '',
        municipio: companyData.municipio || 'Apodaca',
        industria: companyData.industria || '',
        rfc: companyData.rfc || '',
        regimen_fiscal: companyData.regimen_fiscal || REGIMENES_SAT[0],
        direccion: companyData.direccion || '',
        telefono_contacto: companyData.telefono_contacto || '',
        latitud: companyData.latitud,
        longitud: companyData.longitud
      });
      if (companyData.constancia_fiscal_url) {
        setCsfUploadedUrl(companyData.constancia_fiscal_url);
      }
    } else if (isOpen && mode === 'create') {
      setForm({
        nombre: '',
        municipio: 'Apodaca',
        industria: 'Manufactura y Logística',
        rfc: '',
        regimen_fiscal: REGIMENES_SAT[0],
        direccion: '',
        telefono_contacto: '',
        latitud: null,
        longitud: null
      });
      clearCsf();
    }
  }, [isOpen, mode, companyData]);

  if (!isOpen) return null;

  const handleAutoFill = (updates) => {
    setForm(prev => ({ ...prev, ...updates }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim()) {
      toast.warning('Por favor ingresa el nombre de la empresa.');
      return;
    }

    if (mode === 'create' && !csfUploadedUrl) {
      toast.error('Es obligatorio subir la Constancia de Situación Fiscal (CSF).');
      return;
    }

    try {
      if (mode === 'create') {
        const payload = {
          nombre: form.nombre.trim(),
          municipio: form.municipio,
          industria: form.industria,
          rfc: form.rfc.trim().toUpperCase() || undefined,
          regimen_fiscal: form.regimen_fiscal,
          constancia_fiscal_url: csfUploadedUrl,
          direccion: form.direccion.trim() || undefined,
          telefono_contacto: form.telefono_contacto.trim() || undefined,
          creator_email: currentUser?.email,
          creator_name: currentUser?.name,
          idcif: satData?.idcif,
          curp: satData?.curp,
          razon_social: satData?.razon_social,
          regimen_capital: satData?.regimen_capital,
          fecha_inicio_operaciones: satData?.fecha_inicio_operaciones,
          estatus_padron: satData?.estatus_padron || 'ACTIVO',
          fecha_ultimo_cambio_estado: satData?.fecha_ultimo_cambio_estado,
          codigo_postal: satData?.codigo_postal,
          entidad_federativa: satData?.entidad_federativa,
          colonia: satData?.colonia,
          tipo_vialidad: satData?.tipo_vialidad,
          calle: satData?.calle,
          numero_exterior: satData?.numero_exterior,
          numero_interior: satData?.numero_interior,
          sat_url_validacion: satData?.sat_url,
          sat_validado: satValidated || Boolean(satData?.rfc),
          sat_raw_data: satData ? JSON.stringify(satData) : undefined
        };
        await onSave(payload);
      } else {
        const payload = {
          nombre: form.nombre,
          municipio: form.municipio,
          industria: form.industria,
          rfc: form.rfc,
          direccion: form.direccion,
          telefono_contacto: form.telefono_contacto,
          regimen_fiscal: form.regimen_fiscal
        };
        if (csfUploadedUrl && csfUploadedUrl !== companyData?.constancia_fiscal_url) {
          payload.constancia_fiscal_url = csfUploadedUrl;
        }
        await onSave(payload);
      }
    } catch (err) {
      toast.error(err.message || 'Error al guardar empresa');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-4 relative animate-fadeIn max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-200">
            {mode === 'create' ? <Building2 className="w-6 h-6" /> : <Settings className="w-6 h-6" />}
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900">
              {mode === 'create' ? 'Registrar Nueva Empresa o Planta' : 'Configuración de Planta'}
            </h3>
            <p className="text-xs text-slate-500">
              {mode === 'create' ? 'Agrega otra nave industrial con su Constancia Fiscal (SAT)' : form.nombre}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 pt-1">
          {mode === 'create' ? (
            <CsfUploader
              onFileSelect={(file) => uploadCsf(file, handleAutoFill)}
              csfUploadedUrl={csfUploadedUrl}
              csfFileName={csfFileName}
              csfUploading={csfUploading}
              csfError={csfError}
              satValidated={satValidated}
              onClear={clearCsf}
              satData={satData}
              variant="modal"
            />
          ) : (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Constancia Fiscal (CSF)</span>
                {companyData?.constancia_fiscal_url ? (
                  <a
                    href={companyData.constancia_fiscal_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-bold text-emerald-700 hover:underline flex items-center gap-1"
                  >
                    <span>Ver archivo actual</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <span className="text-[10px] text-amber-700 font-bold">Sin constancia</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  id="edit-csf-file"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      uploadCsf(e.target.files[0], handleAutoFill);
                    }
                  }}
                  accept=".pdf,image/jpeg,image/png,image/jpg,image/webp"
                  className="hidden"
                />
                <label
                  htmlFor="edit-csf-file"
                  className="cursor-pointer text-[11px] font-bold px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 transition flex items-center gap-1.5"
                >
                  <UploadCloud className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{csfUploading ? 'Subiendo...' : 'Actualizar / Reemplazar archivo fiscal'}</span>
                </label>
                {csfUploadedUrl && csfUploadedUrl !== companyData?.constancia_fiscal_url && (
                  <span className="text-[11px] text-emerald-600 font-bold">✅ Nuevo archivo cargado</span>
                )}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Nombre de la Empresa</label>
            <input
              type="text"
              required
              placeholder="ej. Whirlpool Planta Horno o Ternium Churubusco"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-800"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">RFC del SAT</label>
              <input
                type="text"
                required
                placeholder="ej. WPL990101XYZ"
                value={form.rfc}
                onChange={(e) => setForm({ ...form, rfc: e.target.value.toUpperCase() })}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs uppercase font-mono text-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Municipio</label>
              <select
                value={form.municipio}
                onChange={(e) => setForm({ ...form, municipio: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-800"
              >
                {MUNICIPIOS_NL.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Régimen Fiscal (SAT)</label>
              <select
                value={form.regimen_fiscal}
                onChange={(e) => setForm({ ...form, regimen_fiscal: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-800"
              >
                {REGIMENES_SAT.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Industria o Giro</label>
              <input
                type="text"
                placeholder="ej. Automotriz, Logística, Ensamble"
                value={form.industria}
                onChange={(e) => setForm({ ...form, industria: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Dirección</label>
            <input
              type="text"
              placeholder="ej. Parque Industrial Prologis Apodaca, Nave 4"
              value={form.direccion}
              onChange={(e) => setForm({ ...form, direccion: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-800"
            />
          </div>

          {mode === 'edit' && (
            <div className="p-3 bg-emerald-50/60 border border-emerald-200/80 rounded-2xl flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                <div className="min-w-0">
                  <span className="text-xs font-bold text-slate-800 block">Ubicación en Mapa & GPS</span>
                  <span className="text-[10px] text-slate-500 truncate block">
                    {form.latitud ? `Lat: ${Number(form.latitud).toFixed(4)}, Lon: ${Number(form.longitud).toFixed(4)}` : 'Sin coordenadas GPS fijadas'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={onOpenLocation}
                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition flex items-center gap-1 shrink-0 shadow-2xs"
              >
                <MapPin className="w-3 h-3" />
                <span>{form.latitud ? 'Ajustar Pin' : 'Fijar en Mapa'}</span>
              </button>
            </div>
          )}

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
              disabled={savingCompany}
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-bold transition shadow-sm"
            >
              {savingCompany ? 'Guardando...' : (mode === 'create' ? 'Guardar y Validar' : 'Guardar Cambios')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
