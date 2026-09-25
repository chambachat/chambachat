import React from 'react';
import { User, GraduationCap, MapPin, X, Briefcase, LogOut, ShieldCheck, Building2, ExternalLink, Navigation } from 'lucide-react';
import { readStoredLocation, locationFromUser, formatLocation } from '../../services/candidateLocation';
import BlockedCompanies from './BlockedCompanies';
import ResumeSummaryCard from './ResumeSummaryCard';

export default function UserProfileModal({ 
  isOpen, 
  onClose, 
  candidateProfile, 
  currentUser, 
  onLogout, 
  onOpenAuth, 
  onReturnToChat,
  onOpenEmpresa,
  onUpdateLocation,
  onEditResume,
  resumeVersion = 0
}) {
  if (!isOpen) return null;

  const isGoogle = currentUser?.provider === 'google';
  const isRecruiter = currentUser?.role === 'recruiter';
  // Ubicación confirmada: la del perfil (usuario con sesión) o la guardada en este dispositivo (invitado)
  const location = locationFromUser(currentUser) || readStoredLocation();

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-6 relative animate-fadeIn">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          {currentUser ? (
            <img
              src={currentUser.avatar_url}
              alt={currentUser.name}
              className={`w-12 h-12 rounded-2xl object-cover shrink-0 border ${
                isRecruiter 
                  ? 'bg-blue-50 border-blue-300' 
                  : 'bg-emerald-50 border-emerald-300'
              }`}
            />
          ) : (
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 text-xl font-bold shrink-0">
              👤
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h2 className="text-lg font-black text-slate-900 truncate">
                {currentUser 
                  ? currentUser.name 
                  : 'Mi Perfil de Operario'}
              </h2>
              {currentUser && (candidateProfile?.aura_puntos > 0 || currentUser?.aura_puntos > 0) && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black tracking-wide border border-amber-200" title="Puntos ganados por ayudar a la comunidad">
                  ⭐ {(candidateProfile?.aura_puntos || currentUser?.aura_puntos || 0)} de Aura
                </span>
              )}
              {currentUser && (
                <ShieldCheck 
                  className={`w-4 h-4 shrink-0 ${isRecruiter ? 'text-blue-600' : 'text-emerald-600'}`} 
                  title={isGoogle ? "Cuenta verificada con Google" : "Cuenta verificada por Correo"} 
                />
              )}
            </div>
            <p className="text-xs text-slate-500 truncate">
              {currentUser 
                ? `${currentUser.email} • ${isRecruiter ? (currentUser.empresa_nombre || currentUser.company_name || 'Reclutador Industrial') : 'Candidato'}`
                : 'Datos registrados a través de las conversaciones de Chambachat'}
            </p>
          </div>
        </div>

        {/* CONTENIDO SEGÚN ROL: RECLUTADOR vs CANDIDATO */}
        {isRecruiter ? (
          /* Vista Reclutador / Empresa */
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 space-y-3">
              <div className="flex items-center justify-between text-xs pb-1 border-b border-blue-100">
                <span className="font-bold text-blue-900 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-blue-600" />
                  Perfil de Empresa & Reclutamiento
                </span>
                <span className="text-[10px] bg-blue-100 text-blue-800 font-extrabold px-2 py-0.5 rounded-full">
                  B2B SaaS
                </span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Nombre del Reclutador:</span>
                <span className="font-bold text-slate-900">{currentUser.name}</span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Empresa / Planta:</span>
                <span className="font-bold text-blue-700 bg-white px-2 py-0.5 rounded-md border border-blue-200">
                  {currentUser.empresa_nombre || currentUser.company_name || 'Planta Industrial'}
                </span>
              </div>

              {currentUser.phone && (
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">WhatsApp / Teléfono:</span>
                  <span className="font-semibold text-slate-800">{currentUser.phone}</span>
                </div>
              )}

              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Método de acceso:</span>
                <span className="font-semibold text-slate-700 bg-white px-2 py-0.5 rounded-md border border-slate-200 text-[11px]">
                  {isGoogle ? 'Google (1 Clic)' : 'Correo Corporativo'}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-900">Portal de Vacantes & Reclutamiento</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenEmpresa?.();
                  }}
                  className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 transition"
                >
                  <span>Abrir Portal</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Accede para dar de alta vacantes, revisar postulaciones de operarios en tiempo real y responder mediante chat directo.
              </p>
            </div>
          </div>
        ) : (
          /* Vista Candidato / Operario */
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Nombre registrado:</span>
                <span className="font-bold text-slate-900 text-sm">
                  {candidateProfile?.nombre || currentUser?.name || 'Operario'}
                </span>
              </div>
              {currentUser?.phone && (
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">WhatsApp / Teléfono:</span>
                  <span className="font-semibold text-emerald-700">
                    {currentUser.phone}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center text-xs gap-2">
                <span className="text-slate-500 shrink-0">Ubicación para transporte:</span>
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`font-semibold flex items-center gap-1 min-w-0 ${location ? 'text-slate-900' : 'text-slate-400'}`}>
                    <MapPin className={`w-3.5 h-3.5 shrink-0 ${location ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <span className="truncate">{location ? formatLocation(location) : 'Sin registrar'}</span>
                  </span>
                  {onUpdateLocation && (
                    <button
                      type="button"
                      onClick={onUpdateLocation}
                      className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-lg border border-emerald-200 transition shrink-0"
                    >
                      <Navigation className="w-3 h-3" />
                      <span>{location ? 'Actualizar' : 'Registrar'}</span>
                    </button>
                  )}
                </div>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Método de acceso:</span>
                <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                  {currentUser ? (isGoogle ? 'Google (1 Clic)' : 'Correo Electrónico') : 'Invitado / No autenticado'}
                </span>
              </div>
            </div>

            <ResumeSummaryCard currentUser={currentUser} onEdit={onEditResume} refreshKey={resumeVersion} />

            {currentUser && <BlockedCompanies />}

            {/* TODO fase 2: Programa Educativo INEA (oculto para lanzamiento) */}
          </div>
        )}

        {/* Footer con botón prominente de Cerrar Sesión */}
        <div className="pt-2 flex items-center justify-between border-t border-slate-100 gap-2">
          <div>
            {currentUser ? (
              <button
                type="button"
                onClick={() => {
                  onLogout?.();
                  onClose();
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold border border-rose-200 shadow-xs transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Cerrar sesión</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAuth?.();
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200 transition"
              >
                <User className="w-3.5 h-3.5" />
                <span>Iniciar sesión</span>
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onReturnToChat?.();
              }}
              className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition shadow-sm"
            >
              Platicar en el Chat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
