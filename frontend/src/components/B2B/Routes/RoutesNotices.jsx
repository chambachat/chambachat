import React from 'react';
import { Building2, Navigation, Sparkles } from 'lucide-react';

export function NoCompanyNotice() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
      <div className="p-4 bg-amber-50 text-amber-600 rounded-3xl inline-flex border border-amber-200">
        <Building2 className="w-10 h-10" />
      </div>
      <h2 className="text-2xl font-black text-slate-900">Empresa Pendiente de Registro</h2>
      <p className="text-sm text-slate-500 max-w-md mx-auto">
        Para crear y gestionar rutas de transporte en el mapa, primero debes dar de alta tu empresa y subir la Constancia de Situación Fiscal (CSF).
      </p>
    </div>
  );
}

export function EditingBanner({ stopsCount }) {
  const plural = stopsCount === 1 ? '' : 's';
  return (
    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-fadeIn">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-2xl shrink-0">
          <Navigation className="w-5 h-5 animate-pulse" />
        </div>
        <div>
          <span className="text-xs font-black text-emerald-950 block">
            Modo Captura GPS Activado: Haz clic sobre el mapa para colocar las paradas
          </span>
          <span className="text-[11px] text-emerald-800">
            Cada clic fijará una parada numerada en el recorrido que se conectará automáticamente con la planta.
          </span>
        </div>
      </div>
      <span className="text-xs font-extrabold text-emerald-900 bg-white px-3 py-1.5 rounded-xl border border-emerald-200 shrink-0">
        {stopsCount} parada{plural} fijada{plural}
      </span>
    </div>
  );
}

export function ChatSyncNotice() {
  return (
    <div className="p-4 bg-slate-50 border border-slate-200 rounded-3xl space-y-2 text-xs text-slate-600">
      <div className="flex items-center gap-1.5 font-bold text-slate-900">
        <Sparkles className="w-4 h-4 text-emerald-600" />
        <span>Sincronización con el Chat de Candidatos</span>
      </div>
      <p className="text-[11px] text-slate-500 leading-relaxed">
        Las paradas y horarios que registres aquí se cruzan automáticamente con la ubicación del candidato cuando conversa con <strong>Chambot</strong>. El bot le indicará la parada más cercana a su colonia y a qué hora pasa el transporte.
      </p>
    </div>
  );
}
