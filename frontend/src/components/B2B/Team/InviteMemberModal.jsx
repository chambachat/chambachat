import React, { useState } from 'react';
import { X, UserPlus, Send } from 'lucide-react';
import InviteResultCard from './InviteResultCard';

export default function InviteMemberModal({
  isOpen,
  onClose,
  onInvite,
  inviting,
  inviteResult,
  selectedCompany
}) {
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState('recruiter');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onInvite({
      email: inviteEmail.trim(),
      nombre: inviteName.trim() || undefined,
      role: inviteRole
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-4 relative animate-fadeIn">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-200">
            <UserPlus className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900">Invitar Reclutador</h3>
            <p className="text-xs text-slate-500">Para colaborar en <strong>{selectedCompany?.nombre}</strong></p>
          </div>
        </div>

        {inviteResult ? (
          <InviteResultCard inviteResult={inviteResult} inviteEmail={inviteEmail} onClose={onClose} />
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5 pt-1">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Correo Electrónico del Reclutador *
              </label>
              <input
                type="email"
                required
                placeholder="ej. reclutamiento2@planta.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 focus:outline-none focus:border-emerald-500 text-xs text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nombre o Cargo (Opcional)
              </label>
              <input
                type="text"
                placeholder="ej. Lic. Alejandro Torres"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 focus:outline-none focus:border-emerald-500 text-xs text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Rol en el Equipo
              </label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 focus:outline-none focus:border-emerald-500 text-xs text-slate-800"
              >
                <option value="recruiter">Reclutador Industrial (Atender candidatos & vacantes)</option>
                <option value="admin">Administrador de RH (Control total de equipo y empresa)</option>
              </select>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={inviting || !inviteEmail.trim()}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-bold transition shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{inviting ? 'Enviando invitación por correo...' : 'Enviar Invitación por Correo'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
