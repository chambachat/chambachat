import React from 'react';
import { User, GraduationCap, MapPin, Phone, CheckCircle2, ArrowLeft, X, Award, Briefcase, LogOut, ShieldCheck } from 'lucide-react';

export default function UserProfileModal({ isOpen, onClose, candidateProfile, currentUser, onLogout, onOpenAuth, onReturnToChat }) {
  if (!isOpen) return null;

  const isGoogle = currentUser?.provider === 'google';

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
              className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-300 object-cover shrink-0"
            />
          ) : (
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 text-xl font-bold shrink-0">
              👤
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="text-lg font-black text-slate-900 truncate">
                {currentUser ? currentUser.name : 'Mi Perfil de Operario'}
              </h2>
              {currentUser && (
                <ShieldCheck 
                  className="w-4 h-4 text-emerald-600 shrink-0" 
                  title={isGoogle ? "Cuenta verificada con Google" : "Cuenta verificada por Correo"} 
                />
              )}
            </div>
            <p className="text-xs text-slate-500 truncate">
              {currentUser ? currentUser.email : 'Datos registrados a través de las conversaciones de Chambachat'}
            </p>
          </div>
        </div>

        {/* Datos del Candidato */}
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">Nombre registrado:</span>
              <span className="font-bold text-slate-900 text-sm">
                {candidateProfile?.nombre || currentUser?.name || 'Operario de Nuevo León'}
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
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">Municipio de residencia:</span>
              <span className="font-bold text-slate-900">
                {candidateProfile?.municipio || 'Apodaca'}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">Grado de estudios:</span>
              <span className="font-semibold text-slate-800">
                {candidateProfile?.nivel_educativo?.replace('_', ' ') || 'Secundaria'}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">Método de acceso:</span>
              <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                {currentUser ? (isGoogle ? 'Google (1 Clic)' : 'Correo Electrónico') : 'Invitado / No autenticado'}
              </span>
            </div>
          </div>

          {/* Estatus INEA */}
          <div className={`p-4 rounded-2xl border ${
            candidateProfile?.tag_inea 
              ? 'bg-purple-50 border-purple-200 text-purple-900' 
              : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <GraduationCap className="w-4 h-4 text-purple-600" />
              <span className="text-xs font-bold uppercase tracking-wide">
                Programa Educativo INEA
              </span>
            </div>
            {candidateProfile?.tag_inea ? (
              <p className="text-xs leading-relaxed text-purple-950 font-medium">
                ✅ <span className="font-bold">Canalizado con éxito.</span> Tus postulaciones priorizan empresas que cuentan con aula y facilidades de tiempo para certificar tu educación básica.
              </p>
            ) : (
              <p className="text-xs text-slate-500">
                Actualmente no tienes activo el apoyo del INEA. Puedes activarlo en cualquier momento platicando con el bot.
              </p>
            )}
          </div>
        </div>

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
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cerrar
            </button>
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
