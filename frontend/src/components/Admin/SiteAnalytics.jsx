import React, { useState, useEffect } from 'react';
import { Users, Briefcase, Eye, Building2, TrendingUp, Activity, BarChart3, Calendar, CalendarDays } from 'lucide-react';
import {
  getAnalyticsOverview, getAnalyticsDAU, getAnalyticsJobs, getAnalyticsViews,
  getAnalyticsDAUMonthly, getAnalyticsJobsMonthly, getAnalyticsViewsMonthly, getAnalyticsAppsMonthly,
} from '../../services/api';

/* ─── Helpers ────────────────────────────────────────────────────────── */

const MONTH_NAMES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
function fmtMonth(ym) {
  if (!ym) return '';
  const [y, m] = ym.split('-');
  return `${MONTH_NAMES[parseInt(m, 10) - 1]} ${y}`;
}

/* ─── Small UI blocks ────────────────────────────────────────────────── */

function MetricCard({ icon: Icon, label, value, sub, color = 'emerald' }) {
  const colors = {
    emerald: 'bg-emerald-50 text-emerald-600', blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600', violet: 'bg-violet-50 text-violet-600',
    rose: 'bg-rose-50 text-rose-600', sky: 'bg-sky-50 text-sky-600',
  };
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-slate-500">{label}</span>
        <div className={`p-2 rounded-xl ${colors[color]}`}><Icon className="w-4 h-4" /></div>
      </div>
      <div className="mt-2">
        <span className="text-2xl font-black text-slate-900">{value ?? '—'}</span>
        {sub && <span className="text-[10px] text-slate-400 block mt-0.5">{sub}</span>}
      </div>
    </div>
  );
}

function BarChart({ title, data, valueKey = 'total', labelKey = 'date', color = 'emerald', formatLabel }) {
  if (!data?.length) return <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs text-xs text-slate-400 text-center">Sin datos</div>;
  const max = Math.max(...data.map(d => d[valueKey] || 0), 1);
  const fmt = formatLabel || (v => v?.slice?.(5) || v);
  const bg = { emerald: 'bg-emerald-400', blue: 'bg-blue-400', amber: 'bg-amber-400', violet: 'bg-violet-400', rose: 'bg-rose-400' }[color] || 'bg-emerald-400';

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
      <h3 className="text-xs font-bold text-slate-700 mb-3">{title}</h3>
      <div className="flex items-end gap-[3px] h-20 overflow-x-auto pb-1">
        {data.map((d, i) => {
          const v = d[valueKey] || 0;
          const h = Math.max(4, (v / max) * 72);
          return (
            <div key={i} className="flex flex-col items-center gap-0.5 group relative flex-shrink-0">
              <div className={`w-4 sm:w-5 rounded-t ${bg} transition-all`} style={{ height: `${h}px` }} />
              <div className="absolute -top-7 hidden group-hover:block bg-slate-800 text-white text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap z-10">
                {fmt(d[labelKey])}: <b>{v}</b>
              </div>
              <span className="text-[7px] text-slate-400 truncate w-5 text-center hidden sm:block">{fmt(d[labelKey])}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StackedBar({ title, data, keys, colors, labelKey = 'date', formatLabel }) {
  if (!data?.length) return null;
  const max = Math.max(...data.map(d => keys.reduce((s, k) => s + (d[k] || 0), 0)), 1);
  const fmt = formatLabel || (v => v?.slice?.(5) || v);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
      <h3 className="text-xs font-bold text-slate-700 mb-2">{title}</h3>
      <div className="flex items-center gap-3 mb-3">
        {keys.map((k, i) => (
          <span key={k} className="flex items-center gap-1 text-[9px] text-slate-500">
            <span className={`w-2 h-2 rounded-sm ${colors[i]}`} /> {k}
          </span>
        ))}
      </div>
      <div className="flex items-end gap-[3px] h-20 overflow-x-auto pb-1">
        {data.map((d, i) => {
          const segments = keys.map((k, ki) => ({ val: d[k] || 0, bg: colors[ki] }));
          const total = segments.reduce((s, seg) => s + seg.val, 0);
          return (
            <div key={i} className="flex flex-col items-center group relative flex-shrink-0">
              <div className="flex flex-col-reverse w-4 sm:w-5">
                {segments.map((seg, si) => {
                  const h = Math.max(0, (seg.val / max) * 72);
                  return <div key={si} className={`${seg.bg} ${si === segments.length - 1 ? 'rounded-t' : ''}`} style={{ height: `${h}px` }} />;
                })}
              </div>
              <div className="absolute -top-7 hidden group-hover:block bg-slate-800 text-white text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap z-10">
                {fmt(d[labelKey])}: {total} ({keys.map(k => `${k}:${d[k]||0}`).join(' ')})
              </div>
              <span className="text-[7px] text-slate-400 truncate w-5 text-center hidden sm:block">{fmt(d[labelKey])}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────── */

export default function SiteAnalytics() {
  const [overview, setOverview] = useState(null);
  const [period, setPeriod] = useState('daily'); // 'daily' | 'monthly'
  const [dailyData, setDailyData] = useState({ dau: [], jobs: [], views: [] });
  const [monthlyData, setMonthlyData] = useState({ dau: [], jobs: [], views: [], apps: [] });
  const [topViews, setTopViews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [ov, tv] = await Promise.all([getAnalyticsOverview(), getAnalyticsViews(30)]);
        setOverview(ov);
        setTopViews(tv);
      } catch (err) { setError(err.message); }
    })();
  }, []);

  useEffect(() => {
    setLoading(true);
    (async () => {
      try {
        if (period === 'daily') {
          const [dau, jobs] = await Promise.all([getAnalyticsDAU(30), getAnalyticsJobs(30)]);
          setDailyData({ dau, jobs });
        } else {
          const [dau, jobs, views, apps] = await Promise.all([
            getAnalyticsDAUMonthly(12), getAnalyticsJobsMonthly(12),
            getAnalyticsViewsMonthly(12), getAnalyticsAppsMonthly(12),
          ]);
          setMonthlyData({ dau, jobs, views, apps });
        }
      } catch (err) { setError(err.message); }
      finally { setLoading(false); }
    })();
  }, [period]);

  if (error) return (
    <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center">
      <p className="text-sm font-bold text-rose-700">⛔ {error}</p>
      <p className="text-xs text-rose-500 mt-1">Solo usuarios @chambachat.com pueden acceder.</p>
    </div>
  );

  const o = overview || {};

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-100">
            <BarChart3 className="w-5 h-5 text-emerald-700" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900">Estadísticas del Sitio</h2>
            <p className="text-xs text-slate-400">Solo visible para el equipo ChambaChat</p>
          </div>
        </div>

        {/* Periodo toggle */}
        <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-0.5">
          <button
            onClick={() => setPeriod('daily')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              period === 'daily' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" /> Diario (30d)
          </button>
          <button
            onClick={() => setPeriod('monthly')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              period === 'monthly' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" /> Mensual (12m)
          </button>
        </div>
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <MetricCard icon={Users} label="Usuarios Totales" value={o.total_users} sub={`${o.total_candidates||0} candidatos · ${o.total_recruiters||0} reclutadores`} color="emerald" />
        <MetricCard icon={Activity} label="Activos Hoy" value={o.dau_today} sub={`${o.dau_today_candidates||0} cand · ${o.dau_today_recruiters||0} emp`} color="blue" />
        <MetricCard icon={TrendingUp} label="Únicos 7 días" value={o.dau_unique_7d} sub="Usuarios distintos" color="violet" />
        <MetricCard icon={Briefcase} label="Vacantes Activas" value={o.active_jobs} sub={`${o.jobs_published_last_7d||0} nuevas esta semana`} color="amber" />
        <MetricCard icon={Building2} label="Empresas" value={o.total_companies} color="sky" />
        <MetricCard icon={Eye} label="Vistas (30d)" value={o.job_views_last_30d?.toLocaleString('es-MX')} sub="Vistas únicas" color="rose" />
        <MetricCard icon={Users} label="Postulaciones 7d" value={o.applications_last_7d} sub="Candidatos aplicaron" color="emerald" />
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center h-32">
          <div className="w-6 h-6 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* ─── GRÁFICAS DIARIAS ─── */}
      {!loading && period === 'daily' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <StackedBar
              title="👥 Usuarios Activos por Día"
              data={dailyData.dau}
              keys={['candidates', 'recruiters']}
              colors={['bg-emerald-400', 'bg-blue-400']}
            />
            <StackedBar
              title="📋 Vacantes Publicadas por Día"
              data={dailyData.jobs}
              keys={['empresa', 'foto_comunitaria', 'scraping']}
              colors={['bg-blue-400', 'bg-amber-400', 'bg-violet-400']}
            />
          </div>

          {/* Tabla DAU */}
          {dailyData.dau.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs overflow-auto">
              <h3 className="text-xs font-bold text-slate-700 mb-3">📅 DAU Desglose</h3>
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-1.5 text-slate-500 font-semibold">Fecha</th>
                    <th className="text-right py-1.5 text-emerald-600 font-semibold">Candidatos</th>
                    <th className="text-right py-1.5 text-blue-600 font-semibold">Empresas</th>
                    <th className="text-right py-1.5 text-slate-500 font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {[...dailyData.dau].reverse().slice(0, 14).map(d => (
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
        </div>
      )}

      {/* ─── GRÁFICAS MENSUALES ─── */}
      {!loading && period === 'monthly' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <StackedBar
              title="👥 Usuarios Activos por Mes"
              data={monthlyData.dau}
              keys={['candidates', 'recruiters']}
              colors={['bg-emerald-400', 'bg-blue-400']}
              labelKey="month"
              formatLabel={fmtMonth}
            />
            <StackedBar
              title="📋 Vacantes por Mes"
              data={monthlyData.jobs}
              keys={['empresa', 'foto_comunitaria', 'scraping']}
              colors={['bg-blue-400', 'bg-amber-400', 'bg-violet-400']}
              labelKey="month"
              formatLabel={fmtMonth}
            />
            <BarChart
              title="👀 Vistas Únicas por Mes"
              data={monthlyData.views}
              valueKey="unique_viewers"
              labelKey="month"
              color="rose"
              formatLabel={fmtMonth}
            />
            <BarChart
              title="📨 Postulaciones por Mes"
              data={monthlyData.apps}
              valueKey="total"
              labelKey="month"
              color="violet"
              formatLabel={fmtMonth}
            />
          </div>

          {/* Tabla mensual */}
          {monthlyData.dau.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs overflow-auto">
              <h3 className="text-xs font-bold text-slate-700 mb-3">📊 Resumen Mensual</h3>
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-1.5 text-slate-500 font-semibold">Mes</th>
                    <th className="text-right py-1.5 text-emerald-600 font-semibold">Candidatos</th>
                    <th className="text-right py-1.5 text-blue-600 font-semibold">Empresas</th>
                    <th className="text-right py-1.5 text-slate-500 font-semibold">DAU Total</th>
                    <th className="text-right py-1.5 text-amber-600 font-semibold">Vacantes</th>
                    <th className="text-right py-1.5 text-rose-600 font-semibold">Vistas</th>
                    <th className="text-right py-1.5 text-violet-600 font-semibold">Postulaciones</th>
                  </tr>
                </thead>
                <tbody>
                  {[...monthlyData.dau].reverse().map(d => {
                    const jm = monthlyData.jobs.find(j => j.month === d.month);
                    const vm = monthlyData.views.find(v => v.month === d.month);
                    const am = monthlyData.apps.find(a => a.month === d.month);
                    return (
                      <tr key={d.month} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="py-1.5 text-slate-700 font-bold">{fmtMonth(d.month)}</td>
                        <td className="py-1.5 text-right text-emerald-700 font-bold">{d.candidates}</td>
                        <td className="py-1.5 text-right text-blue-700 font-bold">{d.recruiters}</td>
                        <td className="py-1.5 text-right text-slate-900 font-black">{d.total}</td>
                        <td className="py-1.5 text-right text-amber-700 font-bold">{jm?.total || 0}</td>
                        <td className="py-1.5 text-right text-rose-700 font-bold">{vm?.unique_viewers || 0}</td>
                        <td className="py-1.5 text-right text-violet-700 font-bold">{am?.total || 0}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Top vacantes vistas (siempre visible) */}
      {topViews.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs overflow-auto">
          <h3 className="text-xs font-bold text-slate-700 mb-3">👀 Top Vacantes Más Vistas (30d)</h3>
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-1.5 text-slate-500 font-semibold">Vacante</th>
                <th className="text-left py-1.5 text-slate-500 font-semibold">Empresa</th>
                <th className="text-right py-1.5 text-slate-500 font-semibold">Únicos</th>
                <th className="text-right py-1.5 text-slate-500 font-semibold">Vistas</th>
              </tr>
            </thead>
            <tbody>
              {topViews.map(v => (
                <tr key={v.job_id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="py-1.5 text-slate-700 font-medium">
                    <span className="text-slate-400 mr-1">#{v.job_id}</span>{v.titulo}
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
