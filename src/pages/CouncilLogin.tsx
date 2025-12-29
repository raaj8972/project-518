import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ArrowRight, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CouncilLogin() {
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    sessionStorage.setItem('council_auth', password);
    navigate('/council-dashboard');
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-gray-900 border border-gray-800 rounded-2xl p-8 relative overflow-hidden">
         {/* Cyberpunk accents */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500"></div>
        
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-purple-500/10 rounded-full flex items-center justify-center mb-4 border border-purple-500/20">
            <ShieldCheck className="w-8 h-8 text-purple-400" />
          </div>
          <h1 className="text-2xl font-bold font-orbitron text-center text-white">Council Dashboard</h1>
          <p className="text-gray-400 text-sm mt-2">Restricted Access</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1 ml-1">ACCESS CODE</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/50 border border-gray-700 rounded-lg py-3 pl-10 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors"
                placeholder="Enter password..."
              />
            </div>
          </div>
          
          <button
            type="submit"
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>Access Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

         <div className="mt-8 text-center">
            <button onClick={() => navigate('/')} className="text-gray-500 hover:text-white text-sm transition-colors">
              Return to Website
            </button>
         </div>
      </div>
    </div>
  );
}
