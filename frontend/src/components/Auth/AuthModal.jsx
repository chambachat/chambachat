import React, { useState, useEffect } from 'react';
import { X, Lock, Mail } from 'lucide-react';
import { verifyCode, sendVerificationCode } from '../../services/authService';
import RoleSelector from './RoleSelector';
import GoogleAuthPanel from './GoogleAuthPanel';
import EmailLoginForm from './EmailLoginForm';
import EmailRegisterForm from './EmailRegisterForm';
import VerifyCodeStep from './VerifyCodeStep';

export default function AuthModal({ 
  isOpen, 
  onClose, 
  onAuthenticated, 
  promptMessage,
  promptTitle,
  initialRole = 'candidate'
}) {
  const [role, setRole] = useState(initialRole);
  const [activeTab, setActiveTab] = useState('google');
  const [emailMode, setEmailMode] = useState('register');
  const [step, setStep] = useState('form');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [pendingUser, setPendingUser] = useState(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [isRealEmailSent, setIsRealEmailSent] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStep('form');
      setError('');
      setPendingUser(null);
      if (promptTitle?.toLowerCase().includes('empresa') || initialRole === 'recruiter') {
        setRole('recruiter');
      } else {
        setRole('candidate');
      }
    }
  }, [isOpen, promptTitle, initialRole]);

  if (!isOpen) return null;

  const handleSendCodeRequest = async (email, userData) => {
    const cleanEmail = email.trim().toLowerCase();
    setLoading(true);
    setError('');
    try {
      const res = await sendVerificationCode(cleanEmail);
      const code = res?.code || `${Math.floor(1000 + Math.random() * 9000)}`;
      setVerificationCode(code);
      setIsRealEmailSent(Boolean(res?.real_email_sent));
      setPendingUser({ ...userData, email: cleanEmail });
      setStep('verify');
    } catch (err) {
      console.error('Error:', err);
      const fallbackCode = `${Math.floor(1000 + Math.random() * 9000)}`;
      setVerificationCode(fallbackCode);
      setIsRealEmailSent(false);
      setPendingUser({ ...userData, email: cleanEmail });
      setStep('verify');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async ({ name, email, phone }) => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setError('Ingresa un correo electrónico válido.');
      return;
    }
    const finalName = name.trim() || cleanEmail.split('@')[0].replace('.', ' ');
    await handleSendCodeRequest(cleanEmail, { name: finalName, phone });
  };

  const handleRegister = async ({ name, email, phone }) => {
    if (!email.trim() || !name.trim()) {
      setError('Por favor completa tu nombre y correo electrónico.');
      return;
    }
    await handleSendCodeRequest(email, { name: name.trim(), phone });
  };

  const handleLogin = async ({ email }) => {
    if (!email.trim()) {
      setError('Ingresa tu correo electrónico.');
      return;
    }
    await handleSendCodeRequest(email, {});
  };

  const handleResendCode = async () => {
    if (!pendingUser?.email) return;
    setLoading(true);
    setError('');
    try {
      const res = await sendVerificationCode(pendingUser.email);
      const newCode = res?.code || `${Math.floor(1000 + Math.random() * 9000)}`;
      setVerificationCode(newCode);
      setIsRealEmailSent(Boolean(res?.real_email_sent));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (enteredCode) => {
    const cleanEntered = enteredCode.trim();
    const cleanTarget = (verificationCode || '').trim();

    if (!cleanEntered) {
      setError('Por favor ingresa el código de 4 dígitos.');
      return;
    }

    if (cleanEntered !== cleanTarget) {
      setError('El código ingresado no coincide con el enviado a tu correo.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const { email, name, phone } = pendingUser;
      const derivedName = name || email.split('@')[0].replace('.', ' ');
      const data = await verifyCode(email, cleanEntered);
      
      const user = {
        ...data.user,
        name: derivedName || data.user?.name,
        phone: phone || data.user?.phone,
        role: role || data.user?.role,
        provider: 'email'
      };
      
      onAuthenticated(user);
      onClose();
    } catch (err) {
      console.error('Error confirmando cuenta:', err);
      setError('Ocurrió un error al activar tu cuenta. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-4 relative animate-fadeIn max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition z-10"
        >
          <X className="w-5 h-5" />
        </button>

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
            <RoleSelector 
              role={role} 
              onSelectRole={(r) => { setRole(r); setError(''); }} 
            />

            <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
              <button
                type="button"
                onClick={() => { setActiveTab('google'); setError(''); }}
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
                onClick={() => { setActiveTab('email'); setError(''); }}
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
            
            {activeTab === 'google' && (
              <GoogleAuthPanel 
                onGoogleAuth={handleGoogleAuth} 
                loading={loading} 
                role={role} 
                error={error} 
              />
            )}

            {activeTab === 'email' && (
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-100">
                  <span className="font-semibold text-slate-700">
                    {emailMode === 'register' ? 'Crear cuenta nueva' : 'Acceder con mi cuenta'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setEmailMode(emailMode === 'register' ? 'login' : 'register');
                      setError('');
                    }}
                    className="text-emerald-600 hover:text-emerald-700 font-bold hover:underline text-[11px]"
                  >
                    {emailMode === 'register' ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
                  </button>
                </div>
                {emailMode === 'register' ? (
                  <EmailRegisterForm 
                    onRegister={handleRegister} 
                    loading={loading} 
                    role={role} 
                    error={error} 
                  />
                ) : (
                  <EmailLoginForm 
                    onSendCode={handleLogin} 
                    loading={loading} 
                    role={role} 
                    error={error} 
                  />
                )}
              </div>
            )}
          </>
        )}

        {step === 'verify' && (
          <VerifyCodeStep
            email={pendingUser?.email}
            onVerify={handleVerify}
            onResend={handleResendCode}
            onChangeEmail={() => { setStep('form'); setError(''); }}
            loading={loading}
            isRealEmailSent={isRealEmailSent}
            verificationCode={verificationCode}
            role={role}
            error={error}
          />
        )}

        <p className="text-[10px] text-center text-slate-400 pt-1">
          Plataforma segura para el ecosistema laboral e industrial de Nuevo León.
        </p>
      </div>
    </div>
  );
}
