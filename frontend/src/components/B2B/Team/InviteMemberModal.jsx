import React, { useState } from 'react';
import { X, UserPlus, CheckCircle2, Send } from 'lucide-react';

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
  const [copiedToken, setCopiedToken] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onInvite({
      email: inviteEmail.trim(),
      nombre: inviteName.trim() || undefined,
      role: inviteRole
    });
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2500);
    } catch (e) {}
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
          <div className="space-y-4 pt-2">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>¡Invitación despachada!</span>
              </div>
              <p className="text-xs text-emerald-700">
                Se envió la notificación a <strong>{inviteEmail}</strong> con las instrucciones de acceso.
              </p>
              <div className="p-2.5 bg-white border border-emerald-200 rounded-xl space-y-1">
                <span className="text-[10px] text-slate-500 font-bold block">Enlace directo de invitación:</span>
                <div className="flex items-center justify-between gap-2 text-xs font-mono text-emerald-900 break-all">
                  <span className="truncate">{inviteResult.invite_url}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(inviteResult.invite_url)}
                    className="text-emerald-700 hover:text-emerald-800 bg-emerald-100 px-2 py-1 rounded-lg text-[10px] font-bold shrink-0"
                  >
                    {copiedToken ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition"
            >
              Listo
            </button>
          </div>
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
