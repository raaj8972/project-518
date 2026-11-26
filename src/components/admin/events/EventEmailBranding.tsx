import { useEffect, useState } from 'react';
import { ImageIcon, TrashIcon, UploadIcon } from '@radix-ui/react-icons';
import { supabase } from '../../../lib/supabase';
import { prepareBrandAsset } from '../../../utils/brandAsset';
import { EventAdminDialog } from './EventAdminDialog';

export function EventEmailBranding({ logo, year, onClose }: { logo?: string | null; year: string | number; onClose: () => void }) {
  const [stamp, setStamp] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [loadFailed, setLoadFailed] = useState(false);
  const [message, setMessage] = useState('');
  const load = async () => {
    setLoading(true); setError(''); setLoadFailed(false);
    try {
      const bucket = supabase.storage.from('pdf-watermarks');
      const { data, error: readError } = await bucket.list();
      if (readError) throw readError;
      const file = ['email_stamp.png', 'email_stamp.svg'].find(name => data?.some(item => item.name === name));
      if (file) { const result = await bucket.createSignedUrl(file, 3600); if (result.error) throw result.error; setStamp(result.data?.signedUrl || null); }
      else setStamp(null);
    } catch { setLoadFailed(true); setError('Email branding could not load. Try again before replacing the stamp.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  const upload = async (file?: File) => {
    if (!file || busy || loading) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const safe = await prepareBrandAsset(file);
      const bucket = supabase.storage.from('pdf-watermarks');
      const result = await bucket.upload('email_stamp.png', safe, { cacheControl: '0', upsert: true });
      if (result.error) throw result.error;
      const signed = await bucket.createSignedUrl('email_stamp.png', 3600);
      if (signed.error) throw signed.error;
      setStamp(signed.data?.signedUrl || null); setMessage('Email stamp updated. It will appear below the message beside the signature.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'The email stamp could not upload. The existing stamp is kept.'); }
    finally { setBusy(false); }
  };
  const remove = async () => {
    if (busy) return; setBusy(true); setError(''); setMessage('');
    try { const result = await supabase.storage.from('pdf-watermarks').remove(['email_stamp.png', 'email_stamp.svg']); if (result.error) throw result.error; setStamp(null); setMessage('Email-specific stamp removed. Emails use the shared stamp when one is configured.'); }
    catch { setError('The stamp could not be removed. Please try again.'); }
    finally { setBusy(false); }
  };
  return <EventAdminDialog title="Email branding" description="A clear festival header and a signature that never covers the message." onClose={onClose} busy={busy} footer={<><span>Changes apply to future event update emails.</span><button type="button" className="event-admin-button is-primary" disabled={busy} onClick={onClose}>Done</button></>}>
    <div className="event-admin-dialog__body">
      {error && <div className="event-admin-feedback is-error" role="alert">{error}{loading === false && <button type="button" onClick={() => void load()}>Retry</button>}</div>}{message && <p className="event-admin-feedback" role="status">{message}</p>}
      <div className="event-email-example" aria-label="Email branding layout"><header>{logo ? <img src={logo} alt="Current festival logo" /> : <span><ImageIcon /></span>}<div><strong>RICORRENZA {year}</strong><small>PARTICIPANT UPDATE</small></div></header><div><span>Event update</span><i /><i /><i /></div><footer><span>Best regards,<strong>The Ricorrenza team</strong></span>{stamp && <img src={stamp} alt="Email signature stamp" />}</footer></div>
      <section className="event-editor-group"><header><h3>Festival logo</h3><p>The logo is placed beside the festival name at the top of the email. Update the shared logo in Homepage → Logo &amp; year.</p></header></section>
      <section className="event-editor-group"><header><h3>Email signature stamp</h3><p>An optional PNG or SVG, up to 5 MB. The stamp sits in its own space below the message. A shared PDF stamp is used when no email-specific stamp is set.</p></header>{loading ? <p role="status">Loading email branding…</p> : <div className="event-email-branding-actions"><label className="event-admin-button is-secondary"><UploadIcon />{busy ? 'Updating…' : stamp ? 'Replace stamp' : 'Upload stamp'}<input type="file" accept="image/png,image/svg+xml" aria-label="Upload email stamp" disabled={busy || loadFailed} onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; void upload(file); }} /></label>{stamp && <button type="button" className="event-admin-button is-danger" disabled={busy} onClick={() => void remove()}><TrashIcon />Remove stamp</button>}</div>}</section>
    </div>
  </EventAdminDialog>;
}
