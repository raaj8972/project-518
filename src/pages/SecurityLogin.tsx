import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { Shield, Lock, User, ChevronDown } from 'lucide-react';

interface SecurityUserOption {
  username: string;
  full_name: string;
}

export default function SecurityLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<SecurityUserOption[]>([]);

  React.useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase.rpc('get_public_security_users');
      if (!error && data) {
        setAvailableUsers(data);
        if (data.length > 0) {
          setUsername(data[0].username);
        }
      }
    };
    fetchUsers();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Call authentication RPC function
      const { data, error } = await supabase
        .rpc('authenticate_security_user', {
          p_username: username,
          p_password: password,
        });

      if (error) throw error;

      if (!data.success) {
        toast.error(data.message || 'Invalid username or password');
        return;
      }

      // Store security session in localStorage
      localStorage.setItem('security_user', JSON.stringify(data.user));

      toast.success(`Welcome, ${data.user.full_name}!`);
      navigate('/security-dashboard');
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error('Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-8 border border-cyan-500/30 shadow-2xl">
          <div className="flex flex-col items-center mb-8">
            <div className="w-20 h-20 bg-cyan-600/20 rounded-full flex items-center justify-center mb-4">
              <Shield className="w-10 h-10 text-cyan-500" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Security Login</h1>
            <p className="text-gray-400 text-sm">RICORRENZA 2025 Entry Management</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-gray-300 mb-2 flex items-center gap-2">
                <User className="w-4 h-4" />
                {availableUsers.length > 0 ? 'Select Security User' : 'Username'}
              </label>
              
              {availableUsers.length > 0 ? (
                <div className="relative">
                  <select
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white appearance-none focus:outline-none focus:border-cyan-500 transition-colors pr-10"
                  >
                    {availableUsers.map((u) => (
                      <option key={u.username} value={u.username} className="bg-gray-800">
                        {u.full_name} ({u.username})
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
              ) : (
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 transition-colors"
                  placeholder="Enter your username"
                  autoComplete="username"
                />
              )}
            </div>

            <div>
              <label className="block text-gray-300 mb-2 flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 transition-colors"
                placeholder="Enter your password"
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-700">
            <p className="text-gray-400 text-sm text-center mb-4">
              For security personnel only. If you don't have credentials, contact the admin.
            </p>
            <div className="flex justify-center">
              <button
                onClick={() => navigate('/login')}
                className="text-cyan-500 hover:text-cyan-400 text-sm font-medium transition-colors"
              >
                ← Back to Admin Login
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
