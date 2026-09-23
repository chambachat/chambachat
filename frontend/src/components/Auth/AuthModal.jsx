import React, { useState, useEffect } from 'react';
import { X, Lock } from 'lucide-react';
import { verifyCode, sendVerificationCode } from '../../services/authService';
import RoleSelector from './RoleSelector';
import GoogleAuthPanel from './GoogleAuthPanel';
import EmailLoginForm from './EmailLoginForm';
import EmailRegisterForm from './EmailRegisterForm';
import VerifyCodeStep from './VerifyCodeStep';
import InvitationAuthForm from './InvitationAuthForm';
import AuthMethodTabs from './AuthMethodTabs';

export default function AuthModal({ 
  isOpen, 
  onClose, 
  onAuthenticated, 
  promptMessage,
  promptTitle,
  initialRole = 'candidate',
  invitation = null
}) {
  const [role, setRole] = useState(initialRole);
  const [activeTab, setActiveTab] = useState('google');
  const [emailMode, setEmailMode] = useState('register');
  const [step, setStep] = useState('form');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [pendingUser, setPendingUser] = useState(null);
  const [isRealEmailSent, setIsRealEmailSent] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStep('form');
      setError('');
      setPendingUser(null);
      if (invitation || promptTitle?.toLowerCase().includes('empresa') || initialRole === 'recruiter') {
        setRole('recruiter');
      } else {
        setRole('candidate');
      }
    }
  }, [isOpen, promptTitle, initialRole, invitation]);

  if (!isOpen) return null;

  const handleSendCodeRequest = async (email, userData) => {
    const cleanEmail = email.trim().toLowerCase();
    setLoading(true);
    setError('');
    try {
      const res = await sendVerificationCode(cleanEmail);
      setIsRealEmailSent(Boolean(res?.real_email_sent));
      if (!res?.real_email_sent) {
        setError(res?.message || 'No se pudo enviar el correo. Intenta más tarde.');
      }
      setPendingUser({ ...userData, email: cleanEmail });
      setStep('verify');
    } catch (err) {
      console.error('Error enviando código:', err);
      setError(err.message || 'No se pudo enviar el código. Intenta nuevamente.');
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
      setIsRealEmailSent(Boolean(res?.real_email_sent));
      if (!res?.real_email_sent) {
        setError(res?.message || 'No se pudo reenviar el correo.');
      }
    } catch (e) {
      console.error(e);
      setError(e.message || 'No se pudo reenviar el código.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (enteredCode) => {
    const cleanEntered = (enteredCode || '').trim();

    if (!/^\d{6}$/.test(cleanEntered)) {
      setError('Ingresa el código de 6 dígitos que recibiste por correo.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const { email, name, phone } = pendingUser;
      const data = await verifyCode(email, cleanEntered);

      const user = {
        ...data.user,
        name: name || data.user?.nombre || email.split('@')[0].replace('.', ' '),
        phone: phone || data.user?.telefono,
        role: role || data.user?.role,
        provider: 'email'
      };

      onAuthenticated(user);
      onClose();
    } catch (err) {
      console.error('Error confirmando cuenta:', err);
      setError(err.message || 'Ocurrió un error al activar tu cuenta. Intenta nuevamente.');
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
            {step === 'verify' ? 'Confirma tu Correo' : invitation ? `Únete al equipo de ${invitation.company?.nombre}` : 'Conecta tu Cuenta en ChambaChat'}
          </h2>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            {step === 'verify' 
              ? 'Ingresa el código que te enviamos para activar tu cuenta.'
              : invitation ? 'Confirma tu correo para aceptar la invitación.'
              : 'Plataforma industrial para candidatos operativos y reclutadores de Nuevo León.'}
          </p>
        </div>

        {step === 'form' && invitation && (
          <InvitationAuthForm
            invitation={invitation}
            loading={loading}
            error={error}
            onSubmit={({ name, email }) => handleSendCodeRequest(email, name ? { name } : {})}
          />
        )}

        {step === 'form' && !invitation && (
          <>
            <RoleSelector 
              role={role} 
              onSelectRole={(r) => { setRole(r); setError(''); }} 
            />

            <AuthMethodTabs activeTab={activeTab} onChange={(t) => { setActiveTab(t); setError(''); }} />

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
