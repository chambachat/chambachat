import React, { useState, useEffect } from 'react';
import { Calculator, Sparkles } from 'lucide-react';
import { predictRetention } from '../../services/api';
import { DEFAULT_PARAMS, PRESETS } from './Predictor/presets';
import PredictorControls from './Predictor/PredictorControls';
import PredictionResult from './Predictor/PredictionResult';

export default function RetentionPredictor() {
  const [params, setParams] = useState(DEFAULT_PARAMS);
  const [prediction, setPrediction] = useState(null);

  // Consulta en tiempo real al mover cualquier slider o switch
  useEffect(() => {
    let isMounted = true;
    predictRetention({
      sueldo: Number(params.sueldo),
      tiempo_traslado_min: Number(params.tiempoTraslado),
      turnos_fijos: Boolean(params.turnosFijos),
      apoyo_inea: Boolean(params.apoyoInea),
    })
      .then((res) => { if (isMounted) setPrediction(res); })
      .catch((err) => console.error('Error calculando predicción:', err));
    return () => { isMounted = false; };
  }, [params]);

  const changeParam = (field, value) => setParams(prev => ({ ...prev, [field]: value }));

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs tracking-wider uppercase mb-1">
            <Calculator className="w-4 h-4" />
            <span>Módulo B2B · People Analytics Predictivo</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Predictor de Retención de Operarios</h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl mt-1">
            Modelo estadístico basado en regresión sobre 100+ perfiles de manufactura. Evalúa en tiempo real el impacto de sueldo, tiempo de traslado y condiciones de turno.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 items-center bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-500 px-2 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            Escenarios:
          </span>
          {PRESETS.map((p) => (
            <button
              key={p.name}
              onClick={() => setParams(p.params)}
              title={p.desc}
              className="text-xs px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition font-medium border border-slate-200"
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 space-y-6">
          <PredictorControls params={params} onChange={changeParam} onReset={() => setParams(DEFAULT_PARAMS)} />
        </div>
        <div className="lg:col-span-5 space-y-6">
          <PredictionResult prediction={prediction} params={params} />
        </div>
      </div>
    </div>
  );
}
