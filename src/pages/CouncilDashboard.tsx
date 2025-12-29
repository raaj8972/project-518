import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { BarChart3, Users, QrCode, LogOut, Loader2, LayoutDashboard, ChevronRight, ChevronDown, Clock, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

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
}

export default function CouncilDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const navigate = useNavigate();

  const loadStats = async () => {
    const password = sessionStorage.getItem('council_auth');
    if (!password) {
      navigate('/council');
      return;
    }

    try {
      const { data, error } = await supabase.rpc('get_council_dashboard_stats', { p_password: password });
      if (error) throw error;
      setStats(data);
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes('password') || err.message?.includes('configure') || err.message?.includes('Invalid password')) {
         toast.error(err.message);
         sessionStorage.removeItem('council_auth');
         navigate('/council');
      } else {
         toast.error('Failed to update stats');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    const interval = setInterval(() => {
        const password = sessionStorage.getItem('council_auth');
        if(password) {
            supabase.rpc('get_council_dashboard_stats', { p_password: password })
            .then(({ data, error }) => {
                if(!error && data) setStats(data);
            });
        }
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem('council_auth');
    navigate('/council');
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
      <div className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <div className="flex items-center gap-3 mb-1">
             <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
               <LayoutDashboard className="w-6 h-6 text-white" />
             </div>
             <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
               Council Dashboard
             </h1>
           </div>
           <p className="text-gray-400 text-sm ml-13">Real-time Event Analytics & Registration Monitoring</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-2 flex items-center text-xs text-gray-400">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
            LIVE UPDATES
          </div>
          <button 
            onClick={handleLogout}
            className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-4 py-2 rounded-lg flex items-center gap-2 text-sm transition-all hover:scale-105 active:scale-95"
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
          <div className="bg-gray-900/50 border border-gray-800 rounded-3xl p-8 backdrop-blur-sm">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-3">
                <BarChart3 className="w-6 h-6 text-blue-400" />
                Event-wise Analysis
              </h2>
              <span className="text-xs text-gray-500 uppercase tracking-widest font-bold">Registration Counts</span>
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
    </div>
  );
}
