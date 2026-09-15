import React, { useState } from 'react';
import { Building2, ShieldCheck, ArrowRight, Lock, FileBadge2 } from 'lucide-react';
import { useToast } from '../../ui/Toast';
import CsfUploader from './CsfUploader';
import { MUNICIPIOS_NL, REGIMENES_SAT } from './constants';
import { useCsfUpload } from '../../../hooks/useCsfUpload';

export default function CompanyOnboarding({ currentUser, onCompanyCreated }) {
  const toast = useToast();
  const {
    csfUploading,
    csfUploadedUrl,
    csfFileName,
    csfError,
    satData,
    satValidated,
    uploadCsf,
    clearCsf
  } = useCsfUpload();

  const [form, setForm] = useState({
    nombre: '',
    municipio: 'Apodaca',
    industria: 'Manufactura y Logística',
    rfc: '',
    regimen_fiscal: REGIMENES_SAT[0],
    direccion: '',
    telefono_contacto: ''
  });
  const [savingCompany, setSavingCompany] = useState(false);

  const handleAutoFill = (updates) => {
    setForm(prev => ({ ...prev, ...updates }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim()) {
      toast.warning('Por favor ingresa el nombre de la empresa o razón social.');
      return;
    }

    if (!csfUploadedUrl) {
      toast.error('Es obligatorio subir la Constancia de Situación Fiscal (CSF) emitida por el SAT.');
      return;
    }

    setSavingCompany(true);
    try {
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

      await onCompanyCreated(payload);
    } catch (err) {
      toast.error(err.message || 'Error al registrar empresa');
    } finally {
      setSavingCompany(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 w-full space-y-6 animate-fadeIn">
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold tracking-wider uppercase">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Verificación Fiscal Obligatoria SAT</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
            Da de alta tu Empresa o Planta Industrial
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            En <strong>ChambaChat</strong> garantizamos que todas las vacantes sean 100% formales y seguras para los trabajadores de Nuevo León. Para comenzar a publicar ofertas y gestionar a tu equipo, sube la <strong>Constancia de Situación Fiscal (CSF)</strong> emitida por el SAT.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-5">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-200">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">Registro de la Empresa</h2>
              <p className="text-xs text-slate-500">Datos fiscales y ubicación en Nuevo León</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <CsfUploader
              onFileSelect={(file) => uploadCsf(file, handleAutoFill)}
              csfUploadedUrl={csfUploadedUrl}
              csfFileName={csfFileName}
              csfUploading={csfUploading}
              csfError={csfError}
              satValidated={satValidated}
              onClear={clearCsf}
              satData={satData}
              variant="onboarding"
            />

            <div className="pt-2 space-y-3.5">
              <span className="block text-xs font-black uppercase tracking-wider text-slate-700">
                2. Información de la Empresa
              </span>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nombre Comercial o Razón Social *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. Kia México Planta Pesquería o Carrier Planta Apodaca"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 focus:outline-none focus:border-emerald-500 text-xs text-slate-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">RFC de la Empresa *</label>
                  <input
                    type="text"
                    required
                    placeholder="ej. KME990101XYZ"
                    value={form.rfc}
                    onChange={(e) => setForm({ ...form, rfc: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 focus:outline-none focus:border-emerald-500 text-xs uppercase font-mono text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Municipio en Nuevo León *</label>
                  <select
                    value={form.municipio}
                    onChange={(e) => setForm({ ...form, municipio: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 focus:outline-none focus:border-emerald-500 text-xs text-slate-800"
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
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 focus:outline-none focus:border-emerald-500 text-xs text-slate-800"
                  >
                    {REGIMENES_SAT.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Giro o Industria *</label>
                  <input
                    type="text"
                    required
                    placeholder="ej. Automotriz, Logística, Ensamble"
                    value={form.industria}
                    onChange={(e) => setForm({ ...form, industria: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 focus:outline-none focus:border-emerald-500 text-xs text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Dirección o Parque Industrial (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="ej. Av. Kia 100, Parque Industrial Pesquería"
                  value={form.direccion}
                  onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 focus:outline-none focus:border-emerald-500 text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Teléfono de Contacto de RH (Opcional)
                </label>
                <input
                  type="tel"
                  placeholder="ej. 81-8000-0000"
                  value={form.telefono_contacto}
                  onChange={(e) => setForm({ ...form, telefono_contacto: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 focus:outline-none focus:border-emerald-500 text-xs text-slate-800"
                />
              </div>
            </div>

            <div className="pt-3">
              <button
                type="submit"
                disabled={savingCompany || !form.nombre.trim() || !csfUploadedUrl}
                className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider transition shadow-md flex items-center justify-center gap-2 group"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-200 group-hover:scale-110 transition-transform" />
                <span>{savingCompany ? 'Dando de alta empresa...' : 'Validar Constancia y Dar de Alta Empresa'}</span>
                <ArrowRight className="w-4 h-4 text-emerald-200 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </form>
        </div>

        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 space-y-4">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-600" />
              <span>¿Por qué requerimos la Constancia Fiscal?</span>
            </h3>

            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <div className="p-3 bg-white rounded-2xl border border-slate-200 space-y-1">
                <span className="font-bold text-slate-900 block">🛡️ Certeza a los Candidatos</span>
                <p className="text-[11px] text-slate-500">
                  Los trabajadores operativos confían plenamente en ChambaChat porque certificamos que las vacantes pertenecen a empresas formales con prestaciones de ley.
                </p>
              </div>

              <div className="p-3 bg-white rounded-2xl border border-slate-200 space-y-1">
                <span className="font-bold text-slate-900 block">👥 Gestión Multiusuario</span>
                <p className="text-[11px] text-slate-500">
                  Una vez que des de alta la empresa, podrás invitar por correo a tus colegas reclutadores para coordinarse en un mismo tablero.
                </p>
              </div>

              <div className="p-3 bg-white rounded-2xl border border-slate-200 space-y-1">
                <span className="font-bold text-slate-900 block">🤖 Chat Grupal con Chambot</span>
                <p className="text-[11px] text-slate-500">
                  El bot de IA atenderá a los postulantes las 24 horas y te notificará cuando un perfil cumpla con tus requisitos.
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl flex items-center gap-3">
            <FileBadge2 className="w-8 h-8 text-emerald-600 shrink-0" />
            <div className="text-[11px] text-emerald-950">
              <span className="font-bold block">Insignia de Empresa Verificada SAT</span>
              <span className="text-emerald-800">Tus vacantes mostrarán el distintivo de confianza en las búsquedas del bot.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
