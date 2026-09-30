import React, { useState } from 'react';
import { requestCompanyQuote } from '../../services/api';
import { Check, Mail, Phone, Building, User } from 'lucide-react';

export default function BillingPlan({ currentUser, activeCompany }) {
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    nombre: currentUser?.nombre || currentUser?.full_name || '',
    empresa: activeCompany?.nombre || '',
    telefono: currentUser?.telefono || '',
    email: currentUser?.email || '',
    comentarios: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await requestCompanyQuote(formData);
      setSuccess(true);
    } catch (err) {
      alert('Hubo un error al enviar tu solicitud. Intenta de nuevo.');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showForm) {
    return (
      <div className="max-w-xl mx-auto mt-10 p-6 bg-white rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Solicitar Cotización Premium</h2>
        <p className="text-slate-500 text-sm mb-6">Déjanos tus datos y un especialista en reclutamiento masivo de ChambaChat te contactará para armar un plan a la medida de tu operación.</p>
        
        {success ? (
          <div className="p-6 bg-emerald-50 rounded-xl border border-emerald-200 text-center space-y-3">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
              <Check className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-emerald-800 text-lg">¡Solicitud Enviada!</h3>
            <p className="text-emerald-700 text-sm">Pronto nos pondremos en contacto contigo al correo {formData.email}.</p>
            <button 
              onClick={() => setShowForm(false)}
              className="mt-4 px-4 py-2 bg-emerald-600 text-white font-semibold rounded-xl text-sm"
            >
              Volver a los planes
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Tu Nombre</label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input required type="text" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Empresa o Grupo Industrial</label>
              <div className="relative">
                <Building className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input required type="text" value={formData.empresa} onChange={e => setFormData({...formData, empresa: e.target.value})} className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Teléfono Móvil</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input required type="tel" value={formData.telefono} onChange={e => setFormData({...formData, telefono: e.target.value})} className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Correo Electrónico</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition" />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Comentarios (Opcional)</label>
              <textarea placeholder="Ej. Contratamos 50 operarios por semana y ocupamos 3 reclutadores..." value={formData.comentarios} onChange={e => setFormData({...formData, comentarios: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition min-h-[80px]" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition">
                Cancelar
              </button>
              <button disabled={isSubmitting} type="submit" className="px-5 py-2 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition disabled:opacity-50">
                {isSubmitting ? 'Enviando...' : 'Enviar solicitud'}
              </button>
            </div>
          </form>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h1 className="text-3xl font-extrabold text-slate-900 mb-3 tracking-tight">Empresas y plantas</h1>
        <p className="text-slate-500 text-sm">
          Tres niveles según cuántas plantas, vacantes y reclutadores manejas. Todos incluyen la verificación fiscal, el chat de candidatos y la entrevista rápida con IA.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 lg:gap-8 items-start">
        {/* Tier: Inicio / Gratis */}
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col h-full">
          <div className="text-center mb-8">
            <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Inicio</span>
            <h2 className="text-3xl font-extrabold text-slate-900 mt-2 mb-1">Gratis</h2>
            <p className="text-slate-400 text-xs font-medium">Para probar la plataforma</p>
          </div>
          <ul className="space-y-4 mb-8 flex-1">
            <li className="flex gap-3 text-sm text-slate-600"><Check className="w-5 h-5 text-emerald-500 shrink-0" /> 1 planta verificada ante el SAT</li>
            <li className="flex gap-3 text-sm text-slate-600"><Check className="w-5 h-5 text-emerald-500 shrink-0" /> Vacantes activas limitadas (5 máx)</li>
            <li className="flex gap-3 text-sm text-slate-600"><Check className="w-5 h-5 text-emerald-500 shrink-0" /> Smart Link con código verificador</li>
            <li className="flex gap-3 text-sm text-slate-600"><Check className="w-5 h-5 text-emerald-500 shrink-0" /> Entrevista rápida y compatibilidad</li>
            <li className="flex gap-3 text-sm text-slate-600"><Check className="w-5 h-5 text-emerald-500 shrink-0" /> Chat de candidatos y candidatos preferidos</li>
          </ul>
          <button disabled className="w-full py-3 px-4 bg-slate-50 text-slate-500 font-bold rounded-xl border border-slate-200 text-sm cursor-not-allowed">
            Plan Actual
          </button>
        </div>

        {/* Tier: Crecimiento */}
        <div className="bg-white rounded-3xl p-8 border-2 border-emerald-500 shadow-xl shadow-emerald-900/5 flex flex-col h-full relative transform md:-translate-y-4">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full border border-emerald-200">
              Más elegido
            </span>
          </div>
          <div className="text-center mb-8 mt-2">
            <span className="text-sm font-bold text-slate-700 uppercase tracking-wider">Crecimiento</span>
            <h2 className="text-3xl font-extrabold text-slate-900 mt-2 mb-1">Consulta el precio</h2>
            <p className="text-slate-500 text-xs font-medium">Para plantas con contratación continua</p>
          </div>
          <ul className="space-y-4 mb-8 flex-1">
            <li className="flex gap-3 text-sm text-slate-700 font-medium"><Check className="w-5 h-5 text-emerald-500 shrink-0" /> Todo lo de Inicio</li>
            <li className="flex gap-3 text-sm text-slate-700 font-medium"><Check className="w-5 h-5 text-emerald-500 shrink-0" /> Vacantes activas ilimitadas</li>
            <li className="flex gap-3 text-sm text-slate-700 font-medium"><Check className="w-5 h-5 text-emerald-500 shrink-0" /> Equipo de reclutadores con roles</li>
            <li className="flex gap-3 text-sm text-slate-700 font-medium"><Check className="w-5 h-5 text-emerald-500 shrink-0" /> Rutas de transporte y turnos en el mapa</li>
            <li className="flex gap-3 text-sm text-slate-700 font-medium"><Check className="w-5 h-5 text-emerald-500 shrink-0" /> Páginas de vacante indexables en buscadores</li>
            <li className="flex gap-3 text-sm text-slate-700 font-medium"><Check className="w-5 h-5 text-emerald-500 shrink-0" /> Soporte por chat en horario hábil</li>
          </ul>
          <button onClick={() => setShowForm(true)} className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-slate-900/20">
            Solicitar cotización
          </button>
        </div>

        {/* Tier: Planta */}
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col h-full">
          <div className="text-center mb-8">
            <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Planta</span>
            <h2 className="text-3xl font-extrabold text-slate-900 mt-2 mb-1">Consulta el precio</h2>
            <p className="text-slate-400 text-xs font-medium">Varias plantas o grupos industriales</p>
          </div>
          <ul className="space-y-4 mb-8 flex-1">
            <li className="flex gap-3 text-sm text-slate-600"><Check className="w-5 h-5 text-slate-400 shrink-0" /> Todo lo de Crecimiento</li>
            <li className="flex gap-3 text-sm text-slate-600"><Check className="w-5 h-5 text-slate-400 shrink-0" /> Varias plantas y empresas en una cuenta</li>
            <li className="flex gap-3 text-sm text-slate-600"><Check className="w-5 h-5 text-slate-400 shrink-0" /> Acompañamiento en campañas con Smart Link</li>
            <li className="flex gap-3 text-sm text-slate-600"><Check className="w-5 h-5 text-slate-400 shrink-0" /> Reportes de postulaciones y compatibilidad</li>
            <li className="flex gap-3 text-sm text-slate-600"><Check className="w-5 h-5 text-slate-400 shrink-0" /> Soporte prioritario</li>
          </ul>
          <button onClick={() => setShowForm(true)} className="w-full py-3 px-4 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-xl border border-slate-200 text-sm transition">
            Solicitar cotización
          </button>
        </div>
      </div>
      
      <p className="text-center text-slate-400 text-xs mt-12 font-medium">
        Los precios se cotizan según la operación de cada empresa. Sin permanencia: cambias o cancelas al terminar el periodo.
      </p>
    </div>
  );
}
