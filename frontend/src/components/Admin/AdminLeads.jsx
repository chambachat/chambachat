import React, { useState, useEffect } from 'react';
import { getAdminLeads } from '../../services/api';
import { Users, Building2, MapPin, CalendarClock, TrendingUp } from 'lucide-react';

export default function AdminLeads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminLeads()
      .then(setLeads)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-emerald-100 rounded-xl">
            <TrendingUp className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Leads Generados (Clics a WhatsApp)</h2>
            <p className="text-sm text-slate-500">Métricas de atracción para vacantes comunitarias, ideal para venta B2B.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-semibold">
              <tr>
                <th className="px-4 py-3 rounded-tl-xl">Empresa</th>
                <th className="px-4 py-3">Vacante</th>
                <th className="px-4 py-3">Origen</th>
                <th className="px-4 py-3 text-center">Total Clics (Leads)</th>
                <th className="px-4 py-3 rounded-tr-xl text-right">Último Clic</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leads.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-4 py-8 text-center text-slate-400">
                    Aún no hay clics registrados en vacantes comunitarias.
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr key={lead.job_id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-4 py-4 font-semibold text-slate-800 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-slate-400" />
                      {lead.empresa_nombre || 'Sin nombre'}
                    </td>
                    <td className="px-4 py-4 text-slate-600 font-medium">
                      {lead.titulo}
                    </td>
                    <td className="px-4 py-4">
                      <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium capitalize">
                        {lead.origen.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="inline-flex items-center justify-center min-w-[2.5rem] px-2 py-1 bg-emerald-100 text-emerald-700 font-bold rounded-lg">
                        {lead.clicks_count}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right text-slate-500 text-xs">
                      {new Date(lead.last_click_at).toLocaleString('es-MX')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
