import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { CalendarIcon, CheckCircledIcon, DownloadIcon, ExternalLinkIcon, PinRightIcon, Share1Icon, UpdateIcon } from '@radix-ui/react-icons';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { entryPassFile } from '../../utils/entryPassActions';
import { downloadFile } from '../../utils/eventActions';
import { studentPassStatus } from '../../utils/studentDashboard';
import { eventDate } from '../../utils/eventPresentation';
import { BRAND_NAME, BRAND_YEAR } from '../../constants/brand';

export interface StudentEntryPass {
  id?: string;
  pass_token: string;
  pass_type: string;
  participant_name: string;
  created_at: string;
  valid_date?: string;
  venue?: string;
  event_name?: string;
  day_number?: number;
  is_used?: boolean;
  scanned_at?: string;
}

export default function EntryPass({ pass }: { pass: StudentEntryPass }) {
  const [gateStatus, setGateStatus] = useState('');
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  const status = studentPassStatus(pass);
  const save = async (share = false) => {
    setSaving(true);
    try {
      const file = await entryPassFile(pass);
      if (share && navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: 'My Ricorrenza pass' });
      else downloadFile(file, file.name);
    } catch (error) { if ((error as Error).name !== 'AbortError') toast.error('Could not save your pass. Please try again.'); }
    finally { setSaving(false); }
  };
  const checkGate = async () => {
    setChecking(true);
    try {
      const { data, error } = await supabase.from('entry_passes').select('is_active, is_used, scanned_at, valid_date').eq('pass_token', pass.pass_token).single();
      if (error) throw error;
      setGateStatus(!data.is_active ? 'Pass deactivated. Contact the help desk.' : data.valid_date && data.valid_date !== today ? `Valid on ${eventDate(data.valid_date)}` : data.is_used || data.scanned_at ? 'Already checked in' : 'Pass active and ready for check-in');
    } catch { setGateStatus('Could not check the current status. Please try again.'); }
    finally { setChecking(false); }
  };
  return <article className="sd-ticket">
    <div className="sd-ticket-brand">
      <span>
        {BRAND_NAME} <b>
          {BRAND_YEAR}
        </b>
      </span>
      <span>
        {pass.day_number ? `DAY ${pass.day_number}` : 'FESTIVAL PASS'}
      </span>
    </div>
    <div className="sd-ticket-person">
      <span className={`sd-status sd-status-${status.tone}`}>
        <CheckCircledIcon />
        {status.label}
      </span>
      <h2>
        {pass.participant_name}
      </h2>
      <p>
        {pass.event_name || (pass.pass_type || 'Festival entry').replace(/_/g, ' ')}
      </p>
    </div>
    <div className="sd-ticket-code">
      <div className="sd-qr-surface">
        <QRCodeSVG value={pass.pass_token} size={200} level="H" includeMargin title="Your festival entry QR code" />
      </div>
      <p>Show this QR code to the team at the gate.</p>
    </div>
    <dl className="sd-ticket-details">
      <div>
        <dt>
          <CalendarIcon /> Valid date</dt>
        <dd>
          {pass.valid_date ? eventDate(pass.valid_date) : 'See festival entry details'}
        </dd>
      </div>
      <div>
        <dt>
          <PinRightIcon /> Venue</dt>
        <dd>
          {pass.venue || 'IQ City Medical College'}
        </dd>
      </div>
    </dl>
    {gateStatus && <p role="status" className="sd-ticket-gate">
      {gateStatus}
    </p>}
    <div className="sd-ticket-actions">
      <button disabled={saving} onClick={() => void save()}>
        <DownloadIcon />
        {saving ? 'Saving…' : 'Save pass'}
      </button>
      <button disabled={checking} onClick={() => void checkGate()}>
        <UpdateIcon />
        {checking ? 'Checking…' : 'Gate status'}
      </button>
      <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pass.venue || 'IQ City Medical College')}`} target="_blank" rel="noopener noreferrer">
        <ExternalLinkIcon />Directions</a>
      <button disabled={saving} onClick={() => void save(true)}>
        <Share1Icon />Share</button>
    </div>
  </article>;
}
