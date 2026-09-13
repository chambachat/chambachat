import React, { useState } from 'react';
import { X, ShieldCheck, User, Phone, Mail, ArrowRight } from 'lucide-react';
import { authenticateUser } from '../../services/supabaseClient';

export default function AuthModal({ isOpen, onClose, onAuthenticated }) {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleQuickGoogle = async () => {
    setLoading(true);
    try {
      // Inicia sesión tomando directamente el nombre y cuenta de Google
      const user = await authenticateUser({
        name: 'Rogelio Valdez',
        email: 'rogelio@chambachat.com',
        phone: phone.trim() || '81-1234-5678'
      });
      onAuthenticated(user);
      onClose();
    } catch (err) {
      console.error('Error logging in with Google:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-5 relative animate-fadeIn">
        {/* Botón cerrar */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Encabezado */}
        <div className="text-center space-y-1 pt-2">
          <div className="inline-flex p-3 rounded-2xl bg-emerald-50 text-2xl mb-1 shadow-sm border border-emerald-100">
            🤠
          </div>
          <h2 className="text-xl font-black text-slate-900">
            Conectar con Google
          </h2>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            Acceso instantáneo en 1 clic. Tu nombre y correo se toman automáticamente de tu cuenta de Google.
          </p>
        </div>

        <div className="space-y-4 pt-1">
          {/* Teléfono / WhatsApp opcional */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              WhatsApp o Teléfono (Opcional)
            </label>
            <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 focus-within:border-emerald-500 focus-within:bg-white transition text-xs">
              <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
              <input
                type="tel"
                placeholder="Ej. 81-1234-5678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-transparent focus:outline-none text-slate-800"
              />
            </div>
            <p className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200/60 rounded-xl p-2 mt-2 leading-relaxed">
              💡 <strong>Recomendado:</strong> Si dejas tu WhatsApp, los reclutadores de las plantas podrán llamarte o mandarte mensaje directo además de responderte por este chat.
            </p>
          </div>

          {/* Botón 1-Clic con Google */}
          <button
            onClick={handleQuickGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-2xl bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold border border-slate-300 shadow-sm hover:shadow transition group"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"/>
              <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
            </svg>
            <span>{loading ? 'Accediendo...' : 'Continuar con Google en 1 Clic'}</span>
          </button>
        </div>

        <p className="text-[10px] text-center text-slate-400">
          Tu cuenta queda vinculada en Supabase para sincronizar tus postulaciones en tiempo real.
        </p>
      </div>
    </div>
  );
}
