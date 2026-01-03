import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { Shield, LogOut, CheckCircle2, Clock, Scan, Search, User, RefreshCw, Database, AlertTriangle, XCircle } from 'lucide-react';
import { QRScanner } from '../components/security/QRScanner';
import { ScanResultOverlay } from '../components/security/ScanResultOverlay';
import { InstallPWA } from '../components/InstallPWA';
import { playFeedback } from '../utils/scanSounds';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useWakeLock } from '../hooks/useWakeLock';
import { debounce } from '../utils/debounce';
import { useData } from '../context/DataContext';
import { requestNotificationPermission, NotificationPresets, areNotificationsEnabled } from '../utils/notifications';
import {
  syncPassesFromServer,
  validatePassHybrid,
  syncPendingScansToServer,
  getSyncStats
} from '../utils/offlineStorage';

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
  guard_name?: string;
}



export default function SecurityDashboard() {
  const navigate = useNavigate();
  const { isOnline, wasOffline } = useOnlineStatus();
  const { isActive: wakeLockActive } = useWakeLock(true); // Keep screen active
  const { securitySettings } = useData();
  
  const [securityUser, setSecurityUser] = useState<SecurityUser | null>(null);
  // Scan UI State
  const [scanning, setScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false); // For success animation
  const [scanMode, setScanMode] = useState<'normal' | 'continuous'>('continuous');
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [lastScanResult, setLastScanResult] = useState<any>(null);
  const [showResultOverlay, setShowResultOverlay] = useState(false);
  const [todayCount, setTodayCount] = useState(0);
  const [recentScans, setRecentScans] = useState<ScanRecord[]>([]);
  const [sessionScans, setSessionScans] = useState<ScanRecord[]>([]); // Track session scans
  
  // Offline/Sync State
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStats, setSyncStats] = useState({ totalPasses: 0, pendingScans: 0, cacheAgeText: 'Never' });
  const [swStatus, setSwStatus] = useState<'Initializing' | 'Active' | 'Offline Ready'>('Initializing');
  
  // High-frequency scan protection
  const processingTokens = useRef<Set<string>>(new Set()); // Prevents "Success -> Rejected" race loops
  const recentSuccessTokens = useRef<Map<string, number>>(new Map());
  // Prevents "Invalid -> Invalid -> Invalid" spam (Reject Debounce)
  const recentErrorTokens = useRef<Map<string, number>>(new Map());
  
  // Manual Entry State
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualSearch, setManualSearch] = useState('');
  const [manualPasses, setManualPasses] = useState<any[]>([]);
  const [manualPassUsage, setManualPassUsage] = useState<Record<string, number[]>>({}); // PassID -> [Day1, Day2]
  const [searching, setSearching] = useState(false);
  
  // Guard Auditing - Persistent for the day
  const getStoredGuard = () => {
    const stored = localStorage.getItem('shift_guard_name');
    const date = localStorage.getItem('shift_guard_date');
    const today = new Date().toLocaleDateString();
    return (stored && date === today) ? stored : '';
  };

  const [guardName, setGuardName] = useState<string>(getStoredGuard());
  const [showShiftSetup, setShowShiftSetup] = useState(!getStoredGuard());

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
        .eq('is_active', true)
        .limit(10);
      
      if (error) throw error;
      setManualPasses(data || []);

      // Fetch usage logs for these passes to show correct status
      if (data && data.length > 0) {
        const ids = data.map(p => p.id);
        const { data: usageData } = await supabase.from('pass_scans')
           .select('pass_id, scanned_at')
           .in('pass_id', ids)
           .eq('scan_result', 'valid');
        
        if (usageData) {
          const usage: Record<string, number[]> = {};
          usageData.forEach(scan => {
            const scanDate = new Date(scan.scanned_at);
            const istDate = scanDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
            const utcDate = scanDate.toISOString().split('T')[0];

            let dayIdx = (securitySettings?.event_dates || []).indexOf(istDate);
            if (dayIdx === -1) {
              dayIdx = (securitySettings?.event_dates || []).indexOf(utcDate);
            }

            if (dayIdx !== -1) {
              if (!usage[scan.pass_id]) usage[scan.pass_id] = [];
              if (!usage[scan.pass_id].includes(dayIdx + 1)) {
                 usage[scan.pass_id].push(dayIdx + 1);
              }
            }
          });
          setManualPassUsage(usage);
        }
      }
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
  
  // Debounced sync stats loader (Performance Optimization #3)
  const debouncedLoadSyncStats = useCallback(
    debounce(async () => {
      try {
        const stats = await getSyncStats();
        setSyncStats(stats);
      } catch (error) {
        console.error('Failed to load sync stats:', error);
      }
    }, 1000),
    []
  );

  useEffect(() => {
    const initializeDashboard = async () => {
      // Check if logged in
      const stored = localStorage.getItem('security_user');
      if (!stored) {
        navigate('/security-login');
        return;
      }

      const user = JSON.parse(stored);
      setSecurityUser(user);
      
      // Request notification permission
      const granted = await requestNotificationPermission();
      if (granted) {
        console.log('✅ Notification permission granted');
      }
      
      // Lock orientation to portrait on mobile
      if ('orientation' in screen && 'lock' in screen.orientation) {
        try {
          await (screen.orientation as any).lock('portrait');
          console.log('✅ Orientation locked to portrait');
        } catch (err) {
          console.log('Orientation lock not supported or failed');
        }
      }
      
      // Log wake lock status
      if (wakeLockActive) {
        console.log('✅ Wake Lock active - screen will stay on');
      }
      
      // 🔄 AUTO-SYNC on login
      await autoSyncOnLogin();
      
      // Load stats
      await loadStats();
      await loadSyncStats();

      // Subscribe to real-time updates for cross-device coordination
      const scanChannel = supabase
        .channel('security_dashboard_stats')
        .on(
          'postgres_changes',
          {
            event: '*', // Listen for ALL events (handles deletes for resets)
            schema: 'public',
            table: 'pass_scans'
          },
          (payload: any) => {
            console.log('🔔 Scan table change:', payload);
            loadStats();
            // Update local cache if a scan was inserted
            if (payload.eventType === 'INSERT' && payload.new?.pass_token) {
              import('../utils/offlineDB').then(({ markPassAsUsedLocally }) => {
                markPassAsUsedLocally(payload.new.pass_token);
              });
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'entry_passes'
          },
          (payload) => {
            console.log('🔄 Pass updated:', payload);
            loadStats();
            // Trigger a re-sync of passes to catch deactivations/resets
            debouncedLoadSyncStats();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(scanChannel);
      };
    };
    
    initializeDashboard();

    // Check Service Worker Status for visibility
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(() => setSwStatus('Active'));
      if (navigator.serviceWorker.controller) {
        setSwStatus('Offline Ready');
      }
    }
  }, [navigate]);
  
  // Auto-sync when connection restored
  useEffect(() => {
    if (wasOffline && isOnline && securityUser) {
      console.log('🔄 Connection restored - auto-syncing...');
      toast.success('Signal Restored! Syncing data...', {
        icon: '📡',
        duration: 4000
      });
      handleAutoSyncPending();
    }
  }, [isOnline, wasOffline, securityUser]);
  
  // Listen for background sync completion from Service Worker
  useEffect(() => {
    const handleSyncMessage = (event: MessageEvent) => {
      if (event.data?.type === 'BACKGROUND_SYNC_COMPLETE') {
        const { synced, failed } = event.data;
        console.log(`📡 Background sync: ${synced} synced, ${failed} failed`);
        
        if (synced > 0) {
          toast.success(`✅ ${synced} offline scans synced automatically`);
          loadStats();
          debouncedLoadSyncStats();
        }
        
        if (failed > 0) {
          toast.error(`⚠️ ${failed} scans failed to sync`);
        }
      }
    };
    
    navigator.serviceWorker?.addEventListener('message', handleSyncMessage);
    
    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleSyncMessage);
    };
  }, []);
  

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
    if (!securityUser) return;
    
    // 1. PREVENTION: If we are already processing this EXACT token, ignore the duplicate signal
    if (processingTokens.current.has(passToken)) {
      console.log('⏳ Already processing token, ignoring duplicate...');
      return;
    }
    
    // 2. PREVENTION: Error Debounce - If this token failed validation recently (3s), ignore it
    const lastErrorTime = recentErrorTokens.current.get(passToken);
    if (lastErrorTime && Date.now() - lastErrorTime < 3000) {
      console.log('🔇 Token recently rejected, suppressing spam...');
      return;
    }

    // 2. PREVENTION: If this token was successfully scanned in the last 5 seconds, ignore it
    // This prevents the "Success -> Rejected (Already Used)" loop
    const lastSuccessTime = recentSuccessTokens.current.get(passToken);
    if (lastSuccessTime && Date.now() - lastSuccessTime < 5000) {
      console.log('🛡️ Token recently successful, ignoring redundant scan...');
      return;
    }

    processingTokens.current.add(passToken);
    
    // In continuous mode, we DON'T stop scanning while processing
    // This allows the camera to stay active behind the overlay
    
    try {
      // Use hybrid validation (online-first, offline fallback)
      const result = await validatePassHybrid(
        passToken,
        securityUser.username,
        isOnline,
        guardName
      );

      setLastScanResult(result);
      setShowResultOverlay(true);
      
      if (result.valid) {
        // UX: Success animation
        setScanSuccess(true);
        setTimeout(() => setScanSuccess(false), 500);
        
        playFeedback('success');
        toast.success(`✓ Valid Entry: ${result.name}`);
        
        // Show notification if enabled
        if (areNotificationsEnabled()) {
          NotificationPresets.validEntry(result.name || 'Unknown', result.pass_type || 'standard');
        }
        
        // Add to session scans (for history)
        setSessionScans(prev => [{
          id: Date.now(),
          participant_name: result.name || 'Unknown',
          scanned_at: new Date().toISOString(),
          scan_result: 'valid',
          pass_type: result.pass_type
        }, ...prev].slice(0, 10)); // Keep last 10
        
        // Mark as recently successful to prevent double-scan jitter
        recentSuccessTokens.current.set(passToken, Date.now());
        // Periodic cleanup of the success map
        setTimeout(() => recentSuccessTokens.current.delete(passToken), 6000);

        // Reload stats (debounced)
        await loadStats();
        debouncedLoadSyncStats();
      } else {
        if (result.result === 'already_used') {
          playFeedback('warning');
          toast.error(`✗ Already Used: ${result.name}`);
          
          if (areNotificationsEnabled()) {
            NotificationPresets.duplicateAttempt(result.name || 'Unknown');
          }
        } else if (result.result === 'inactive') {
          playFeedback('error');
          toast.error('✗ Pass Deactivated');
          
          if (areNotificationsEnabled()) {
            NotificationPresets.invalidPass('Pass has been deactivated');
          }
        } else if (result.result === 'rule_violation') {
          playFeedback('error');
          toast.error(`✗ ${result.message}`);
          
          if (areNotificationsEnabled()) {
            NotificationPresets.ruleViolation('Validation Rule', result.message);
          }
        } else {
          playFeedback('error');
          toast.error('✗ Invalid Pass');
        }
        
        // Add to Recent Error Map to throttle redundant validation
        recentErrorTokens.current.set(passToken, Date.now());
        setTimeout(() => recentErrorTokens.current.delete(passToken), 3000);
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
    } finally {
      processingTokens.current.delete(passToken);
      if (scanMode !== 'continuous') {
        setScanning(false);
      }
    }
  };
  
  // Manual lookup handler
  const handleManualLookup = async () => {
    if (!manualSearch.trim()) return;
    
    setSearching(true);
    try {
      const { data, error } = await supabase
        .from('entry_passes')
        .select('*')
        .ilike('participant_name', `%${manualSearch}%`)
        .eq('is_active', true);
      
      if (error) throw error;
      
      setManualPasses(data || []);
    } catch (error) {
      console.error('Manual lookup error:', error);
      toast.error('Search failed');
      setManualPasses([]);
    } finally {
      setSearching(false);
    }
  };
  
  // Auto-sync passes on login
  const autoSyncOnLogin = async () => {
    setIsSyncing(true);
    try {
      const result = await syncPassesFromServer();
      
      if (result.success) {
        toast.success(`✓ ${result.count} passes synced automatically`);
      } else {
        // Show warning but don't block - can still work online
        console.warn('Auto-sync failed:', result.error);
        toast.error(result.error || 'Failed to sync passes', {
          duration: 5000,
          icon: '⚠️'
        });
        // Still load sync stats to show current state
        await loadSyncStats();
      }
    } catch (error) {
      console.error('Auto-sync error:', error);
      toast.error('Auto-sync failed. You can still scan online.', {
        duration: 5000
      });
    } finally {
      setIsSyncing(false);
    }
  };
  
  // Manual sync passes
  const handleSyncPasses = async () => {
    setIsSyncing(true);
    try {
      const result = await syncPassesFromServer();
      
      if (result.success) {
        toast.success(`✓ ${result.count} passes synced`);
        await loadSyncStats();
      } else {
        toast.error(result.error || 'Sync failed');
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Sync failed');
    } finally {
      setIsSyncing(false);
    }
  };
  
  // Auto-sync pending scans
  const handleAutoSyncPending = async () => {
    if (!securityUser || !isOnline) return;
    
    try {
      const result = await syncPendingScansToServer(securityUser.username);
      
      if (result.synced > 0) {
        toast.success(`✓ ${result.synced} scans synced`);
        await loadStats();
        await loadSyncStats();
      }
      
      if (result.failed > 0) {
        toast.error(`${result.failed} scans failed to sync`);
      }
    } catch (error) {
      console.error('Pending sync error:', error);
    }
  };
  
  // Load sync statistics (non-debounced for immediate updates)
  const loadSyncStats = async () => {
    try {
      const stats = await getSyncStats();
      setSyncStats(stats);
    } catch (error) {
      console.error('Failed to load sync stats:', error);
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
    // Keep guard name for the day so they aren't asked again
    // sessionStorage.removeItem('shift_guard_name');
    navigate('/security-login');
    toast.success('Logged out successfully');
  };

  const handleShiftSetup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guardName.trim()) {
      toast.error('Please enter your name');
      return;
    }
    localStorage.setItem('shift_guard_name', guardName);
    localStorage.setItem('shift_guard_date', new Date().toLocaleDateString());
    setShowShiftSetup(false);
    toast.success(`Shift started: ${guardName}`);
  };

  if (!securityUser) {
    return null;
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <style>{`
          @keyframes pulse-ring {
            0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.7); }
            70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(37, 99, 235, 0); }
            100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(37, 99, 235, 0); }
          }
          .animate-pulse-premium {
            animation: pulse-ring 2s infinite;
          }
        `}</style>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 md:w-10 md:h-10 text-cyan-500" />
            <div>
              <h1 className="text-xl md:text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                Security Dashboard
              </h1>
              <div className="flex items-center gap-2">
                <p className="text-sm md:text-base text-gray-400">Welcome, {securityUser?.username}</p>
                {guardName && (
                  <span className="text-sm md:text-base text-cyan-400 font-medium">
                    • Guard: {guardName}
                  </span>
                )}
                <div className="flex items-center gap-1.5 ml-1 bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20">
                  <div className={`w-1.5 h-1.5 rounded-full bg-green-500 ${syncStats.pendingScans > 0 ? 'animate-bounce' : 'animate-pulse'}`} />
                  <span className="text-[10px] text-green-400 uppercase font-black tracking-tighter">
                    Worker: {syncStats.pendingScans > 0 ? `Syncing ${syncStats.pendingScans}...` : swStatus}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors text-sm md:text-base"
          >
            <LogOut className="w-4 h-4 md:w-5 md:h-5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>

        {/* Scanner Section - Moved to Top */}
        <div className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl rounded-2xl p-6 md:p-10 shadow-2xl border border-cyan-500/20 relative overflow-hidden">
          {/* Decorative background glow */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          
          {/* Success Animation Overlay */}
          {scanSuccess && (
            <div className="absolute inset-0 bg-green-500/20 rounded-2xl animate-pulse pointer-events-none z-10" />
          )}
          
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-cyan-500/20 rounded-2xl flex items-center justify-center border border-cyan-500/30">
                <Scan className="w-8 h-8 md:w-10 md:h-10 text-cyan-500" />
              </div>
              <div>
                <h2 className="text-2xl md:text-4xl font-black text-white tracking-tight">QR Scanner</h2>
                <div className="flex items-center gap-2">
                  <p className="text-cyan-400 font-medium text-sm md:text-base uppercase tracking-wider">Entry Validation System</p>
                  <div className="flex items-center gap-1.5 bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20">
                    <div className={`w-2 h-2 rounded-full bg-green-500 ${syncStats.pendingScans > 0 ? 'animate-bounce' : 'animate-pulse'}`} />
                    <span className="text-[10px] md:text-xs text-green-400 uppercase font-black tracking-tighter">
                      System {isOnline ? 'Online' : 'Offline'} • {syncStats.pendingScans > 0 ? `Syncing ${syncStats.pendingScans}` : 'All Synced'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setScanning(!scanning)}
              className={`w-full md:w-auto px-10 py-5 rounded-2xl font-black text-xl transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-4 shadow-2xl ${
                scanning
                  ? 'bg-red-600 hover:bg-red-700 text-white border-b-4 border-red-800'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white border-b-4 border-indigo-900 animate-pulse-premium'
              }`}
            >
              {scanning ? (
                <>
                  <XCircle className="w-8 h-8" />
                  Stop Scanning
                </>
              ) : (
                <>
                  <Scan className="w-8 h-8" />
                  Start Scanning
                </>
              )}
            </button>
          </div>

          
          {/* Session Summary mini-stat (added for premium feel) */}
          {!scanning && sessionScans.length > 0 && (
            <div className="mt-6 flex items-center gap-3 px-4 py-2 bg-white/5 rounded-xl border border-white/10 w-fit">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              <span className="text-gray-300 text-sm font-medium">
                <span className="text-white font-bold">{sessionScans.length}</span> scans performed this session
              </span>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
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
          
          {/* System Health / Worker Status */}
          <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 border border-green-500/30">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                syncStats.pendingScans > 0 ? 'bg-orange-600/20' : 'bg-green-600/20'
              }`}>
                <Database className={`w-6 h-6 ${
                  syncStats.pendingScans > 0 ? 'text-orange-500 animate-bounce' : 'text-green-500 animate-pulse'
                }`} />
              </div>
              <div className="flex-1">
                <p className="text-gray-400 text-sm">Offline Worker</p>
                <div className="flex items-center justify-between">
                  <p className={`text-lg font-bold ${
                    syncStats.pendingScans > 0 ? 'text-orange-400' : 'text-green-400'
                  }`}>
                    {syncStats.pendingScans > 0 ? `Syncing (${syncStats.pendingScans})` : swStatus}
                  </p>
                  <span className="text-[10px] text-gray-500 font-mono italic">
                    {syncStats.totalPasses} cached • Updated {syncStats.cacheAgeText}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Sync Stats Card */}
        <div className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 backdrop-blur-lg rounded-xl p-6 border border-blue-500/30 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Database className="w-6 h-6 text-blue-400" />
              <h3 className="text-lg font-bold text-white">Offline Cache</h3>
            </div>
            <button
              onClick={handleSyncPasses}
              disabled={isSyncing || !isOnline}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-semibold text-sm"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing...' : 'Refresh Passes'}
            </button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white/5 rounded-lg p-4">
              <p className="text-gray-400 text-sm mb-1">Cached Passes</p>
              <p className="text-2xl font-bold text-white">{syncStats.totalPasses}</p>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <p className="text-gray-400 text-sm mb-1">Pending Sync</p>
              <p className={`text-2xl font-bold ${
                syncStats.pendingScans > 0 ? 'text-orange-400' : 'text-white'
              }`}>{syncStats.pendingScans}</p>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <p className="text-gray-400 text-sm mb-1">Last Synced</p>
              <p className="text-lg font-semibold text-white">{syncStats.cacheAgeText}</p>
            </div>
          </div>
          
          {syncStats.pendingScans > 0 && isOnline && (
            <div className="mt-4 bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-orange-400 text-sm font-semibold">
                  {syncStats.pendingScans} scans pending upload
                </p>
              </div>
              <button
                onClick={handleAutoSyncPending}
                className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded text-sm font-semibold"
              >
                Sync Now
              </button>
            </div>
          )}
          
          {!isOnline && syncStats.totalPasses === 0 && (
            <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <p className="text-red-400 text-sm font-semibold">
                No cached data. Connect to internet to sync passes.
              </p>
            </div>
          )}
        </div>

        {/* Smart Scanning Mode Controls */}
        <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 rounded-xl p-4 md:p-6 border border-purple-500/30 mb-6 md:mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2 md:gap-3">
              <Scan className="w-5 h-5 md:w-6 md:h-6 text-purple-400" />
              <h2 className="text-lg md:text-xl font-bold text-white">Scanning Mode</h2>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={() => setScanMode('normal')}
                className={`flex-1 sm:flex-none px-3 md:px-4 py-2 rounded-lg font-semibold transition-all text-sm md:text-base ${
                  scanMode === 'normal'
                    ? 'bg-cyan-600 text-white'
                    : 'bg-white/10 text-gray-400 hover:bg-white/20'
                }`}
              >
                Normal
              </button>
              <button
                onClick={() => setScanMode('continuous')}
                className={`flex-1 sm:flex-none px-3 md:px-4 py-2 rounded-lg font-semibold transition-all text-sm md:text-base ${
                  scanMode === 'continuous'
                    ? 'bg-purple-600 text-white'
                    : 'bg-white/10 text-gray-400 hover:bg-white/20'
                }`}
              >
                Continuous
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white/5 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-semibold">Auto-Advance</p>
                  <p className="text-gray-400 text-sm">Auto-dismiss results after scan</p>
                </div>
                <button
                  onClick={() => setAutoAdvance(!autoAdvance)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    autoAdvance ? 'bg-green-500' : 'bg-gray-600'
                  }`}
                >
                  <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    autoAdvance ? 'transform translate-x-6' : ''
                  }`} />
                </button>
              </div>
            </div>
            
            <div className="bg-white/5 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-semibold">Session Scans</p>
                  <p className="text-gray-400 text-sm">{sessionScans.length} scans this session</p>
                </div>
                <div className="text-2xl font-bold text-cyan-400">{sessionScans.length}</div>
              </div>
            </div>
          </div>
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

          {showManualEntry && !scanning && (
            <div className="bg-gray-800/30 rounded-xl p-4 md:p-6 border border-gray-700">
              <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
                <Search className="w-5 h-5 md:w-6 md:h-6 text-purple-400" />
                <h3 className="text-lg md:text-xl font-semibold text-white">Manual Lookup</h3>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 md:gap-3 mb-3 md:mb-4">
                <input
                  type="text"
                  placeholder="Search participant name..."
                  value={manualSearch}
                  onChange={(e) => setManualSearch(e.target.value)}
                  className="flex-1 px-4 py-2 md:py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 text-sm md:text-base"
                />
                <button
                  onClick={handleManualLookup}
                  disabled={searching || !manualSearch.trim()}
                  className="w-full sm:w-auto px-4 md:px-6 py-2 md:py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 text-sm md:text-base"
                >
                  {searching ? (
                    <>
                      <RefreshCw className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4 md:w-5 md:h-5" />
                      Search
                    </>
                  )}
                </button>
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
                      <div className="flex flex-col items-end gap-2">
                        {(() => {
                          const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
                          const currentDayIdx = (securitySettings?.event_dates || []).indexOf(todayIST);
                          const currentDayNum = currentDayIdx !== -1 ? currentDayIdx + 1 : null;
                          const isUsed = (pass.pass_type === 'vip' ? (currentDayNum && manualPassUsage[pass.id]?.includes(currentDayNum)) : pass.is_used);

                          return (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black tracking-widest whitespace-nowrap border ${
                              isUsed
                                ? 'bg-red-500/10 text-red-500 border-red-500/20'
                                : 'bg-green-500/10 text-green-400 border-green-500/20'
                            }`}>
                              {isUsed ? 'CHECKED IN' : 'VALID'}
                            </span>
                          );
                        })()}
                        <button
                          onClick={() => {
                            if (window.confirm(`Check in ${pass.participant_name}?`)) {
                              handleScan(pass.pass_token);
                              setManualSearch(''); // Clear search after check-in
                            }
                          }}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg transition-colors"
                        >
                          Check In
                        </button>
                      </div>
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
                        {scan.guard_name && (
                          <span className="ml-2 text-cyan-500 font-medium">
                            • {scan.guard_name}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        
        {/* PWA Install Prompt */}
        <InstallPWA />
      </div>
      {/* Shift Setup Modal */}
      {showShiftSetup && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-cyan-500/30 rounded-2xl p-6 md:p-8 max-w-md w-full shadow-[0_0_50px_rgba(6,182,212,0.1)]">
            <div className="flex flex-col items-center text-center gap-4 mb-6">
              <div className="w-16 h-16 bg-cyan-500/20 rounded-2xl flex items-center justify-center">
                <User className="w-8 h-8 text-cyan-500" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white">Shift Setup</h3>
                <p className="text-gray-400 mt-1">Please enter your name to begin scanning</p>
              </div>
            </div>

            <form onSubmit={handleShiftSetup} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Guard Name
                </label>
                <input
                  type="text"
                  required
                  value={guardName}
                  onChange={(e) => setGuardName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-medium"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                className="w-full py-4 bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white rounded-xl font-bold text-lg shadow-lg shadow-cyan-900/20 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
              >
                Start Scanning
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Truly Full-Screen Immersive Scanner */}
      {scanning && (
        <div className="fixed inset-0 z-[100] bg-black overflow-hidden">
          <QRScanner
            onScanSuccess={handleScan}
            onScanError={handleScanError}
            onClose={() => setScanning(false)}
          />
        </div>
      )}
    </div>

    {/* EXTREME FULL-SCREEN OVERLAYS (Outside main container to bypass CSS containment) */}
    {scanning && (
      <div className="fixed inset-0 z-[100] bg-black overflow-hidden">
        <QRScanner
          onScanSuccess={handleScan}
          onScanError={handleScanError}
          onClose={() => setScanning(false)}
        />
      </div>
    )}

    {showResultOverlay && lastScanResult && (
      <div className="fixed inset-0 z-[110]">
        <ScanResultOverlay
          result={lastScanResult}
          onDismiss={() => {
            setShowResultOverlay(false);
            setLastScanResult(null);
          }}
          autoDismissMs={autoAdvance ? (lastScanResult.valid ? 15000 : 7000) : 0}
        />
      </div>
    )}
  </>
  );
}
