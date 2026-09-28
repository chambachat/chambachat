import React, { useState, useEffect } from 'react';
import { Users, Briefcase, Eye, Building2, TrendingUp, Activity, BarChart3 } from 'lucide-react';
import { getAnalyticsOverview, getAnalyticsDAU, getAnalyticsJobs, getAnalyticsViews } from '../../services/api';

function MetricCard({ icon: Icon, label, value, sub, color = 'emerald' }) {
  const colors = {
    emerald: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    violet: 'bg-violet-50 text-violet-600',
    rose: 'bg-rose-50 text-rose-600',
    sky: 'bg-sky-50 text-sky-600',
  };
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-slate-500">{label}</span>
        <div className={`p-2 rounded-xl ${colors[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="mt-2">
        <span className="text-2xl font-black text-slate-900">{value ?? '—'}</span>
        {sub && <span className="text-[10px] text-slate-400 block mt-0.5">{sub}</span>}
      </div>
    </div>
  );
}

function MiniBar({ data, maxVal }) {
  const h = maxVal ? Math.max(4, (data / maxVal) * 48) : 4;
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="w-3 rounded-t bg-emerald-400 transition-all" style={{ height: `${h}px` }} />
    </div>
  );
}

function SimpleChart({ title, data, valueKey = 'total', labelKey = 'date', color = 'emerald' }) {
  if (!data?.length) return null;
  const max = Math.max(...data.map(d => d[valueKey] || 0), 1);
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
      <h3 className="text-xs font-bold text-slate-700 mb-3">{title}</h3>
      <div className="flex items-end gap-[3px] h-16 overflow-x-auto">
        {data.map((d, i) => {
          const v = d[valueKey] || 0;
          const h = Math.max(4, (v / max) * 56);
          const bg = color === 'blue' ? 'bg-blue-400' : color === 'amber' ? 'bg-amber-400' : 'bg-emerald-400';
          return (
            <div key={i} className="flex flex-col items-center gap-0.5 group relative">
              <div className={`w-2.5 sm:w-3 rounded-t ${bg} transition-all`} style={{ height: `${h}px` }} />
              <div className="absolute -top-6 hidden group-hover:block bg-slate-800 text-white text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap z-10">
                {d[labelKey]?.slice(5)}: {v}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[9px] text-slate-400">{data[0]?.[labelKey]?.slice(5)}</span>
        <span className="text-[9px] text-slate-400">{data[data.length - 1]?.[labelKey]?.slice(5)}</span>
      </div>
    </div>
  );
}

export default function SiteAnalytics() {
  const [overview, setOverview] = useState(null);
  const [dau, setDau] = useState([]);
  const [jobsPerDay, setJobsPerDay] = useState([]);
  const [topViews, setTopViews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [ov, da, jp, tv] = await Promise.all([
          getAnalyticsOverview(),
          getAnalyticsDAU(30),
          getAnalyticsJobs(30),
          getAnalyticsViews(30),
        ]);
        setOverview(ov);
        setDau(da);
        setJobsPerDay(jp);
        setTopViews(tv);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error) return (
    <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center">
      <p className="text-sm font-bold text-rose-700">⛔ {error}</p>
      <p className="text-xs text-rose-500 mt-1">Solo usuarios @chambachat.com pueden acceder.</p>
    </div>
  );

  const o = overview || {};

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-emerald-100">
          <BarChart3 className="w-5 h-5 text-emerald-700" />
        </div>
        <div>
          <h2 className="text-lg font-black text-slate-900">Estadísticas del Sitio</h2>
          <p className="text-xs text-slate-400">Solo visible para el equipo ChambaChat</p>
        </div>
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <MetricCard icon={Users} label="Usuarios Totales" value={o.total_users} sub={`${o.total_candidates} candidatos · ${o.total_recruiters} reclutadores`} color="emerald" />
        <MetricCard icon={Activity} label="Activos Hoy" value={o.dau_today} sub={`${o.dau_today_candidates} cand · ${o.dau_today_recruiters} emp`} color="blue" />
        <MetricCard icon={TrendingUp} label="Únicos 7 días" value={o.dau_unique_7d} sub="Usuarios distintos" color="violet" />
        <MetricCard icon={Briefcase} label="Vacantes Activas" value={o.active_jobs} sub={`${o.jobs_published_last_7d} nuevas esta semana`} color="amber" />
        <MetricCard icon={Building2} label="Empresas" value={o.total_companies} color="sky" />
        <MetricCard icon={Eye} label="Vistas (30 días)" value={o.job_views_last_30d?.toLocaleString('es-MX')} sub="Vistas únicas de vacantes" color="rose" />
        <MetricCard icon={Users} label="Postulaciones 7d" value={o.applications_last_7d} sub="Candidatos aplicaron" color="emerald" />
      </div>

      {/* Gráficas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SimpleChart title="📊 Usuarios Activos por Día (30d)" data={dau} valueKey="total" color="emerald" />
        <SimpleChart title="📋 Vacantes Publicadas por Día (30d)" data={jobsPerDay} valueKey="total" color="blue" />
      </div>

      {/* DAU desglose */}
      {dau.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs overflow-auto">
          <h3 className="text-xs font-bold text-slate-700 mb-3">👥 DAU Desglose (últimos 30 días)</h3>
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-1.5 text-slate-500 font-semibold">Fecha</th>
                <th className="text-right py-1.5 text-slate-500 font-semibold">Candidatos</th>
                <th className="text-right py-1.5 text-slate-500 font-semibold">Empresas</th>
                <th className="text-right py-1.5 text-slate-500 font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {[...dau].reverse().slice(0, 14).map((d) => (
                <tr key={d.date} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="py-1.5 text-slate-700 font-mono">{d.date}</td>
                  <td className="py-1.5 text-right text-emerald-700 font-bold">{d.candidates}</td>
                  <td className="py-1.5 text-right text-blue-700 font-bold">{d.recruiters}</td>
                  <td className="py-1.5 text-right text-slate-900 font-black">{d.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Top vacantes vistas */}
      {topViews.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs overflow-auto">
          <h3 className="text-xs font-bold text-slate-700 mb-3">👀 Top Vacantes Más Vistas (30d)</h3>
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-1.5 text-slate-500 font-semibold">Vacante</th>
                <th className="text-left py-1.5 text-slate-500 font-semibold">Empresa</th>
                <th className="text-right py-1.5 text-slate-500 font-semibold">Usuarios Únicos</th>
                <th className="text-right py-1.5 text-slate-500 font-semibold">Vistas Totales</th>
              </tr>
            </thead>
            <tbody>
              {topViews.map((v) => (
                <tr key={v.job_id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="py-1.5 text-slate-700 font-medium">
                    <span className="text-slate-400 mr-1">#{v.job_id}</span>
                    {v.titulo}
                  </td>
                  <td className="py-1.5 text-slate-500">{v.empresa_nombre}</td>
                  <td className="py-1.5 text-right text-emerald-700 font-bold">{v.unique_viewers}</td>
                  <td className="py-1.5 text-right text-slate-700 font-bold">{v.total_views}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
