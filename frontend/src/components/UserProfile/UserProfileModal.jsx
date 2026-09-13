import React from 'react';
import { User, GraduationCap, MapPin, Phone, CheckCircle2, ArrowLeft, X, Award, Briefcase } from 'lucide-react';

export default function UserProfileModal({ isOpen, onClose, candidateProfile, onReturnToChat }) {
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
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 text-xl font-bold">
            👤
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900">
              Mi Perfil de Operario
            </h2>
            <p className="text-xs text-slate-500">
              Datos registrados a través de las conversaciones de Chambachat
            </p>
          </div>
        </div>

        {candidateProfile ? (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Nombre completo:</span>
                <span className="font-bold text-slate-900 text-sm">{candidateProfile.nombre}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Municipio de residencia:</span>
                <span className="font-bold text-slate-900">{candidateProfile.municipio}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Grado de estudios:</span>
                <span className="font-semibold text-slate-800">{candidateProfile.nivel_educativo?.replace('_', ' ')}</span>
              </div>
            </div>

            {/* Estatus INEA */}
            <div className={`p-4 rounded-2xl border ${
              candidateProfile.tag_inea 
                ? 'bg-purple-50 border-purple-200 text-purple-900' 
                : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                <GraduationCap className="w-4 h-4 text-purple-600" />
                <span className="text-xs font-bold uppercase tracking-wide">
                  Programa Educativo INEA
                </span>
              </div>
              {candidateProfile.tag_inea ? (
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
        ) : (
          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-2">
            <p className="text-xs text-slate-600 font-medium">
              Aún no has completado tu perfil conversacional.
            </p>
            <p className="text-[11px] text-slate-400">
              Platica con Chambachat en la pantalla principal para que guarde automáticamente tu municipio, nivel de estudios y vacantes afines.
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 flex justify-end gap-2">
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
  );
}
