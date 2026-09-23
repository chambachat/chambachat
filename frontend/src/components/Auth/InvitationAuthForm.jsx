import React, { useState } from 'react';
import { Building2, User, Mail, ArrowRight, Lock } from 'lucide-react';

/**
 * Acceso guiado cuando el usuario llega desde un enlace de invitación:
 * el correo viene fijo por la invitación y solo pedimos el nombre.
 * No hay que elegir entre "crear cuenta" e "iniciar sesión": el código de correo cubre ambos casos.
 */
export default function InvitationAuthForm({ invitation, onSubmit, loading, error }) {
  const emailPrefix = invitation?.email?.split('@')[0] || '';
  const [name, setName] = useState(invitation?.nombre && invitation.nombre !== emailPrefix ? invitation.nombre : '');
  const roleLabel = invitation?.role === 'admin' ? 'Administrador de RH' : 'Reclutador';
  const inviter = invitation?.inviter_name || invitation?.inviter_email || 'quien te invitó';

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ name: name.trim(), email: invitation.email });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 pt-1">
      <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-2xl space-y-1.5">
        <div className="flex items-center gap-2 text-blue-900 font-bold text-xs">
          <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
          <span>{invitation.company?.nombre}</span>
        </div>
        <p className="text-[11px] text-blue-800 leading-relaxed">
          <strong>{inviter}</strong> te invitó a unirte como <strong>{roleLabel}</strong>
          {invitation.company?.municipio ? ` en ${invitation.company.municipio}` : ''}.
        </p>
        <p className="text-[11px] text-blue-700">
          {invitation.has_account
            ? 'Ya tienes cuenta en ChambaChat: te enviaremos un código a tu correo para confirmar y unirte.'
            : 'Crearemos tu cuenta de reclutador con este correo. Solo confirma con el código que te enviaremos.'}
        </p>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">Correo de la invitación</label>
        <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-slate-100 border border-slate-200 text-xs">
          <Mail className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="w-full text-slate-700 font-semibold truncate">{invitation.email}</span>
          <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        </div>
        <p className="text-[10px] text-slate-400 mt-1">
          Si este no es tu correo, pide a {inviter} que envíe la invitación a tu dirección.
        </p>
      </div>

      {!invitation.has_account && (
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Tu nombre completo *</label>
          <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-slate-50 border border-slate-200 focus-within:border-emerald-500 focus-within:bg-white transition text-xs">
            <User className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Ej. Lic. Laura Sánchez"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full bg-transparent focus:outline-none text-slate-800"
            />
          </div>
        </div>
      )}

      {error && (
        <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
          ⚠️ {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-bold transition shadow-sm"
      >
        {loading ? <span>Enviando código...</span> : (
          <>
            <span>Enviarme el código y unirme al equipo</span>
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </form>
  );
}
