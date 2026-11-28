import { useCoreData } from '../context/CoreDataContext';
import { registrationBatches } from '../utils/registrationBatches';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowUpRight, CheckCircle2, ChevronDown, Eye, EyeOff, Lock, UserCheck, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { BRAND_NAME, BRAND_YEAR } from '../constants/brand';
import { SEO } from '../components/SEO';
import { StaffPortalLayout } from '../components/StaffPortalLayout';

export const CRLogin: React.FC = () => {
  const navigate = useNavigate();
  const { siteSettings, loading: settingsLoading } = useCoreData();
  const batches = registrationBatches(siteSettings);
  const [selectedBatch, setSelectedBatch] = useState<string>('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const loadingBatches = settingsLoading && !siteSettings;

  useEffect(() => {
    if (selectedBatch && !batches.includes(selectedBatch)) setSelectedBatch('');
  }, [selectedBatch, batches]);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) return;
    setError('');
    if (!selectedBatch || !password) {
      setError(!selectedBatch ? 'Please select your academic batch.' : 'Please enter your batch PIN or password.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/cr-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batch: selectedBatch, password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Sign-in failed. Check your batch PIN or password.');
      const { error: authError } = await supabase.auth.verifyOtp({ token_hash: result.token_hash, type: result.type || 'magiclink' });
      if (authError) throw authError;
      const session = {
        batch: selectedBatch,
        authenticated: true,
        expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
      };
      sessionStorage.setItem('cr_session', JSON.stringify(session));
      toast.success(`Welcome, CR for ${selectedBatch}!`);
      navigate('/cr/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <StaffPortalLayout
      title="CR Portal"
      eyebrow="Batch verification"
      description="Choose your batch and verify student registrations."
      icon={UserCheck}
      storyTitle={<>Your batch.<br /><em>Verified cleanly.</em></>}
      storyDescription="Review incoming student signups, confirm batch identities and keep festival passes moving."
      features={[
        { icon: Users, label: 'Batch directory' },
        { icon: CheckCircle2, label: 'Instant approvals' },
        { icon: Lock, label: 'Batch-scoped access' },
      ]}
      footerLabel="Class Representative portal"
    >
      <SEO
        title="CR Portal Login"
        description={`Class Representative batch verification access for ${BRAND_NAME} ${BRAND_YEAR}.`}
        canonical="https://ricorrenza.fun/cr/login"
      />
      <form onSubmit={handleLogin} className="staff-login-form" aria-busy={loading}>
        {error && (
          <div className="staff-login-message" role="alert">
            <AlertCircle size={17} aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <div className="staff-login-field">
          <label htmlFor="cr-login-batch">Select batch</label>
          <div className="staff-portal-select">
            <select
              id="cr-login-batch"
              name="batch"
              required
              disabled={loading || loadingBatches || !batches.length}
              value={selectedBatch}
              onChange={event => {
                setSelectedBatch(event.target.value);
                setPassword('');
                setError('');
              }}
              aria-describedby={!batches.length ? 'cr-batch-status' : undefined}
            >
              <option value="">{loadingBatches ? 'Loading batches…' : 'Choose your batch'}</option>
              {batches.map(batch => (
                <option key={batch} value={batch}>
                  {batch}
                </option>
              ))}
            </select>
            <ChevronDown size={17} aria-hidden="true" />
          </div>
          {!batches.length && (
            <p id="cr-batch-status" className="staff-portal-field-help" role="status">
              {loadingBatches
                ? 'Fetching available batches. Please wait.'
                : 'No registration batches are available right now. Contact your festival admin.'}
            </p>
          )}
        </div>

        <div className="staff-login-field">
          <label htmlFor="cr-login-password">Batch PIN / password</label>
          <div className="staff-login-password">
            <input
              id="cr-login-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              enterKeyHint="done"
              value={password}
              onChange={event => {
                setPassword(event.target.value);
                if (error) setError('');
              }}
              placeholder="Enter your batch PIN or password"
              required
              disabled={loading}
            />
            <button
              type="button"
              aria-label={showPassword ? 'Hide access code' : 'Show access code'}
              aria-pressed={showPassword}
              onClick={() => setShowPassword(value => !value)}
            >
              {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
            </button>
          </div>
        </div>

        <button
          className="staff-login-primary"
          type="submit"
          disabled={loading || loadingBatches || !selectedBatch || !password}
        >
          <UserCheck size={17} aria-hidden="true" />
          {loading ? 'Signing in…' : 'Access dashboard'}
          {!loading && <ArrowUpRight size={17} aria-hidden="true" />}
        </button>

        <span className="staff-login-sr-only" role="status">
          {loading ? 'Verifying your Class Representative session' : ''}
        </span>
      </form>

      <div className="staff-portal-notice">
        <Lock size={16} aria-hidden="true" />
        <p>
          For authorised Class Representatives. No email required.
          <br />
          <span>Choose the same batch as student registration. Need your PIN? Contact your festival admin.</span>
        </p>
      </div>
    </StaffPortalLayout>
  );
};
