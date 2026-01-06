import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

/**
 * MasterGate: A hidden "entry point" for the Owner.
 * Visiting this URL sets a secure session key that allows Owner-level login.
 */
export const MasterGate: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Generate a secure, unique session token
    const secureToken = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    const gatePass = `vault_v2_${secureToken}_${Date.now()}`;
    sessionStorage.setItem('rico_master_gate_access', gatePass);
    
    // Redirect after a deliberate delay
    const timer = setTimeout(() => {
      navigate('/login?mode=master');
    }, 1000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center font-mono">
      <div className="text-center space-y-4">
        <div className="relative mx-auto w-20 h-20">
            <div className="absolute inset-0 border-4 border-cyan-500/20 rounded-full animate-ping"></div>
            <div className="relative border-4 border-cyan-500 rounded-full w-full h-full flex items-center justify-center">
                <ShieldAlert className="text-cyan-500 w-10 h-10 animate-pulse" />
            </div>
        </div>
        <div className="space-y-2">
            <h2 className="text-cyan-400 text-sm font-bold tracking-widest uppercase">System Handshake</h2>
            <div className="flex justify-center gap-1">
                {[1, 2, 3].map(i => (
                    <div key={i} className={`w-2 h-2 bg-cyan-500 rounded-full animate-bounce [animation-delay:${i * 0.2}s]`} />
                ))}
            </div>
            <p className="text-gray-600 text-[10px] uppercase mt-4">Initializing secure node communication...</p>
            <div className="mt-4 pt-4 border-t border-cyan-500/10">
              <p className="text-[10px] text-gray-700 font-mono">AUTH_ID: {sessionStorage.getItem('rico_master_gate_access')?.slice(-16)}</p>
              <p className="text-[10px] text-gray-700 font-mono">NODE_SYNC: OK</p>
            </div>
        </div>
      </div>
    </div>
  );
};
