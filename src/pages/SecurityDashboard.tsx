import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { Shield, LogOut, CheckCircle2, Clock, Scan, Search, User } from 'lucide-react';
import { QRScanner } from '../components/security/QRScanner';
import { ScanResultOverlay } from '../components/security/ScanResultOverlay';
import { playFeedback } from '../utils/scanSounds';

interface SecurityUser {
  username: string;
  full_name: string;
}

interface ScanRecord {
  id: number;
  participant_name: string | null;
  scanned_at: string;
  scan_result: string;
  pass_type?: string;
}



export default function SecurityDashboard() {
  const navigate = useNavigate();
  const [securityUser, setSecurityUser] = useState<SecurityUser | null>(null);
  const [scanning, setScanning] = useState(false);
  const [lastScanResult, setLastScanResult] = useState<any>(null);
  const [showResultOverlay, setShowResultOverlay] = useState(false);
  const [todayCount, setTodayCount] = useState(0);
  const [recentScans, setRecentScans] = useState<ScanRecord[]>([]);
  
  // Manual Entry State
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualSearch, setManualSearch] = useState('');
  const [manualPasses, setManualPasses] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const searchManualPasses = async (query: string) => {
    if (!query.trim()) {
      setManualPasses([]);
      return;
    }
    setSearching(true);
    try {
      const { data, error } = await supabase
        .from('entry_passes')
        .select('*')
        .ilike('participant_name', `%${query}%`)
        .eq('is_used', false)
        .eq('is_active', true)
        .limit(10);
      
      if (error) throw error;
      setManualPasses(data || []);
    } catch (err) {
      console.error('Search error:', err);
      toast.error('Search failed');
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    const delay = setTimeout(() => {
      if (showManualEntry && manualSearch) {
        searchManualPasses(manualSearch);
      }
    }, 500);
    return () => clearTimeout(delay);
  }, [manualSearch, showManualEntry]);

  useEffect(() => {
    // Check if logged in
    const stored = localStorage.getItem('security_user');
    if (!stored) {
      navigate('/security-login');
      return;
    }

    setSecurityUser(JSON.parse(stored));
    loadStats();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('security_dashboard_stats')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT and DELETE
          schema: 'public',
          table: 'pass_scans'
        },
        () => {
          loadStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [navigate]);

  const loadStats = async () => {
    try {
      if (!securityUser) return;
      
      // Call RPC function to get stats (bypasses RLS)
      const { data, error } = await supabase
        .rpc('get_security_dashboard_stats', { 
          p_username: securityUser.username 
        });

      if (error) {
        console.error('Error loading stats:', error);
        return;
      }

      if (data) {
        setTodayCount(data.today_count || 0);
        setRecentScans(data.recent_scans || []);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleScan = async (passToken: string) => {
    try {
      // Call validate RPC function
      const { data, error } = await supabase
        .rpc('validate_entry_pass', { p_pass_token: passToken });

      if (error) throw error;

      setLastScanResult(data);
      setShowResultOverlay(true);
      
      if (data.valid) {
        playFeedback('success');
        toast.success(`✓ Valid Entry: ${data.name}`);
        // Reload stats
        loadStats();
      } else {
        if (data.result === 'already_used') {
          playFeedback('warning');
          toast.error(`✗ Already Used: ${data.name}`);
        } else if (data.result === 'inactive') {
          playFeedback('error');
          toast.error('✗ Pass Deactivated');
        } else {
          playFeedback('error');
          toast.error('✗ Invalid Pass');
        }
      }
    } catch (error: any) {
      console.error('Error validating pass:', error);
      playFeedback('error');
      toast.error('Validation failed');
      setLastScanResult({
        valid: false,
        result: 'error',
        message: 'System error',
      });
      setShowResultOverlay(true);
    }
  };

  const handleScanError = (error: string) => {
    console.error('Scanner error:', error);
    if (error.includes('camera') || error.includes('permission')) {
      toast.error('Camera access denied. Please allow camera permissions and refresh.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('security_user');
    navigate('/security-login');
    toast.success('Logged out successfully');
  };

  if (!securityUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-cyan-600/20 rounded-full flex items-center justify-center">
              <Shield className="w-6 h-6 text-cyan-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Security Dashboard</h1>
              <p className="text-gray-400 text-sm">{securityUser.full_name}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-400 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 border border-cyan-500/30">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-600/20 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Valid Entries Today</p>
                <p className="text-3xl font-bold text-white">{todayCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 border border-purple-500/30">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-600/20 rounded-lg flex items-center justify-center">
                <Scan className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Scanner Status</p>
                <p className="text-lg font-semibold text-white">
                  {scanning ? 'Active' : 'Ready'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Scanner Section */}
        <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 border border-cyan-500/30 mb-8">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Scan className="w-5 h-5 text-cyan-500" />
            QR Code Scanner
          </h2>

          {!scanning ? (
            <button
              onClick={() => setScanning(true)}
              className="w-full px-6 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl text-lg"
            >
              Start Scanning
            </button>
          ) : (
            <div className="space-y-4">
              <QRScanner
                onScanSuccess={handleScan}
                onScanError={handleScanError}
              />

              <button
                onClick={() => setScanning(false)}
                className="w-full px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-semibold"
              >
                Stop Scanner
              </button>
            </div>
          )}
        </div>

        {/* Manual Lookup Section */}
        <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 border border-blue-500/30 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Search className="w-5 h-5 text-blue-500" />
              Manual VIP Lookup
            </h2>
            <button
              onClick={() => setShowManualEntry(!showManualEntry)}
              className="text-blue-400 hover:text-blue-300 text-sm font-medium"
            >
              {showManualEntry ? 'Hide Lookup' : 'Show Lookup'}
            </button>
          </div>

          {showManualEntry && (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={manualSearch}
                  onChange={(e) => setManualSearch(e.target.value)}
                  placeholder="Search guest by name..."
                  className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                />
              </div>

              {manualPasses.length > 0 && (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {manualPasses.map((pass) => (
                    <div key={pass.id} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg border border-gray-600/30">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          pass.pass_type === 'vip' ? 'bg-yellow-500/20 text-yellow-500' : 'bg-blue-500/20 text-blue-500'
                        }`}>
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-white font-semibold">{pass.participant_name || 'Unnamed Guest'}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400 font-mono">{pass.pass_token}</span>
                            {pass.pass_type === 'vip' && (
                              <span className="text-[10px] bg-yellow-500/10 text-yellow-500 px-1.5 py-0.5 rounded border border-yellow-500/20 uppercase tracking-wide">VIP</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          if (window.confirm(`Check in ${pass.participant_name}?`)) {
                            handleScan(pass.pass_token);
                            setManualSearch(''); // Clear search after check-in
                          }
                        }}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors"
                      >
                        Check In
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {manualSearch && !searching && manualPasses.length === 0 && (
                <p className="text-gray-400 text-center py-4">No valid unused passes found for "{manualSearch}"</p>
              )}
            </div>
          )}
        </div>

        {/* Recent Scans */}
        <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 border border-purple-500/30">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-purple-500" />
            Recent Valid Entries
          </h2>

          {recentScans.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No entries yet today</p>
          ) : (
            <div className="space-y-2">
              {recentScans.map((scan) => (
                <div
                  key={scan.id}
                  className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg border border-gray-600/30"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-white font-semibold">
                          {scan.participant_name || 'VIP Guest'}
                        </p>
                        {scan.pass_type === 'vip' && (
                          <span className="px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-500 text-[10px] font-bold border border-yellow-500/30 uppercase tracking-wide">
                            VIP
                          </span>
                        )}
                      </div>
                      <p className="text-gray-400 text-xs">
                        {new Date(scan.scanned_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Scan Result Overlay */}
      {showResultOverlay && lastScanResult && (
        <ScanResultOverlay
          result={lastScanResult}
          onDismiss={() => {
            setShowResultOverlay(false);
            setLastScanResult(null);
          }}
          autoDismissMs={3000}
        />
      )}
    </div>
  );
}
