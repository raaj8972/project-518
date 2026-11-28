import { useCallback, useEffect, useRef, useState } from 'react';
import { claimCollegeIdentity, getCollegeIdentity, type CollegeIdentity } from '../../services/studentTeams';
import { useDomainRealtime } from '../../hooks/useDomainRealtime';
import '../../styles/StudentTeams.css';

export default function CollegeIdentityCard({ userId, onSaved }: { userId: string; onSaved?: () => void; }) {
  const [identity, setIdentity] = useState<CollegeIdentity | null>(null);
  const [number, setNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const version = useRef(0);
  const saving = useRef(false);
  const dirty = useRef(false);
  const snapshot = useRef<string>();
  const load = useCallback(async () => {
    const request = ++version.current;
    try {
      const value = await getCollegeIdentity();
      if (request !== version.current) return;
      const nextSnapshot = JSON.stringify(value);
      if (!dirty.current || nextSnapshot !== snapshot.current) {
        setNumber(value?.iqmg_number || '');
        dirty.current = false;
      }
      snapshot.current = nextSnapshot;
      setIdentity(value);
      setError('');
    } catch {
      if (request === version.current) setError('College ID could not load. Refresh and try again.');
    } finally {
      if (request === version.current) setLoading(false);
    }
  }, [userId]);
  useEffect(() => {
    setLoading(true);
    void load();
    const onFocus = () => { if (!saving.current) void load(); };
    window.addEventListener('focus', onFocus);
    return () => { version.current += 1; window.removeEventListener('focus', onFocus); };
  }, [load]);
  useDomainRealtime(`college-identity-${userId}`, !!userId, ['student_iqmg_identities'], load);

  const save = async () => {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    setError('');
    const request = ++version.current;
    try {
      const value = await claimCollegeIdentity(number);
      if (request !== version.current) return;
      setIdentity(value);
      setNumber(value.iqmg_number || '');
      dirty.current = false;
      snapshot.current = JSON.stringify(value);
      onSaved?.();
    } catch (error: any) {
      if (request === version.current) setError(error.message || 'IQMG could not be saved');
    } finally { saving.current = false; setBusy(false); }
  };

  return <section className="st-identity">
    <h2>Your college IQMG number</h2>
    <p>Use the number printed on your college ID. One IQMG number belongs to one account. Admin verifies it against the college PDF roster.</p>
    {loading ? <p role="status">Loading college ID…</p> : <>
      <label>IQMG number<input value={number} onChange={event => { dirty.current = true; setNumber(event.target.value.toUpperCase()); }} disabled={busy || identity?.status === 'verified'} autoComplete="off" maxLength={50} placeholder="e.g. IQMG6738" />
      </label>
      <p className={`st-status${identity?.status === 'correction_required' ? ' st-correction' : ''}`}>
        {identity?.status === 'verified' ? 'Verified against the college roster' : identity?.status === 'pending' ? 'Saved · waiting for college roster verification' : identity?.status === 'correction_required' ? 'Correction required' : 'Not added yet'}
      </p>
      {identity?.note && <p>
        {identity.note}
      </p>}
      {identity?.status !== 'verified' && <button className="sd-button" type="button" disabled={busy || !number.trim()} onClick={() => void save()}>
        {busy ? 'Saving…' : 'Save IQMG number'}
      </button>}
      {identity?.note && identity?.status !== 'verified' && (
        <button
          className="sd-button sd-button-secondary"
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('rico-open-iqmg-popup', { detail: userId }))}
        >
          Open IQMG popup
        </button>
      )}
    </>}
    {error && <p role="alert">
      {error}
    </p>}
  </section>;
}
