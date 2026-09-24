import React from 'react';
import { ShieldCheck, User, MapPin, Navigation, Building2, Bot } from 'lucide-react';

/** Encabezado fijo de una conversación directa con los reclutadores de una planta. */
export function DirectChatBanner({ session }) {
  const contacted = session?.status && session.status !== 'Pendiente';
  return (
    <div className="pl-0 sm:pl-10 pb-1 w-full min-w-0 animate-fadeIn">
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-50 to-sky-50 border border-blue-200/80 shadow-sm space-y-1.5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 text-xs font-extrabold text-blue-950 min-w-0">
            <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="truncate">Línea directa con Reclutamiento {session.companyName}</span>
          </div>
          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
            contacted ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-amber-100 text-amber-800 border-amber-300'
          }`}>
            {contacted ? 'Reclutador en el chat' : 'Esperando al reclutador'}
          </span>
        </div>
        <p className="text-[11px] text-blue-900/80 leading-snug">
          Vacante: <strong>{session.jobTitle}</strong>. Lo que escribas aquí lo reciben los reclutadores de la planta.
        </p>
        <p className="text-[10px] text-blue-800/70 flex items-center gap-1">
          <Bot className="w-3 h-3 shrink-0" />
          <span>Si tardan más de 2 minutos, Chambot te contesta con los datos de la vacante.</span>
        </p>
      </div>
    </div>
  );
}

/** Invitación a vincular cuenta cuando el bot lo sugiere y no hay sesión. */
export function LoginPromptCard({ onLogin }) {
  return (
    <div className="pl-0 sm:pl-10 py-2 animate-fadeIn w-full min-w-0">
      <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/90 shadow-sm max-w-md space-y-2.5">
        <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Guarda tu perfil para postularte a plantas</span>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          Vincula tu cuenta para guardar tu municipio, ver las mejores vacantes y recibir avisos de contratación.
        </p>
        <button
          type="button"
          onClick={onLogin}
          className="flex items-center justify-center gap-2.5 w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold border border-slate-300 shadow-xs transition"
        >
          <User className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Conectar Cuenta (Google o Correo)</span>
        </button>
      </div>
    </div>
  );
}

/**
 * Tarjeta de ubicación del candidato. Se muestra mientras no haya ubicación registrada,
 * o cuando el bot vuelve a pedirla (`asking`) porque el candidato quiere cambiarla.
 */
export function LocationCard({ location, onOpen, asking = false }) {
  const changing = Boolean(location && asking);
  return (
    <div className="pl-0 sm:pl-10 py-1 animate-fadeIn w-full min-w-0">
      <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-emerald-50/80 via-teal-50/70 to-sky-50/80 border border-emerald-200/90 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <MapPin className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-extrabold text-slate-900">
                {changing ? '📍 ¿Cambiamos tu ubicación?' : location ? '📍 Tu Ubicación Registrada' : '📍 Ubicación para Transporte y Cercanía'}
              </span>
              {location && (
                <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300">
                  {location.colonia}, {location.municipio}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
              {changing
                ? 'Elige tu nueva zona con GPS o en el mapa y vuelvo a calcular las vacantes con menor tiempo de traslado.'
                : location
                  ? 'Calculamos las empresas con menor tiempo de traslado desde tu casa.'
                  : 'Comparte dónde vives (GPS o selecciona en el mapa) para ver qué plantas te quedan más cerca.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpen}
          className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-[0.98] text-white text-xs font-bold shadow-xs transition shrink-0 self-start sm:self-center"
        >
          <Navigation className="w-3.5 h-3.5 text-emerald-200" />
          <span>{changing ? 'Elegir nueva ubicación' : location ? 'Cambiar ubicación' : 'Compartir mi ubicación'}</span>
        </button>
      </div>
    </div>
  );
}
