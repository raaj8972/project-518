import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { previewIQMGRoster, applyIQMGRoster, type RosterPreview } from '../../services/studentTeams';
import '../../styles/StudentTeams.css';
interface Draft {
  id: string;
  file_name: string;
  status: string;
  created_at: string;
}
export default function IQMGRosterManagement() {
  const { getValidToken } = useAuth();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [id, setId] = useState('');
  const [rows, setRows] = useState<RosterPreview[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const load = useCallback(async () => {
    const result = await supabase.from('iqmg_roster_imports').select('id,file_name,status,created_at').order('created_at', { ascending: false }).limit(30);
    if (result.error)
      throw result.error;
    setDrafts((result.data || []) as Draft[]);
  }, []);
  useEffect(() => {
    void load().catch(() => setError('Roster imports could not load.'));
  }, [load]);
  const review = async (value: string) => {
    if (!value) {
      setId('');
      setRows([]);
      setSelected(new Set());
      return;
    }
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const next = await previewIQMGRoster(value);
      setId(value);
      setRows(next);
      setSelected(new Set(next.filter(row => row.status === 'matched').map(row => row.row_index)));
    }
    catch (error: any) {
      setError(error.message || 'Could not preview this import');
    }
    finally {
      setBusy(false);
    }
  };
  const upload = async (file: File) => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      if (file.type !== 'application/pdf' || file.size > 4 * 1024 * 1024)
        throw new Error('Use a PDF up to 4 MB. Split or compress a larger roster first.');
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const token = await getValidToken();
      const response = await fetch('/api/ai-extract-iqmg-roster', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ mimeType: 'application/pdf', data: base64, fileName: file.name }) });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || 'PDF extraction failed');
      await load();
      await review(result.import_id);
      setMessage(`${result.rows_count} rows extracted. Compare them with the PDF before verifying.`);
    }
    catch (error: any) {
      setError(error.message || 'PDF could not be processed');
    }
    finally {
      setBusy(false);
    }
  };
  const apply = async () => {
    setBusy(true);
    setError('');
    try {
      const result = await applyIQMGRoster(id, [...selected]);
      setMessage(`${result.verified} college identities verified; ${result.corrected_claims} incorrect claims corrected. ${result.roster_rows} official roster rows saved.`);
      await load();
      await review(id);
      setMessage(`${result.verified} college identities verified; ${result.corrected_claims} incorrect claims corrected. Student profiles update automatically.`);
    }
    catch (error: any) {
      setError(error.message || 'Could not apply the roster');
    }
    finally {
      setBusy(false);
    }
  };
  return <div className="st-admin">
    <h2>College IQMG roster</h2>
    <p>Upload the official college PDF with student names and IQMG numbers. Google Gemini extracts a private draft. Review its rows against the PDF; only exact, unique matches to student accounts can have their IQMG verified. Account approval remains in Verifications. No manual IQMG entry is needed here.</p>
    <label>College PDF · up to 4 MB<input type="file" accept="application/pdf,.pdf" disabled={busy} onChange={event => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (file)
        void upload(file);
    }} />
    </label>
    {busy && <p role="status">Processing roster…</p>}{error && <p role="alert">
      {error}
    </p>}{message && <p role="status">
      {message}
    </p>}<label>Previous PDF imports<select value={id} disabled={busy} onChange={event => void review(event.target.value)}>
      <option value="">Select an import to review or recheck new accounts</option>
      {drafts.map(draft => <option key={draft.id} value={draft.id}>
        {draft.file_name} · {draft.status}
      </option>)}
    </select>
    </label>
    {rows.length > 0 && <>
      <p>Ambiguous names, duplicate IDs and unreadable rows stay blocked. Rows without a matching account can be saved to the official roster and rechecked after the student completes their details.</p>
      <div className="st-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Select</th>
              <th>Name</th>
              <th>IQMG</th>
              <th>Batch</th>
              <th>Match / correction</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => <tr key={row.row_index}>
              <td>
                <input type="checkbox" aria-label={`Select roster row ${row.row_index}`} checked={selected.has(row.row_index)} disabled={busy || row.status === 'invalid' || row.status === 'ambiguous'} onChange={event => setSelected(previous => {
                  const next = new Set(previous);
                  if (event.target.checked)
                    next.add(row.row_index);
                  else
                    next.delete(row.row_index);
                  return next;
                })} />
              </td>
              <td>
                {row.full_name}
              </td>
              <td>
                {row.iqmg_number}
              </td>
              <td>
                {row.batch || '—'}
              </td>
              <td>
                {row.status.replace(/_/g, ' ')}{row.current_claimant && <strong className="st-correction">Currently claimed by {row.current_claimant}. Applying this matched row will correct ownership.</strong>}
              </td>
            </tr>)}
          </tbody>
        </table>
      </div>
      <button disabled={busy || !selected.size} onClick={() => void apply()}>Verify selected rows & apply corrections ({selected.size})</button>
    </>}
  </div>;
}
