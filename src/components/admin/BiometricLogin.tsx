import React, { useState, useEffect } from 'react';
import { Fingerprint, CheckCircle, AlertCircle, Trash2, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface Passkey {
  id: string;
  credential_id: string;
  created_at: string;
  last_used_at: string;
  transports: string[];
}

export const BiometricLogin: React.FC = () => {
  const { registerPasskey, user } = useAuth();
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [isLoadingPasskeys, setIsLoadingPasskeys] = useState(true);

  const fetchPasskeys = async () => {
    if (!user) return;
    setIsLoadingPasskeys(true);
    try {
      const res = await fetch('/api/passkey-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      if (res.ok) {
        const data = await res.json();
        setPasskeys(data.passkeys || []);
      }
    } catch (error) {
      console.error('Failed to fetch passkeys:', error);
    }
    setIsLoadingPasskeys(false);
  };

  useEffect(() => {
    fetchPasskeys();
  }, [user]);

  const handleRegisterPasskey = async () => {
    setIsLoading(true);
    setMessage(null);
    const res = await registerPasskey();
    setIsLoading(false);
    if (res.success) {
      setMessage({ type: 'success', text: 'Passkey registered successfully!' });
      fetchPasskeys(); // Refresh the list
    } else {
      setMessage({ type: 'error', text: res.error || 'Failed to register passkey' });
    }
  };

  const handleDeletePasskey = async (passkeyId: string) => {
    if (!confirm('Are you sure you want to delete this passkey?')) return;
    
    try {
      const res = await fetch('/api/passkey-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passkeyId, userId: user?.id }),
      });
      
      if (res.ok) {
        setMessage({ type: 'success', text: 'Passkey deleted successfully!' });
        fetchPasskeys(); // Refresh the list
      } else {
        setMessage({ type: 'error', text: 'Failed to delete passkey' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete passkey' });
    }
  };

  return (
    <>
    <div className="space-y-6 text-white font-rajdhani">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="relative">
          <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-full animate-pulse"></div>
          <div className="relative p-3 bg-black border border-cyan-500/30 rounded-full">
             <Fingerprint className="w-8 h-8 text-cyan-400" />
          </div>
        </div>
        <div>
          <h2 className="text-3xl font-black tracking-widest uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-500">
            Biometric Array
          </h2>
          <p className="text-cyan-400/60 text-sm tracking-widest uppercase font-bold">
            Hardware Authentication Protocol Active
          </p>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`rounded-lg p-4 flex items-center border shadow-[0_0_15px_rgba(0,0,0,0.5)] ${
          message.type === 'success' 
            ? 'bg-green-500/10 border-green-500/50 text-green-400' 
            : 'bg-red-500/10 border-red-500/50 text-red-400'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5 mr-3 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
          )}
          <span className="font-medium tracking-wide">
            {message.text}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Register New Passkey */}
        <div className="bg-zinc-900/50 border border-white/10 rounded-xl p-6 relative overflow-hidden group hover:border-cyan-500/50 transition-all duration-500">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          
          <div className="relative z-10">
            <h3 className="text-xl font-bold text-white mb-2 uppercase tracking-wide flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
              Add Device Node
            </h3>
            
            <p className="text-gray-400 text-sm mb-6 leading-relaxed">
              Register this physical device's secure enclave (Face ID, Touch ID, Windows Hello) to bypass password entry on future logins.
            </p>
            
            <button
              onClick={handleRegisterPasskey}
              disabled={isLoading}
              className="w-full relative py-4 px-6 rounded-lg uppercase tracking-[0.2em] font-bold text-sm overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-purple-600 transition-transform duration-500 group-hover:scale-105"></div>
              <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors duration-300"></div>
              <span className="relative z-10 text-white flex items-center justify-center gap-2">
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Establishing Protocol...
                  </>
                ) : (
                  <>
                    <Fingerprint className="w-5 h-5" />
                    Initialize Biometric Link
                  </>
                )}
              </span>
            </button>
          </div>
        </div>

        {/* Info Section */}
        <div className="bg-black/40 border border-cyan-500/20 rounded-xl p-6 relative">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></div>
          <h4 className="font-bold text-cyan-400 mb-4 tracking-widest uppercase text-sm border-b border-cyan-500/20 pb-2">
            Secure Authentication Parameters
          </h4>
          <ul className="space-y-3 text-sm text-gray-400 font-mono">
            <li className="flex items-start gap-3">
              <span className="text-cyan-500 mt-0.5">▶</span>
              Click initialization sequence and follow your device's native security prompt.
            </li>
            <li className="flex items-start gap-3">
              <span className="text-cyan-500 mt-0.5">▶</span>
              <span className="text-white">iOS / macOS:</span> Authenticate via Face ID or Touch ID.
            </li>
            <li className="flex items-start gap-3">
              <span className="text-cyan-500 mt-0.5">▶</span>
              <span className="text-white">Android / Windows:</span> Fingerprint, Face Unlock, or Windows Hello.
            </li>
            <li className="flex items-start gap-3">
              <span className="text-cyan-500 mt-0.5">▶</span>
              Cryptographic keys never leave your secure hardware enclave.
            </li>
          </ul>
        </div>
      </div>

      {/* Registered Passkeys List */}
      <div className="bg-zinc-900/80 border border-white/10 rounded-xl p-6 mt-8">
        <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
          <Shield className="w-5 h-5 text-purple-400" />
          <h3 className="text-lg font-bold text-white tracking-widest uppercase">
            Authorized Nodes ({passkeys.length})
          </h3>
        </div>
        
        {isLoadingPasskeys ? (
          <div className="flex justify-center items-center py-12">
            <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin"></div>
          </div>
        ) : passkeys.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-white/10 rounded-lg bg-black/20">
            <Fingerprint className="w-12 h-12 text-gray-600 mx-auto mb-3 opacity-50" />
            <p className="text-gray-500 font-mono text-sm uppercase tracking-widest">No Active Biometric Nodes</p>
          </div>
        ) : (
          <div className="space-y-4">
            {passkeys.map((passkey, index) => (
              <div
                key={passkey.id}
                className="flex items-center justify-between p-5 bg-black/40 border border-white/5 hover:border-cyan-500/30 rounded-lg transition-all duration-300 group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-cyan-900/30 border border-cyan-500/30 flex items-center justify-center">
                     <span className="text-cyan-400 font-bold font-mono text-sm">#{index + 1}</span>
                  </div>
                  <div>
                    <div className="font-bold text-white tracking-wider uppercase mb-1 flex items-center gap-2">
                       Secure Node Link
                       {index === 0 && <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded border border-purple-500/30">PRIMARY</span>}
                    </div>
                    <div className="flex gap-4 text-xs font-mono text-gray-500">
                      <span>CREATED: {new Date(passkey.created_at).toLocaleDateString()}</span>
                      <span className="text-cyan-500/50">|</span>
                      <span>LAST SYNC: {passkey.last_used_at ? new Date(passkey.last_used_at).toLocaleDateString() : 'Pending'}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDeletePasskey(passkey.id)}
                  className="text-gray-500 hover:text-red-400 p-3 rounded-lg hover:bg-red-500/10 transition-colors border border-transparent hover:border-red-500/30"
                  title="Revoke Node Priority"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
    </>
  );
};

