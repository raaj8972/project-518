import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { ArrowLeft, Download, Search } from 'lucide-react';
import { QRCodeGenerator } from '../components/admin/QRCodeGenerator';

export default function PassDownload() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [pass, setPass] = useState<any>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setPass(null);

    try {
      // Get pass registration
      const { data: passReg, error: regError } = await supabase
        .from('pass_registrations')
        .select('*')
        .eq('email', email)
        .eq('status', 'approved')
        .single();

      if (regError || !passReg) {
        toast.error('No approved pass found for this email');
        return;
      }

      // Get entry pass
      const { data: entryPass, error: passError } = await supabase
        .from('entry_passes')
        .select('*')
        .eq('pass_registration_id', passReg.id)
        .single();

      if (passError || !entryPass) {
        toast.error('Pass not generated yet. Please contact admin.');
        return;
      }

      setPass(entryPass);
      toast.success('Pass found!');
    } catch (error: any) {
      console.error('Error fetching pass:', error);
      toast.error('Failed to fetch pass');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </button>

        <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-8 border border-cyan-500/30">
          <div className="flex items-center gap-3 mb-6">
            <Download className="w-8 h-8 text-cyan-500" />
            <div>
              <h1 className="text-3xl font-bold text-white">Download Pass</h1>
              <p className="text-gray-400 text-sm">Enter your email to retrieve your pass</p>
            </div>
          </div>

          {!pass ? (
            <form onSubmit={handleSearch} className="space-y-4">
              <div>
                <label className="block text-gray-300 mb-2">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 transition-colors"
                  placeholder="your.email@example.com"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-3 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-700 hover:to-purple-700 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                <Search className="w-4 h-4" />
                {loading ? 'Searching...' : 'Find My Pass'}
              </button>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="bg-gray-700/30 p-4 rounded-lg border border-cyan-500/30">
                <p className="text-cyan-400 text-sm font-semibold mb-1">Pass Found!</p>
                <p className="text-white font-bold text-lg">{pass.participant_name}</p>
                <p className="text-gray-400 text-sm uppercase tracking-wide mt-1">
                  {pass.pass_type?.replace('_', ' ')}
                </p>
              </div>

              <QRCodeGenerator
                passToken={pass.pass_token}
                participantName={pass.participant_name}
                passType={pass.pass_type}
                size={256}
              />

              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                <p className="text-yellow-400 text-sm font-semibold mb-2">Important Instructions:</p>
                <ul className="text-gray-300 text-sm space-y-1 list-disc list-inside">
                  <li>Present this QR code at the entry gate</li>
                  <li>{pass.pass_type === 'vip' ? 'This pass is valid for MULTI-DAY entry (once per day)' : 'This pass is valid for ONE-TIME entry only'}</li>
                  <li>Keep this QR code safe and do not share</li>
                  <li>Download or print the QR code for easy access</li>
                </ul>
              </div>

              <button
                onClick={() => {
                  setPass(null);
                  setEmail('');
                }}
                className="w-full px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Search Another Pass
              </button>
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-gray-700">
            <p className="text-gray-400 text-sm text-center">
              Don't have a pass yet?{' '}
              <button
                onClick={() => navigate('/pass-registration')}
                className="text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                Register now
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
