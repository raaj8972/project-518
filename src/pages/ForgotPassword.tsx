import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Mail, Lock, Send, ShieldCheck, ArrowRight, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { FestivalAccessLayout } from '../components/FestivalAccessLayout';

type Step = 'email' | 'otp' | 'password' | 'success';
const ForgotPassword = () => {
  const location = useLocation();
  const recoveryQuery=new URLSearchParams(location.search);
  const handoff = (location.state || (recoveryQuery.get('email') ? { email:recoveryQuery.get('email'),codeSent:recoveryQuery.get('codeSent')==='1' } : null)) as { email?: string; codeSent?: boolean } | null;
  const [email, setEmail] = useState(handoff?.email || '');
  const [step, setStep] = useState<Step>(handoff?.codeSent && handoff.email ? 'otp' : 'email');
  const [code, setCode] = useState('');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [cooldown, setCooldown] = useState(step === 'otp' ? 60 : 0);
  useEffect(() => {
    if (!cooldown) return;
    const timer = window.setTimeout(() => setCooldown(value => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const request = async (endpoint: string, body: object) => {
    const response = await fetch(`/api/${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Unable to complete the request. Please try again.');
    return data;
  };
  const sendCode = async () => {
    if (loading || cooldown > 0) return;
    setLoading(true); setError(''); setNotice('');
    try {
      const result = await request('request-password-reset', { email: email.trim().toLowerCase() });
      setStep('otp'); setCode(''); setCooldown(60); setNotice(result.message);
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to send code.'); }
    finally { setLoading(false); }
  };
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) return;
    if (step === 'email') { await sendCode(); return; }
    setError(''); setNotice('');
    if (step === 'password' && password !== confirmPassword) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      if (step === 'otp') {
        const result = await request('verify-password-reset-otp', { email: email.trim().toLowerCase(), code });
        setToken(result.token); setCode(''); setStep('password');
      } else if (step === 'password') {
        const result=await request('confirm-password-reset', { token, newPassword: password });
        if(result.warning)setNotice(result.warning);
        setToken(''); setPassword(''); setConfirmPassword(''); setStep('success');
      }
    } catch (err) { setError(err instanceof Error ? err.message : 'Please try again.'); }
    finally { setLoading(false); }
  };
  const restart = () => { setStep('email'); setToken(''); setCode(''); setPassword(''); setConfirmPassword(''); setError(''); setNotice(''); };

  return (
    <FestivalAccessLayout title={step === 'success' ? 'Password updated.' : step === 'password' ? 'Set a new password.' : step === 'otp' ? 'Verify your email.' : 'Forgot password?'} eyebrow="RICORRENZA · ACCOUNT RECOVERY" description={step === 'success' ? 'You can now sign in with your new password.' : step === 'password' ? 'Email verified. Choose a new password for your account.' : step === 'otp' ? `Enter the 6-digit code sent to ${email}.` : 'We’ll email you a verification code to reset your password.'} sectionLabel={step === 'password' ? 'Create your new password' : 'Email verification'} accessLabel="Admin & owner" footerLabel="SECURE ACCOUNT RECOVERY" icon={step === 'success' ? CheckCircle2 : Mail}>
      {step === 'success' ? <>{notice && <p className="council-message" role="status">{notice}</p>}<Link className="council-submit recovery-sign-in" to="/login">Return to login<ArrowRight size={18} /></Link></> : (
        <form onSubmit={handleSubmit} className="council-form" aria-busy={loading}>
          {step === 'email' && <><div className="council-field-heading"><label htmlFor="recovery-email">Email address</label></div><div className="council-password"><Mail size={18} aria-hidden="true" /><input id="recovery-email" type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="Enter your admin email" required disabled={loading} /></div><p className="council-help">Use the email registered for your admin or owner account.</p></>}
          {step === 'otp' && <><div className="council-field-heading"><label htmlFor="recovery-code">Verification code</label><span>Valid for 10 minutes</span></div><div className="council-password"><ShieldCheck size={18} aria-hidden="true" /><input id="recovery-code" className="recovery-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" required disabled={loading} aria-describedby="recovery-code-help" /></div><p id="recovery-code-help" className="council-help">Check your inbox and spam folder. Only the latest code works.</p></>}
          {step === 'password' && <>{[{ id: 'recovery-password', label: 'New password', value: password, update: setPassword }, { id: 'recovery-confirm', label: 'Confirm password', value: confirmPassword, update: setConfirmPassword }].map(field => <div key={field.id} className="recovery-password-field"><div className="council-field-heading"><label htmlFor={field.id}>{field.label}</label></div><div className="council-password"><Lock size={18} aria-hidden="true" /><input id={field.id} type={showPassword ? 'text' : 'password'} autoComplete="new-password" minLength={8} value={field.value} onChange={event => field.update(event.target.value)} placeholder="At least 8 characters" required disabled={loading} /><button type="button" aria-label={showPassword ? 'Hide passwords' : 'Show passwords'} aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></div>)}</>}
          {notice && <p className="recovery-notice" role="status">{notice}</p>}
          {error && <p className="council-error" role="alert">{error}</p>}
          <button type="submit" className="council-submit" disabled={loading || (step === 'email' && (!email.trim() || cooldown > 0)) || (step === 'otp' && code.length !== 6) || (step === 'password' && (!password || !confirmPassword))}><span>{loading ? 'Please wait…' : step === 'email' ? (cooldown > 0 ? `Send code in ${cooldown}s` : 'Send verification code') : step === 'otp' ? 'Verify code' : 'Update password'}</span>{step === 'email' ? <Send size={18} /> : <ArrowRight size={18} />}</button>
          {step === 'otp' && <div className="recovery-actions"><button type="button" onClick={() => void sendCode()} disabled={loading || cooldown > 0}>{cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}</button><button type="button" onClick={restart} disabled={loading}>Change email</button></div>}
          {step === 'password' && <div className="recovery-actions"><button type="button" onClick={restart} disabled={loading}>Start again with a new code</button></div>}
          <span className="council-sr-only" role="status">{loading ? 'Processing your recovery request' : ''}</span>
        </form>
      )}
      <div className="council-access-note"><ShieldCheck size={20} /><p>Secure account recovery<span>Never share your verification code or password.</span></p></div>
    </FestivalAccessLayout>
  );
};
export default ForgotPassword;
