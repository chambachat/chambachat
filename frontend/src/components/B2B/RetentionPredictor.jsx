import React, { useState, useEffect } from 'react';
import { 
  Calculator, 
  TrendingUp, 
  Clock, 
  DollarSign, 
  GraduationCap, 
  CalendarCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles,
  Info,
  HelpCircle,
  RotateCcw
} from 'lucide-react';
import { predictRetention } from '../../services/api';

export default function RetentionPredictor() {
  const [sueldo, setSueldo] = useState(2400);
  const [tiempoTraslado, setTiempoTraslado] = useState(35);
  const [turnosFijos, setTurnosFijos] = useState(true);
  const [apoyoInea, setApoyoInea] = useState(true);

  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState(null);

  // Consulta en tiempo real al mover cualquier slider o switch
  useEffect(() => {
    let isMounted = true;
    const fetchPrediction = async () => {
      setLoading(true);
      try {
        const res = await predictRetention({
          sueldo: Number(sueldo),
          tiempo_traslado_min: Number(tiempoTraslado),
          turnos_fijos: Boolean(turnosFijos),
          apoyo_inea: Boolean(apoyoInea),
        });
        if (isMounted) {
          setPrediction(res);
        }
      } catch (err) {
        console.error('Error calculando predicción:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchPrediction();
    return () => {
      isMounted = false;
    };
  }, [sueldo, tiempoTraslado, turnosFijos, apoyoInea]);

  const presets = [
    {
      name: 'Turnos Rotativos Críticos',
      sueldo: 1700,
      tiempoTraslado: 65,
      turnosFijos: false,
      apoyoInea: false,
      desc: 'Salario base, sin transporte, alta deserción'
    },
    {
      name: 'Planta Estándar Apodaca',
      sueldo: 2200,
      tiempoTraslado: 30,
      turnosFijos: false,
      apoyoInea: false,
      desc: 'Promedio manufacturero actual'
    },
    {
      name: 'Estrategia de Fidelidad INEA',
      sueldo: 2500,
      tiempoTraslado: 25,
      turnosFijos: true,
      apoyoInea: true,
      desc: 'Turno fijo + Aula INEA de alta retención'
    }
  ];

  const applyPreset = (p) => {
    setSueldo(p.sueldo);
    setTiempoTraslado(p.tiempoTraslado);
    setTurnosFijos(p.turnosFijos);
    setApoyoInea(p.apoyoInea);
  };

  const getBadgeColor = (level) => {
    switch (level) {
      case 'Excelente':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
      case 'Alto':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/40';
      case 'Medio':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
      default:
        return 'bg-rose-500/20 text-rose-400 border-rose-500/40';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs tracking-wider uppercase mb-1">
            <Calculator className="w-4 h-4" />
            <span>Módulo B2B · People Analytics Predictivo</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Predictor de Retención de Operarios
          </h1>
          <p className="text-sm text-slate-400 max-w-2xl mt-1">
            Modelo estadístico basado en regresión logística y lineal sobre 100+ perfiles de manufactura en Nuevo León. Evalúa en tiempo real el impacto de sueldo, tiempo de traslado y beneficios educativos.
          </p>
        </div>

        {/* Presets rápidos */}
        <div className="flex flex-wrap gap-2 items-center bg-slate-900 p-2 rounded-xl border border-slate-800">
          <span className="text-xs font-bold text-slate-400 px-2 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            Escenarios:
          </span>
          {presets.map((p, idx) => (
            <button
              key={idx}
              onClick={() => applyPreset(p)}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition font-medium border border-slate-700/60"
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Panel de Controles / Sliders (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-slate-900/90 rounded-2xl p-6 border border-slate-800 shadow-xl space-y-6">
            <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              Parámetros de la Oferta Laboral
            </h2>

            {/* Slider 1: Sueldo semanal libre */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  Sueldo Semanal Libre
                </label>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-extrabold text-emerald-400">
                    ${Number(sueldo).toLocaleString('es-MX')}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">MXN/sem</span>
                </div>
              </div>
              <input
                type="range"
                min="1400"
                max="4500"
                step="50"
                value={sueldo}
                onChange={(e) => setSueldo(Number(e.target.value))}
                className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-400 transition"
              />
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>$1,400 (Base operativo)</span>
                <span>$2,500 (Competitivo)</span>
                <span>$4,500 (Especializado)</span>
              </div>
              <p className="text-[11px] text-slate-400 italic">
                * Fórmula PRD: +0.25 meses por cada $100 MXN sobre la base de $1,500.
              </p>
            </div>

            {/* Slider 2: Tiempo de traslado */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-sky-400" />
                  Tiempo de Traslado Promedio
                </label>
                <div className="flex items-baseline gap-1">
                  <span className={`text-xl font-extrabold ${tiempoTraslado > 45 ? 'text-rose-400' : 'text-sky-400'}`}>
                    {tiempoTraslado}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">minutos</span>
                </div>
              </div>
              <input
                type="range"
                min="10"
                max="120"
                step="5"
                value={tiempoTraslado}
                onChange={(e) => setTiempoTraslado(Number(e.target.value))}
                className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500 hover:accent-sky-400 transition"
              />
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>10 min (Parque cercano)</span>
                <span>45 min (Ruta media)</span>
                <span>120 min (Transbordo pesado)</span>
              </div>
              <p className="text-[11px] text-slate-400 italic">
                * Penalización PRD: -0.4 meses por cada 10 min por encima de los 20 min.
              </p>
            </div>

            {/* Switches de Políticas de Empresa */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {/* Switch Turnos Fijos */}
              <div 
                onClick={() => setTurnosFijos(!turnosFijos)}
                className={`p-4 rounded-xl border cursor-pointer transition flex items-start gap-3 select-none ${
                  turnosFijos 
                    ? 'bg-emerald-500/10 border-emerald-500/50 text-white' 
                    : 'bg-slate-800/40 border-slate-700 text-slate-400 hover:border-slate-600'
                }`}
              >
                <div className={`mt-0.5 p-1.5 rounded-lg ${turnosFijos ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-500'}`}>
                  <CalendarCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-100">Turnos Fijos</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold">+2.0m</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Turnos continuos sin rolación para reducir fatiga biológica.
                  </p>
                </div>
              </div>

              {/* Switch Apoyo INEA */}
              <div 
                onClick={() => setApoyoInea(!apoyoInea)}
                className={`p-4 rounded-xl border cursor-pointer transition flex items-start gap-3 select-none ${
                  apoyoInea 
                    ? 'bg-purple-500/10 border-purple-500/50 text-white' 
                    : 'bg-slate-800/40 border-slate-700 text-slate-400 hover:border-slate-600'
                }`}
              >
                <div className={`mt-0.5 p-1.5 rounded-lg ${apoyoInea ? 'bg-purple-500 text-slate-950' : 'bg-slate-800 text-slate-500'}`}>
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-100">Apoyo INEA</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-bold">+3.5m</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Aula o tiempo para certificar primaria/secundaria en planta.
                  </p>
                </div>
              </div>
            </div>

            {/* Reset button */}
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => {
                  setSueldo(2400);
                  setTiempoTraslado(35);
                  setTurnosFijos(true);
                  setApoyoInea(true);
                }}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition"
              >
                <RotateCcw className="w-3 h-3" />
                Restablecer valores por defecto
              </button>
            </div>
          </div>
        </div>

        {/* Panel de Resultados del Predictor (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-gradient-to-b from-slate-900 to-slate-950 rounded-2xl p-6 border border-slate-800 shadow-2xl relative overflow-hidden">
            {/* Background decorative glow */}
            <div className="absolute -top-24 -right-24 w-56 h-56 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Permanencia Proyectada
              </span>
              {prediction && (
                <span className={`px-2.5 py-1 text-xs font-bold rounded-full border ${getBadgeColor(prediction.retention_level)}`}>
                  {prediction.retention_level}
                </span>
              )}
            </div>

            {/* Resultado Numérico Central */}
            <div className="py-6 text-center">
              <div className="inline-flex items-baseline gap-2">
                <span className="text-6xl font-black tracking-tight text-white drop-shadow-sm">
                  {prediction ? prediction.retention_months.toFixed(1) : '--'}
                </span>
                <span className="text-lg font-bold text-emerald-400">meses</span>
              </div>
              <p className="text-xs font-semibold text-slate-300 mt-1">
                {prediction?.risk_category}
              </p>
            </div>

            {/* Cascada de Desglose de Factores */}
            {prediction && (
              <div className="space-y-2.5 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 mb-6">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Desglose de la Ecuación Predictiva
                </h3>

                {/* Base */}
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Permanencia Base del Mercado</span>
                  <span className="font-bold text-slate-300">+{prediction.base_months.toFixed(1)} meses</span>
                </div>

                {/* Sueldo */}
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Impacto Salarial (${sueldo}/sem)</span>
                  <span className={`font-bold ${prediction.sueldo_impact >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {prediction.sueldo_impact >= 0 ? `+${prediction.sueldo_impact.toFixed(2)}` : prediction.sueldo_impact.toFixed(2)} meses
                  </span>
                </div>

                {/* Traslado */}
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Distancia ({tiempoTraslado} min)</span>
                  <span className={`font-bold ${prediction.traslado_impact < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                    {prediction.traslado_impact.toFixed(2)} meses
                  </span>
                </div>

                {/* Turnos */}
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Turnos Fijos</span>
                  <span className={`font-bold ${turnosFijos ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {turnosFijos ? `+${prediction.turnos_impact.toFixed(1)} meses` : '0.0 meses'}
                  </span>
                </div>

                {/* INEA */}
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Programa Aula / Horarios INEA</span>
                  <span className={`font-bold ${apoyoInea ? 'text-purple-400' : 'text-slate-500'}`}>
                    {apoyoInea ? `+${prediction.inea_impact.toFixed(1)} meses` : '0.0 meses'}
                  </span>
                </div>
              </div>
            )}

            {/* Recomendaciones Tácticas para el Reclutador */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                Recomendaciones Tácticas para RRHH:
              </h3>
              <div className="space-y-1.5">
                {prediction?.recommendations.map((rec, i) => (
                  <div key={i} className="text-xs text-slate-300 bg-slate-800/40 p-2.5 rounded-lg border border-slate-700/40 flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span>{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
