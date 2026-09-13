import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  GraduationCap, 
  Calendar, 
  PieChart, 
  AlertCircle, 
  CheckCircle2, 
  ShieldCheck,
  Building2,
  Clock
} from 'lucide-react';
import { getAnalytics } from '../../services/api';

export default function AnalyticsDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getAnalytics();
        setData(res);
      } catch (err) {
        console.error('Error cargando analíticas:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-slate-400">
        Cargando indicadores de People Analytics...
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs tracking-wider uppercase mb-1">
          <BarChart3 className="w-4 h-4" />
          <span>Módulo B2B · People Analytics & BI</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Dashboard de Rotación y Retención Laboral
        </h1>
        <p className="text-sm text-slate-400 max-w-2xl mt-1">
          Análisis del histórico de 100 contrataciones en plantas de manufactura de Nuevo León. Evidencia empírica del anclaje de lealtad generado por el programa INEA y turnos fijos.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>Permanencia Promedio</span>
            <Calendar className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-white">{data.promedio_permanencia_meses}</span>
            <span className="text-xs font-bold text-emerald-400">meses</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Mercado operativo Nuevo León</p>
        </div>

        <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>Operarios en Padrón</span>
            <Users className="w-4 h-4 text-sky-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-white">{data.total_operarios}</span>
            <span className="text-xs font-bold text-sky-400">perfiles</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Área Metropolitana Monterrey</p>
        </div>

        <div className="bg-slate-900 rounded-2xl p-5 border border-purple-800/50 shadow-xl">
          <div className="flex items-center justify-between text-purple-300 text-xs font-semibold mb-2">
            <span>Canalizados al INEA</span>
            <GraduationCap className="w-4 h-4 text-purple-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-purple-300">{data.total_inea_canalizados}</span>
            <span className="text-xs font-bold text-purple-400">({data.tasa_inea_pct}%)</span>
          </div>
          <p className="text-[11px] text-purple-400/80 mt-1">Con rezago acreditando estudios</p>
        </div>

        <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>Vacantes en Planta</span>
            <Building2 className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-white">{data.total_vacantes}</span>
            <span className="text-xs font-bold text-amber-400">activas</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Parques Apodaca / Pesquería</p>
        </div>
      </div>

      {/* Comparativa Clave de Retención (2 cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Impacto INEA */}
        <div className="bg-gradient-to-br from-slate-900 to-purple-950/30 rounded-2xl p-6 border border-purple-900/40 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-purple-400" />
              Impacto del Programa INEA en Retención
            </h3>
            <span className="px-2.5 py-1 text-xs font-bold bg-purple-500/20 text-purple-300 rounded-full border border-purple-500/40">
              +3.5 meses impacto
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 my-4">
            <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 text-center">
              <span className="text-xs text-slate-400 block mb-1">Sin Acompañamiento</span>
              <span className="text-2xl font-black text-slate-300">{data.permanencia_sin_inea}</span>
              <span className="text-xs text-slate-400 block mt-0.5">meses promedio</span>
            </div>
            <div className="bg-purple-950/60 p-4 rounded-xl border border-purple-500/40 text-center">
              <span className="text-xs text-purple-300 font-bold block mb-1">Con Aula / Apoyo INEA</span>
              <span className="text-3xl font-black text-purple-300">{data.permanencia_con_inea}</span>
              <span className="text-xs text-purple-300/80 block mt-0.5 font-bold">meses (+97% lealtad)</span>
            </div>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Los operarios que cursan la primaria/secundaria con apoyo de la planta sienten anclaje social y agradecimiento, postergando cambios de empleo por pequeñas diferencias de sueldo.
          </p>
        </div>

        {/* Impacto Turnos Fijos */}
        <div className="bg-gradient-to-br from-slate-900 to-blue-950/30 rounded-2xl p-6 border border-blue-900/40 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-400" />
              Impacto de Turnos Fijos vs. Rotativos
            </h3>
            <span className="px-2.5 py-1 text-xs font-bold bg-blue-500/20 text-blue-300 rounded-full border border-blue-500/40">
              +2.0 meses impacto
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 my-4">
            <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 text-center">
              <span className="text-xs text-slate-400 block mb-1">Turnos Rotativos</span>
              <span className="text-2xl font-black text-slate-300">{data.permanencia_turnos_rotativos}</span>
              <span className="text-xs text-slate-400 block mt-0.5">meses promedio</span>
            </div>
            <div className="bg-blue-950/60 p-4 rounded-xl border border-blue-500/40 text-center">
              <span className="text-xs text-blue-300 font-bold block mb-1">Turnos Fijos</span>
              <span className="text-3xl font-black text-blue-300">{data.permanencia_turnos_fijos}</span>
              <span className="text-xs text-blue-300/80 block mt-0.5 font-bold">meses promedio</span>
            </div>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            La rotación semanal o quincenal de turnos altera el reloj circadiano y la vida familiar en colonias periféricas, provocando renuncias tempranas antes del tercer mes.
          </p>
        </div>
      </div>

      {/* Motivos de Rotación & Distribución */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Principales Motivos de Baja */}
        <div className="lg:col-span-7 bg-slate-900 rounded-2xl p-6 border border-slate-800 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400" />
            Causas Raíz de Deserción en Manufactura (Nuevo León)
          </h3>

          <div className="space-y-3">
            {data.principales_motivos_baja.map((m, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-300">{m.motivo}</span>
                  <span className="text-rose-400 font-bold">{m.porcentaje}% ({m.frecuencia} casos)</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-rose-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${m.porcentaje}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Distribución por Escolaridad y Municipios */}
        <div className="lg:col-span-5 bg-slate-900 rounded-2xl p-6 border border-slate-800 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <PieChart className="w-4 h-4 text-sky-400" />
            Distribución Escolar de Operarios
          </h3>

          <div className="space-y-2.5">
            {Object.entries(data.distribucion_escolaridad).map(([k, v]) => {
              const pct = ((v / data.total_operarios) * 100).toFixed(0);
              return (
                <div key={k} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 text-xs">
                  <span className="font-semibold text-slate-300">{k.replace('_', ' ')}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{v}</span>
                    <span className="text-slate-400">({pct}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
