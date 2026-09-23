import React, { useState } from 'react';
import { CheckCircle2, AlertTriangle, Copy, MessageCircle } from 'lucide-react';

/** Resultado de una invitación: estado real del correo + enlace para compartir a mano. */
export default function InviteResultCard({ inviteResult, inviteEmail, onClose }) {
  const [copied, setCopied] = useState(false);
  const sent = Boolean(inviteResult?.email_sent);
  const inviteUrl = inviteResult?.invite_url || '';

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {}
  };

  const whatsappText = encodeURIComponent(
    `Hola, te invito a colaborar como reclutador en ChambaChat. Entra con este enlace: ${inviteUrl}`
  );

  return (
    <div className="space-y-4 pt-2">
      <div className={`p-4 rounded-2xl space-y-2 border ${sent ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
        <div className={`flex items-center gap-2 text-xs font-bold ${sent ? 'text-emerald-800' : 'text-amber-900'}`}>
          {sent
            ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            : <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />}
          <span>{sent ? '¡Invitación enviada por correo!' : 'Invitación registrada, pero el correo no se pudo enviar'}</span>
        </div>

        {sent ? (
          <p className="text-xs text-emerald-700">
            Se envió la notificación a <strong>{inviteEmail}</strong> con las instrucciones de acceso.
            Si no la ve en unos minutos, pídele revisar la carpeta de spam.
          </p>
        ) : (
          <div className="text-xs text-amber-800 space-y-1">
            <p>
              <strong>{inviteEmail}</strong> ya puede unirse con el enlace de abajo. Compártelo por WhatsApp o cópialo.
            </p>
            {inviteResult?.email_error && (
              <p className="text-[11px] text-amber-700/90 break-words">Motivo: {inviteResult.email_error}</p>
            )}
          </div>
        )}

        <div className="p-2.5 bg-white border border-slate-200 rounded-xl space-y-1">
          <span className="text-[10px] text-slate-500 font-bold block">Enlace directo de invitación:</span>
          <div className="flex items-center justify-between gap-2 text-xs font-mono text-slate-800 break-all">
            <span className="truncate">{inviteUrl}</span>
            <button
              type="button"
              onClick={copyToClipboard}
              className="flex items-center gap-1 text-emerald-700 hover:text-emerald-800 bg-emerald-100 px-2 py-1 rounded-lg text-[10px] font-bold shrink-0"
            >
              <Copy className="w-3 h-3" />
              <span>{copied ? 'Copiado' : 'Copiar'}</span>
            </button>
          </div>
        </div>

        <a
          href={`https://wa.me/?text=${whatsappText}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-[#25D366] hover:bg-[#1ebe5d] text-white text-xs font-bold transition"
        >
          <MessageCircle className="w-4 h-4" />
          <span>Compartir por WhatsApp</span>
        </a>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition"
      >
        Listo
      </button>
    </div>
  );
}
