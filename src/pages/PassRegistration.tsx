import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { Ticket, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function PassRegistration() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('pass_registrations')
        .insert([formData]);

      if (error) throw error;

      setSubmitted(true);
      toast.success('Pass registration submitted successfully!');
    } catch (error: any) {
      console.error('Error submitting pass registration:', error);
      toast.error(error.message || 'Failed to submit registration');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-gray-800/50 backdrop-blur-lg rounded-2xl p-8 border border-cyan-500/30 text-center">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-4">
            Registration Submitted!
          </h2>
          <p className="text-gray-300 mb-6">
            Your pass registration has been submitted successfully. It will be reviewed by our admin team.
          </p>
          <p className="text-gray-400 mb-8 text-sm">
            Once approved, you can download your entry pass using your email.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/pass-download')}
              className="flex-1 px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
            >
              Check Pass Status
            </button>
            <button
              onClick={() => navigate('/')}
              className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }

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
            <Ticket className="w-8 h-8 text-cyan-500" />
            <div>
              <h1 className="text-3xl font-bold text-white">Entry Pass Registration</h1>
              <p className="text-gray-400 text-sm">Get your RICORRENZA 2025 entry pass</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-300 mb-2">Full Name *</label>
              <input
                type="text"
                required
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 transition-colors"
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <label className="block text-gray-300 mb-2">Email *</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 transition-colors"
                placeholder="your.email@example.com"
              />
            </div>

            <div>
              <label className="block text-gray-300 mb-2">Phone *</label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 transition-colors"
                placeholder="+91 XXXXXXXXXX"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-700 hover:to-purple-700 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              {loading ? 'Submitting...' : 'Submit Registration'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-700">
            <p className="text-gray-400 text-sm text-center">
              Already registered?{' '}
              <button
                onClick={() => navigate('/pass-download')}
                className="text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                Download your pass
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
