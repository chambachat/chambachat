import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { badgeColorForLevel } from './presets';

function ImpactRow({ label, value, className }) {
  return (
    <div className="flex justify-between items-center text-xs">
      <span className="text-slate-600">{label}</span>
      <span className={`font-bold ${className}`}>{value}</span>
    </div>
  );
}

const signed = (n, digits = 2) => (n >= 0 ? `+${n.toFixed(digits)}` : n.toFixed(digits));

export default function PredictionResult({ prediction, params }) {
  const { sueldo, tiempoTraslado, turnosFijos, apoyoInea } = params;

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Permanencia Proyectada</span>
        {prediction && (
          <span className={`px-2.5 py-1 text-xs font-bold rounded-full border ${badgeColorForLevel(prediction.retention_level)}`}>
            {prediction.retention_level}
          </span>
        )}
      </div>

      <div className="py-4 text-center">
        <div className="inline-flex items-baseline gap-2">
          <span className="text-6xl font-black tracking-tight text-slate-900">
            {prediction ? prediction.retention_months.toFixed(1) : '--'}
          </span>
          <span className="text-lg font-bold text-emerald-600">meses</span>
        </div>
        <p className="text-xs font-semibold text-slate-500 mt-1">{prediction?.risk_category}</p>
      </div>

      {prediction && (
        <div className="space-y-2.5 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Desglose de la Ecuación Predictiva</h3>
          <ImpactRow label="Permanencia Base del Mercado" value={`+${prediction.base_months.toFixed(1)} meses`} className="text-slate-900" />
          <ImpactRow
            label={`Impacto Salarial ($${sueldo}/sem)`}
            value={`${signed(prediction.sueldo_impact)} meses`}
            className={prediction.sueldo_impact >= 0 ? 'text-emerald-600' : 'text-rose-600'}
          />
          <ImpactRow
            label={`Distancia (${tiempoTraslado} min)`}
            value={`${prediction.traslado_impact.toFixed(2)} meses`}
            className={prediction.traslado_impact < 0 ? 'text-rose-600' : 'text-slate-600'}
          />
          <ImpactRow
            label="Turnos Fijos"
            value={turnosFijos ? `+${prediction.turnos_impact.toFixed(1)} meses` : '0.0 meses'}
            className={turnosFijos ? 'text-emerald-600' : 'text-slate-400'}
          />
          <ImpactRow
            label="Programa Aula / Horarios INEA"
            value={apoyoInea ? `+${prediction.inea_impact.toFixed(1)} meses` : '0.0 meses'}
            className={apoyoInea ? 'text-purple-600' : 'text-slate-400'}
          />
        </div>
      )}

      <div className="space-y-2">
        <h3 className="text-xs font-bold text-amber-600 flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5" />
          Recomendaciones Tácticas para RRHH:
        </h3>
        <div className="space-y-1.5">
          {prediction?.recommendations.map((rec, i) => (
            <div key={i} className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-start gap-2">
              <span className="text-emerald-600 font-bold">•</span>
              <span>{rec}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
