import React from 'react';
import { User, GraduationCap, MapPin, Phone, CheckCircle2, ArrowLeft, X, Award, Briefcase, LogOut, ShieldCheck } from 'lucide-react';

export default function UserProfileModal({ isOpen, onClose, candidateProfile, currentUser, onLogout, onReturnToChat }) {
  if (!isOpen) return null;

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
              className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-300"
            />
          ) : (
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 text-xl font-bold">
              👤
            </div>
          )}
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-lg font-black text-slate-900">
                {currentUser ? currentUser.name : 'Mi Perfil de Operario'}
              </h2>
              {currentUser && (
                <ShieldCheck className="w-4 h-4 text-emerald-600" title="Cuenta vinculada con Google" />
              )}
            </div>
            <p className="text-xs text-slate-500">
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

        {/* Footer */}
        <div className="pt-2 flex items-center justify-between border-t border-slate-100">
          <div>
            {currentUser && (
              <button
                onClick={() => {
                  onLogout?.();
                  onClose();
                }}
                className="flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 font-semibold"
              >
                <LogOut className="w-3.5 h-3.5" />
                Cerrar sesión
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cerrar
            </button>
            <button
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
