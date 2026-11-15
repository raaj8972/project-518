import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowUpRight, ChevronDown, Eye, EyeOff, Lock, ScanLine, Shield, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { BRAND_NAME, BRAND_YEAR } from '../constants/brand';
import { SEO } from '../components/SEO';
import { supabase } from '../lib/supabase';
import { StaffPortalLayout } from '../components/StaffPortalLayout';

interface SecurityUserOption { username: string; full_name: string }

export default function SecurityLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [availableUsers, setAvailableUsers] = useState<SecurityUserOption[]>([]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const { data, error: readError } = await supabase.rpc('get_public_security_users');
        if (!active || readError || !Array.isArray(data)) return;
        setAvailableUsers(data);
        if (data.length) setUsername(previous => previous || data[0].username);
      } catch { /* Manual username entry remains available if the directory is unavailable. */ }
    })();
    return () => { active = false; };
  }, []);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/security-login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to sign in. Check your name and PIN/password.');
      const { error: authError } = await supabase.auth.verifyOtp({ token_hash: data.token_hash, type: 'magiclink' });
      if (authError) throw authError;
      localStorage.setItem('security_user', JSON.stringify(data.user));
      toast.success(`Welcome, ${data.user.full_name}!`);
      navigate('/security-dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to sign in. Please try again.');
    } finally { setLoading(false); }
  };

  return <StaffPortalLayout
    title="Security Node" eyebrow="Entry management system" description="Sign in to your entry management workspace."
    icon={Shield} storyTitle={<>Every entry.<br /><em>Verified.</em></>}
    storyDescription="Keep the gates moving and the celebration going. Your entry management workspace starts here."
    features={[{ icon: ScanLine, label: 'Pass verification' }, { icon: Users, label: 'Entry management' }, { icon: Shield, label: 'Staff access' }]}
    footerLabel="Security staff portal"
  >
    <SEO title="Security Login" description={`Security staff access for ${BRAND_NAME} ${BRAND_YEAR}.`} canonical="https://ricorrenza.fun/security-login" />
          <form onSubmit={handleLogin} className="staff-login-form" aria-busy={loading}>
            {error && <div className="staff-login-message" role="alert"><AlertCircle size={17} /><span>{error}</span></div>}
            <div className="staff-login-field">
              <label htmlFor="security-username">Your name</label>
              {availableUsers.length ? <div className="staff-portal-select">
                <select id="security-username" name="username" autoComplete="username" required disabled={loading} value={username} onChange={event => setUsername(event.target.value)}>
                  {availableUsers.map(user => <option key={user.username} value={user.username}>{user.full_name}</option>)}
                </select><ChevronDown size={17} aria-hidden="true" />
              </div> : <input id="security-username" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} value={username} onChange={event => setUsername(event.target.value)} placeholder="Enter the name given by your admin" required disabled={loading} />}
            </div>
            <div className="staff-login-field">
              <label htmlFor="security-password">PIN / password</label>
              <div className="staff-login-password">
                <input id="security-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} placeholder="Enter your PIN or password" required disabled={loading} />
                <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
              </div>
            </div>
            <button className="staff-login-primary" type="submit" disabled={loading || !username || !password}><Shield size={17} />{loading ? 'Signing in…' : 'Access system'}{!loading && <ArrowUpRight size={17} />}</button>
            <span className="staff-login-sr-only" role="status">{loading ? 'Verifying your security account' : ''}</span>
          </form>
          <div className="staff-portal-notice"><Lock size={16} /><p>For authorised security personnel.<br /><span>Choose your name and enter your PIN/password. No email needed.</span></p></div>
  </StaffPortalLayout>;
}
