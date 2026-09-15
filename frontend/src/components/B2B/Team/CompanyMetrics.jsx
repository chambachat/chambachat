import React from 'react';
import { Users, Mail, MapPin, FileCheck, CheckCircle2, ShieldCheck } from 'lucide-react';

export default function CompanyMetrics({ teamData, selectedCompany, onOpenLocation }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">Miembros Activos</span>
          <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
            <Users className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-black text-slate-900">{teamData?.active_members?.length || 1}</span>
          <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">En línea</span>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">Invitaciones Pendientes</span>
          <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
            <Mail className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-black text-slate-900">{teamData?.pending_invitations?.length || 0}</span>
          <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded">Por aceptar</span>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Ubicación de Planta</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <MapPin className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-sm font-black text-slate-900 block truncate">{selectedCompany?.municipio || 'Apodaca'}</span>
            <div className="flex items-center justify-between mt-0.5">
              <span className="text-[10px] text-slate-400">Nuevo León, México</span>
              {selectedCompany?.latitud && selectedCompany?.longitud ? (
                <span className="inline-flex items-center gap-1 text-[9px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                  <span>GPS Listo</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                  <span>Sin GPS</span>
                </span>
              )}
            </div>
          </div>
        </div>
        
        <button
          type="button"
          onClick={onOpenLocation}
          className="mt-3 w-full py-1.5 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1.5 shadow-2xs"
        >
          <MapPin className="w-3 h-3 text-blue-600" />
          <span>{selectedCompany?.latitud ? 'Ajustar en Mapa' : 'Ubicar en Mapa'}</span>
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">Verificación Fiscal</span>
          <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
            <FileCheck className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2">
          <span className="text-xs font-black text-slate-900 block truncate font-mono">
            RFC: {selectedCompany?.rfc || 'Validado SAT'}
          </span>
          <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" />
            <span>{selectedCompany?.sat_validado ? 'SAT Validado (Activo)' : 'CSF Registrada'}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
