import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ArrowUpRight, BarChart3, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { FestivalAccessLayout } from '../components/FestivalAccessLayout';

export default function CouncilLogin() {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || isSubmitting) return;
    setError('');
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/verify-council', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: password })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Invalid passcode');
      }

      const data = await res.json();
      
      if (!data.success) {
        throw new Error('Authentication failed');
      }

      // Valid passcode, now set the session variable to the passcode directly
      // Since CouncilDashboard still reads the exact plaintext password to make DB calls
      sessionStorage.setItem('council_auth', password.trim());
      
      React.startTransition(() => {
        navigate('/council-dashboard');
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Access denied');
      setPassword('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FestivalAccessLayout title="Council dashboard." eyebrow="RICORRENZA · COUNCIL SUITE" description="Your festival. Your insights. One perspective." sectionLabel="Executive analytics portal" accessLabel="Council access" footerLabel="COUNCIL PORTAL" icon={BarChart3}>
            <form onSubmit={handleLogin} className="council-form" aria-busy={isSubmitting}>
              <div className="council-field-heading"><label htmlFor="council-access-code">PIN / password</label><span><Lock size={12} />Private access</span></div>
              <div className="council-password">
                <Lock size={18} aria-hidden="true" />
                <input id="council-access-code" name="password" type={showPassword ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your PIN or password" autoComplete="current-password" disabled={isSubmitting} aria-invalid={Boolean(error)} aria-describedby={error ? 'council-error council-code-help' : 'council-code-help'} />
                <button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Hide access code' : 'Show access code'} aria-pressed={showPassword}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
              </div>
              <p id="council-code-help" className="council-help">Use the PIN/password shared by your festival administrator. No email required.</p>
              {error && <p id="council-error" role="alert" className="council-error">{error}</p>}
              <button type="submit" disabled={isSubmitting || !password.trim()} className="council-submit"><span>{isSubmitting ? 'Verifying access…' : 'Access analytics'}</span><ArrowUpRight size={19} /></button>
              <span className="council-sr-only" role="status">{isSubmitting ? 'Authenticating your access code' : ''}</span>
            </form>
            <div className="council-access-note"><ShieldCheck size={20} /><p>Reserved for council members<span>Authorized access is required to view this portal.</span></p></div>
    </FestivalAccessLayout>
  );
}
