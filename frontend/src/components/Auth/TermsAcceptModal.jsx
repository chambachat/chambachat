import React, { useState } from 'react';
import { ShieldCheck, ExternalLink } from 'lucide-react';

/**
 * Modal de aceptación de Términos y Condiciones.
 * Aparece al primer inicio de sesión (terminos_aceptados === false).
 * No se puede cerrar sin aceptar.
 */
export default function TermsAcceptModal({ onAccept, loading }) {
  const [checked, setChecked] = useState(false);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-fadeIn">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black">Bienvenido a ChambaChat</h2>
              <p className="text-xs text-emerald-100 mt-0.5">Antes de continuar, acepta nuestros términos</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-slate-600 leading-relaxed">
            Para usar ChambaChat necesitas aceptar nuestros <strong>Términos y Condiciones</strong> y 
            nuestro <strong>Aviso de Privacidad</strong>. Estos documentos describen:
          </p>

          <ul className="space-y-2 text-xs text-slate-500">
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 font-bold mt-0.5">✓</span>
              Cómo usamos y protegemos tu información personal
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 font-bold mt-0.5">✓</span>
              Reglas de uso de la plataforma y contenido
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 font-bold mt-0.5">✓</span>
              Tus derechos como usuario (ARCO y Ley Federal de Datos Personales)
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 font-bold mt-0.5">✓</span>
              Nuestra responsabilidad como intermediarios
            </li>
          </ul>

          <a
            href="/web/terminos"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-800 transition"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Leer Términos y Condiciones completos
          </a>

          {/* Checkbox */}
          <label className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-xs text-slate-700 leading-relaxed">
              He leído y acepto los <strong>Términos y Condiciones</strong> y el{' '}
              <strong>Aviso de Privacidad</strong> de ChambaChat.
            </span>
          </label>
        </div>

        {/* Footer */}
        <div className="px-6 pb-5">
          <button
            onClick={onAccept}
            disabled={!checked || loading}
            className={`w-full py-3 rounded-xl text-sm font-black transition ${
              checked && !loading
                ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-200'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Guardando...
              </span>
            ) : (
              'Aceptar y continuar'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
