import React, { useState } from 'react';
import { User, Mail, Phone } from 'lucide-react';

export default function GoogleAuthPanel({ onGoogleAuth, loading, role, error }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onGoogleAuth({ name, email, phone });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 pt-1">
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">
          Tu Nombre Completo *
        </label>
        <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-slate-50 border border-slate-200 focus-within:border-emerald-500 focus-within:bg-white transition text-xs">
          <User className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder={role === 'recruiter' ? 'Ej. Lic. Laura Sánchez' : 'Ej. Juan Pérez Garza'}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full bg-transparent focus:outline-none text-slate-800"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">
          Tu Correo de Google / Gmail *
        </label>
        <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-slate-50 border border-slate-200 focus-within:border-emerald-500 focus-within:bg-white transition text-xs">
          <Mail className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="email"
            placeholder="tucorreo@gmail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full bg-transparent focus:outline-none text-slate-800"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">
          WhatsApp o Teléfono (Opcional)
        </label>
        <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-slate-50 border border-slate-200 focus-within:border-emerald-500 focus-within:bg-white transition text-xs">
          <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
          <input
            type="tel"
            placeholder="Ej. 81-1234-5678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full bg-transparent focus:outline-none text-slate-800"
          />
        </div>
      </div>

      {error && (
        <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
          ⚠️ {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className={`w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-2xl text-white text-xs font-bold transition shadow-sm ${
          role === 'recruiter' 
            ? 'bg-blue-600 hover:bg-blue-700' 
            : 'bg-emerald-600 hover:bg-emerald-700'
        }`}
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24">
          <path fill="#ffffff" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
          <path fill="#ffffff" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"/>
          <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
          <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
        </svg>
        <span>
          {loading 
            ? 'Accediendo...' 
            : role === 'recruiter' 
              ? 'Conectar como Empresa con Google' 
              : 'Conectar como Candidato con Google'}
        </span>
      </button>
    </form>
  );
}
