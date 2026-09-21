import React, { useState } from 'react';
import { CheckCircle2, Trash2, Clock, Copy, X } from 'lucide-react';
import { useToast } from '../../ui/Toast';

export default function MembersList({
  teamData,
  currentUser,
  onRemoveMember,
  originUrl = 'https://chambachat.onrender.com'
}) {
  const toast = useToast();
  const [copiedToken, setCopiedToken] = useState(false);

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2500);
    } catch (e) {}
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-black text-slate-900">Equipo de Reclutadores</h2>
            <p className="text-xs text-slate-500">Colegas con acceso a vacantes y atención de postulantes de esta empresa.</p>
          </div>
          <span className="text-xs font-bold text-slate-400">
            {teamData?.active_members?.length || 0} integrante{(teamData?.active_members?.length || 0) === 1 ? '' : 's'}
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {teamData?.active_members?.map((member) => (
            <div key={member.id} className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition">
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={`https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(member.nombre || member.email)}`}
                  alt={member.nombre}
                  className="w-10 h-10 rounded-2xl bg-slate-100 border border-slate-200 object-cover shrink-0"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                      {member.nombre || member.email.split('@')[0]}
                    </span>
                    {member.email === currentUser?.email && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-full">
                        Tú
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-500 block truncate">{member.email}</span>
                </div>
              </div>

              <div className="flex items-center gap-4 shrink-0">
                <div className="text-right hidden md:block">
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                    member.role === 'admin'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}>
                    {member.role === 'admin' ? 'Administrador RH' : 'Reclutador'}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Activo desde {member.joined_at ? new Date(member.joined_at).toLocaleDateString() : 'hoy'}
                  </span>
                </div>

                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Activo</span>
                </span>

                {member.email !== currentUser?.email && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (await toast.confirm(`¿Seguro que deseas remover a "${member.nombre || member.email}" del equipo?`)) {
                        onRemoveMember(member.id);
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    title="Remover miembro del equipo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {teamData?.pending_invitations && teamData.pending_invitations.length > 0 && (
        <div className="bg-amber-50/50 border border-amber-200 rounded-3xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wider">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>Invitaciones Enviadas Pendientes de Aceptar ({teamData.pending_invitations.length})</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {teamData.pending_invitations.map((inv) => (
              <div key={inv.id} className="bg-white border border-amber-200/80 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-xs">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900 truncate">{inv.nombre || inv.email}</span>
                    <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded">Pendiente</span>
                  </div>
                  <span className="text-[11px] text-slate-500 block truncate">{inv.email}</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                    Código: <strong>{inv.token}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => copyToClipboard(`${originUrl}/?invitacion=${inv.token}`)}
                    className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                    title="Copiar enlace de invitación"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (await toast.confirm(`¿Seguro que deseas remover a "${inv.email}" del equipo?`)) {
                        onRemoveMember(inv.id);
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    title="Revocar invitación"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          {copiedToken && (
            <p className="text-[11px] text-emerald-700 font-bold animate-fadeIn">
              ✅ ¡Enlace de invitación copiado al portapapeles!
            </p>
          )}
        </div>
      )}
    </div>
  );
}
