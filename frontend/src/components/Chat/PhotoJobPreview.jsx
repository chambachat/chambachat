import React, { useState } from 'react';
import { Camera, Phone, Mail, MessageCircle, ChevronDown, ChevronUp, Check, X, Sparkles } from 'lucide-react';
import { CATEGORIAS, TIPOS_TURNO, DIAS_LABORALES } from '../../constants/jobCatalog';

export default function PhotoJobPreview({ extraction, onConfirm, onDiscard, isSubmitting }) {
  const [showRawText, setShowRawText] = useState(false);
  const [formData, setFormData] = useState({
    titulo: extraction?.titulo || '',
    empresa_nombre: extraction?.empresa_nombre || '',
    sueldo_semanal_libre: extraction?.sueldo_semanal_libre || '',
    categoria: extraction?.categoria || '',
    tipo_turno: extraction?.tipo_turno || '',
    dias_laborales: extraction?.dias_laborales || '',
    municipio: extraction?.municipio || '',
    descripcion: extraction?.descripcion || '',
    fuente_contacto_telefono: extraction?.contacto?.telefono || extraction?.fuente_contacto_telefono || '',
    fuente_contacto_whatsapp: extraction?.contacto?.whatsapp || extraction?.fuente_contacto_whatsapp || extraction?.contacto?.telefono || '',
  });

  const getConfidenceBadge = (confidence) => {
    const val = typeof confidence === 'number' ? confidence : 0.8;
    if (val > 0.7) return { text: 'Alta 🟢', color: 'text-emerald-700 bg-emerald-100' };
    if (val >= 0.4) return { text: 'Media 🟡', color: 'text-yellow-700 bg-yellow-100' };
    return { text: 'Baja 🔴', color: 'text-red-700 bg-red-100' };
  };

  const badge = getConfidenceBadge(extraction?.confianza || extraction?.confidence);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { ...formData };
    if (payload.sueldo_semanal_libre) {
      payload.sueldo_semanal_libre = parseFloat(payload.sueldo_semanal_libre);
    } else {
      payload.sueldo_semanal_libre = null;
    }
    payload.latitud = extraction?.latitud || 25.6866;
    payload.longitud = extraction?.longitud || -100.3161;
    payload.photo_log_id = extraction?.photo_log_id || null;
    payload.texto_ocr = extraction?.texto_crudo || extraction?.raw_text || null;
    
    payload.fuente_contacto_telefono = formData.fuente_contacto_telefono?.trim() || null;
    payload.fuente_contacto_whatsapp = formData.fuente_contacto_whatsapp?.trim() || formData.fuente_contacto_telefono?.trim() || null;
    payload.fuente_contacto_email = extraction?.contacto?.email || null;

    onConfirm(payload);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden max-w-lg w-full border border-gray-200 my-2 text-sm">
      <div className="bg-emerald-600 px-4 py-3 text-white flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold">
          <Sparkles className="w-5 h-5 text-emerald-200" />
          <span>Datos detectados de la lona</span>
        </div>
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${badge.color}`}>
          Confianza: {badge.text}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4 text-gray-800">
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">Título del puesto *</label>
          <input
            type="text"
            name="titulo"
            value={formData.titulo}
            onChange={handleChange}
            required
            placeholder="Ej. Soldador / Ayudante general"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">Empresa o Negocio</label>
          <input
            type="text"
            name="empresa_nombre"
            value={formData.empresa_nombre}
            onChange={handleChange}
            placeholder="Nombre de la empresa que contrata"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        {/* Contacto directo para WhatsApp */}
        <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-100 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
            <MessageCircle className="w-4 h-4 text-emerald-600" />
            <span>Contacto para que los candidatos se postulen</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">WhatsApp (10 dígitos)</label>
              <div className="relative">
                <span className="absolute left-2.5 top-2 text-xs font-bold text-emerald-600">📱</span>
                <input
                  type="tel"
                  name="fuente_contacto_whatsapp"
                  value={formData.fuente_contacto_whatsapp}
                  onChange={handleChange}
                  placeholder="Ej. 8112345678"
                  className="w-full bg-white border border-gray-300 rounded-lg pl-8 pr-3 py-1.5 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">Teléfono adicional</label>
              <div className="relative">
                <span className="absolute left-2.5 top-2 text-xs font-bold text-emerald-600">📞</span>
                <input
                  type="tel"
                  name="fuente_contacto_telefono"
                  value={formData.fuente_contacto_telefono}
                  onChange={handleChange}
                  placeholder="Opcional"
                  className="w-full bg-white border border-gray-300 rounded-lg pl-8 pr-3 py-1.5 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
          <span className="text-[10px] text-emerald-700">
            * Con este número, los candidatos podrán enviar un WhatsApp directo al presionar "Postularme".
          </span>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">Sueldo semanal libre</label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-gray-500 font-semibold">$</span>
            <input
              type="number"
              name="sueldo_semanal_libre"
              value={formData.sueldo_semanal_libre}
              onChange={handleChange}
              placeholder="Si no viene en la foto, déjalo vacío"
              className="w-full border border-gray-300 rounded-lg pl-7 pr-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Categoría</label>
            <select
              name="categoria"
              value={formData.categoria}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-2.5 py-2 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="">Selecciona...</option>
              {CATEGORIAS?.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Municipio</label>
            <input
              type="text"
              name="municipio"
              value={formData.municipio}
              onChange={handleChange}
              placeholder="Ej. Monterrey"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Tipo de turno</label>
            <select
              name="tipo_turno"
              value={formData.tipo_turno}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-2.5 py-2 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="">Selecciona...</option>
              {TIPOS_TURNO?.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Días laborales</label>
            <select
              name="dias_laborales"
              value={formData.dias_laborales}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-2.5 py-2 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="">Selecciona...</option>
              {DIAS_LABORALES?.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">Descripción / Requisitos</label>
          <textarea
            name="descripcion"
            value={formData.descripcion}
            onChange={handleChange}
            rows={3}
            placeholder="Detalles adicionales detectados en la lona"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none text-xs"
          />
        </div>

        <div className="border-t border-gray-100 pt-3">
          <button
            type="button"
            onClick={() => setShowRawText(!showRawText)}
            className="flex items-center justify-between w-full text-left text-xs text-gray-500 hover:text-emerald-600 transition-colors"
          >
            <span className="font-semibold flex items-center gap-1.5">
              <Camera className="w-4 h-4" /> Ver texto original leído de la foto
            </span>
            {showRawText ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          
          {showRawText && (
            <div className="mt-2 p-3 bg-gray-50 rounded-lg text-[11px] text-gray-600 whitespace-pre-wrap font-mono h-28 overflow-y-auto border border-gray-200">
              {extraction?.texto_crudo || extraction?.raw_text || "No se detectó texto crudo."}
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-1 pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={onDiscard}
            disabled={isSubmitting}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors text-xs"
          >
            <X className="w-4 h-4" /> Descartar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-md disabled:opacity-50 transition-all text-xs"
          >
            <Check className="w-4 h-4" />
            {isSubmitting ? 'Guardando...' : 'Publicar vacante (+10 ⭐)'}
          </button>
        </div>
      </form>
    </div>
  );
}
