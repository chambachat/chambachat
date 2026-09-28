import React, { useState, useEffect } from 'react';
import { Camera, Mail, Phone, ShieldCheck, Loader2, CheckCircle2, AlertTriangle, Search } from 'lucide-react';
import { discoverClaimableVacancies, startVacancyClaim, verifyVacancyClaim } from '../../services/api';

const MATCH_ICONS = { telefono: Phone, email: Mail, whatsapp: Phone };
const MATCH_LABELS = { telefono: 'Teléfono', email: 'Email', whatsapp: 'WhatsApp' };

export default function ClaimVacancies() {
  const [vacancies, setVacancies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Verification flow state
  const [activeJobId, setActiveJobId] = useState(null);
  const [verifyStep, setVerifyStep] = useState('idle'); // idle | sending | code | verifying | success
  const [targetMasked, setTargetMasked] = useState('');
  const [code, setCode] = useState('');
  const [verifyError, setVerifyError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => { loadVacancies(); }, []);

  const loadVacancies = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await discoverClaimableVacancies();
      setVacancies(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStartClaim = async (jobId) => {
    setActiveJobId(jobId);
    setVerifyStep('sending');
    setVerifyError('');
    setCode('');
    try {
      const res = await startVacancyClaim(jobId, 'email');
      setTargetMasked(res.target_masked);
      setVerifyStep('code');
    } catch (err) {
      setVerifyError(err.message);
      setVerifyStep('idle');
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (code.length !== 6) return;
    setVerifyStep('verifying');
    setVerifyError('');
    try {
      const res = await verifyVacancyClaim(activeJobId, code);
      setVerifyStep('success');
      setSuccessMsg(res.message);
      // Remove from list
      setVacancies(prev => prev.filter(v => v.job_id !== activeJobId));
      setTimeout(() => {
        setVerifyStep('idle');
        setActiveJobId(null);
        setSuccessMsg('');
      }, 4000);
    } catch (err) {
      setVerifyError(err.message);
      setVerifyStep('code');
    }
  };

  const handleCancel = () => {
    setActiveJobId(null);
    setVerifyStep('idle');
    setCode('');
    setVerifyError('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        Buscando vacantes por reclamar...
      </div>
    );
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-amber-100 rounded-lg">
          <ShieldCheck className="w-6 h-6 text-amber-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Reclamar Vacantes</h2>
          <p className="text-xs text-slate-500">
            Vacantes publicadas por la comunidad que coinciden con tu empresa
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Success toast */}
      {verifyStep === 'success' && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg p-4 mb-4 flex items-center gap-3 animate-pulse">
          <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
          <div>
            <p className="font-bold">🎉 ¡Vacante reclamada!</p>
            <p className="text-sm">{successMsg}</p>
          </div>
        </div>
      )}

      {vacancies.length === 0 && !error ? (
        <div className="text-center py-16 text-slate-400">
          <Search className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No hay vacantes por reclamar</p>
          <p className="text-xs mt-1">
            Cuando alguien suba una foto con el teléfono o email de tu empresa, aparecerá aquí.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {vacancies.map((v) => {
            const MatchIcon = MATCH_ICONS[v.match_field] || Phone;
            const isActive = activeJobId === v.job_id;

            return (
              <div
                key={v.job_id}
                className={`border rounded-xl p-4 transition-all ${isActive ? 'border-amber-400 bg-amber-50/50 shadow-md' : 'border-slate-200 bg-white hover:border-slate-300'}`}
              >
                <div className="flex items-start gap-3">
                  {/* Photo thumbnail */}
                  {v.has_photo ? (
                    <img
                      src={`/api/v1/feed/${v.job_id}/photo`}
                      alt=""
                      className="w-16 h-16 rounded-lg object-cover bg-slate-100 shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                      <Camera className="w-6 h-6 text-slate-300" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900 truncate">{v.titulo}</h3>
                    <p className="text-xs text-slate-500">{v.empresa_nombre || 'Empresa'} · {v.municipio || 'N/A'}</p>

                    {/* Match badge */}
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-semibold">
                        <MatchIcon className="w-3 h-3" />
                        {MATCH_LABELS[v.match_field]}: {v.match_value_masked}
                      </span>
                    </div>
                  </div>

                  {/* Action button */}
                  {!isActive && (
                    <button
                      onClick={() => handleStartClaim(v.job_id)}
                      disabled={verifyStep === 'sending'}
                      className="shrink-0 px-3 py-2 bg-amber-500 text-white text-xs font-bold rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50"
                    >
                      Reclamar
                    </button>
                  )}
                </div>

                {/* Verification flow (inline) */}
                {isActive && verifyStep !== 'idle' && verifyStep !== 'success' && (
                  <div className="mt-4 pt-4 border-t border-amber-200">
                    {verifyStep === 'sending' && (
                      <div className="flex items-center gap-2 text-amber-700 text-sm">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Enviando código de verificación...
                      </div>
                    )}

                    {(verifyStep === 'code' || verifyStep === 'verifying') && (
                      <div>
                        <p className="text-sm text-slate-600 mb-3">
                          Enviamos un código de 6 dígitos a <strong>{targetMasked}</strong>
                        </p>
                        <form onSubmit={handleVerify} className="flex gap-2">
                          <input
                            type="text"
                            value={code}
                            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-center text-lg font-mono tracking-[0.3em] focus:ring-2 focus:ring-amber-400 focus:outline-none"
                            autoFocus
                            inputMode="numeric"
                            maxLength={6}
                          />
                          <button
                            type="submit"
                            disabled={code.length !== 6 || verifyStep === 'verifying'}
                            className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 disabled:opacity-40 transition-colors flex items-center gap-2"
                          >
                            {verifyStep === 'verifying' ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <ShieldCheck className="w-4 h-4" />
                            )}
                            Verificar
                          </button>
                        </form>
                        {verifyError && (
                          <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            {verifyError}
                          </p>
                        )}
                        <button
                          onClick={handleCancel}
                          className="text-xs text-slate-400 hover:text-slate-600 mt-2"
                        >
                          Cancelar
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
