import React from 'react';

/** Pantalla inicial del chat cuando la sesión no tiene mensajes: saludo y una sola invitación a escribir. */
export default function ChatWelcome() {
  return (
    <div className="py-10 sm:py-20 text-center space-y-6 sm:space-y-8 animate-fadeIn">
      <div className="flex justify-center">
        <img src="/chambot-v2.png" alt="Chambot" className="w-24 h-24 sm:w-28 sm:h-28 object-contain drop-shadow-md hover:scale-105 transition-transform" />
      </div>
      <div className="space-y-1.5 sm:space-y-2 px-2">
        <h1 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight">¡Qué onda! ¿Buscamos una chambita?</h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
          Cuéntame qué puesto buscas o en qué zona vives y te ayudo a encontrar jale cerca de tu casa: montacargas, ensamble, almacén, turnos fijos, sueldos y transporte.
        </p>
      </div>
    </div>
  );
}
