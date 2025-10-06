import React from 'react';
import { useData } from '../../context/DataContext';
import { supabase } from '../../lib/supabase';

export const NotificationsManagement: React.FC = () => {
  const { addNotification, updateNotification, deleteNotification } = useData();
  const [rows, setRows] = React.useState<any[]>([]);
  const [draft, setDraft] = React.useState({
    title: '',
    message: '',
    type: 'info' as string,
    link_url: '',
    visible: true,
    starts_at: new Date().toISOString().slice(0,16), // local yyyy-MM-ddTHH:mm
    ends_at: '',
    priority: 0,
    auto_dismiss_seconds: '' as any,
    text_color: '',
    glow_color: '',
  });
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Native color input helper that also supports clearing to default (null)
  const ColorInput: React.FC<{
    label: string;
    value: string; // hex or '' for default
    onChange: (v: string) => void;
    onClear?: () => void;
  }> = ({ label, value, onChange, onClear }) => {
    const display = value || '#ffffff';
    return (
      <label className="text-sm text-gray-700">
        {label}
        <div className="mt-1 flex items-center gap-3">
          <input
            type="color"
            className="h-9 w-14 cursor-pointer rounded border border-gray-300 bg-white"
            value={display}
            onChange={(e)=>onChange(e.target.value)}
            aria-label={label}
          />
          {onClear && (
            <button
              type="button"
              onClick={onClear}
              className="text-xs px-2 py-1 rounded border hover:bg-gray-50"
              title="Use default"
            >
              Default
            </button>
          )}
        </div>
      </label>
    );
  };

  // Quick presets per type to fill text/glow instantly
  const applyPreset = (type: string) => {
    // default mapping tuned for contrast on dark background
    const presets: Record<string, { text: string; glow: string }> = {
      info:    { text: '#e6fbff', glow: '#22d3ee' },
      success: { text: '#e9fff7', glow: '#34d399' },
      warning: { text: '#fff6e6', glow: '#f59e0b' },
      error:   { text: '#ffe9ec', glow: '#f43f5e' },
      urgent:  { text: '#ffe9ff', glow: '#d946ef' },
      custom:  { text: '#ffffff', glow: '#a78bfa' },
    };
    const key = (type || 'info').toLowerCase();
    const p = presets[key] || presets.info;
    setDraft((d)=>({ ...d, text_color: p.text, glow_color: p.glow }));
  };

  const loadAll = React.useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('notifications' as any)
        .select('*')
        .order('created_at', { ascending: false });
      if (!error) setRows(data || []);
    } catch {}
  }, []);

  React.useEffect(() => { loadAll(); }, [loadAll]);

  const resetDraft = () => setDraft({
    title: '', message: '', type: 'info', link_url: '', visible: true,
    starts_at: new Date().toISOString().slice(0,16), ends_at: '', priority: 0, auto_dismiss_seconds: '',
    text_color: '', glow_color: ''
  });

  const handleCreate = async () => {
    setError(null);
    if (!draft.message.trim()) { setError('Message is required'); return; }
    setSaving(true);
    try {
      const toIso = (s: string) => s ? new Date(s).toISOString() : null;
      await addNotification?.({
        title: draft.title || null,
        message: draft.message,
        type: draft.type,
        link_url: draft.link_url || null,
        visible: !!draft.visible,
        starts_at: toIso(draft.starts_at) || undefined,
        ends_at: toIso(draft.ends_at) || null,
        priority: Number.isFinite(draft.priority as any) ? Number(draft.priority) : 0,
        auto_dismiss_seconds: draft.auto_dismiss_seconds === '' ? null : Number(draft.auto_dismiss_seconds),
        text_color: draft.text_color ? draft.text_color : null,
        glow_color: draft.glow_color ? draft.glow_color : null,
      });
      resetDraft();
      await loadAll();
    } catch (e: any) {
      setError(e?.message || 'Failed to create notification');
    } finally { setSaving(false); }
  };

  // Create an immediate notification without scheduling a timer (starts now, visible=true)
  const handleCreateImmediate = async () => {
    setError(null);
    if (!draft.message.trim()) { setError('Message is required'); return; }
    setSaving(true);
    try {
      await addNotification?.({
        title: draft.title || null,
        message: draft.message,
        type: draft.type,
        link_url: draft.link_url || null,
        visible: true,
        starts_at: new Date().toISOString(),
        ends_at: null,
        priority: Number.isFinite(draft.priority as any) ? Number(draft.priority) : 0,
        auto_dismiss_seconds: draft.auto_dismiss_seconds === '' ? null : Number(draft.auto_dismiss_seconds),
        text_color: draft.text_color ? draft.text_color : null,
        glow_color: draft.glow_color ? draft.glow_color : null,
      });
      resetDraft();
      await loadAll();
    } catch (e: any) {
      setError(e?.message || 'Failed to send now');
    } finally { setSaving(false); }
  };

  const handlePatch = async (id: number, patch: any) => {
    try {
      if (patch.starts_at) patch.starts_at = new Date(patch.starts_at).toISOString();
      if (patch.ends_at === '') patch.ends_at = null;
      if (patch.ends_at) patch.ends_at = new Date(patch.ends_at).toISOString();
      await updateNotification?.(id, patch);
      await loadAll();
    } catch (e) {
      console.warn('update notification failed', e);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this notification?')) return;
    // Optimistic removal: drop the row immediately so no extra space lingers
    const prev = rows;
    setRows((rs) => rs.filter((r) => r.id !== id));
    try {
      await deleteNotification?.(id);
      // Background reconcile (non-blocking) to ensure list stays in sync
      loadAll().catch(() => {});
    } catch (e) {
      console.warn(e);
      // Revert on failure so UI reflects server state
      setRows(prev);
      alert('Failed to delete notification.');
    }
  };

  const toLocalInput = (iso: string | null | undefined) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      const pad = (n: number) => String(n).padStart(2, '0');
      const yyyy = d.getFullYear();
      const mm = pad(d.getMonth()+1);
      const dd = pad(d.getDate());
      const hh = pad(d.getHours());
      const mi = pad(d.getMinutes());
      return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
    } catch { return ''; }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Notifications</h3>

      {/* Create */}
      <div className="border border-gray-200 rounded-lg p-4 mb-6">
        <div className="grid md:grid-cols-2 gap-3">
          <input
            type="text" placeholder="Title (optional)" className="border rounded px-3 py-2"
            value={draft.title} onChange={(e)=>setDraft((d)=>({...d, title: e.target.value}))}
          />
          <div>
            <input
              list="notif-type-suggestions"
              type="text"
              placeholder="Type (e.g., info, success, warning, error, or custom)"
              className="border rounded px-3 py-2 w-full"
              value={draft.type}
              onChange={(e)=>setDraft((d)=>({...d, type: e.target.value}))}
            />
            <datalist id="notif-type-suggestions">
              <option value="info" />
              <option value="success" />
              <option value="warning" />
              <option value="error" />
              <option value="urgent" />
              <option value="custom" />
            </datalist>
          </div>
          <input
            type="url" placeholder="Link URL (optional)" className="border rounded px-3 py-2"
            value={draft.link_url} onChange={(e)=>setDraft((d)=>({...d, link_url: e.target.value}))}
          />
          <input
            type="number" placeholder="Priority (default 0)" className="border rounded px-3 py-2"
            value={draft.priority} onChange={(e)=>setDraft((d)=>({...d, priority: Number(e.target.value)}))}
          />
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={draft.visible} onChange={(e)=>setDraft((d)=>({...d, visible: e.target.checked}))} />
            Visible
          </label>
        </div>
        <textarea
          className="mt-3 w-full border rounded px-3 py-2 min-h-[90px]"
          placeholder="Message"
          value={draft.message}
          onChange={(e)=>setDraft((d)=>({...d, message: e.target.value}))}
        />
        <div className="grid md:grid-cols-2 gap-3 mt-3">
          <label className="text-sm text-gray-700">Starts At
            <input type="datetime-local" className="w-full border rounded px-3 py-2 mt-1" value={draft.starts_at}
              onChange={(e)=>setDraft((d)=>({...d, starts_at: e.target.value}))}
            />
          </label>
          <label className="text-sm text-gray-700">Ends At (optional)
            <input type="datetime-local" className="w-full border rounded px-3 py-2 mt-1" value={draft.ends_at}
              onChange={(e)=>setDraft((d)=>({...d, ends_at: e.target.value}))}
            />
          </label>
          <label className="text-sm text-gray-700">Auto Dismiss (seconds, optional)
            <input type="number" min={0} placeholder="e.g., 4 for 4s" className="w-full border rounded px-3 py-2 mt-1"
              value={draft.auto_dismiss_seconds}
              onChange={(e)=>setDraft((d)=>({...d, auto_dismiss_seconds: e.target.value}))}
            />
          </label>
          <ColorInput
            label="Text Color"
            value={draft.text_color}
            onChange={(v)=>setDraft((d)=>({...d, text_color: v }))}
            onClear={() => setDraft((d)=>({...d, text_color: ''}))}
          />
          <ColorInput
            label="Glow Color"
            value={draft.glow_color}
            onChange={(v)=>setDraft((d)=>({...d, glow_color: v }))}
            onClear={() => setDraft((d)=>({...d, glow_color: ''}))}
          />
        </div>
        {error && <div className="text-sm text-rose-600 mt-2">{error}</div>}
        <div className="mt-3 flex gap-2 flex-wrap items-center">
          <button disabled={saving} onClick={handleCreate} className="px-4 py-2 rounded bg-gray-900 text-white hover:bg-black disabled:opacity-50">Create (Scheduled)</button>
          <button disabled={saving} onClick={handleCreateImmediate} className="px-4 py-2 rounded bg-cyan-600 text-white hover:bg-cyan-700 disabled:opacity-50">Send Now</button>
          <button disabled={saving} onClick={resetDraft} className="px-3 py-2 rounded border">Reset</button>
          <div className="ml-2 flex items-center gap-1 text-xs">
            <span className="text-gray-500">Presets:</span>
            {['info','success','warning','error','urgent','custom'].map((t)=> (
              <button key={t} type="button" onClick={()=>applyPreset(t)} className="px-2 py-1 rounded border hover:bg-gray-50 capitalize">{t}</button>
            ))}
          </div>
        </div>
      </div>

      {/* List */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-600">
              <th className="py-2 pr-3">Title</th>
              <th className="py-2 pr-3">Type</th>
              <th className="py-2 pr-3">Message</th>
              <th className="py-2 pr-3">Link</th>
              <th className="py-2 pr-3">Visible</th>
              <th className="py-2 pr-3">Starts</th>
              <th className="py-2 pr-3">Ends</th>
              <th className="py-2 pr-3">Priority</th>
              <th className="py-2 pr-3">Auto Dismiss (s)</th>
              <th className="py-2 pr-3">Text Color</th>
              <th className="py-2 pr-3">Glow Color</th>
              <th className="py-2 pr-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(rows || []).map((n: any) => (
              <tr key={n.id} className="border-t">
                <td className="py-2 pr-3 align-top">
                  <input className="border rounded px-2 py-1 w-48" defaultValue={n.title || ''}
                    onBlur={(e)=>handlePatch(n.id, { title: e.target.value })}
                  />
                </td>
                <td className="py-2 pr-3 align-top">
                  <input
                    list="notif-type-suggestions"
                    className="border rounded px-2 py-1 w-32"
                    defaultValue={n.type || 'info'}
                    onBlur={(e)=>handlePatch(n.id, { type: e.target.value })}
                  />
                </td>
                <td className="py-2 pr-3 align-top">
                  <textarea className="border rounded px-2 py-1 w-72 min-h-[60px]" defaultValue={n.message}
                    onBlur={(e)=>handlePatch(n.id, { message: e.target.value })}
                  />
                </td>
                <td className="py-2 pr-3 align-top">
                  <input className="border rounded px-2 py-1 w-48" defaultValue={n.link_url || ''}
                    onBlur={(e)=>handlePatch(n.id, { link_url: e.target.value || null })}
                  />
                </td>
                <td className="py-2 pr-3 align-top">
                  <input type="checkbox" defaultChecked={!!n.visible}
                    onChange={(e)=>handlePatch(n.id, { visible: e.target.checked })}
                  />
                </td>
                <td className="py-2 pr-3 align-top">
                  <input type="datetime-local" className="border rounded px-2 py-1" defaultValue={toLocalInput(n.starts_at)}
                    onBlur={(e)=>handlePatch(n.id, { starts_at: e.target.value })}
                  />
                </td>
                <td className="py-2 pr-3 align-top">
                  <input type="datetime-local" className="border rounded px-2 py-1" defaultValue={toLocalInput(n.ends_at)}
                    onBlur={(e)=>handlePatch(n.id, { ends_at: e.target.value })}
                  />
                </td>
                <td className="py-2 pr-3 align-top">
                  <input type="number" className="border rounded px-2 py-1 w-20" defaultValue={n.priority ?? 0}
                    onBlur={(e)=>handlePatch(n.id, { priority: Number(e.target.value || 0) })}
                  />
                </td>
                <td className="py-2 pr-3 align-top">
                  <input type="number" className="border rounded px-2 py-1 w-24" defaultValue={n.auto_dismiss_seconds ?? ''}
                    onBlur={(e)=>handlePatch(n.id, { auto_dismiss_seconds: e.target.value === '' ? null : Number(e.target.value) })}
                  />
                </td>
                <td className="py-2 pr-3 align-top">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      className="h-7 w-10 rounded border border-gray-300"
                      value={(n.text_color || '#ffffff')}
                      onChange={(e)=>handlePatch(n.id, { text_color: e.target.value })}
                    />
                    <button
                      type="button"
                      className="text-xs px-2 py-1 rounded border hover:bg-gray-50"
                      onClick={()=>handlePatch(n.id, { text_color: null })}
                    >Default</button>
                  </div>
                </td>
                <td className="py-2 pr-3 align-top">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      className="h-7 w-10 rounded border border-gray-300"
                      value={(n.glow_color || '#ffffff')}
                      onChange={(e)=>handlePatch(n.id, { glow_color: e.target.value })}
                    />
                    <button
                      type="button"
                      className="text-xs px-2 py-1 rounded border hover:bg-gray-50"
                      onClick={()=>handlePatch(n.id, { glow_color: null })}
                    >Default</button>
                  </div>
                </td>
                <td className="py-2 pr-3 align-top">
                  <button onClick={()=>handleDelete(n.id)} className="text-rose-600 hover:text-rose-700 text-sm">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default NotificationsManagement;
