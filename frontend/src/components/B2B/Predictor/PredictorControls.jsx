import React from 'react';
import { TrendingUp, Clock, DollarSign, GraduationCap, CalendarCheck, RotateCcw } from 'lucide-react';

function PolicySwitch({ active, onToggle, icon: Icon, label, bonus, description, activeClasses, iconActiveClass }) {
  return (
    <div
      onClick={onToggle}
      className={`p-4 rounded-2xl border cursor-pointer transition flex items-start gap-3 select-none ${
        active ? `${activeClasses} text-slate-900 shadow-sm` : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'
      }`}
    >
      <div className={`mt-0.5 p-1.5 rounded-lg ${active ? `${iconActiveClass} text-white` : 'bg-slate-200 text-slate-500'}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-900">{label}</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${bonus.className}`}>{bonus.text}</span>
        </div>
        <p className="text-[11px] text-slate-500 mt-1 leading-snug">{description}</p>
      </div>
    </div>
  );
}

export default function PredictorControls({ params, onChange, onReset }) {
  const { sueldo, tiempoTraslado, turnosFijos, apoyoInea } = params;

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
      <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
        <TrendingUp className="w-5 h-5 text-emerald-600" />
        Parámetros de la Oferta Laboral
      </h2>

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            Sueldo Semanal Libre
          </label>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-extrabold text-emerald-600">${Number(sueldo).toLocaleString('es-MX')}</span>
            <span className="text-xs text-slate-400 font-medium">MXN/sem</span>
          </div>
        </div>
        <input
          type="range" min="1400" max="4500" step="50" value={sueldo}
          onChange={(e) => onChange('sueldo', Number(e.target.value))}
          className="w-full h-2.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-600 hover:accent-emerald-700 transition"
        />
        <div className="flex justify-between text-[11px] text-slate-400">
          <span>$1,400 (Base operativo)</span>
          <span>$2,500 (Competitivo)</span>
          <span>$4,500 (Especializado)</span>
        </div>
        <p className="text-[11px] text-slate-400 italic">* Fórmula PRD: +0.25 meses por cada $100 MXN sobre la base de $1,500.</p>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <Clock className="w-4 h-4 text-sky-500" />
            Tiempo de Traslado Promedio
          </label>
          <div className="flex items-baseline gap-1">
            <span className={`text-xl font-extrabold ${tiempoTraslado > 45 ? 'text-rose-600' : 'text-sky-600'}`}>{tiempoTraslado}</span>
            <span className="text-xs text-slate-400 font-medium">minutos</span>
          </div>
        </div>
        <input
          type="range" min="10" max="120" step="5" value={tiempoTraslado}
          onChange={(e) => onChange('tiempoTraslado', Number(e.target.value))}
          className="w-full h-2.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-sky-500 hover:accent-sky-600 transition"
        />
        <div className="flex justify-between text-[11px] text-slate-400">
          <span>10 min (Parque cercano)</span>
          <span>45 min (Ruta media)</span>
          <span>120 min (Transbordo pesado)</span>
        </div>
        <p className="text-[11px] text-slate-400 italic">* Penalización PRD: -0.4 meses por cada 10 min por encima de los 20 min.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
        <PolicySwitch
          active={turnosFijos}
          onToggle={() => onChange('turnosFijos', !turnosFijos)}
          icon={CalendarCheck}
          label="Turnos Fijos"
          bonus={{ text: '+2.0m', className: 'bg-emerald-100 text-emerald-800' }}
          description="Turnos continuos sin rolación para reducir fatiga biológica."
          activeClasses="bg-emerald-50 border-emerald-300"
          iconActiveClass="bg-emerald-600"
        />
        <PolicySwitch
          active={apoyoInea}
          onToggle={() => onChange('apoyoInea', !apoyoInea)}
          icon={GraduationCap}
          label="Apoyo INEA"
          bonus={{ text: '+3.5m', className: 'bg-purple-100 text-purple-800' }}
          description="Aula o tiempo para certificar primaria/secundaria en planta."
          activeClasses="bg-purple-50 border-purple-300"
          iconActiveClass="bg-purple-600"
        />
      </div>

      <div className="pt-2 flex justify-end">
        <button onClick={onReset} className="text-xs text-slate-400 hover:text-slate-700 flex items-center gap-1 transition font-medium">
          <RotateCcw className="w-3 h-3" />
          Restablecer valores por defecto
        </button>
      </div>
    </div>
  );
}
