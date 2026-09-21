import React, { useState } from 'react';
import { CheckCircle2, RefreshCw } from 'lucide-react';

export default function VerifyCodeStep({ email, onVerify, onResend, onChangeEmail, loading, isRealEmailSent, role, error }) {
  const [enteredCode, setEnteredCode] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onVerify(enteredCode);
  };

  return (
    <div className="space-y-4 pt-1">
      {isRealEmailSent ? (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-1.5">
          <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>¡Correo enviado a tu bandeja!</span>
          </div>
          <p className="text-[11px] text-emerald-700 leading-relaxed">
            Enviamos el código a <strong className="text-emerald-950">{email}</strong>. Revisa tu bandeja de entrada o spam.
          </p>
          <div className="pt-1.5 text-[10px] text-emerald-800/80 border-t border-emerald-200/60 leading-tight">
            💡 <strong>Nota para Hotmail / Outlook:</strong> Microsoft suele filtrar o demorar correos de dominios nuevos. Si no lo ves en tu bandeja principal, revisa en <strong>Correo no deseado (Spam)</strong> o en la pestaña <strong>'Otros'</strong>.
          </div>
        </div>
      ) : (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl space-y-1.5">
          <div className="flex items-center gap-2 text-amber-900 text-xs font-bold">
            <span className="text-base">⚠️</span>
            <span>No pudimos enviar el correo</span>
          </div>
          <p className="text-[11px] text-amber-800 leading-relaxed">
            El servidor de correo no está disponible en este momento. Intenta reenviar el código en unos minutos o contacta al administrador.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1 text-center">
            Ingresa el código de 6 dígitos
          </label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            placeholder="Ej. 123456"
            value={enteredCode}
            onChange={(e) => setEnteredCode(e.target.value.replace(/\D/g, ''))}
            autoFocus
            className="w-full text-center text-xl font-mono font-bold tracking-widest py-3 px-4 rounded-2xl bg-slate-50 border border-slate-300 focus:border-emerald-500 focus:bg-white focus:outline-none transition"
          />
        </div>

        {error && (
          <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium text-center">
            ⚠️ {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-white text-xs font-bold transition shadow-sm ${
            role === 'recruiter' 
              ? 'bg-blue-600 hover:bg-blue-700' 
              : 'bg-emerald-600 hover:bg-emerald-700'
          }`}
        >
          {loading ? 'Verificando...' : 'Confirmar Cuenta y Acceder'}
        </button>

        <div className="flex items-center justify-between pt-1 text-xs">
          <button
            type="button"
            onClick={onResend}
            disabled={loading}
            className="text-slate-500 hover:text-emerald-600 font-semibold flex items-center gap-1 transition"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Reenviar código</span>
          </button>
          <button
            type="button"
            onClick={onChangeEmail}
            className="text-slate-400 hover:text-slate-600 font-medium transition"
          >
            Cambiar correo
          </button>
        </div>
      </form>
    </div>
  );
}
