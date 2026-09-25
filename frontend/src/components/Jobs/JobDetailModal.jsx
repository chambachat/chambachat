import React from 'react';
import { 
  X, 
  Building2, 
  MapPin, 
  Clock, 
  Bus, 
  GraduationCap, 
  DollarSign, 
  ShieldCheck, 
  CheckCircle2, 
  MessageSquare, 
  Users, 
  Sparkles,
  ArrowRight
} from 'lucide-react';

export default function JobDetailModal({ 
  job, 
  isOpen, 
  onClose, 
  onStartDirectChat, 
  isApplied, 
  currentUser 
}) {
  if (!isOpen || !job) return null;

  const weeklySalary = job.sueldo_semanal_libre || 0;
  const monthlySalary = Math.round(weeklySalary * 4.33);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-5 sm:p-7 shadow-2xl space-y-5 relative animate-fadeIn my-auto">
        {/* Botón cerrar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
          title="Cerrar ventana"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Encabezado con Empresa y Puesto */}
        <div className="space-y-1.5 pr-8">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
              <Building2 className="w-4 h-4" />
            </div>
            <span className="text-xs font-black text-emerald-700 uppercase tracking-wider">
              {job.empresa_nombre}
            </span>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
              Vacante Verificada
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-snug">
            {job.titulo}
          </h2>
          <p className="text-xs text-slate-500 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-sky-500 shrink-0" />
            <span>{job.municipio}</span>
            {job.distancia_km && <span>&bull; a ~{job.distancia_km} km de tu zona</span>}
          </p>
        </div>

        {/* Tarjeta de Sueldo y Compensaciones */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-50 to-teal-50 border border-emerald-200/80 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase text-emerald-800 tracking-wider block">
              Sueldo Semanal Libre
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-2xl sm:text-3xl font-black text-emerald-700">
                ${weeklySalary.toLocaleString('es-MX')}
              </span>
              <span className="text-xs font-bold text-slate-500">/semana</span>
            </div>
            <span className="text-[11px] text-slate-600 font-medium block mt-0.5">
              Equivalente aprox: <strong>${monthlySalary.toLocaleString('es-MX')} al mes</strong> + horas extra
            </span>
          </div>

          <div className="hidden sm:flex flex-col items-end gap-1 text-[11px] font-bold text-emerald-900">
            <span className="bg-white/80 px-2.5 py-1 rounded-lg border border-emerald-200 shadow-xs">
              💰 Pagos Puntuales
            </span>
            <span className="bg-white/80 px-2.5 py-1 rounded-lg border border-emerald-200 shadow-xs">
              🛡️ Prestaciones de Ley
            </span>
          </div>
        </div>

        {/* Atributos Clave en Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Turnos */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/90 space-y-1">
            <div className="flex items-center gap-1.5 text-slate-700">
              <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="text-xs font-bold">Turno de Trabajo</span>
            </div>
            <p className="text-xs text-slate-600 font-medium">
              {job.turnos_fijos ? (
                <span className="text-emerald-700 font-bold">✅ Turnos Fijos (Sin rolar)</span>
              ) : (
                <span>Turnos Rotativos (Rotación programada)</span>
              )}
            </p>
          </div>

          {/* Transporte */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/90 space-y-1">
            <div className="flex items-center gap-1.5 text-slate-700">
              <Bus className="w-3.5 h-3.5 text-sky-500 shrink-0" />
              <span className="text-xs font-bold">Rutas de Transporte</span>
            </div>
            <p className="text-xs text-slate-600 font-medium">
              {job.transporte_incluido ? (
                <span className="text-emerald-700 font-bold">✅ Rutas de transporte incluidas</span>
              ) : (
                <span>Transporte accesible por ruta urbana</span>
              )}
            </p>
          </div>

          {/* Aula INEA */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/90 space-y-1 sm:col-span-2">
            <div className="flex items-center gap-1.5 text-slate-700">
              <GraduationCap className="w-3.5 h-3.5 text-purple-600 shrink-0" />
              <span className="text-xs font-bold">Programa Educativo INEA</span>
            </div>
            <p className="text-xs text-slate-600 font-medium">
              {job.apoyo_inea ? (
                <span className="text-purple-900 font-semibold">
                  🎓 Esta planta cuenta con aula y facilidades para que concluyas tu primaria o secundaria mientras trabajas.
                </span>
              ) : (
                <span>Requisito escolaridad básica (Secundaria concluida o trunca).</span>
              )}
            </p>
          </div>
        </div>

        {/* Descripción Detallada */}
        <div className="space-y-1.5">
          <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider">
            Descripción y Actividades
          </h4>
          <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/70 p-3 rounded-xl border border-slate-200/60 max-h-32 overflow-y-auto">
            {job.descripcion || 'Puesto operativo en planta industrial para ensamble, logística, empaque o producción general con capacitación pagada desde tu primer día de ingreso.'}
          </p>
        </div>

        {/* Beneficios Incluidos */}
        <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/70 text-xs text-emerald-950 space-y-1">
          <div className="flex items-center gap-1.5 font-bold">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Prestaciones y Beneficios:</span>
          </div>
          <p className="text-[11px] text-emerald-900/90 leading-relaxed">
            IMSS desde el día 1, aguinaldo, vacaciones, prima vacacional, uniformes y equipo de protección personal sin costo, comedor subsidiado y oportunidad de tiempo extra.
          </p>
        </div>

        {/* Acciones del Footer */}
        <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition order-2 sm:order-1 text-center"
          >
            Volver al chat
          </button>

          <button
            type="button"
            onClick={() => {
              onStartDirectChat(job);
              onClose();
            }}
            className="w-full flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold transition shadow-md hover:shadow-lg flex items-center justify-center gap-2 order-1 sm:order-2 group"
          >
            <MessageSquare className="w-4 h-4 text-emerald-200 group-hover:scale-110 transition-transform" />
            <span>
              {isApplied ? 'Ir a mi chat con el reclutador' : 'Abrir chat directo con el reclutador'}
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-emerald-200 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* Explicación sutil del chat grupal */}
        <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400">
          <Users className="w-3 h-3 text-emerald-600 shrink-0" />
          <span>Chat grupal en vivo: Tú + Reclutador de {job.empresa_nombre} + Chambot (IA)</span>
        </div>
      </div>
    </div>
  );
}
