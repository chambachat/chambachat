import React, { useEffect, useState } from 'react';
import { X, ClipboardList, Save } from 'lucide-react';
import { useToast } from '../ui/Toast';
import { getMyProfile, updateMyProfile } from '../../services/api';
import TagInput from '../Jobs/TagInput';

const inputClass = 'w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white transition';
const HABILIDADES_SUGERIDAS = ['Puntual', 'Trabajo en equipo', 'Manejo de herramienta', 'Lectura de planos', 'Control de calidad', 'Empaque rápido', 'Atención al cliente', 'Manejo de PC básico'];

/**
 * Edición del currículum operativo. Lo que el candidato conteste en el chat (a Chambot o en la
 * entrevista rápida) también llega aquí, y lo que capture aquí lo usa el bot para no volver a preguntar.
 */
export default function CandidateResumeModal({ isOpen, onClose, onSaved }) {
  const toast = useToast();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setProfile(null);
    getMyProfile()
      .then(p => {
        setProfile(p);
        setForm({
          nombre: p.nombre || '',
          telefono: p.telefono || '',
          edad: p.edad || '',
          escolaridad: p.escolaridad || '',
          experiencia_general: p.experiencia_general || '',
          puesto_deseado: p.puesto_deseado || '',
          certificaciones: p.certificaciones || [],
          habilidades: p.habilidades || [],
          disponibilidad: p.disponibilidad || '',
          turno_preferido: p.turno_preferido || '',
          sueldo_deseado: p.sueldo_deseado || '',
        });
      })
      .catch(err => toast.error(err.message || 'No se pudo cargar tu currículum'));
  }, [isOpen]);

  if (!isOpen) return null;

  const change = (field, value) => setForm(prev => ({ ...prev, [field]: value }));
  const cat = profile?.catalogos || {};

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        edad: form.edad === '' ? null : Number(form.edad),
        sueldo_deseado: form.sueldo_deseado === '' ? null : Number(form.sueldo_deseado),
        escolaridad: form.escolaridad || null,
        experiencia_general: form.experiencia_general || null,
        disponibilidad: form.disponibilidad || null,
        turno_preferido: form.turno_preferido || null,
        puesto_deseado: form.puesto_deseado || null,
        telefono: form.telefono || null,
      };
      const saved = await updateMyProfile(payload);
      toast.success(`Currículum guardado (${saved.completitud}% completo)`);
      onSaved?.(saved);
    } catch (err) {
      toast.error(err.message || 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const Select = ({ field, label, options, placeholder = 'Selecciona...' }) => (
    <div>
      <label className="block text-xs font-semibold text-slate-700 mb-1">{label}</label>
      <select value={form[field] || ''} onChange={(e) => change(field, e.target.value)} className={inputClass}>
        <option value="">{placeholder}</option>
        {(options || []).map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-slate-200 max-w-2xl w-full p-6 shadow-2xl space-y-4 relative animate-fadeIn max-h-[92vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition">
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-200">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900">Mi currículum operativo</h3>
            <p className="text-xs text-slate-500">Con estos datos Chambot te propone mejores vacantes y los reclutadores te ubican más rápido.</p>
          </div>
        </div>

        {!profile ? (
          <div className="py-10 text-center text-xs text-slate-400">Cargando tu currículum...</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex items-center gap-3 text-xs">
              <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                <div className="bg-emerald-500 h-2 rounded-full transition-all" style={{ width: `${profile.completitud}%` }} />
              </div>
              <span className="font-black text-emerald-700">{profile.completitud}% completo</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre completo</label>
                <input type="text" value={form.nombre} onChange={(e) => change('nombre', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">WhatsApp (10 dígitos)</label>
                <input type="tel" value={form.telefono} onChange={(e) => change('telefono', e.target.value)} placeholder="81-1234-5678" className={inputClass} />
              </div>
              <Select field="puesto_deseado" label="Puesto que buscas" options={cat.puestos} />
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Edad (opcional)</label>
                <input type="number" min="15" max="75" value={form.edad} onChange={(e) => change('edad', e.target.value)} className={inputClass} />
              </div>
              <Select field="escolaridad" label="Escolaridad" options={cat.escolaridades} />
              <Select field="experiencia_general" label="Experiencia en planta o almacén" options={cat.experiencias} />
              <Select field="disponibilidad" label="¿Cuándo puedes empezar?" options={cat.disponibilidades} />
              <Select field="turno_preferido" label="Turno que te acomoda" options={cat.turnos} />
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Sueldo semanal libre que buscas (MXN)</label>
                <input type="number" min="0" step="100" value={form.sueldo_deseado} onChange={(e) => change('sueldo_deseado', e.target.value)} className={inputClass} />
              </div>
            </div>

            <div className="text-xs">
              <TagInput
                label="Certificaciones y licencias"
                hint="Escribe y presiona Enter, o elige una sugerencia (ej. DC-3, licencia de conducir, Excel)."
                placeholder="Ej. Licencia de montacargas (DC-3)"
                suggestions={cat.certificaciones || []}
                value={form.certificaciones}
                onChange={(v) => change('certificaciones', v)}
              />
            </div>
            <div className="text-xs">
              <TagInput
                label="Habilidades"
                hint="Lo que sabes hacer bien; ayuda a la IA a emparejarte con las vacantes."
                placeholder="Ej. Manejo de herramienta, Puntual"
                suggestions={HABILIDADES_SUGERIDAS}
                value={form.habilidades}
                onChange={(v) => change('habilidades', v)}
              />
            </div>

            {profile.faltantes?.length > 0 && (
              <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                Te falta: {profile.faltantes.join(', ')}. {profile.faltantes.includes('Ubicación') ? 'La ubicación se registra desde tu perfil o compartiéndola en el chat.' : ''}
              </p>
            )}

            <div className="pt-3 flex gap-2 border-t border-slate-100">
              <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition">
                Cancelar
              </button>
              <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-bold transition shadow-sm flex items-center justify-center gap-1.5">
                <Save className="w-4 h-4" />
                <span>{saving ? 'Guardando...' : 'Guardar currículum'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
