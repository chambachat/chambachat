import React from 'react';
import { Building2, Plus, UserPlus, Settings, ShieldCheck, FileText, ExternalLink } from 'lucide-react';

export default function CompanySelector({
  companies,
  selectedCompany,
  onSelectCompany,
  onNewCompany,
  onInvite,
  onEditCompany
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-wider">
            <Building2 className="w-4 h-4" />
            <span>Configuración Multiusuario B2B</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Mi Equipo de Reclutamiento & Plantas
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">
            Configura las empresas o plantas industriales que administras y colabora con tu equipo de reclutadores en un mismo panel.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onNewCompany}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>Nueva Planta / Empresa</span>
          </button>
          <button
            type="button"
            onClick={onInvite}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            <span>Invitar Reclutador</span>
          </button>
        </div>
      </div>

      <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-500 shrink-0">Planta Activa:</span>
          <div className="relative min-w-[240px]">
            <select
              value={selectedCompany?.id || ''}
              onChange={(e) => {
                const found = companies.find(c => c.id === parseInt(e.target.value));
                if (found) onSelectCompany(found);
              }}
              className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500 cursor-pointer transition"
            >
              {companies.map(c => (
                <option key={c.id} value={c.id}>
                  🏭 {c.nombre} ({c.municipio})
                </option>
              ))}
            </select>
          </div>

          {selectedCompany && (
            <button
              type="button"
              onClick={onEditCompany}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
              title="Editar datos de esta empresa"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}

          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Verificada SAT</span>
          </span>

          {selectedCompany?.constancia_fiscal_url && (
            <a
              href={selectedCompany.constancia_fiscal_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 hover:text-emerald-700 hover:bg-slate-100 border border-slate-200 px-2 py-1 rounded-lg transition"
              title="Ver Constancia de Situación Fiscal de esta planta"
            >
              <FileText className="w-3 h-3 text-emerald-600" />
              <span>Ver Constancia Fiscal</span>
              <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
            </a>
          )}
        </div>

        <div className="text-[11px] text-slate-400 flex items-center gap-2">
          <span>{companies.length} empresa{companies.length === 1 ? '' : 's'} vinculada{companies.length === 1 ? '' : 's'}</span>
          <span>&bull;</span>
          <span className="font-semibold text-emerald-700">{selectedCompany?.industria || 'Industrial'}</span>
        </div>
      </div>
    </div>
  );
}
