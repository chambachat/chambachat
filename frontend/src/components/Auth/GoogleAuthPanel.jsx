import React, { useEffect, useRef, useState } from 'react';
import { ShieldCheck, Mail } from 'lucide-react';
import { getAuthConfig } from '../../services/authService';

const GSI_SRC = 'https://accounts.google.com/gsi/client';

/** Espera a que el script de Google Identity Services esté disponible en window.google. */
function waitForGoogle(timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const tick = () => {
      if (window.google?.accounts?.id) return resolve(window.google.accounts.id);
      if (Date.now() - started > timeoutMs) return reject(new Error('No se pudo cargar Google Sign-In.'));
      setTimeout(tick, 100);
    };
    if (!document.querySelector(`script[src="${GSI_SRC}"]`)) {
      const s = document.createElement('script');
      s.src = GSI_SRC; s.async = true; s.defer = true;
      document.head.appendChild(s);
    }
    tick();
  });
}

/**
 * Acceso con Google real: el usuario solo elige su cuenta en la ventana de Google.
 * El backend verifica el token de Google y emite el JWT de ChambaChat.
 */
export default function GoogleAuthPanel({ onGoogleCredential, onUseEmail, loading, role, error }) {
  const buttonRef = useRef(null);
  const [status, setStatus] = useState('loading'); // loading | ready | disabled | failed
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cfg = await getAuthConfig();
        if (cancelled) return;
        if (!cfg?.google_client_id) { setStatus('disabled'); return; }
        const google = await waitForGoogle();
        if (cancelled) return;
        google.initialize({
          client_id: cfg.google_client_id,
          callback: (resp) => { if (resp?.credential) onGoogleCredential(resp.credential); },
          ux_mode: 'popup',
          auto_select: false,
        });
        if (buttonRef.current) {
          buttonRef.current.innerHTML = '';
          google.renderButton(buttonRef.current, {
            type: 'standard', theme: 'outline', size: 'large', shape: 'pill',
            text: 'continue_with', logo_alignment: 'left', locale: 'es',
            width: Math.min(buttonRef.current.offsetWidth || 360, 400),
          });
        }
        setStatus('ready');
      } catch (e) {
        if (!cancelled) { setStatus('failed'); setLocalError(e.message); }
      }
    })();
    return () => { cancelled = true; };
  }, [onGoogleCredential]);

  const shownError = error || localError;

  return (
    <div className="space-y-3 pt-1">
      <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-start gap-2 text-[11px] text-slate-600 leading-relaxed">
        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
        <span>
          Se abrirá la ventana de Google para que elijas tu cuenta. No necesitas escribir nada:
          tomamos tu nombre y correo directamente de Google.
          {role === 'recruiter' ? ' Entrarás como Empresa / Reclutador.' : ''}
        </span>
      </div>

      {status === 'disabled' ? (
        <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-2">
          <p>El acceso con Google aún no está habilitado en este servidor. Usa tu correo electrónico: te enviaremos un código de 6 dígitos.</p>
          <button type="button" onClick={onUseEmail} className="flex items-center gap-1.5 font-bold text-emerald-700 hover:underline">
            <Mail className="w-3.5 h-3.5" />
            <span>Continuar con correo electrónico</span>
          </button>
        </div>
      ) : (
        <div className="flex justify-center min-h-[44px]">
          {status === 'loading' && <span className="text-xs text-slate-400 self-center">Cargando Google...</span>}
          <div ref={buttonRef} className={`w-full flex justify-center ${loading ? 'opacity-50 pointer-events-none' : ''}`} />
        </div>
      )}

      {loading && <p className="text-xs text-center text-slate-500">Verificando tu cuenta de Google...</p>}

      {shownError && (
        <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
          ⚠️ {shownError}
        </div>
      )}
    </div>
  );
}
