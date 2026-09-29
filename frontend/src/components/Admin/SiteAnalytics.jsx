import React, { useState, useEffect } from 'react';
import { Users, Briefcase, Eye, Building2, TrendingUp, Activity, BarChart3, Calendar, CalendarDays } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Legend
} from 'recharts';
import {
  getAnalyticsOverview, getAnalyticsDAU, getAnalyticsJobs, getAnalyticsViews,
  getAnalyticsDAUMonthly, getAnalyticsJobsMonthly, getAnalyticsViewsMonthly, getAnalyticsAppsMonthly,
} from '../../services/api';

const MONTH_NAMES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
function fmtLabel(val) {
  if (!val) return '';
  if (val.includes('-') && val.length === 7) {
    const [y, m] = val.split('-');
    return `${MONTH_NAMES[parseInt(m, 10) - 1]} ${y}`;
  }
  return val.slice(5);
}

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

export default function SiteAnalytics() {
  const [overview, setOverview] = useState(null);
  const [period, setPeriod] = useState('daily');
  const [activeTab, setActiveTab] = useState('dau');
  
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
          const [dau, jobs, views] = await Promise.all([
            getAnalyticsDAU(30), getAnalyticsJobs(30), getAnalyticsViews(30)
          ]);
          setDailyData({ dau, jobs, views });
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
  const currentData = period === 'daily' ? dailyData : monthlyData;

  const renderChart = () => {
    if (activeTab === 'dau') {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={currentData.dau} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorCand" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorRec" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tickFormatter={fmtLabel} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <Tooltip 
              labelFormatter={fmtLabel}
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
            />
            <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
            <Area type="monotone" dataKey="candidates" name="Candidatos" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorCand)" />
            <Area type="monotone" dataKey="recruiters" name="Empresas" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorRec)" />
          </AreaChart>
        </ResponsiveContainer>
      );
    }
    
    if (activeTab === 'jobs') {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={currentData.jobs} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorJobs" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tickFormatter={fmtLabel} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <Tooltip 
              labelFormatter={fmtLabel}
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
            />
            <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
            <Area type="monotone" dataKey="empresa" name="Por Empresas" stroke="#3b82f6" strokeWidth={2} fillOpacity={0} />
            <Area type="monotone" dataKey="foto_comunitaria" name="Comunitarias" stroke="#f59e0b" strokeWidth={2} fillOpacity={0} />
            <Area type="monotone" dataKey="total" name="Total Vacantes" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorJobs)" />
          </AreaChart>
        </ResponsiveContainer>
      );
    }

    if (activeTab === 'views') {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={currentData.views} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <XAxis dataKey="date" tickFormatter={fmtLabel} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <Tooltip 
              labelFormatter={fmtLabel}
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
            />
            <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
            <Line type="monotone" dataKey="total" name="Vistas de Vacantes" stroke="#f43f5e" strokeWidth={3} dot={{ r: 0 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      );
    }
  };

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
            <p className="text-xs text-slate-400">Panel visual de métricas principales</p>
          </div>
        </div>
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <MetricCard icon={Users} label="Usuarios Totales" value={o.total_users} sub={`${o.total_candidates||0} candidatos · ${o.total_recruiters||0} reclutadores`} color="emerald" />
        <MetricCard icon={Activity} label="Activos Hoy" value={o.dau_today} sub={`${o.dau_today_candidates||0} cand · ${o.dau_today_recruiters||0} emp`} color="blue" />
        <MetricCard icon={Briefcase} label="Vacantes Activas" value={o.active_jobs} sub={`${o.jobs_published_last_7d||0} nuevas esta semana`} color="amber" />
        <MetricCard icon={Building2} label="Empresas" value={o.total_companies} color="sky" />
      </div>

      {/* Main Chart Section */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        {/* Tabs */}
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 bg-slate-50/50 flex-wrap gap-4">
          <div className="flex gap-6">
            <button 
              onClick={() => setActiveTab('dau')}
              className={`text-sm font-semibold transition ${activeTab === 'dau' ? 'text-emerald-600 border-b-2 border-emerald-600 pb-3 -mb-3' : 'text-slate-500 hover:text-slate-700 pb-3 -mb-3 border-b-2 border-transparent'}`}
            >
              Audiencia (DAU)
            </button>
            <button 
              onClick={() => setActiveTab('jobs')}
              className={`text-sm font-semibold transition ${activeTab === 'jobs' ? 'text-emerald-600 border-b-2 border-emerald-600 pb-3 -mb-3' : 'text-slate-500 hover:text-slate-700 pb-3 -mb-3 border-b-2 border-transparent'}`}
            >
              Vacantes
            </button>
            <button 
              onClick={() => setActiveTab('views')}
              className={`text-sm font-semibold transition ${activeTab === 'views' ? 'text-emerald-600 border-b-2 border-emerald-600 pb-3 -mb-3' : 'text-slate-500 hover:text-slate-700 pb-3 -mb-3 border-b-2 border-transparent'}`}
            >
              Vistas
            </button>
          </div>

          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-sm">
            <button
              onClick={() => setPeriod('daily')}
              className={`px-3 py-1 rounded-md text-xs font-bold transition ${
                period === 'daily' ? 'bg-slate-100 text-slate-800' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Últimos 30 días
            </button>
            <button
              onClick={() => setPeriod('monthly')}
              className={`px-3 py-1 rounded-md text-xs font-bold transition ${
                period === 'monthly' ? 'bg-slate-100 text-slate-800' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Este Año
            </button>
          </div>
        </div>

        {/* Chart Canvas */}
        <div className="p-4 sm:p-6">
          {loading ? (
             <div className="flex items-center justify-center h-[300px]">
               <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
             </div>
          ) : (
            renderChart()
          )}
        </div>
      </div>

      {/* Top Views Table */}
      {topViews.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <h3 className="text-xs font-bold text-slate-700 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-rose-500" /> Top Vacantes Más Vistas (30d)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] text-left">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500">
                  <th className="py-2 font-semibold">Vacante</th>
                  <th className="py-2 font-semibold">Empresa</th>
                  <th className="py-2 font-semibold text-right">Vistas</th>
                </tr>
              </thead>
              <tbody>
                {topViews.map((j) => (
                  <tr key={j.job_id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="py-2.5 font-semibold text-slate-800 truncate max-w-[200px]">{j.titulo}</td>
                    <td className="py-2.5 text-slate-600">{j.empresa}</td>
                    <td className="py-2.5 text-right font-bold text-slate-900">{(j.views||0).toLocaleString('es-MX')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
