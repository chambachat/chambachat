import React from 'react';
import { MapPin, Clock, CheckCircle2, Sparkles, Bus } from 'lucide-react';

export default function VacanciesCarousel({ 
  jobs, 
  nearbyRoutes, 
  appliedJobIds, 
  onViewDetail, 
  showVacancies, 
  setShowVacancies,
  currentUser 
}) {
  return (
    <div className="w-full max-w-full overflow-hidden">
      {nearbyRoutes && nearbyRoutes.length > 0 && (
        <div className="pl-0 sm:pl-10 pt-1 space-y-2 w-full max-w-full overflow-hidden animate-fadeIn mb-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
              <Bus className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Rutas de Transporte Cercanas a Tu Colonia ({nearbyRoutes.length})</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full">
            {nearbyRoutes.map((route, idx) => (
              <div 
                key={idx}
                className="p-3.5 rounded-2xl bg-white border border-slate-200 hover:border-emerald-400 shadow-xs hover:shadow-sm transition space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span 
                      className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md inline-block text-white mb-1"
                      style={{ backgroundColor: route.color_hex || '#059669' }}
                    >
                      {route.nombre_ruta}
                    </span>
                    <h5 className="text-xs font-bold text-slate-900 truncate">
                      {route.empresa_nombre}
                    </h5>
                  </div>
                  <span className="text-[10px] bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded-full shrink-0">
                    {route.turno || 'Matutino'}
                  </span>
                </div>

                <div className="space-y-1 text-[11px] text-slate-600">
                  <div className="flex items-center gap-1.5 truncate">
                    <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span className="font-semibold text-slate-800">Parada:</span>
                    <span className="truncate">{route.nombre_parada}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="font-semibold text-slate-800">Pasa:</span>
                    <span className="text-emerald-700 font-bold">{route.horario_paso}</span>
                    {route.hora_llegada_planta && (
                      <span className="text-slate-400 text-[10px]">(Llega a planta {route.hora_llegada_planta})</span>
                    )}
                  </div>
                </div>

                <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px]">
                  <span className="text-slate-500 font-medium">
                    🚶 ~{route.caminando_min} min caminando a la parada
                  </span>
                  <span className="font-bold text-emerald-600">
                    {route.distancia_km} km
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {jobs && jobs.length > 0 && (
        <div className="pl-0 sm:pl-10 pt-2 space-y-2 w-full max-w-full overflow-hidden">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Vacantes Afines ({jobs.length})</span>
            </div>
            <button
              onClick={() => setShowVacancies(!showVacancies)}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 transition"
            >
              <span>{showVacancies ? 'Ocultar vacantes ▴' : 'Ver vacantes ▾'}</span>
            </button>
          </div>

          {showVacancies && (
            <div className="flex gap-3 overflow-x-auto snap-x py-1 px-0.5 no-scrollbar w-full max-w-full">
              {jobs.map((job) => {
                const isApplied = appliedJobIds.has(job.id);
                return (
                  <div
                    key={job.id}
                    onClick={() => onViewDetail(job)}
                    className="w-[260px] sm:w-[280px] shrink-0 snap-start bg-white p-3.5 rounded-2xl border border-slate-200 hover:border-emerald-500 shadow-sm transition flex flex-col justify-between space-y-2.5 cursor-pointer group hover:shadow-md"
                    title="Haz clic para ver toda la información de la vacante y abrir chat directo"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1.5">
                        <span className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-wide truncate">
                          {job.empresa_nombre}
                        </span>
                        <div className="text-right shrink-0">
                          <span className="text-xs font-black text-emerald-600">
                            ${job.sueldo_semanal_libre?.toLocaleString('es-MX')}
                          </span>
                          <span className="text-[9px] text-slate-400"> /sem</span>
                        </div>
                      </div>

                      <h4 className="text-xs font-bold text-slate-900 leading-tight line-clamp-1 mt-0.5 group-hover:text-emerald-700 transition-colors" title={job.titulo}>
                        {job.titulo}
                      </h4>

                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 leading-snug">
                        {job.descripcion}
                      </p>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewDetail(job);
                        }}
                        className="text-[10px] text-emerald-700 font-bold hover:underline mt-1.5 flex items-center gap-1"
                      >
                        <span>Ver información extendida</span>
                        <span>&rarr;</span>
                      </button>
                    </div>

                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1 text-[10px]">
                        <span className="flex items-center gap-1 bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                          <MapPin className="w-3 h-3 text-sky-500 shrink-0" />
                          {job.municipio} ({job.distancia_km} km)
                        </span>
                        <span className="flex items-center gap-1 bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                          <Clock className="w-3 h-3 text-amber-500 shrink-0" />
                          ~{job.tiempo_traslado_min} min
                        </span>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewDetail(job);
                        }}
                        className={`w-full text-center py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                          isApplied
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-900 hover:bg-emerald-600 text-white shadow-sm'
                        }`}
                      >
                        {isApplied ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Chat Directo Activo ✓</span>
                          </>
                        ) : (
                          <span>{currentUser ? '💬 Chat Directo con Reclutador' : 'Ver Detalles & Chat'}</span>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
