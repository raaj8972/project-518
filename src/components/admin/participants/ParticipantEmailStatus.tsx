import { useState } from 'react';
import { EnvelopeClosedIcon, ReloadIcon } from '@radix-ui/react-icons';
import { supabase } from '../../../lib/supabase';

type ProviderStatus = { ready: boolean; status: string; message: string };
export function ParticipantEmailStatus() {
  const [status, setStatus] = useState<Record<'smtp' | 'resend', ProviderStatus> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const check = async () => {
    setBusy(true); setError('');
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session?.access_token) throw new Error('Sign in again to check provider settings.');
      const response = await fetch('/api/email-provider-status', { headers: { Authorization: `Bearer ${data.session.access_token}` } });
      const result = await response.json();
      if (!response.ok || !result.smtp || !result.resend) throw new Error(result.error || 'Provider status could not load.');
      setStatus(result);
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Provider status could not load.'); }
    finally { setBusy(false); }
  };
  return <section className="participants-provider-status" aria-label="Email provider connection checks"><div><strong><EnvelopeClosedIcon />Email provider connections</strong><p>Check SMTP authentication and the Resend sending domain before emailing participants.</p></div><button className="participants-button" disabled={busy} onClick={() => void check()}><ReloadIcon />{busy ? 'Checking providers…' : 'Check email providers'}</button>{error && <p role="alert">{error}</p>}{status && <div className="participants-provider-results">{(['smtp', 'resend'] as const).map(provider => <article key={provider} data-ready={status[provider].ready}><strong>{provider === 'smtp' ? 'SMTP' : 'Resend'}<span>{status[provider].ready ? 'Verified' : 'Needs attention'}</span></strong><p>{status[provider].message}</p></article>)}</div>}</section>;
}
