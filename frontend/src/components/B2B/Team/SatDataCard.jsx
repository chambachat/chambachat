import React from 'react';
import { ShieldCheck, QrCode, ExternalLink, CheckCircle2, Sparkles, Info } from 'lucide-react';

export default function SatDataCard({ satData }) {
  if (!satData) return null;
  const is32D = satData.tipo_documento === 'opinion_32d';

  return (
    <div className="p-4 bg-gradient-to-br from-emerald-50/90 via-white to-emerald-50/50 border border-emerald-300 rounded-2xl space-y-2.5 shadow-xs animate-fadeIn mt-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-emerald-600 text-white rounded-xl shadow-xs">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-slate-900">
                {is32D ? 'Opinión 32-D Validada ante el SAT' : 'Validado Oficialmente ante el SAT'}
              </span>
              {satData.qr_detectado && (
                <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                  <QrCode className="w-2.5 h-2.5" /> QR Detectado
                </span>
              )}
            </div>
            <span className="text-[10px] text-emerald-700 font-medium block">
              {is32D 
                ? 'siat.sat.gob.mx • Cumplimiento de Obligaciones Fiscales' 
                : 'siat.sat.gob.mx • Cédula de Identificación Fiscal'}
            </span>
          </div>
        </div>

        <span className="px-2.5 py-0.5 bg-emerald-600 text-white text-[10px] font-black rounded-full uppercase tracking-wider">
          {is32D 
            ? (satData.sentido_opinion ? `OPINIÓN ${satData.sentido_opinion}` : 'POSITIVO') 
            : (satData.estatus_padron || 'ACTIVO')}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1.5 border-t border-emerald-100">
        <div>
          <span className="text-slate-400 font-bold block text-[9px] uppercase tracking-wider">RFC Oficial</span>
          <span className="font-mono font-bold text-slate-900">{satData.rfc || 'No detectado'}</span>
        </div>
        {satData.folio && (
          <div>
            <span className="text-slate-400 font-bold block text-[9px] uppercase tracking-wider">Folio Oficial SAT</span>
            <span className="font-mono font-bold text-slate-900">{satData.folio}</span>
          </div>
        )}
        {satData.idcif && (
          <div>
            <span className="text-slate-400 font-bold block text-[9px] uppercase tracking-wider">idCIF (Folio SAT)</span>
            <span className="font-mono font-bold text-slate-900">{satData.idcif}</span>
          </div>
        )}
        {satData.razon_social && (
          <div className="sm:col-span-2">
            <span className="text-slate-400 font-bold block text-[9px] uppercase tracking-wider">Razón Social / Denominación</span>
            <span className="font-bold text-slate-900 block">{satData.razon_social}</span>
            {satData.regimen_capital && (
              <span className="text-slate-500 text-[10px]">{satData.regimen_capital}</span>
            )}
          </div>
        )}
        {satData.direccion && (
          <div className="sm:col-span-2">
            <span className="text-slate-400 font-bold block text-[9px] uppercase tracking-wider">Domicilio Fiscal Registrado</span>
            <span className="font-medium text-slate-700 text-[11px] leading-snug">{satData.direccion}</span>
          </div>
        )}
        {is32D && !satData.direccion && (
          <div className="sm:col-span-2 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-amber-900">
              <Info className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Opinión 32-D: Domicilio requerido</span>
            </div>
            <p className="text-[10px] leading-relaxed text-amber-700">
              El SAT no imprime domicilio en la Opinión 32-D. RFC y Razón Social fueron extraídos exitosamente. Por favor ingresa la dirección de tu planta o empresa abajo (o sube tu Constancia de Situación Fiscal para autocompletarla).
            </p>
          </div>
        )}
      </div>

      <div className="pt-2 flex flex-wrap items-center justify-between gap-1 text-[10px] border-t border-emerald-100/70">
        {satData.sat_url ? (
          <a
            href={satData.sat_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1 hover:underline"
          >
            <ExternalLink className="w-3 h-3" />
            <span>Verificar en Validador Oficial del SAT</span>
          </a>
        ) : (
          <span className="text-emerald-700 font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>{is32D ? 'Opinión 32-D SAT Certificada' : 'Constancia Fiscal Certificada'}</span>
          </span>
        )}
        <span className="text-emerald-800 font-semibold flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-emerald-600" />
          <span>Datos fiscales autorrellenados automáticamente</span>
        </span>
      </div>
    </div>
  );
}
