import React from 'react';
import { useData } from '../../context/DataContext';
import { supabase } from '../../lib/supabase';
import { 
  Bell, Calendar, Clock, Trash2, Save, AlertTriangle, Info, 
  CheckCircle, AlertOctagon, Zap, Link as LinkIcon, Eye, EyeOff, 
  RefreshCw, X, Megaphone, Plus 
} from 'lucide-react';

export const NotificationsManagement: React.FC = () => {
  const { addNotification, updateNotification, deleteNotification } = useData();
  const [rows, setRows] = React.useState<any[]>([]);
  const [draft, setDraft] = React.useState({
    title: '',
    message: '',
    type: 'info' as string,
    link_url: '',
    visible: true,
    starts_at: new Date().toISOString().slice(0,16),
    ends_at: '',
    priority: 0,
    auto_dismiss_seconds: '' as any,
    text_color: '',
    glow_color: '',
  });
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Load Notifications
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

  // Color Presets
  const applyPreset = (type: string) => {
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
    setDraft((d)=>({ ...d, type: type, text_color: p.text, glow_color: p.glow }));
  };

  // Handlers
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

  const handleCreateImmediate = async () => {
    setError(null);
    if (!draft.message.trim()) { setError('Message is required'); return; }
    setSaving(true);
    try {
      await addNotification?.({
        title: draft.title || null,
        message: draft.message,
        type: draft.type || 'info',
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
    const prev = rows;
    setRows((rs) => rs.filter((r) => r.id !== id));
    try {
      await deleteNotification?.(id);
      loadAll().catch(() => {});
    } catch (e) {
      console.warn(e);
      setRows(prev);
      alert('Failed to delete notification.');
    }
  };

  const toLocalInput = (iso: string | null | undefined) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch { return ''; }
  };

  const getTypeIcon = (type: string) => {
    switch(type) {
      case 'success': return <CheckCircle size={16} className="text-emerald-400" />;
      case 'warning': return <AlertTriangle size={16} className="text-amber-400" />;
      case 'error': return <AlertOctagon size={16} className="text-red-400" />;
      case 'urgent': return <Zap size={16} className="text-purple-400" />;
      default: return <Info size={16} className="text-blue-400" />;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
          <div className="w-1.5 h-8 bg-gradient-to-b from-cyan-400 to-blue-600 rounded-full" />
          Notifications Management
        </h2>
        <p className="text-sm text-gray-400 mt-1 ml-4.5">Create and manage site-wide announcements and alerts</p>
      </div>

      {/* Create Form */}
      <div className="bg-[#181824]/60 backdrop-blur-md border border-white/5 rounded-2xl p-6 sm:p-8 border-l-4 border-l-cyan-500 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
        
        <div className="flex items-center gap-3 mb-6 relative z-10">
          <div className="p-2.5 bg-cyan-500/10 rounded-xl border border-cyan-500/20">
            <Megaphone className="w-5 h-5 text-cyan-400" />
          </div>
          <h3 className="text-lg font-bold text-white">Create New Notification</h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative z-10">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Title (Optional)</label>
              <input
                type="text"
                placeholder="Notification Title"
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50 transition-all font-medium placeholder-gray-600"
                value={draft.title}
                onChange={(e) => setDraft(d => ({ ...d, title: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Message *</label>
              <textarea
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50 transition-all font-medium placeholder-gray-600 min-h-[100px] resize-none"
                placeholder="What do you want to tell everyone?"
                value={draft.message}
                onChange={(e) => setDraft(d => ({ ...d, message: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Notification Type</label>
                <div className="flex flex-wrap gap-2">
                  {['info', 'success', 'warning', 'error', 'urgent'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => applyPreset(t)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all border ${
                        draft.type === t 
                          ? 'bg-white/10 border-white/20 text-white shadow-lg shadow-white/5' 
                          : 'bg-black/20 border-transparent text-gray-500 hover:text-gray-300 hover:bg-white/5'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                 <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Visibility</label>
                 <label className="flex items-center gap-3 p-3 bg-black/20 rounded-xl border border-white/5 cursor-pointer hover:bg-white/5 transition-colors">
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 rounded bg-black/40 border-gray-600 text-cyan-500 focus:ring-cyan-500/50"
                      checked={draft.visible}
                      onChange={(e) => setDraft(d => ({ ...d, visible: e.target.checked }))}
                    />
                    <span className="text-sm font-medium text-gray-300">Publicly Visible</span>
                 </label>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                 <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1 flex items-center gap-1">
                   <Calendar size={12} /> Starts At
                 </label>
                 <input
                   type="datetime-local"
                   className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-cyan-500/50 text-sm"
                   value={draft.starts_at}
                   onChange={(e) => setDraft(d => ({ ...d, starts_at: e.target.value }))}
                 />
               </div>
               <div className="space-y-2">
                 <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1 flex items-center gap-1">
                   <Clock size={12} /> Ends At (Optional)
                 </label>
                 <input
                   type="datetime-local"
                   className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-cyan-500/50 text-sm"
                   value={draft.ends_at}
                   onChange={(e) => setDraft(d => ({ ...d, ends_at: e.target.value }))}
                 />
               </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1 flex items-center gap-1">
                <LinkIcon size={12} /> Link URL (Optional)
              </label>
              <input
                type="url"
                placeholder="https://..."
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500/50 transition-all font-mono text-sm placeholder-gray-600"
                value={draft.link_url}
                onChange={(e) => setDraft(d => ({ ...d, link_url: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Text Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    className="h-10 w-full rounded-lg bg-black/20 border border-white/10 cursor-pointer"
                    value={draft.text_color || '#ffffff'}
                    onChange={(e) => setDraft(d => ({ ...d, text_color: e.target.value }))}
                  />
                  <button onClick={() => setDraft(d => ({ ...d, text_color: '' }))} className="px-3 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-gray-400">Auto</button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Glow Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    className="h-10 w-full rounded-lg bg-black/20 border border-white/10 cursor-pointer"
                    value={draft.glow_color || '#ffffff'}
                    onChange={(e) => setDraft(d => ({ ...d, glow_color: e.target.value }))}
                  />
                   <button onClick={() => setDraft(d => ({ ...d, glow_color: '' }))} className="px-3 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-gray-400">Auto</button>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Priority</label>
                  <input
                    type="number"
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500/50 text-sm"
                    value={draft.priority}
                    onChange={(e) => setDraft(d => ({ ...d, priority: parseInt(e.target.value) || 0 }))}
                  />
               </div>
               <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Auto-Dismiss (Sec)</label>
                  <input
                    type="number"
                    placeholder="None"
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500/50 text-sm"
                    value={draft.auto_dismiss_seconds}
                    onChange={(e) => setDraft(d => ({ ...d, auto_dismiss_seconds: e.target.value }))}
                  />
               </div>
            </div>
          </div>
        </div>
        
        {error && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-2">
            <AlertOctagon size={16} /> {error}
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-white/5 flex gap-3 justify-end relative z-10">
          <button 
             onClick={resetDraft}
             className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-300 hover:bg-white/5 rounded-lg transition-colors"
          >
             Reset
          </button>
          <button 
             onClick={handleCreate}
             disabled={saving}
             className="px-6 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-sm transition-all flex items-center gap-2 disabled:opacity-50"
          >
             <Calendar size={16} /> Schedule
          </button>
          <button 
             onClick={handleCreateImmediate} 
             disabled={saving}
             className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-sm shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-2 disabled:opacity-50 transform hover:-translate-y-0.5"
          >
             <Zap size={16} fill="currentColor" /> Send Now
          </button>
        </div>
      </div>

      {/* Notifications Grid */}
      <h3 className="text-xl font-bold text-white flex items-center gap-2 mt-12">
        <Bell size={20} className="text-gray-400" />
        Existing Notifications
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {rows.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-500 border border-dashed border-gray-700 rounded-2xl">
             No notifications found
          </div>
        )}
        
        {rows.map((n) => (
          <div 
             key={n.id} 
             className="group bg-[#181824]/60 backdrop-blur-md border border-white/5 rounded-2xl overflow-hidden hover:shadow-2xl transition-all duration-500 hover:-translate-y-1 relative"
             style={{
               boxShadow: n.glow_color ? `0 0 20px ${n.glow_color}10` : 'none',
               borderColor: n.glow_color ? `${n.glow_color}30` : 'rgba(255,255,255,0.05)'
             }}
          >
             {/* Header */}
             <div className="p-4 border-b border-white/5 bg-black/20 flex justify-between items-start gap-4">
                <input 
                  type="text"
                  defaultValue={n.title || ''}
                  placeholder="No Title"
                  className="bg-transparent border-none text-white font-bold text-lg w-full focus:ring-0 px-0 placeholder-gray-600"
                  onBlur={(e) => handlePatch(n.id, { title: e.target.value })}
                />
                
                <div className="flex items-center gap-1 shrink-0">
                  <button 
                     onClick={() => handlePatch(n.id, { visible: !n.visible })}
                     className={`p-1.5 rounded-lg transition-colors ${n.visible ? 'text-emerald-400 hover:bg-emerald-400/10' : 'text-gray-600 hover:bg-gray-700'}`}
                     title="Toggle Visibility"
                  >
                     {n.visible ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                  <button 
                     onClick={() => handleDelete(n.id)}
                     className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                     title="Delete"
                  >
                     <Trash2 size={16} />
                  </button>
                </div>
             </div>

             {/* Body */}
             <div className="p-4 space-y-4">
                <textarea 
                   defaultValue={n.message}
                   className="w-full bg-transparent border-none text-gray-300 resize-none focus:ring-0 px-0 min-h-[60px] leading-relaxed"
                   onBlur={(e) => handlePatch(n.id, { message: e.target.value })}
                />
                
                {/* Meta Inputs */}
                <div className="grid grid-cols-2 gap-3 pb-2">
                   <div className="bg-black/20 rounded-lg px-3 py-2 border border-white/5">
                      <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Type</label>
                      <input 
                        defaultValue={n.type}
                        list="notif-type-suggestions"
                        className="bg-transparent text-sm text-cyan-400 w-full focus:outline-none font-mono"
                        onBlur={(e) => handlePatch(n.id, { type: e.target.value })}
                      />
                   </div>
                   <div className="bg-black/20 rounded-lg px-3 py-2 border border-white/5">
                      <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Priority</label>
                      <input 
                        type="number"
                        defaultValue={n.priority}
                        className="bg-transparent text-sm text-white w-full focus:outline-none font-mono"
                        onBlur={(e) => handlePatch(n.id, { priority: Number(e.target.value) })}
                      />
                   </div>
                   <div className="bg-black/20 rounded-lg px-3 py-2 border border-white/5">
                      <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Starts</label>
                      <input 
                        type="datetime-local"
                        defaultValue={toLocalInput(n.starts_at)}
                        className="bg-transparent text-[10px] text-gray-400 w-full focus:outline-none"
                        onBlur={(e) => handlePatch(n.id, { starts_at: e.target.value })}
                      />
                   </div>
                   <div className="bg-black/20 rounded-lg px-3 py-2 border border-white/5">
                      <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Ends</label>
                      <input 
                        type="datetime-local"
                        defaultValue={toLocalInput(n.ends_at)}
                        className="bg-transparent text-[10px] text-gray-400 w-full focus:outline-none"
                        onBlur={(e) => handlePatch(n.id, { ends_at: e.target.value })}
                      />
                   </div>
                </div>
                
                {/* URL */}
                <div className="flex items-center gap-2 bg-black/20 px-3 py-2 rounded-lg border border-white/5">
                   <LinkIcon size={12} className="text-gray-500 shrink-0" />
                   <input 
                      defaultValue={n.link_url || ''}
                      placeholder="No link URL"
                      className="bg-transparent text-xs text-blue-400 w-full focus:outline-none truncate"
                      onBlur={(e) => handlePatch(n.id, { link_url: e.target.value })}
                   />
                </div>
             </div>
             
             {/* Footer Color Pickers */}
             <div className="px-4 py-3 bg-white/[0.02] border-t border-white/5 flex gap-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="flex items-center gap-2">
                   <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: n.text_color || '#fff' }}></div>
                   <input type="color" className="w-0 h-0 opacity-0 absolute" id={`tc-${n.id}`} onChange={(e) => handlePatch(n.id, { text_color: e.target.value })} />
                   <label htmlFor={`tc-${n.id}`} className="text-[10px] text-gray-500 cursor-pointer hover:text-white">Text Color</label>
                </div>
                <div className="flex items-center gap-2">
                   <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: n.glow_color || '#fff', boxShadow: `0 0 10px ${n.glow_color}` }}></div>
                   <input type="color" className="w-0 h-0 opacity-0 absolute" id={`gc-${n.id}`} onChange={(e) => handlePatch(n.id, { glow_color: e.target.value })} />
                   <label htmlFor={`gc-${n.id}`} className="text-[10px] text-gray-500 cursor-pointer hover:text-white">Glow Color</label>
                </div>
             </div>
          </div>
        ))}

      </div>

      <datalist id="notif-type-suggestions">
        <option value="info" />
        <option value="success" />
        <option value="warning" />
        <option value="error" />
        <option value="urgent" />
        <option value="custom" />
      </datalist>
    </div>
  );
};

export default NotificationsManagement;
