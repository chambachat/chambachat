import React from 'react';

const STARTER_PROMPTS = [
  {
    title: '🚜 Vacantes de Montacarguista',
    subtitle: 'Hombre sentado y parado con sueldos de hasta $3,400/sem',
    prompt: 'Habrá vacantes de montacarguista?'
  },
  {
    title: '🏭 Operario en Apodaca',
    subtitle: 'Ensamble y producción con ruta de transporte de personal',
    prompt: 'Busco vacantes de operario de producción en Apodaca con transporte'
  },
  {
    title: '⏱️ Turnos Fijos sin Rolar',
    subtitle: 'Mayor descanso y estabilidad para tu familia',
    prompt: 'Busco puestos que ofrezcan turnos fijos sin rolación'
  },
  {
    title: '💰 Sueldos mayores a $2,800/sem',
    subtitle: 'Puestos de montacargas, soldadura y maquinado CNC',
    prompt: '¿Cuáles son las vacantes con sueldo superior a $2,800 semanales libres?'
  }
];

/** Pantalla inicial del chat cuando la sesión no tiene mensajes. */
export default function ChatWelcome({ onPrompt }) {
  return (
    <div className="py-8 sm:py-16 text-center space-y-6 sm:space-y-8 animate-fadeIn">
      <div className="flex justify-center">
        <img src="/chambot.png" alt="Chambot" className="w-20 h-20 sm:w-24 sm:h-24 object-contain drop-shadow-md hover:scale-105 transition-transform" />
      </div>
      <div className="space-y-1.5 sm:space-y-2 px-2">
        <h1 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight">¡Qué onda! ¿Buscamos una chambita?</h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
          Pregúntame sobre vacantes de montacarguistas, ensamble, almacén, turnos fijos o sueldos en Nuevo León.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 text-left pt-2 sm:pt-4">
        {STARTER_PROMPTS.map((item) => (
          <button
            key={item.title}
            onClick={() => onPrompt(item.prompt)}
            className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/70 hover:border-emerald-300 transition text-left group shadow-sm"
          >
            <div className="font-bold text-xs text-slate-800 group-hover:text-emerald-700 transition">{item.title}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">{item.subtitle}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
