import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { Shield, LogOut, CheckCircle2, XCircle, Clock, Scan } from 'lucide-react';
import { QRScanner } from '../components/security/QRScanner';

interface SecurityUser {
  username: string;
  full_name: string;
}

interface ScanRecord {
  id: number;
  participant_name: string | null;
  scanned_at: string;
  scan_result: string;
}

export default function SecurityDashboard() {
  const navigate = useNavigate();
  const [securityUser, setSecurityUser] = useState<SecurityUser | null>(null);
  const [scanning, setScanning] = useState(false);
  const [lastScanResult, setLastScanResult] = useState<any>(null);
  const [todayCount, setTodayCount] = useState(0);
  const [recentScans, setRecentScans] = useState<ScanRecord[]>([]);

  useEffect(() => {
    // Check if logged in
    const stored = localStorage.getItem('security_user');
    if (!stored) {
      navigate('/security-login');
      return;
    }

    setSecurityUser(JSON.parse(stored));
    loadStats();
  }, [navigate]);

  const loadStats = async () => {
    try {
      // Get today's count
      const today = new Date().toISOString().split('T')[0];
      const { data: scans, error } = await supabase
        .from('pass_scans')
        .select('*')
        .gte('scanned_at', today)
        .eq('scan_result', 'valid')
        .order('scanned_at', { ascending: false });

      if (!error && scans) {
        setTodayCount(scans.length);
        setRecentScans(scans.slice(0, 10));
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
      
      if (data.valid) {
        toast.success(`✓ Valid Entry: ${data.name}`);
        // Reload stats
        loadStats();
      } else {
        if (data.result === 'already_used') {
          toast.error(`✗ Already Used: ${data.name}`);
        } else if (data.result === 'inactive') {
          toast.error('✗ Pass Deactivated');
        } else {
          toast.error('✗ Invalid Pass');
        }
      }

      // Clear result after 5 seconds
      setTimeout(() => setLastScanResult(null), 5000);
    } catch (error: any) {
      console.error('Error validating pass:', error);
      toast.error('Validation failed');
      setLastScanResult({
        valid: false,
        result: 'error',
        message: 'System error',
      });
      setTimeout(() => setLastScanResult(null), 5000);
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

              {lastScanResult && (
                <div className={`p-6 rounded-xl border-2 ${
                  lastScanResult.valid
                    ? 'bg-green-500/10 border-green-500/50'
                    : 'bg-red-500/10 border-red-500/50'
                }`}>
                  <div className="flex items-center gap-3 mb-2">
                    {lastScanResult.valid ? (
                      <CheckCircle2 className="w-8 h-8 text-green-500" />
                    ) : (
                      <XCircle className="w-8 h-8 text-red-500" />
                    )}
                    <div>
                      <p className={`font-bold text-lg ${
                        lastScanResult.valid ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {lastScanResult.message}
                      </p>
                      {lastScanResult.name && (
                        <p className="text-white text-xl font-semibold mt-1">
                          {lastScanResult.name}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={() => setScanning(false)}
                className="w-full px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Stop Scanner
              </button>
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
                      <p className="text-white font-semibold">
                        {scan.participant_name || 'VIP Guest'}
                      </p>
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
    </div>
  );
}
