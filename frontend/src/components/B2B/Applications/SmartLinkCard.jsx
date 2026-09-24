import React, { useState } from 'react';
import { CheckCircle2, Copy, ExternalLink, KeyRound } from 'lucide-react';
import { buildSmartLinkUrl } from '../../../services/smartLink';

/**
 * "Enlace Vivo" (Smart Link) de la planta activa: URL del chat enfocada en esa empresa.
 * Lleva la razón social (legible) y un código verificador único que evita confusiones
 * con empresas de nombre parecido.
 */
export default function SmartLinkCard({ company }) {
  const [copied, setCopied] = useState(false);
  if (!company) return null;

  const originUrl = typeof window !== 'undefined' ? window.location.origin : 'https://chambachat.onrender.com';
  const smartLinkUrl = buildSmartLinkUrl(originUrl, company);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(smartLinkUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error('Error al copiar enlace:', err);
    }
  };

  return (
    <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-white border border-emerald-200 rounded-3xl p-5 shadow-sm space-y-3">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-emerald-600 text-white text-xs">⚡</span>
            <h2 className="text-sm font-black text-slate-900">Smart Link de {company.nombre}</h2>
          </div>
          <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
            Comparte este enlace en Facebook, WhatsApp o volantes con QR. Quien lo abra entra al chat enfocado en las vacantes vigentes de esta planta.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 text-xs" title="Identifica exactamente a tu planta aunque otra empresa tenga un nombre parecido">
          <KeyRound className="w-4 h-4 text-emerald-600" />
          <span className="font-bold text-slate-700">Código verificador:</span>
          <span className="font-mono font-black tracking-widest text-emerald-800 bg-white border border-emerald-200 px-2.5 py-1 rounded-lg">
            {company.smart_code || '——————'}
          </span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
        <div className="flex-1 w-full bg-white border border-slate-200 rounded-2xl px-4 py-2 text-xs font-mono text-slate-600 truncate flex items-center gap-2 shadow-inner">
          <span className="text-emerald-600 font-bold">URL:</span>
          <span className="truncate">{smartLinkUrl}</span>
        </div>

        <button
          onClick={handleCopy}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm shrink-0"
        >
          {copied ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-white" />
              <span>¡Copiado al portapapeles!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span>Copiar Smart Link</span>
            </>
          )}
        </button>

        <a
          href={smartLinkUrl}
          target="_blank"
          rel="noreferrer"
          className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-bold transition shadow-sm shrink-0"
        >
          <span>Ver como candidato</span>
          <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
        </a>
      </div>
      <p className="text-[10px] text-slate-500">
        El código evita duplicidades: si dos empresas se llaman parecido, el chat abre exactamente la tuya. Los enlaces anteriores sin código siguen funcionando por nombre.
      </p>
    </div>
  );
}
