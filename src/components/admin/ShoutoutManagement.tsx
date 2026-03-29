import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Trash2, Shield, ShieldOff, MessageSquare, Search, Filter, User, Settings, Power, Clock, Infinity as InfinityIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { useData } from '../../context/DataContext';

export const ShoutoutManagement: React.FC = () => {
  const { siteSettings, updateSiteSettings } = useData();
  const [shoutouts, setShoutouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all');
  const [updatingSettings, setUpdatingSettings] = useState(false);

  const handleUpdateSetting = async (patch: any) => {
    setUpdatingSettings(true);
    try {
      await updateSiteSettings(patch);
      toast.success('Settings updated');
    } catch (err) {
      toast.error('Failed to update settings');
    } finally {
      setUpdatingSettings(false);
    }
  };

  const fetchShoutouts = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('shoutouts')
        .select('*, profiles(full_name, avatar_url, batch)')
        .order('created_at', { ascending: false });

      if (filter === 'pending') {
        query = query.eq('is_approved', false);
      } else if (filter === 'approved') {
        query = query.eq('is_approved', true);
      }

      const { data, error } = await query;
      if (error) throw error;
      setShoutouts(data || []);
    } catch (err: any) {
      toast.error('Failed to load shout-outs');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchShoutouts();
  }, [fetchShoutouts]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this shout-out? This action cannot be undone.')) return;

    try {
      const { error } = await supabase
        .from('shoutouts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Shout-out deleted');
      setShoutouts(prev => prev.filter(s => s.id !== id));
    } catch (err: any) {
      toast.error('Failed to delete shout-out');
    }
  };

  const handleToggleApproval = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('shoutouts')
        .update({ is_approved: !currentStatus })
        .eq('id', id);

      if (error) throw error;
      toast.success(currentStatus ? 'Shout-out hidden' : 'Shout-out approved');
      setShoutouts(prev => prev.map(s => s.id === id ? { ...s, is_approved: !currentStatus } : s));
    } catch (err: any) {
      toast.error('Failed to update status');
    }
  };

  const filteredShoutouts = shoutouts.filter(s => 
    s.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.profiles?.full_name || 'Anonymous').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
            <div className="w-1.5 h-8 bg-gradient-to-b from-orange-400 to-red-600 rounded-full" />
            Shout-out Moderation
          </h2>
          <p className="text-sm text-gray-400 mt-1 ml-4.5">Monitor and manage community messages</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-orange-500 transition-colors" />
            <input 
              type="text"
              placeholder="Search messages or authors..."
              className="bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500/30 transition-all w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex bg-white/5 rounded-xl p-1 border border-white/5">
            {(['all', 'pending', 'approved'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                  filter === t ? 'bg-orange-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Settings Panel */}
      <div className="superia-glass-card rounded-3xl border border-white/5 overflow-hidden">
        <div className="px-6 py-4 bg-white/[0.02] border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-orange-500" />
            <h3 className="text-xs font-black uppercase tracking-widest text-white">System Controls</h3>
          </div>
          {updatingSettings && (
            <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          )}
        </div>
        
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Toggle */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Board Status</label>
              <button 
                onClick={() => handleUpdateSetting({ shoutouts_enabled: !siteSettings?.shoutouts_enabled })}
                disabled={updatingSettings}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${
                  siteSettings?.shoutouts_enabled !== false 
                    ? 'bg-green-500/10 border-green-500/20 text-green-500' 
                    : 'bg-red-500/10 border-red-500/20 text-red-500'
                }`}
              >
                <Power className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-tight">
                  {siteSettings?.shoutouts_enabled !== false ? 'Live' : 'Disabled'}
                </span>
              </button>
            </div>
            <p className="text-[10px] text-gray-600 font-bold uppercase leading-tight">
              Turn off the shout-out board globally for all participants.
            </p>
          </div>

          {/* Daily Limit */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Daily Per-User Limit</label>
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-2 py-1">
                <input 
                  type="number"
                  min="0"
                  value={siteSettings?.shoutouts_daily_limit ?? 3}
                  onChange={(e) => handleUpdateSetting({ shoutouts_daily_limit: parseInt(e.target.value) || 0 })}
                  disabled={updatingSettings}
                  className="w-12 bg-transparent text-white text-xs font-black focus:outline-none text-center"
                />
                <InfinityIcon className={`w-3.5 h-3.5 ${siteSettings?.shoutouts_daily_limit === 0 ? 'text-orange-500' : 'text-gray-600'}`} />
              </div>
            </div>
            <p className="text-[10px] text-gray-600 font-bold uppercase leading-tight">
              Max messages per participant per day (0 = infinite).
            </p>
          </div>

          {/* Expiry Hours */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Visibility Lifetime</label>
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-2 py-1">
                <input 
                  type="number"
                  min="1"
                  value={siteSettings?.shoutouts_expiry_hours ?? 24}
                  onChange={(e) => handleUpdateSetting({ shoutouts_expiry_hours: parseInt(e.target.value) || 1 })}
                  disabled={updatingSettings}
                  className="w-12 bg-transparent text-white text-xs font-black focus:outline-none text-center"
                />
                <span className="text-[10px] font-black uppercase text-gray-500">Hrs</span>
              </div>
            </div>
            <p className="text-[10px] text-gray-600 font-bold uppercase leading-tight">
              How long messages stay visible on the board (default 24h).
            </p>
          </div>
        </div>
      </div>

      {/* Stats Quick HUD */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="superia-glass-card rounded-3xl p-6 border border-white/5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20">
              <MessageSquare className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Total Shoutouts</p>
              <h4 className="text-2xl font-black text-white">{shoutouts.length}</h4>
            </div>
          </div>
        </div>
        <div className="superia-glass-card rounded-3xl p-6 border border-white/5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-yellow-500/10 rounded-2xl border border-yellow-500/20">
              <Shield className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Pending Review</p>
              <h4 className="text-2xl font-black text-white">
                {shoutouts.filter(s => !s.is_approved).length}
              </h4>
            </div>
          </div>
        </div>
        <div className="superia-glass-card rounded-3xl p-6 border border-white/5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-500/10 rounded-2xl border border-green-500/20">
              <ShieldOff className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Approved</p>
              <h4 className="text-2xl font-black text-white">
                {shoutouts.filter(s => s.is_approved).length}
              </h4>
            </div>
          </div>
        </div>
      </div>

      {/* Message List */}
      <div className="superia-glass-card rounded-[2.5rem] border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/[0.02] border-b border-white/5">
                <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Author</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Message</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-20 text-center">
                    <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-500 text-sm font-bold uppercase tracking-widest">Accessing records...</p>
                  </td>
                </tr>
              ) : filteredShoutouts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-20 text-center">
                    <p className="text-gray-500 text-sm font-bold uppercase tracking-widest">No shout-outs found</p>
                  </td>
                </tr>
              ) : (
                filteredShoutouts.map((shout) => (
                  <tr key={shout.id} className="group hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-700 to-gray-800 border border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {shout.profiles?.avatar_url ? (
                            <img src={shout.profiles.avatar_url} className="w-full h-full object-cover" alt="" />
                          ) : (
                            <User size={18} className="text-gray-500" />
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-black text-white tracking-tight">
                            {shout.is_anonymous ? 'Anonymous' : (shout.profiles?.full_name || 'Unknown')}
                          </div>
                          <div className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">
                            {shout.profiles?.batch || 'Participant'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-md">
                        <p className="text-sm text-gray-300 leading-relaxed italic">"{shout.message}"</p>
                        <p className="text-[9px] text-gray-600 font-bold uppercase mt-1.5 tabular-nums">
                          {new Date(shout.created_at).toLocaleString()}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => handleToggleApproval(shout.id, shout.is_approved)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all ${
                          shout.is_approved 
                            ? 'bg-green-500/10 border-green-500/20 text-green-500' 
                            : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500'
                        }`}
                      >
                        {shout.is_approved ? (
                          <><Shield size={10} /> Approved</>
                        ) : (
                          <><ShieldOff size={10} /> Pending</>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleDelete(shout.id)}
                        className="p-2 text-gray-600 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                        title="Delete Permanently"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ShoutoutManagement;
