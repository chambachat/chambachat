import React, { useState, useEffect } from 'react';
import { 
  X, 
  ShieldCheck, 
  User, 
  Phone, 
  Mail, 
  ArrowRight, 
  Lock, 
  CheckCircle2, 
  Building2,
  Briefcase,
  KeyRound, 
  RefreshCw 
} from 'lucide-react';
import { authenticateUser, sendVerificationCode } from '../../services/supabaseClient';

export default function AuthModal({ 
  isOpen, 
  onClose, 
  onAuthenticated, 
  promptMessage,
  promptTitle,
  initialRole = 'candidate'
}) {
  // Lado de la plataforma (Multi-Sided Platform): 'candidate' (Operario) | 'recruiter' (Empresa)
  const [role, setRole] = useState(initialRole);

  const [activeTab, setActiveTab] = useState('google'); // 'google' | 'email'
  const [emailMode, setEmailMode] = useState('register'); // 'register' | 'login'
  const [step, setStep] = useState('form'); // 'form' | 'verify'

  // Form states - Limpios por defecto para cada usuario
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  
  // Verification code states
  const [verificationCode, setVerificationCode] = useState('');
  const [enteredCode, setEnteredCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [codeSuccessMsg, setCodeSuccessMsg] = useState('');
  const [isRealEmailSent, setIsRealEmailSent] = useState(false);

  const [loading, setLoading] = useState(false);

  // Inicializar estados al abrir
  useEffect(() => {
    if (isOpen) {
      setStep('form');
      setCodeError('');
      setCodeSuccessMsg('');
      setEnteredCode('');
      setIsRealEmailSent(false);

      if (promptTitle?.toLowerCase().includes('empresa') || initialRole === 'recruiter') {
        setRole('recruiter');
      } else {
        setRole('candidate');
      }
    }
  }, [isOpen, promptTitle, initialRole]);

  if (!isOpen) return null;

  // Manejo de acceso con Google
  const handleGoogleAuth = async (e) => {
    e?.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setCodeError('Por favor ingresa tu correo de Google o Gmail.');
      return;
    }
    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setCodeError('Ingresa un correo electrónico válido.');
      return;
    }

    const finalName = name.trim() || cleanEmail.split('@')[0].replace('.', ' ');

    setLoading(true);
    setCodeError('');
    try {
      const user = await authenticateUser({
        name: finalName,
        email: cleanEmail,
        phone: phone.trim(),
        role: role,
        company_name: null,
        provider: 'google'
      });
      onAuthenticated(user);
      onClose();
    } catch (err) {
      console.error('Error logging in with Google:', err);
      setCodeError('No se pudo autenticar con Google. Verifica tus datos.');
    } finally {
      setLoading(false);
    }
  };

  // Enviar código de confirmación al correo
  const handleSendEmailVerification = async (e) => {
    e?.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !name.trim()) {
      setCodeError('Por favor completa tu nombre y correo electrónico.');
      return;
    }
    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setCodeError('Ingresa un correo electrónico válido.');
      return;
    }

    setLoading(true);
    setCodeError('');
    try {
      const res = await sendVerificationCode(cleanEmail);
      const code = res?.code || `${Math.floor(1000 + Math.random() * 9000)}`;
      setVerificationCode(code);
      setIsRealEmailSent(Boolean(res?.real_email_sent));
      setStep('verify');
      setCodeSuccessMsg(res?.message || `Código generado para ${cleanEmail}`);
    } catch (err) {
      console.error('Error al enviar código:', err);
      const fallbackCode = `${Math.floor(1000 + Math.random() * 9000)}`;
      setVerificationCode(fallbackCode);
      setIsRealEmailSent(false);
      setStep('verify');
    } finally {
      setLoading(false);
    }
  };

  // Reenviar código de confirmación
  const handleResendCode = async () => {
    setLoading(true);
    setCodeError('');
    try {
      const res = await sendVerificationCode(email);
      const newCode = res?.code || `${Math.floor(1000 + Math.random() * 9000)}`;
      setVerificationCode(newCode);
      setIsRealEmailSent(Boolean(res?.real_email_sent));
      setCodeSuccessMsg(res?.message || '¡Nuevo código enviado!');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Validar código y activar cuenta
  const handleConfirmVerification = async (e) => {
    e?.preventDefault();
    const cleanEntered = enteredCode.trim();
    const cleanTarget = (verificationCode || '').trim();

    if (!cleanEntered) {
      setCodeError('Por favor ingresa el código de 4 dígitos.');
      return;
    }

    // Validación estricta: debe coincidir exactamente con el código enviado al correo
    if (cleanEntered !== cleanTarget) {
      setCodeError('El código ingresado no coincide con el enviado a tu correo.');
      return;
    }

    setLoading(true);
    try {
      const derivedName = name.trim() || email.trim().split('@')[0].replace('.', ' ');
      const user = await authenticateUser({
        name: derivedName,
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        role: role,
        company_name: null,
        provider: 'email'
      });
      onAuthenticated(user);
      onClose();
    } catch (err) {
      console.error('Error confirmando cuenta:', err);
      setCodeError('Ocurrió un error al activar tu cuenta. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  // Iniciar sesión con correo existente
  const handleEmailLogin = async (e) => {
    e?.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setCodeError('Ingresa tu correo electrónico.');
      return;
    }
    setLoading(true);
    try {
      const derivedName = name.trim() || cleanEmail.split('@')[0].replace('.', ' ');
      const user = await authenticateUser({
        name: derivedName,
        email: cleanEmail,
        phone: phone.trim(),
        role: role,
        company_name: null,
        provider: 'email'
      });
      onAuthenticated(user);
      onClose();
    } catch (err) {
      console.error('Error logging in:', err);
      setCodeError('Error al iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-4 relative animate-fadeIn max-h-[90vh] overflow-y-auto">
        {/* Botón cerrar */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Mensaje contextual si fue disparado por acción restringida */}
        {promptMessage && (
          <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900">
            <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block text-amber-950">
                {promptTitle || 'Acceso Restringido'}
              </span>
              <span className="text-[11px] text-amber-800 leading-snug block">
                {promptMessage}
              </span>
            </div>
          </div>
        )}

        {/* Encabezado */}
        <div className="text-center space-y-1 pt-1">
          <div className="flex justify-center mb-1">
            <img 
              src="/chambot.png" 
              alt="Chambot" 
              className="w-14 h-14 object-contain drop-shadow-sm rounded-2xl" 
            />
          </div>
          <h2 className="text-lg font-black text-slate-900">
            {step === 'verify' ? 'Confirma tu Correo' : 'Conecta tu Cuenta en ChambaChat'}
          </h2>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            {step === 'verify' 
              ? 'Ingresa el código que te enviamos para activar tu cuenta.' 
              : 'Plataforma industrial para candidatos operativos y reclutadores de Nuevo León.'}
          </p>
        </div>

        {step === 'form' && (
          <>
            {/* SELECTOR MULTI-SIDE: Candidato vs Empresa */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Selecciona tu rol en la plataforma:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setRole('candidate');
                    setCodeError('');
                  }}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition text-left text-xs ${
                    role === 'candidate'
                      ? 'bg-emerald-50/80 border-emerald-500 text-emerald-950 ring-2 ring-emerald-500/20'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold mb-0.5">
                    <User className="w-4 h-4 text-emerald-600" />
                    <span>Soy Candidato</span>
                  </div>
                  <span className="text-[10px] text-slate-500 text-center leading-tight">
                    Busco empleo operativo
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRole('recruiter');
                    setCodeError('');
                  }}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition text-left text-xs ${
                    role === 'recruiter'
                      ? 'bg-blue-50/80 border-blue-500 text-blue-950 ring-2 ring-blue-500/20'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold mb-0.5">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    <span>Soy Empresa</span>
                  </div>
                  <span className="text-[10px] text-slate-500 text-center leading-tight">
                    Reclutador / Publico vacantes
                  </span>
                </button>
              </div>
            </div>

            {/* SELECCIÓN DE PLANTA/EMPRESA SI ES RECLUTADOR */}
            {/* AVISO RECLUTADOR: La empresa se da de alta después con CSF */}
            {role === 'recruiter' && (
              <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-2xl space-y-1">
                <div className="flex items-center gap-1.5 text-blue-900 font-bold text-xs">
                  <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Acceso Corporativo / Reclutador</span>
                </div>
                <p className="text-[11px] text-blue-700 leading-relaxed">
                  Inicia sesión con tu correo o Google. Al ingresar al panel podrás dar de alta tu empresa subiendo la <strong>Constancia de Situación Fiscal (CSF del SAT)</strong> o aceptar invitaciones de tu equipo.
                </p>
              </div>
            )}

            {/* Selector de Pestañas: Google vs Correo */}
            <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('google');
                  setCodeError('');
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition ${
                  activeTab === 'google'
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"/>
                  <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                </svg>
                <span>Google</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('email');
                  setCodeError('');
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition ${
                  activeTab === 'email'
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Mail className="w-3.5 h-3.5 text-emerald-600" />
                <span>Correo Electrónico</span>
              </button>
            </div>
          </>
        )}

        {/* PESTAÑA 1: GOOGLE */}
        {activeTab === 'google' && step === 'form' && (
          <form onSubmit={handleGoogleAuth} className="space-y-3 pt-1">
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

            {codeError && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                ⚠️ {codeError}
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
                <path fill="#ffffff" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                <path fill="#ffffff" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
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
        )}

        {/* PESTAÑA 2: CORREO PERSONAL / EMPRESARIAL */}
        {activeTab === 'email' && step === 'form' && (
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-100">
              <span className="font-semibold text-slate-700">
                {emailMode === 'register' ? 'Crear cuenta nueva' : 'Acceder con mi cuenta'}
              </span>
              <button
                type="button"
                onClick={() => {
                  setEmailMode(emailMode === 'register' ? 'login' : 'register');
                  setCodeError('');
                }}
                className="text-emerald-600 hover:text-emerald-700 font-bold hover:underline text-[11px]"
              >
                {emailMode === 'register' ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
              </button>
            </div>

            <form 
              onSubmit={emailMode === 'register' ? handleSendEmailVerification : handleEmailLogin}
              className="space-y-3"
            >
              {emailMode === 'register' && (
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
              )}

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

              {codeError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                  ⚠️ {codeError}
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
                ) : emailMode === 'register' ? (
                  <>
                    <span>Continuar y Recibir Código</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <span>Iniciar Sesión</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* PASO 2: VERIFICACIÓN DE CÓDIGO */}
        {step === 'verify' && (
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
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-amber-900 text-xs font-bold">
                  <span className="text-base">⚠️</span>
                  <span>Servidor de correo SMTP en modo de prueba</span>
                </div>
                <div className="p-2 rounded-xl bg-white border border-amber-200 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[11px] text-slate-600 shrink-0">Código generado:</span>
                    <span className="font-mono font-black text-sm text-emerald-700 tracking-widest bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                      {verificationCode}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEnteredCode(verificationCode);
                      setCodeError('');
                    }}
                    className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-100/70 hover:bg-emerald-200 px-2 py-1 rounded-lg transition shrink-0"
                  >
                    Usar código
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleConfirmVerification} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 text-center">
                  Ingresa el código de 4 dígitos
                </label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="Ej. 1234"
                  value={enteredCode}
                  onChange={(e) => {
                    setEnteredCode(e.target.value);
                    setCodeError('');
                  }}
                  autoFocus
                  className="w-full text-center text-xl font-mono font-bold tracking-widest py-3 px-4 rounded-2xl bg-slate-50 border border-slate-300 focus:border-emerald-500 focus:bg-white focus:outline-none transition"
                />
              </div>

              {codeError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium text-center">
                  ⚠️ {codeError}
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
                  onClick={handleResendCode}
                  disabled={loading}
                  className="text-slate-500 hover:text-emerald-600 font-semibold flex items-center gap-1 transition"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Reenviar código</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStep('form');
                    setCodeError('');
                  }}
                  className="text-slate-400 hover:text-slate-600 font-medium transition"
                >
                  Cambiar correo
                </button>
              </div>
            </form>
          </div>
        )}

        <p className="text-[10px] text-center text-slate-400 pt-1">
          Plataforma segura para el ecosistema laboral e industrial de Nuevo León.
        </p>
      </div>
    </div>
  );
}
