import React, { useState } from 'react';
import { User, Mail, Lock, Phone, ArrowRight } from 'lucide-react';

export default function EmailRegisterForm({ onRegister, loading, role, error }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onRegister({ name, email, password, phone });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">
          Nombre Completo *
        </label>
        <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-slate-50 border border-slate-200 focus-within:border-emerald-500 focus-within:bg-white transition text-xs">
          <User className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder={role === 'recruiter' ? 'Ej. Lic. Laura Sánchez' : 'Ej. Juan Pérez'}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full bg-transparent focus:outline-none text-slate-800"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">
          {role === 'recruiter' ? 'Correo Empresarial o Personal *' : 'Correo Electrónico *'}
        </label>
        <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-slate-50 border border-slate-200 focus-within:border-emerald-500 focus-within:bg-white transition text-xs">
          <Mail className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="email"
            placeholder={role === 'recruiter' ? 'reclutamiento@planta.com' : 'tucorreo@ejemplo.com'}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full bg-transparent focus:outline-none text-slate-800"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">
          Contraseña *
        </label>
        <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-slate-50 border border-slate-200 focus-within:border-emerald-500 focus-within:bg-white transition text-xs">
          <Lock className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="password"
            placeholder="Mínimo 6 caracteres"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
        className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-white text-xs font-bold transition shadow-sm ${
          role === 'recruiter' 
            ? 'bg-blue-600 hover:bg-blue-700' 
            : 'bg-emerald-600 hover:bg-emerald-700'
        }`}
      >
        {loading ? (
          <span>Procesando...</span>
        ) : (
          <>
            <span>Continuar y Recibir Código</span>
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </form>
  );
}
