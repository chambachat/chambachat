import React from 'react';
import { User, Building2, ShieldCheck } from 'lucide-react';

export default function RoleSelector({ role, onSelectRole }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
        Selecciona tu rol en la plataforma:
      </label>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onSelectRole('candidate')}
          className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition text-left text-xs ${
            role === 'candidate'
              ? 'bg-emerald-50/80 border-emerald-500 text-emerald-950 ring-2 ring-emerald-500/20'
              : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center gap-1.5 font-bold mb-0.5">
            <User className="w-4 h-4 text-emerald-600" />
            <span>Soy Candidato</span>
          </div>
          <span className="text-[10px] text-slate-500 text-center leading-tight">
            Busco empleo operativo
          </span>
        </button>

        <button
          type="button"
          onClick={() => onSelectRole('recruiter')}
          className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition text-left text-xs ${
            role === 'recruiter'
              ? 'bg-blue-50/80 border-blue-500 text-blue-950 ring-2 ring-blue-500/20'
              : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center gap-1.5 font-bold mb-0.5">
            <Building2 className="w-4 h-4 text-blue-600" />
            <span>Soy Empresa</span>
          </div>
          <span className="text-[10px] text-slate-500 text-center leading-tight">
            Reclutador / Publico vacantes
          </span>
        </button>
      </div>

      {role === 'recruiter' && (
        <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-2xl space-y-1 mt-2">
          <div className="flex items-center gap-1.5 text-blue-900 font-bold text-xs">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Acceso Corporativo / Reclutador</span>
          </div>
          <p className="text-[11px] text-blue-700 leading-relaxed">
            Inicia sesión con tu correo o Google. Al ingresar al panel podrás dar de alta tu empresa subiendo la <strong>Constancia de Situación Fiscal (CSF del SAT)</strong> o aceptar invitaciones de tu equipo.
          </p>
        </div>
      )}
    </div>
  );
}
