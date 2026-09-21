import React from 'react';
import { Compass, Loader2 } from 'lucide-react';

/**
 * Contenedor visual para un mapa Leaflet dentro de un modal:
 * marco, badge de ayuda y badge de "trabajando" (geocodificación).
 * El mapa lo controla el hook useLeafletPin a través de `containerRef`.
 */
export default function MapCanvas({
  containerRef,
  heightClass = 'h-[340px] sm:h-[380px]',
  minHeight = 300,
  hint,
  hintSide = 'left',
  spinCompass = false,
  busy = false,
  busyLabel = 'Identificando dirección...'
}) {
  return (
    <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-inner bg-slate-100">
      <div ref={containerRef} className={`w-full z-10 ${heightClass}`} style={{ minHeight: `${minHeight}px` }} />

      {hint && (
        <div
          className={`absolute top-3 ${hintSide === 'left' ? 'left-3' : 'right-3'} z-[1000] bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200 shadow-md text-[11px] text-slate-700 font-bold flex items-center gap-1.5 pointer-events-none`}
        >
          <Compass
            className={`w-3.5 h-3.5 text-emerald-600 ${spinCompass ? 'animate-spin' : ''}`}
            style={spinCompass ? { animationDuration: '8s' } : undefined}
          />
          <span>{hint}</span>
        </div>
      )}

      {busy && (
        <div className="absolute bottom-3 right-3 z-[1000] bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl text-white text-[10px] font-bold flex items-center gap-1.5">
          <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />
          <span>{busyLabel}</span>
        </div>
      )}
    </div>
  );
}
