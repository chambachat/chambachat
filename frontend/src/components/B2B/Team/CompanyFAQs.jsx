import React, { useState, useEffect } from 'react';
import { HelpCircle, Plus, Pencil, Trash2, Check, X, ChevronDown, ChevronUp } from 'lucide-react';
import { getCompanyFAQs, createCompanyFAQ, updateCompanyFAQ, deleteCompanyFAQ } from '../../../services/api';

export default function CompanyFAQs({ companyId }) {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // faq id or 'new'
  const [form, setForm] = useState({ pregunta: '', respuesta: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const data = await getCompanyFAQs(companyId);
      setFaqs(data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { if (companyId) load(); }, [companyId]); // eslint-disable-line

  const startNew = () => {
    setEditing('new');
    setForm({ pregunta: '', respuesta: '' });
  };

  const startEdit = (faq) => {
    setEditing(faq.id);
    setForm({ pregunta: faq.pregunta, respuesta: faq.respuesta });
  };

  const cancel = () => { setEditing(null); setForm({ pregunta: '', respuesta: '' }); };

  const handleSave = async () => {
    if (!form.pregunta.trim() || !form.respuesta.trim()) return;
    setSaving(true);
    try {
      if (editing === 'new') {
        const created = await createCompanyFAQ(companyId, { pregunta: form.pregunta, respuesta: form.respuesta, orden: faqs.length });
        setFaqs(prev => [...prev, created]);
      } else {
        const updated = await updateCompanyFAQ(companyId, editing, form);
        setFaqs(prev => prev.map(f => f.id === editing ? updated : f));
      }
      cancel();
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (faqId) => {
    if (!confirm('¿Eliminar esta pregunta frecuente?')) return;
    try {
      await deleteCompanyFAQ(companyId, faqId);
      setFaqs(prev => prev.filter(f => f.id !== faqId));
    } catch (err) { alert(err.message); }
  };

  const toggleActive = async (faq) => {
    try {
      const updated = await updateCompanyFAQ(companyId, faq.id, { activa: !faq.activa });
      setFaqs(prev => prev.map(f => f.id === faq.id ? updated : f));
    } catch (err) { alert(err.message); }
  };

  if (!companyId) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-violet-50">
            <HelpCircle className="w-4 h-4 text-violet-600" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900">Preguntas Frecuentes</h3>
            <p className="text-[10px] text-slate-400">El chatbot usará estas respuestas al hablar con candidatos</p>
          </div>
        </div>
        {editing !== 'new' && (
          <button
            onClick={startNew}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-violet-600 text-white text-[10px] font-bold rounded-lg hover:bg-violet-700 transition"
          >
            <Plus className="w-3 h-3" /> Agregar
          </button>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="p-6 flex justify-center">
          <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Lista */}
      <div className="divide-y divide-slate-50">
        {faqs.map(faq => (
          <div key={faq.id} className={`px-5 py-3 ${!faq.activa ? 'opacity-50' : ''}`}>
            {editing === faq.id ? (
              <div className="space-y-2">
                <input
                  value={form.pregunta}
                  onChange={e => setForm(p => ({ ...p, pregunta: e.target.value }))}
                  placeholder="Pregunta..."
                  className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-violet-400 outline-none"
                />
                <textarea
                  value={form.respuesta}
                  onChange={e => setForm(p => ({ ...p, respuesta: e.target.value }))}
                  placeholder="Respuesta..."
                  rows={3}
                  className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-violet-400 outline-none resize-none"
                />
                <div className="flex gap-2">
                  <button onClick={handleSave} disabled={saving} className="flex items-center gap-1 px-2.5 py-1 bg-violet-600 text-white text-[10px] font-bold rounded-lg hover:bg-violet-700 transition">
                    <Check className="w-3 h-3" /> Guardar
                  </button>
                  <button onClick={cancel} className="px-2.5 py-1 text-[10px] font-bold text-slate-500 hover:text-slate-700">
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800">❓ {faq.pregunta}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{faq.respuesta}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => toggleActive(faq)} title={faq.activa ? 'Desactivar' : 'Activar'}
                    className={`p-1 rounded-md text-[10px] font-bold border transition ${faq.activa ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                    {faq.activa ? 'ON' : 'OFF'}
                  </button>
                  <button onClick={() => startEdit(faq)} className="p-1 text-slate-400 hover:text-violet-600 transition">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(faq.id)} className="p-1 text-slate-400 hover:text-red-500 transition">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Form para nueva FAQ */}
        {editing === 'new' && (
          <div className="px-5 py-3 bg-violet-50/30">
            <div className="space-y-2">
              <input
                value={form.pregunta}
                onChange={e => setForm(p => ({ ...p, pregunta: e.target.value }))}
                placeholder="Ej: ¿Dan uniforme?"
                className="w-full text-xs border border-violet-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-violet-400 outline-none"
                autoFocus
              />
              <textarea
                value={form.respuesta}
                onChange={e => setForm(p => ({ ...p, respuesta: e.target.value }))}
                placeholder="Ej: Sí, se proporcionan 2 uniformes sin costo al ingresar."
                rows={3}
                className="w-full text-xs border border-violet-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-violet-400 outline-none resize-none"
              />
              <div className="flex gap-2">
                <button onClick={handleSave} disabled={saving} className="flex items-center gap-1 px-2.5 py-1 bg-violet-600 text-white text-[10px] font-bold rounded-lg hover:bg-violet-700 transition">
                  <Check className="w-3 h-3" /> {saving ? 'Guardando...' : 'Guardar'}
                </button>
                <button onClick={cancel} className="px-2.5 py-1 text-[10px] font-bold text-slate-500 hover:text-slate-700">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && faqs.length === 0 && editing !== 'new' && (
          <div className="px-5 py-8 text-center">
            <HelpCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-500">Sin preguntas frecuentes</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Agrega las preguntas que más hacen los candidatos</p>
            <button onClick={startNew} className="mt-3 text-[10px] font-bold text-violet-600 hover:text-violet-800">
              + Agregar primera pregunta
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
