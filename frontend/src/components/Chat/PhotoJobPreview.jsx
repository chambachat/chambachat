import React, { useState } from 'react';
import { Camera, Phone, Mail, MessageCircle, ChevronDown, ChevronUp, Check, X, Sparkles } from 'lucide-react';
import { CATEGORIAS, TIPOS_TURNO, DIAS_LABORALES } from '../../constants/jobCatalog';

export default function PhotoJobPreview({ extraction, onConfirm, onDiscard, isSubmitting }) {
  const [showRawText, setShowRawText] = useState(false);
  const [formData, setFormData] = useState({
    titulo_puesto: extraction.titulo_puesto || '',
    empresa: extraction.empresa || '',
    sueldo_semanal_libre: extraction.sueldo_semanal_libre || '',
    categoria: extraction.categoria || '',
    tipo_turno: extraction.tipo_turno || '',
    dias_laborales: extraction.dias_laborales || '',
    municipio: extraction.municipio || '',
    descripcion: extraction.descripcion || ''
  });

  const getConfidenceBadge = (confidence) => {
    if (confidence > 0.7) return { text: 'Alta 🟢', color: 'text-emerald-600 bg-emerald-100' };
    if (confidence >= 0.4) return { text: 'Media 🟡', color: 'text-yellow-600 bg-yellow-100' };
    return { text: 'Baja 🔴', color: 'text-red-600 bg-red-100' };
  };

  const badge = getConfidenceBadge(extraction.confidence || 0.8);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm({ ...extraction, ...formData });
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden max-w-md w-full border border-gray-200 my-2 text-sm">
      <div className="bg-emerald-500 px-4 py-3 text-white flex items-center justify-between">
        <div className="flex items-center gap-2 font-medium">
          <Sparkles className="w-5 h-5" />
          <span>Datos detectados</span>
        </div>
        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${badge.color}`}>
          Confianza: {badge.text}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-4 text-gray-800">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Título del puesto *</label>
          <input
            type="text"
            name="titulo_puesto"
            value={formData.titulo_puesto}
            onChange={handleChange}
            required
            className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Empresa</label>
          <input
            type="text"
            name="empresa"
            value={formData.empresa}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Sueldo semanal libre *</label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-gray-500">$</span>
            <input
              type="number"
              name="sueldo_semanal_libre"
              value={formData.sueldo_semanal_libre}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded pl-7 pr-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Categoría</label>
            <select
              name="categoria"
              value={formData.categoria}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="">Selecciona...</option>
              {CATEGORIAS?.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Tipo de turno</label>
            <select
              name="tipo_turno"
              value={formData.tipo_turno}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="">Selecciona...</option>
              {TIPOS_TURNO?.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Días laborales</label>
            <select
              name="dias_laborales"
              value={formData.dias_laborales}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="">Selecciona...</option>
              {DIAS_LABORALES?.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Municipio</label>
            <input
              type="text"
              name="municipio"
              value={formData.municipio}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Descripción</label>
          <textarea
            name="descripcion"
            value={formData.descripcion}
            onChange={handleChange}
            rows={3}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none"
          />
        </div>

        {/* Contact info read-only */}
        {(extraction.telefono || extraction.whatsapp || extraction.email) && (
          <div className="bg-gray-50 p-3 rounded border border-gray-100 flex flex-col gap-2">
            <span className="text-xs font-semibold text-gray-500">Contacto detectado</span>
            {extraction.telefono && (
              <div className="flex items-center gap-2 text-gray-700">
                <Phone className="w-4 h-4 text-emerald-600" />
                <span>{extraction.telefono}</span>
              </div>
            )}
            {extraction.whatsapp && (
              <div className="flex items-center gap-2 text-gray-700">
                <MessageCircle className="w-4 h-4 text-emerald-600" />
                <span>{extraction.whatsapp}</span>
              </div>
            )}
            {extraction.email && (
              <div className="flex items-center gap-2 text-gray-700">
                <Mail className="w-4 h-4 text-emerald-600" />
                <span>{extraction.email}</span>
              </div>
            )}
          </div>
        )}

        <div className="border-t border-gray-100 pt-3">
          <button
            type="button"
            onClick={() => setShowRawText(!showRawText)}
            className="flex items-center justify-between w-full text-left text-sm text-gray-600 hover:text-emerald-600 transition-colors"
          >
            <span className="font-medium flex items-center gap-2">
              <Camera className="w-4 h-4" /> Texto detectado de la foto
            </span>
            {showRawText ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          
          {showRawText && (
            <div className="mt-2 p-3 bg-gray-50 rounded text-xs text-gray-600 whitespace-pre-wrap font-mono h-32 overflow-y-auto border border-gray-200">
              {extraction.raw_text || "No se detectó texto crudo."}
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-2">
          <button
            type="button"
            onClick={onDiscard}
            disabled={isSubmitting}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <X className="w-4 h-4" /> Descartar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            <Check className="w-4 h-4" />
            {isSubmitting ? 'Guardando...' : 'Publicar vacante'}
          </button>
        </div>
      </form>
    </div>
  );
}
