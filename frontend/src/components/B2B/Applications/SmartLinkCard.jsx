import React, { useState, useEffect } from 'react';
import { CheckCircle2, Copy, ExternalLink } from 'lucide-react';
import { getUserCompanies } from '../../../services/api';

/**
 * "Enlace Vivo" (Smart Link) para campañas: URL del chat enfocada en una planta.
 * Las empresas disponibles salen de las membresías reales del usuario autenticado.
 */
export default function SmartLinkCard({ currentUser }) {
  const [companiesList, setCompaniesList] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(
    currentUser?.empresa_nombre || currentUser?.company_name || ''
  );
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (currentUser?.empresa_nombre || currentUser?.company_name) {
      setSelectedCompany(currentUser.empresa_nombre || currentUser.company_name);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser?.email) return;
    getUserCompanies()
      .then((data) => {
        const names = (Array.isArray(data) ? data : []).map(c => c.nombre);
        if (names.length > 0) {
          setCompaniesList(names);
          setSelectedCompany(prev => (prev && names.includes(prev)) ? prev : names[0]);
        }
      })
      .catch(err => console.error('Error cargando empresas:', err));
  }, [currentUser?.email]);

  const originUrl = typeof window !== 'undefined' ? window.location.origin : 'https://chambachat.onrender.com';
  const smartLinkUrl = `${originUrl}/?empresa=${encodeURIComponent(selectedCompany)}`;

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
            <h2 className="text-sm font-black text-slate-900">El Enlace Vivo (Smart Link) para Campañas</h2>
          </div>
          <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
            Sustituye flyers estáticos de Facebook y Canva. Comparte este enlace único con tus vacantes vigentes. Todo el tráfico de redes sociales entra al chat enfocado en tu planta.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <label className="text-xs font-bold text-slate-700">Empresa:</label>
          <select
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500 shadow-sm"
          >
            {companiesList.length === 0 && selectedCompany && (
              <option value={selectedCompany}>{selectedCompany}</option>
            )}
            {companiesList.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
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
          <span>Ver como Candidato</span>
          <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
        </a>
      </div>
    </div>
  );
}
