import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  FileUp,
  Loader2,
  School,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { previewIQMGRoster, applyIQMGRoster, type RosterPreview } from '../../services/studentTeams';

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
    const result = await supabase
      .from('iqmg_roster_imports')
      .select('id,file_name,status,created_at')
      .order('created_at', { ascending: false })
      .limit(30);
    if (result.error) throw result.error;
    setDrafts((result.data || []) as Draft[]);
  }, []);

  useEffect(() => {
    void load().catch(() => setError('Could not load previous roster imports.'));
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
      setSelected(new Set(next.filter((row) => row.status === 'matched').map((row) => row.row_index)));
    } catch (err: any) {
      setError(err.message || 'Could not preview this PDF import');
    } finally {
      setBusy(false);
    }
  };

  const upload = async (file: File) => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      if (file.type !== 'application/pdf' || file.size > 4 * 1024 * 1024) {
        throw new Error('Please upload a PDF file smaller than 4 MB.');
      }
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const token = await getValidToken();
      const response = await fetch('/api/ai-extract-iqmg-roster', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          mimeType: 'application/pdf',
          data: base64,
          fileName: file.name,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not read that PDF');
      await load();
      await review(result.import_id);
      setMessage(`Extracted ${result.rows_count} rows. Check the list below and click Verify.`);
    } catch (err: any) {
      setError(err.message || 'Could not process the PDF');
    } finally {
      setBusy(false);
    }
  };

  const apply = async () => {
    setBusy(true);
    setError('');
    try {
      const result = await applyIQMGRoster(id, [...selected]);
      await load();
      await review(id);
      setMessage(
        `Verified ${result.verified} student ID(s) and fixed ${result.corrected_claims} mismatch(es).`
      );
    } catch (err: any) {
      setError(err.message || 'Could not verify selected rows');
    } finally {
      setBusy(false);
    }
  };

  const toggleRow = (rowIndex: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(rowIndex)) next.delete(rowIndex);
      else next.add(rowIndex);
      return next;
    });
  };

  const statusBadge = (status: string) => {
    if (status === 'matched') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#eaf1e4] text-[#3d6246]">
          <CheckCircle2 className="w-3 h-3" />
          Ready to verify
        </span>
      );
    }
    if (status === 'already_verified') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#eff4ed] text-[#426b52]">
          Verified
        </span>
      );
    }
    if (status === 'invalid' || status === 'ambiguous') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#fdf2f3] text-[#b43c48]">
          {status.replace(/_/g, ' ')}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#f3f4f6] text-[#5c6660]">
        {status.replace(/_/g, ' ')}
      </span>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header & Upload / History Card */}
      <div className="bg-white border border-[#e2e8df] rounded-xl p-4 sm:p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#eff4ed] text-[#426b52] flex items-center justify-center shrink-0">
            <School className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[#26352e]">College ID (IQMG) Roster</h2>
            <p className="text-xs text-[#65726a] mt-0.5">
              Upload your official college PDF list. We match names and IQMG numbers with student accounts so you can verify them quickly.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2 border-t border-[#eef2ec]">
          <label className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-dashed border-[#c9d6c5] bg-[#fafbf9] hover:bg-[#eff4ed]/70 cursor-pointer transition-colors">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-white border border-[#e2e8df] text-[#426b52] flex items-center justify-center shrink-0">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#26352e]">Upload College PDF</p>
                <p className="text-[11px] text-[#65726a]">PDF file up to 4 MB</p>
              </div>
            </div>
            <span className="px-3 py-1.5 rounded-lg bg-[#426b52] text-white text-xs font-medium shrink-0">
              Choose file
            </span>
            <input
              type="file"
              accept="application/pdf,.pdf"
              disabled={busy}
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (file) void upload(file);
              }}
            />
          </label>

          <div className="p-3.5 rounded-xl border border-[#e2e8df] bg-[#fafbf9] flex flex-col justify-center">
            <label htmlFor="iqmg-prev-select" className="text-[11px] font-medium text-[#65726a] mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              Previous PDF imports
            </label>
            <select
              id="iqmg-prev-select"
              value={id}
              disabled={busy}
              onChange={(event) => void review(event.target.value)}
              className="w-full h-9 px-2.5 text-xs rounded-lg border border-[#e2e8df] bg-white text-[#26352e] focus:outline-none focus:border-[#426b52]"
            >
              <option value="">Select an import to review...</option>
              {drafts.map((draft) => (
                <option key={draft.id} value={draft.id}>
                  {draft.file_name} ({draft.status})
                </option>
              ))}
            </select>
          </div>
        </div>

        {busy && (
          <div role="status" className="flex items-center gap-2 text-xs text-[#426b52] bg-[#eff4ed] px-3.5 py-2.5 rounded-lg border border-[#cde0cb]">
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            Reading roster data... please wait.
          </div>
        )}

        {error && (
          <div role="alert" className="flex items-start gap-2 text-xs text-[#b43c48] bg-[#fdf2f3] px-3.5 py-2.5 rounded-lg border border-[#f2cfd3]">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div role="status" className="flex items-start gap-2 text-xs text-[#365a44] bg-[#eff4ed] px-3.5 py-2.5 rounded-lg border border-[#cde0cb]">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{message}</span>
          </div>
        )}
      </div>

      {/* Extracted Rows */}
      {rows.length > 0 && (
        <div className="space-y-3">
          <div className="bg-white border border-[#e2e8df] rounded-xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-[#26352e]">
                {rows.length} rows extracted from PDF
              </p>
              <p className="text-[11px] text-[#65726a] mt-0.5">
                Unclear or duplicate rows stay locked. Unmatched rows are saved so they can be checked once students sign up.
              </p>
            </div>
            <button
              type="button"
              disabled={busy || !selected.size}
              onClick={() => void apply()}
              className="h-10 sm:h-9 px-4 rounded-lg bg-[#426b52] hover:bg-[#365a44] text-white text-xs font-medium inline-flex items-center justify-center gap-1.5 disabled:opacity-45 shrink-0"
            >
              <ShieldCheck className="w-4 h-4" />
              Verify selected ({selected.size})
            </button>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-2.5">
            {rows.map((row) => {
              const disabled = busy || row.status === 'invalid' || row.status === 'ambiguous';
              return (
                <label
                  key={row.row_index}
                  className="block bg-white border border-[#e2e8df] rounded-xl p-3.5 space-y-2 cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <input
                        type="checkbox"
                        checked={selected.has(row.row_index)}
                        disabled={disabled}
                        onChange={() => toggleRow(row.row_index)}
                        className="w-4 h-4 accent-[#426b52] shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#26352e] truncate">
                          {row.full_name}
                        </p>
                        <p className="text-xs font-mono text-[#4a5750]">
                          {row.iqmg_number} {row.batch ? `· ${row.batch}` : ''}
                        </p>
                      </div>
                    </div>
                    {statusBadge(row.status)}
                  </div>
                  {row.current_claimant && (
                    <p className="text-[11px] text-[#92400e] bg-[#fef3c7] px-2.5 py-1.5 rounded-lg">
                      Currently claimed by {row.current_claimant}. Verifying will correct ownership.
                    </p>
                  )}
                </label>
              );
            })}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block bg-white border border-[#e2e8df] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#e2e8df] bg-[#fafbf9] text-[11px] font-semibold text-[#65726a]">
                    <th className="py-3 px-4 w-12">Select</th>
                    <th className="py-3 px-4">Student name</th>
                    <th className="py-3 px-4">IQMG number</th>
                    <th className="py-3 px-4">Batch</th>
                    <th className="py-3 px-4">Match status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eef2ec] text-xs">
                  {rows.map((row) => {
                    const disabled = busy || row.status === 'invalid' || row.status === 'ambiguous';
                    return (
                      <tr key={row.row_index} className="hover:bg-[#fafcf9]">
                        <td className="py-3 px-4">
                          <input
                            type="checkbox"
                            aria-label={`Select roster row ${row.row_index}`}
                            checked={selected.has(row.row_index)}
                            disabled={disabled}
                            onChange={() => toggleRow(row.row_index)}
                            className="w-4 h-4 accent-[#426b52]"
                          />
                        </td>
                        <td className="py-3 px-4 font-medium text-[#26352e]">{row.full_name}</td>
                        <td className="py-3 px-4 font-mono text-[#4a5750]">{row.iqmg_number}</td>
                        <td className="py-3 px-4 text-[#4a5750]">{row.batch || '—'}</td>
                        <td className="py-3 px-4 space-y-1">
                          <div>{statusBadge(row.status)}</div>
                          {row.current_claimant && (
                            <p className="text-[11px] text-[#92400e]">
                              Currently claimed by {row.current_claimant} — verifying will fix ownership.
                            </p>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
