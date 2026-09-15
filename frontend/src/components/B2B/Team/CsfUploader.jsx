import React, { useRef } from 'react';
import { UploadCloud, FileCheck, CheckCircle2, X, AlertCircle, Loader2, ExternalLink } from 'lucide-react';
import SatDataCard from './SatDataCard';

export default function CsfUploader({
  onFileSelect,
  csfUploadedUrl,
  csfFileName,
  csfUploading,
  csfError,
  satValidated,
  onClear,
  satData,
  variant = 'onboarding' // 'onboarding' | 'modal'
}) {
  const fileInputRef = useRef(null);

  const isModal = variant === 'modal';

  return (
    <div className="space-y-2">
      {!isModal ? (
        <div className="flex items-center justify-between">
          <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
            1. Constancia de Situación Fiscal (SAT) *
          </label>
          <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
            PDF o Imagen
          </span>
        </div>
      ) : (
        <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
          Constancia de Situación Fiscal (SAT) *
        </label>
      )}

      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            onFileSelect(e.target.files[0]);
          }
        }}
        accept=".pdf,image/jpeg,image/png,image/jpg,image/webp"
        className="hidden"
      />

      {!csfUploadedUrl ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className={
            !isModal
              ? `border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition group ${
                  csfError 
                    ? 'border-rose-300 bg-rose-50/50 hover:bg-rose-50' 
                    : 'border-emerald-300 bg-emerald-50/30 hover:bg-emerald-50/70'
                }`
              : "border-2 border-dashed border-emerald-300 rounded-2xl p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-emerald-50/60 transition"
          }
        >
          {csfUploading ? (
            !isModal ? (
              <div className="flex flex-col items-center gap-2 py-3">
                <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
                <div className="text-center">
                  <span className="text-xs font-black text-slate-800 block">
                    Escaneando QR y Validando con el SAT en vivo...
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Consultando siat.sat.gob.mx y extrayendo datos fiscales oficiales
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 py-2 text-center">
                <Loader2 className="w-5 h-5 text-emerald-600 animate-spin" />
                <span className="text-xs font-bold text-slate-700">Validando QR con el SAT en vivo...</span>
              </div>
            )
          ) : (
            !isModal ? (
              <>
                <div className="p-3 bg-white text-emerald-600 rounded-2xl border border-emerald-200 group-hover:scale-110 transition-transform shadow-xs mb-2">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <span className="text-xs font-black text-slate-800 block">
                  Haz clic para subir tu Constancia de Situación Fiscal (CSF)
                </span>
                <span className="text-[11px] text-slate-500 mt-1 max-w-sm">
                  Sube el documento PDF o imagen emitido recientemente por el SAT (máximo 15 MB)
                </span>
              </>
            ) : (
              <>
                <UploadCloud className="w-6 h-6 text-emerald-600 mb-1" />
                <span className="text-xs font-bold text-slate-800">
                  Selecciona la Constancia Fiscal (PDF o Imagen)
                </span>
              </>
            )
          )}
        </div>
      ) : (
        <div className={`p-${!isModal ? '3.5' : '2.5'} bg-emerald-50 border border-emerald-200 rounded-${!isModal ? '2xl' : 'xl'} flex items-center justify-between gap-${!isModal ? '3' : '2'}`}>
          <div className="flex items-center gap-2.5 min-w-0">
            {!isModal ? (
              <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                <FileCheck className="w-5 h-5" />
              </div>
            ) : (
              <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            )}
            <div className="min-w-0">
              <span className="text-xs font-bold text-slate-900 block truncate">
                {csfFileName || 'Constancia_Situacion_Fiscal.pdf'}
              </span>
              <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>{satValidated ? 'Validado con el SAT exitosamente' : 'Archivo fiscal cargado correctamente'}</span>
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!isModal && (
              <a
                href={csfUploadedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-bold flex items-center gap-1"
                title="Ver documento cargado"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
            <button
              type="button"
              onClick={onClear}
              className={`p-${!isModal ? '1.5' : '1'} text-rose-500 hover:bg-rose-100 rounded-lg transition`}
              title="Eliminar y subir otro"
            >
              <X className={`w-${!isModal ? '4' : '3.5'} h-${!isModal ? '4' : '3.5'}`} />
            </button>
          </div>
        </div>
      )}

      <SatDataCard satData={satData} />

      {csfError && (
        !isModal ? (
          <p className="text-xs text-rose-600 font-semibold flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{csfError}</span>
          </p>
        ) : (
          <p className="text-xs text-rose-600 font-semibold mt-1">⚠️ {csfError}</p>
        )
      )}
    </div>
  );
}
