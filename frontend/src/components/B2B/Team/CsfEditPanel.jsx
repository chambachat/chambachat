import React from 'react';
import { UploadCloud, ExternalLink, AlertTriangle } from 'lucide-react';

/** Bloque de la CSF en modo edición: ver archivo actual y reemplazarlo. */
export default function CsfEditPanel({ companyData, csfUploadedUrl, csfUploading, csfError, onFile }) {
  const hasNewFile = csfUploadedUrl && csfUploadedUrl !== companyData?.constancia_fiscal_url;
  // Si ya se subió un archivo nuevo, el enlace apunta a ese; si no, al guardado en la empresa.
  const viewUrl = hasNewFile ? csfUploadedUrl : companyData?.constancia_fiscal_url;
  return (
    <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-700">Constancia Fiscal (CSF)</span>
        {viewUrl ? (
          <a
            href={viewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-bold text-emerald-700 hover:underline flex items-center gap-1"
          >
            <span>{hasNewFile ? 'Ver archivo nuevo' : 'Ver archivo actual'}</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        ) : (
          <span className="text-[10px] text-amber-700 font-bold">Sin constancia</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="file"
          id="edit-csf-file"
          onChange={(e) => { if (e.target.files && e.target.files[0]) onFile(e.target.files[0]); }}
          accept=".pdf,image/jpeg,image/png,image/jpg,image/webp"
          className="hidden"
        />
        <label
          htmlFor="edit-csf-file"
          className="cursor-pointer text-[11px] font-bold px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 transition flex items-center gap-1.5"
        >
          <UploadCloud className="w-3.5 h-3.5 text-emerald-600" />
          <span>{csfUploading ? 'Subiendo...' : 'Actualizar / Reemplazar archivo fiscal'}</span>
        </label>
        {hasNewFile && <span className="text-[11px] text-emerald-600 font-bold">✅ Nuevo archivo cargado, guarda los cambios para aplicarlo</span>}
      </div>
      {csfError && (
        <p className="text-[11px] text-rose-600 font-bold flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>{csfError}</span>
        </p>
      )}
    </div>
  );
}
