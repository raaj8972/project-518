import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, ArrowUpRight, BarChart3, Eye, EyeOff, Lock, Crown, HeartPulse, Layers, LogIn, RotateCcw, CalendarCheck, Shield, UserCheck, Users, X, Zap } from 'lucide-react';
import BrandLogo3D from '../components/BrandLogo3D';
import { SEO } from '../components/SEO';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { BRAND_NAME, BRAND_YEAR } from '../constants/brand';
import { isMasterOwner, MASTER_OWNER_EMAILS } from '../constants/owners';
import { AdminService, type AdminUser } from '../lib/adminService';
import '../styles/StaffLogin.css';

const owner: AdminUser = { user_id: 'system-owner', email: MASTER_OWNER_EMAILS[0], role: 'owner', created_at: '' };
const roles = [
  { label: 'Security Node', description: 'Scan & entry verification', icon: Shield, to: '/security-login' },
  { label: 'Coordinators', description: 'Event management', icon: Users, to: '/coordinator' },
  { label: 'CR Portal', description: 'Batch profile verification', icon: UserCheck, to: '/cr/login' },
  { label: 'Council', description: 'Analytics dashboard', icon: BarChart3, to: '/council' },
];

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, loginWithGoogle, isAuthenticated, loading: authLoading, lastAuthError, user, requiresMFA, completeMFA } = useAuth();
  const { homepageSettings } = useData();
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([owner]);
  const [email, setEmail] = useState('');
  const [step,setStep] = useState<'portals'|'admin-role'|'credentials'>('portals');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [requiresTOTP, setRequiresTOTP] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'owner' | 'admin'>('owner');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showRepairModal, setShowRepairModal] = useState(false);
  const [repairEmail, setRepairEmail] = useState('');
  const [repairLoading, setRepairLoading] = useState(false);
  const [repairMessage, setRepairMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const totpRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const isMasterActive = new URLSearchParams(window.location.search).get('mode') === 'master'
    && !!sessionStorage.getItem('rico_master_gate_access')?.startsWith('vault_v2_');
  const rawLogo = homepageSettings?.brand_logo_url?.trim();
  // A stable URL keeps typing and pointer movement from reloading the logo.
  const logo = rawLogo?.startsWith('//') ? `https:${rawLogo}` : rawLogo;

  useEffect(() => {
    if (step !== 'credentials') return;
    let active = true;
    void AdminService.getAllAdmins().then(admins => {
      if (!active) return;
      const unique = new Map([owner, ...admins].filter(admin => admin.email).map(admin => [admin.email.toLowerCase(), admin]));
      setAdminUsers([...unique.values()].sort((a, b) => Number(isMasterOwner(b.email)) - Number(isMasterOwner(a.email))));
    }).catch(() => { /* The owner entry and manual email entry remain available. */ });
    return () => { active = false; };
  }, [step]);

  useEffect(() => {
    if (!authLoading && isAuthenticated && ['admin', 'owner'].includes(user?.user_metadata?.role)) {
      navigate('/admin', { replace: true });
    }
  }, [authLoading, isAuthenticated, user, navigate]);

  useEffect(() => {
    if (requiresTOTP) totpRef.current?.focus({ preventScroll: true });
  }, [requiresTOTP]);

  useEffect(() => {
    if (showRepairModal) dialogRef.current?.showModal();
    else dialogRef.current?.close();
  }, [showRepairModal]);

  useEffect(() => {
    if (step === 'credentials' && !requiresTOTP) {
      (selectedRole === 'owner' ? passwordRef : emailRef).current?.focus({ preventScroll:true });
    }
  },[step,selectedRole,requiresTOTP]);

  useEffect(() => {
    if (isMasterActive) { setStep('credentials');setSelectedRole('owner');setEmail(owner.email); }
  },[isMasterActive]);

  useEffect(() => {
    sessionStorage.removeItem('rico_fast_track_creds');
    if (requiresMFA) { setRequiresTOTP(true); setStep('credentials'); }
  }, [requiresMFA]);

  async function authenticate(identity: string, accessKey: string, code?: string) {
    setError('');
    setIsLoading(true);
    try {
      const result = requiresMFA && completeMFA ? await completeMFA(code || '') : await login(identity, accessKey, code || undefined);
      if (result.success) {
        navigate('/admin');
      } else if (result.requiresTOTP) {
        setRequiresTOTP(true);
        if (result.error) setError(result.error);
      } else setError(result.error || 'Authentication failed. Please try again.');
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Check your connection.');
    } finally {
      setIsLoading(false);
    }
  }


  const openForm = (identity?: string) => {
    setEmail(identity || '');setPassword('');setTotpCode('');setRequiresTOTP(false);setError('');
    setSelectedRole(identity && isMasterOwner(identity) ? 'owner' : 'admin');
    setStep('credentials');
  };
  const resetIdentity = () => {
    setEmail('');
    setSelectedRole('admin');
    setRequiresTOTP(false);
    setTotpCode('');
    setPassword('');
    setError('');
  };
  const handleGoogle = async () => {
    setIsLoading(true);
    setError('');
    try {
      const result = await loginWithGoogle();
      if (result.success) navigate('/admin');
      else setError(result.error || 'Google sign-in failed. Please try again.');
    } catch { setError('Google sign-in failed. Please try again.'); }
    finally { setIsLoading(false); }
  };
  const handleRecovery = async (event: React.FormEvent) => {
    event.preventDefault();
    setRepairLoading(true);
    setRepairMessage(null);
    try {
      const response = await fetch('/api/request-password-reset', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: repairEmail.trim() }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not send recovery email');
      setRepairMessage({ type: 'success', text: result.message || 'Check your email for the 6-digit verification code.' });
    } catch (err: any) { setRepairMessage({ type: 'error', text: err.message }); }
    finally { setRepairLoading(false); }
  };

  const brandMark = (size: number) => logo
    ? <BrandLogo3D src={logo} size={size} glowStrength={0} animated={false} alt={`${BRAND_NAME} emblem`} />
    : <img src="/favicon.svg" width={size} height={size} alt={`${BRAND_NAME} emblem`} />;

  return (
    <div className="staff-login">
      <SEO title="Login" description={`Select your role to access ${BRAND_NAME} ${BRAND_YEAR} management.`} canonical="https://ricorrenza.fun/login" />
      <div className="staff-login-background" aria-hidden="true" />
      <div className="staff-login-layout">
        <aside className="staff-login-brand" aria-label="Festival management portal">
          <div className="staff-login-college">
            <span className="staff-login-college-mark" aria-hidden="true"><HeartPulse size={27} strokeWidth={1.4} /></span>
            <div className="staff-login-college-copy"><span className="staff-login-college-kicker">Our host institute</span><strong>IQ City</strong><span>Medical College Hospital</span><small>Durgapur, West Bengal</small></div>
          </div>
          <div className="staff-login-brand-content">
            <div className="staff-login-emblem">{brandMark(86)}</div>
            <h2>Ricorren<span>z</span>a</h2>
            <p className="staff-login-year"><span />{BRAND_YEAR}<span /></p>
            <p className="staff-login-brand-caption">The annual cultural fest</p>
          </div>
          <div className="staff-login-committee">
            <p>One festival. One connected team.</p>
            <div className="staff-login-capabilities">
              <span><Layers size={25} />Event<br />Management</span>
              <span><Users size={25} />Team &<br />Coordination</span>
              <span><CalendarCheck size={25} />Registrations<br />& Verification</span>
              <span><BarChart3 size={25} />Reports<br />& Analytics</span>
            </div>
          </div>
        </aside>
        <section className="staff-login-access" aria-labelledby="staff-login-heading">
          <div className="staff-login-card">
            <header className="staff-login-header">
              <p className="staff-login-portal-kicker"><span />{BRAND_NAME} · Management suite</p>
              <h1 id="staff-login-heading">{requiresTOTP ? 'One last step.' : step === 'portals' ? 'Welcome back.' : step === 'admin-role' ? 'Admin access.' : selectedRole === 'owner' ? 'Super Admin login.' : 'Admin login.'}</h1>
              <p className="staff-login-heading-intro">{requiresTOTP ? 'Confirm your identity to access your workspace.' : step === 'portals' ? 'Your festival. Your team. Your workspace.' : step === 'admin-role' ? 'Choose the type of admin account you use.' : 'Enter your email and password to continue.'}</p>
              {isMasterActive && <span className="staff-login-master"><Shield size={13} /> Master access</span>}
            </header>
            {step === 'portals' && <>
              <div className="staff-login-role-heading"><h2><Users size={17} />Choose your access</h2><span><Shield size={12} />Role-based access</span></div>
              <div className="staff-login-role-list is-expanded staff-login-entry-options" aria-label="Staff portals">
                <button type="button" className="staff-login-role staff-login-admin-entry" onClick={() => {setError('');setStep('admin-role');}}><Zap size={26} strokeWidth={1.4}/><strong>Admin</strong><span>Super Admin & team accounts</span><ArrowUpRight size={18}/></button>
                {roles.map(({label,description,icon:Icon,to})=><Link className="staff-login-role" to={to} key={to}><Icon size={26} strokeWidth={1.4}/><strong>{label}</strong><span>{description}</span></Link>)}
              </div>
              <p className="staff-login-step-help">Select a portal to continue to sign in.</p>
            </>}
            {step === 'admin-role' && <>
              <button type="button" className="staff-login-step-back" onClick={() => {resetIdentity();setStep('portals');}}><ArrowLeft size={15}/>All access options</button>
              <div className="staff-login-role-list is-expanded staff-login-admin-types" aria-label="Admin account types">
                <button type="button" className="staff-login-role" onClick={() => openForm(owner.email)}><Crown size={26} strokeWidth={1.4}/><strong>Super Admin</strong><span>Owner access</span></button>
                <button type="button" className="staff-login-role" onClick={() => openForm()}><Zap size={26} strokeWidth={1.4}/><strong>Admin</strong><span>Assigned management pages</span></button>
              </div>
              <p className="staff-login-step-help">Your account permissions are verified when you sign in.</p>
            </>}
            {step === 'credentials' && <>
            <button type="button" className="staff-login-step-back" disabled={isLoading} onClick={() => {resetIdentity();setStep('admin-role');}}><ArrowLeft size={15}/>Change account type</button>
            <div className="staff-login-form-content">
              {(error || lastAuthError) && <div className="staff-login-message" role="alert"><AlertCircle size={17} /><span>{error || lastAuthError}</span></div>}
              <form onSubmit={event => { event.preventDefault(); void authenticate(email, password, totpCode); }} className="staff-login-form">
                <p className="staff-login-form-intro">{requiresTOTP ? 'Enter the 6-digit code from your authenticator app.' : `Continue as ${selectedRole === 'owner' ? 'Super Admin' : 'Admin'}`}</p>
                <div className="staff-login-field">
                  <label htmlFor="staff-email">Email address</label>
                  <input id="staff-email" ref={emailRef} type="email" name="username" autoComplete="username" list="staff-identities" value={email} onChange={event => { setEmail(event.target.value); setSelectedRole(isMasterOwner(event.target.value) ? 'owner' : 'admin'); }} required disabled={isLoading || requiresTOTP} />
                  <datalist id="staff-identities">{adminUsers.map(admin => <option value={admin.email} key={admin.email} />)}</datalist>
                </div>
                <div className="staff-login-field">
                  <label htmlFor="staff-password">Access key</label>
                  <div className="staff-login-password">
                    <input id="staff-password" ref={passwordRef} type={showPassword ? 'text' : 'password'} name="password" autoComplete="current-password" placeholder="Enter your password" value={password} onChange={event => setPassword(event.target.value)} required disabled={isLoading || requiresTOTP} />
                    <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                  </div>
                </div>
                {requiresTOTP && <div className="staff-login-field">
                  <label htmlFor="staff-code">Authentication code</label>
                  <input id="staff-code" ref={totpRef} name="totp" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={totpCode} onChange={event => setTotpCode(event.target.value.replace(/\D/g, ''))} required placeholder="000000" />
                </div>}
                <button className="staff-login-primary" type="submit" disabled={isLoading || (!requiresMFA && (!email || !password)) || (requiresTOTP && totpCode.length !== 6)}><LogIn size={18} />{isLoading ? 'Authenticating…' : requiresTOTP ? 'Verify & continue' : 'Access portal'}{!isLoading && <ArrowUpRight size={17} />}</button>
                <span className="staff-login-sr-only" role="status">{isLoading ? 'Authentication in progress' : ''}</span>
              </form>
              {!requiresTOTP && <>
                <div className="staff-login-or"><span />Or<span /></div>
                <button className="staff-login-google" type="button" onClick={handleGoogle} disabled={isLoading}>
                  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
                  Continue with Google
                </button>
                <p className="staff-login-helper">Only owner-approved accounts can sign in.</p>
              </>}
              <div className="staff-login-help-links">
                <Link to="/forgot-password"><Lock size={15} />Forgot access key?</Link>
                <button type="button" onClick={resetIdentity} disabled={isLoading}><RotateCcw size={15} />Reset identity</button>
                <button type="button" onClick={() => { setRepairMessage(null); setShowRepairModal(true); }}><Shield size={15} />Account recovery</button>
              </div>
            </div>
            </>}
          </div>
          <p className="staff-login-copyright">© {BRAND_YEAR} {BRAND_NAME} Fest Committee</p>
        </section>
      </div>
      <dialog ref={dialogRef} className="staff-login-dialog" onCancel={() => setShowRepairModal(false)} onClose={() => setShowRepairModal(false)} aria-labelledby="staff-recovery-heading">
        <div className="staff-login-dialog-heading"><Shield size={20} /><h2 id="staff-recovery-heading">Account recovery</h2><button type="button" aria-label="Close account recovery" onClick={() => setShowRepairModal(false)}><X size={20} /></button></div>
        <p>We’ll send a 6-digit verification code to your email.</p>
        <form onSubmit={handleRecovery} className="staff-login-form">
          {repairMessage && <div className={`staff-login-message${repairMessage.type === 'success' ? ' is-success' : ''}`} role="status">{repairMessage.text}</div>}
          {repairMessage?.type === 'success' && <Link className="staff-login-primary" to="/forgot-password" state={{ email: repairEmail.trim().toLowerCase(), codeSent: true }}>Enter verification code<ArrowUpRight size={17} /></Link>}
          <div className="staff-login-field"><label htmlFor="staff-recovery-email">Email address</label><input id="staff-recovery-email" type="email" autoComplete="email" value={repairEmail} onChange={event => setRepairEmail(event.target.value)} required placeholder="you@example.com" /></div>
          <button type="submit" className="staff-login-primary" disabled={repairLoading || !repairEmail}>{repairLoading ? 'Sending…' : 'Send verification code'}<ArrowUpRight size={17} /></button>
        </form>
      </dialog>
    </div>
  );
};
