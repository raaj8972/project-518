import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { BarChart3, Users, QrCode, LogOut, Loader2, LayoutDashboard, ChevronRight, ChevronDown, Clock, CheckCircle2, Plus, Trash, Eye, X, ShieldAlert } from 'lucide-react';
import { QRCodeGenerator } from '../components/admin/QRCodeGenerator';
import toast from 'react-hot-toast';

interface VipPass {
  pass_id: string;
  participant_name: string | null;
  pass_type: string;
  created_at: string;
  notes: string | null;
  pass_token: string;
  is_used: boolean;
  is_active: boolean;
  usage_logs: string[]; // Array of scan timestamps
}

interface DashboardStats {
  total_registrations: number;
  batch_stats: { batch: string; count: number }[];
  event_stats: { 
    event_name: string; 
    count: number;
    batch_breakdown: { batch: string; count: number }[];
  }[];
  scan_stats: {
    total_valid: number;
    valid_today: number;
  };
  recent_scans: {
    id: number;
    participant_name: string;
    pass_type: string;
    scanned_at: string;
  }[];
  event_dates: string[]; // Array of event dates for day-wise tracking
}

export default function CouncilDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [vipPasses, setVipPasses] = useState<VipPass[]>([]);
  const [showVipModal, setShowVipModal] = useState(false);
  const [showCreateVip, setShowCreateVip] = useState(false);
  const [newVip, setNewVip] = useState({ name: '', notes: '' });
  const [selectedPass, setSelectedPass] = useState<VipPass | null>(null);
  const [vipLoading, setVipLoading] = useState(false);
  const navigate = useNavigate();

  const loadStats = async () => {
    const password = sessionStorage.getItem('council_auth');
    if (!password) {
      React.startTransition(() => {
        navigate('/council');
      });
      return;
    }

    try {
      const { data, error } = await supabase.rpc('get_council_dashboard_stats_v3', { p_password: password });
      if (error) throw error;
      setStats(data);
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes('password') || err.message?.includes('configure') || err.message?.includes('Invalid password')) {
         toast.error(err.message);
         sessionStorage.removeItem('council_auth');
         React.startTransition(() => {
           navigate('/council');
         });
      } else {
         toast.error('Failed to update stats');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadVipPasses = async () => {
    try {
      const password = sessionStorage.getItem('council_auth');
      if (!password) return;

      const { data, error } = await supabase.rpc('get_council_vip_passes_v3', { 
        p_password: password 
      });
      
      if (error) throw error;
      setVipPasses(data || []);
    } catch (err: any) {
      console.error('Error loading VIP passes:', err);
      console.error('Error details:', { message: err.message, code: err.code, details: err.details, hint: err.hint });
      toast.error(err.message || 'Failed to load VIP passes');
    }
  };

  const handleCreateVIP = async (e: React.FormEvent) => {
    e.preventDefault();
    setVipLoading(true);
    try {
      const password = sessionStorage.getItem('council_auth');
      if (!password) throw new Error('Not authenticated');

      const { error } = await supabase.rpc('create_vip_pass_v3', {
        p_council_password: password,
        p_name: newVip.name || null,
        p_notes: newVip.notes || null
      });

      if (error) throw error;

      toast.success('VIP pass created successfully');
      setNewVip({ name: '', notes: '' });
      setShowCreateVip(false);
      await loadVipPasses();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create VIP pass');
    } finally {
      setVipLoading(false);
    }
  };

  const handleDeleteVIPPass = async (id: string, name: string | null) => {
    const displayName = name || 'Unnamed VIP';
    if (!window.confirm(`Are you sure you want to delete the VIP pass for "${displayName}"?`)) return;
    try {
      const password = sessionStorage.getItem('council_auth');
      if (!password) throw new Error('Not authenticated');

      const { error } = await supabase.rpc('delete_entry_pass_v3', { 
        p_council_password: password,
        p_pass_id: id
      });
      if (error) throw error;
      toast.success('VIP pass deleted');
      await loadVipPasses();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to delete pass');
    }
  };

  useEffect(() => {
    loadStats();
    loadVipPasses();

    // Real-time synchronization for deletes/updates
    const channel = supabase
      .channel('council_dashboard_sync')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'pass_scans' 
      }, () => {
        loadStats();
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'entry_passes' 
      }, () => {
        loadStats();
        loadVipPasses();
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'registrations' 
      }, () => {
        loadStats();
      })
      .subscribe();

    const interval = setInterval(() => {
        const password = sessionStorage.getItem('council_auth');
        if(password) {
            supabase.rpc('get_council_dashboard_stats_v3', { p_password: password })
            .then(({ data, error }) => {
                if(!error && data) setStats(data);
            });
        }
    }, 30000);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

   const handleLogout = () => {
    sessionStorage.removeItem('council_auth');
    React.startTransition(() => {
      navigate('/council');
    });
  };

  if (loading && !stats) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  const batchStats = stats?.batch_stats || [];
  const eventStats = stats?.event_stats || [];

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8 font-sans selection:bg-purple-500/30">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex-1">
           <div className="flex items-center gap-3 mb-2">
             <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20 flex-shrink-0">
               <LayoutDashboard className="w-6 h-6 md:w-7 md:h-7 text-white" />
             </div>
             <h1 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 flex-1">
               Council Dashboard
             </h1>
           </div>
           <p className="text-gray-400 text-xs md:text-sm ps-13 md:ps-15">Real-time Event Analytics & Registration Monitoring</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <div className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-1.5 md:px-4 md:py-2 flex items-center text-[10px] md:text-xs text-gray-400">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
            LIVE
          </div>
          <button 
            onClick={() => setShowVipModal(true)}
            className="bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 px-3 py-1.5 md:px-4 md:py-2 rounded-lg flex items-center gap-2 text-xs md:text-sm transition-all hover:scale-105"
          >
            <ShieldAlert className="w-4 h-4" />
            VIP Passes
          </button>
          <button 
            onClick={handleLogout}
            className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-3 py-1.5 md:px-4 md:py-2 rounded-lg flex items-center gap-2 text-xs md:text-sm transition-all hover:scale-105 active:scale-95"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Summaries & Event Drill-down */}
        <div className="lg:col-span-2 space-y-8">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-gray-900/50 border border-gray-800 p-6 rounded-3xl backdrop-blur-sm group hover:border-purple-500/50 transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400 group-hover:scale-110 transition-transform">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-bold mb-1">{stats?.total_registrations || 0}</div>
              <div className="text-gray-400 text-sm font-medium">Total Registrations</div>
            </div>

            <div className="bg-gray-900/50 border border-gray-800 p-6 rounded-3xl backdrop-blur-sm group hover:border-pink-500/50 transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-pink-500/10 rounded-lg text-pink-400 group-hover:scale-110 transition-transform">
                  <QrCode className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-bold mb-1">{stats?.scan_stats.valid_today || 0}</div>
              <div className="text-gray-400 text-sm font-medium">Scans Today</div>
            </div>

            <div className="bg-gray-900/50 border border-gray-800 p-6 rounded-3xl backdrop-blur-sm group hover:border-blue-500/50 transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400 group-hover:scale-110 transition-transform">
                  <QrCode className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-bold mb-1">{stats?.scan_stats.total_valid || 0}</div>
              <div className="text-gray-400 text-sm font-medium">Total Valid Scans</div>
            </div>
          </div>

          {/* Event Analysis */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-3xl p-5 md:p-8 backdrop-blur-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-3">
                <BarChart3 className="w-6 h-6 text-blue-400" />
                Event Analysis
              </h2>
              <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Registration Counts</span>
            </div>
            
            <div className="space-y-4 max-h-[1200px] overflow-y-auto pr-2 custom-scrollbar">
               {eventStats.map((item, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => setExpandedEvent(expandedEvent === item.event_name ? null : item.event_name)}
                    className={`bg-black/40 border rounded-2xl p-5 cursor-pointer group transition-all duration-500 ${expandedEvent === item.event_name ? 'border-blue-500/50 bg-black/80 shadow-2xl shadow-blue-500/10 ring-1 ring-blue-500/20' : 'border-gray-800 hover:bg-black/60 hover:border-gray-700'}`}
                  >
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded-lg transition-colors ${expandedEvent === item.event_name ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-800 text-gray-500 group-hover:text-gray-300'}`}>
                          {expandedEvent === item.event_name ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </div>
                        <span className={`font-semibold transition-colors ${expandedEvent === item.event_name ? 'text-white text-lg' : 'text-gray-300 group-hover:text-white'}`}>{item.event_name}</span>
                      </div>
                      <div className="text-right">
                        <span className={`text-2xl font-black font-mono transition-all ${expandedEvent === item.event_name ? 'text-blue-400' : 'text-gray-400 group-hover:text-blue-400'}`}>
                          {item.count}
                        </span>
                      </div>
                    </div>
                    
                    <div className="h-1.5 w-full bg-gray-900 rounded-full overflow-hidden mb-1">
                       <div 
                         className={`h-full rounded-full transition-all duration-1000 ${expandedEvent === item.event_name ? 'bg-gradient-to-r from-blue-500 to-cyan-400 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'bg-gray-700'}`} 
                         style={{ width: `${Math.min((item.count / (stats?.total_registrations || 1)) * 100, 100)}%` }} 
                       ></div>
                    </div>

                    {/* Drill-down: Batch Breakdown for this event */}
                    {expandedEvent === item.event_name && (
                      <div className="mt-6 pt-6 border-t border-gray-800/50 space-y-5 animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Batch breakdown for this event</span>
                          <span className="text-[10px] text-blue-400 font-bold bg-blue-500/10 px-2 py-0.5 rounded">DYNAMIC VIEW</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                          {item.batch_breakdown?.map((batch, bidx) => (
                            <div key={bidx} className="flex flex-col gap-2">
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-gray-400 font-medium">{batch.batch}</span>
                                <span className="text-white font-black bg-white/5 px-2 py-0.5 rounded min-w-[30px] text-center">{batch.count}</span>
                              </div>
                              <div className="h-1 w-full bg-gray-900 rounded-full overflow-hidden">
                                <div 
                                  className="bg-gradient-to-r from-blue-600/60 to-cyan-500/60 h-full rounded-full transition-all duration-1000 delay-300"
                                  style={{ width: `${Math.min((batch.count / (item.count || 1)) * 100, 100)}%` }}
                                ></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
               ))}
               {eventStats.length === 0 && (
                 <div className="text-center py-20 text-gray-600 border border-gray-800 border-dashed rounded-3xl bg-gray-900/20">
                   <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
                   <p className="font-medium">No event registrations found.</p>
                 </div>
               )}
            </div>
          </div>
        </div>

        {/* Right Column: Global Batch Breakdown & Recent Activity */}
        <div className="space-y-8">
          {/* Global Batches */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-3xl p-8 backdrop-blur-sm">
            <h2 className="text-xl font-bold text-white mb-8 flex items-center gap-3">
              <Users className="w-6 h-6 text-purple-400" />
              Global Batches
            </h2>
            
            <div className="space-y-6 text-sm">
               {batchStats.map((item, idx) => (
                  <div key={idx} className="group">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-400 group-hover:text-purple-400 transition-colors uppercase tracking-tight font-bold text-[11px]">{item.batch || 'Other'}</span>
                      <span className="text-lg font-bold text-white">{item.count}</span>
                    </div>
                    <div className="h-2 w-full bg-gray-900 rounded-full overflow-hidden">
                       <div 
                         className="bg-gradient-to-r from-purple-600 to-pink-600 h-full rounded-full transition-all duration-1000" 
                         style={{ width: `${Math.min((item.count / (stats?.total_registrations || 1)) * 100, 100)}%` }} 
                       ></div>
                    </div>
                  </div>
               ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-3xl p-8 backdrop-blur-sm">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
              <Clock className="w-6 h-6 text-pink-500" />
              Recent Valid Entries
            </h2>
            
            <div className="space-y-4">
               {(stats?.recent_scans || []).map((scan, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-black/40 border border-gray-800 rounded-2xl group hover:border-pink-500/30 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-500/10 rounded-lg text-green-500">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-200 truncate max-w-[120px]">{scan.participant_name || 'Guest'}</p>
                        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-tighter">
                          {new Date(scan.scanned_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    {scan.pass_type === 'vip' && (
                      <span className="text-[9px] bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-1.5 py-0.5 rounded font-black tracking-widest">VIP</span>
                    )}
                  </div>
               ))}
               {(stats?.recent_scans || []).length === 0 && (
                 <p className="text-gray-500 text-center py-8 text-sm italic">No recent scans recorded</p>
               )}
            </div>
          </div>
        </div>
      </div>

      {/* VIP Management Modal */}
      {showVipModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowVipModal(false)} />
          <div className="relative bg-gray-900 border border-gray-800 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-4 md:p-6 border-b border-gray-800 flex items-center justify-between bg-black/20">
              <h2 className="text-lg md:text-xl font-bold flex items-center gap-3">
                <ShieldAlert className="w-5 h-5 md:w-6 md:h-6 text-purple-400" />
                VIP Management
              </h2>
              <button 
                onClick={() => setShowVipModal(false)}
                className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5 md:w-6 md:h-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6 custom-scrollbar">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <p className="text-gray-400 text-xs md:text-sm">Create and manage exclusive VIP entry passes.</p>
                <button
                  onClick={() => setShowCreateVip(!showCreateVip)}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-purple-600/20"
                >
                  <Plus className="w-4 h-4" />
                  Generate VIP
                </button>
              </div>

              {showCreateVip && (
                <form onSubmit={handleCreateVIP} className="bg-black/40 border border-purple-500/20 rounded-2xl p-6 space-y-4 animate-in fade-in slide-in-from-top-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">VIP Name</label>
                    <input
                      type="text"
                      placeholder="e.g. John Doe"
                      value={newVip.name}
                      onChange={(e) => setNewVip({ ...newVip, name: e.target.value })}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 focus:border-purple-500 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Notes (Optional)</label>
                    <textarea
                      placeholder="Context for this VIP pass..."
                      value={newVip.notes}
                      onChange={(e) => setNewVip({ ...newVip, notes: e.target.value })}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 focus:border-purple-500 outline-none transition-all resize-none h-24"
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      type="submit"
                      disabled={vipLoading}
                      className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all"
                    >
                      {vipLoading ? 'Generating...' : 'Confirm Generation'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCreateVip(false)}
                      className="bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold py-3 px-6 rounded-xl transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-3">
                {vipPasses.length === 0 ? (
                  <div className="text-center py-12 border border-gray-800 border-dashed rounded-2xl">
                    <p className="text-gray-500 italic">No VIP passes generated yet.</p>
                  </div>
                ) : (
                  vipPasses.map((pass) => {
                    // Calculate which days this pass was used
                    const usedDays: number[] = [];
                    const eventDates = stats?.event_dates || [];
                    
                    if (pass.usage_logs && pass.usage_logs.length > 0 && eventDates.length > 0) {
                      pass.usage_logs.forEach((scanTimestamp) => {
                        const scanDate = new Date(scanTimestamp);
                        const istDate = scanDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
                        const utcDate = scanDate.toISOString().split('T')[0];
                        
                        let dayIdx = eventDates.indexOf(istDate);
                        if (dayIdx === -1) {
                          dayIdx = eventDates.indexOf(utcDate);
                        }
                        
                        if (dayIdx !== -1 && !usedDays.includes(dayIdx + 1)) {
                          usedDays.push(dayIdx + 1);
                        }
                      });
                    }

                    return (
                      <div key={pass.pass_id} className="bg-black/40 border border-gray-800 rounded-2xl p-4 flex items-center justify-between group hover:border-purple-500/30 transition-all">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <p className="font-bold text-gray-200 truncate">{pass.participant_name || 'Unnamed VIP'}</p>
                            <span className={`text-[9px] md:text-[10px] px-2 py-0.5 rounded-full font-black tracking-widest ${pass.is_used ? 'bg-blue-500/10 text-blue-500' : 'bg-green-500/10 text-green-500'}`}>
                              {pass.is_used ? 'CHECKED IN' : 'VALID'}
                            </span>
                            {usedDays.length > 0 && (
                              <div className="flex gap-1">
                                {usedDays.sort((a, b) => a - b).map((day) => (
                                  <span key={day} className="text-[8px] md:text-[9px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-black">
                                    Day {day}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <p className="text-[10px] md:text-xs text-gray-500 truncate">Token: <span className="font-mono">{pass.pass_token}</span></p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedPass(pass)}
                            className="p-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-all"
                            title="View & Download QR"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteVIPPass(pass.pass_id, pass.participant_name)}
                            className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg transition-all"
                            title="Delete Pass"
                          >
                            <Trash className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR Viewer Modal */}
      {selectedPass && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setSelectedPass(null)} />
          <div className="relative bg-gray-900 border border-gray-800 rounded-3xl p-8 w-full max-w-sm flex flex-col items-center">
            <button 
              onClick={() => setSelectedPass(null)}
              className="absolute top-4 right-4 p-2 hover:bg-gray-800 rounded-lg text-gray-400"
            >
              <X className="w-6 h-6" />
            </button>
            <QRCodeGenerator 
              passToken={selectedPass.pass_token}
              participantName={selectedPass.participant_name}
              passType="VIP Entry Pass"
              size={200}
            />
          </div>
        </div>
      )}
    </div>
  );
}
