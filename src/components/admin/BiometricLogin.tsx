import React, { useState, useEffect } from 'react';
import { Fingerprint, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';
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
      const res = await fetch('/.netlify/functions/passkey-list', {
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
      const res = await fetch('/.netlify/functions/passkey-delete', {
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Biometric Login</h2>
        <p className="text-gray-600">Manage your Face ID / Fingerprint authentication</p>
      </div>

      {/* Message */}
      {message && (
        <div className={`rounded-lg p-4 flex items-center ${
          message.type === 'success' 
            ? 'bg-green-50 border border-green-200' 
            : 'bg-red-50 border border-red-200'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-500 mr-3" />
          )}
          <span className={message.type === 'success' ? 'text-green-700' : 'text-red-700'}>
            {message.text}
          </span>
        </div>
      )}

      {/* Register New Passkey */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Fingerprint className="w-6 h-6 text-purple-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900">Biometric Authentication</h3>
          </div>
        </div>
        <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
          <h4 className="font-medium text-purple-900 mb-2">Passwordless Login</h4>
          <p className="text-sm text-purple-700 mb-4">
            Register your device's biometric authenticator for faster and more secure login. Works with:
          </p>
          <ul className="text-sm text-purple-700 mb-4 ml-4 list-disc">
            <li><strong>iOS:</strong> Face ID, Touch ID</li>
            <li><strong>Android:</strong> Fingerprint, Face Unlock</li>
            <li><strong>Desktop:</strong> Windows Hello, Touch ID</li>
          </ul>
          <button
            onClick={handleRegisterPasskey}
            disabled={isLoading}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium disabled:opacity-50"
          >
            {isLoading ? 'Registering...' : 'Register New Passkey'}
          </button>
        </div>
      </div>

      {/* Registered Passkeys List */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Registered Passkeys ({passkeys.length})
        </h3>
        
        {isLoadingPasskeys ? (
          <p className="text-gray-500 text-center py-4">Loading...</p>
        ) : passkeys.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No passkeys registered yet</p>
        ) : (
          <div className="space-y-3">
            {passkeys.map((passkey, index) => (
              <div
                key={passkey.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div>
                  <div className="font-medium text-gray-900">
                    Passkey #{index + 1}
                  </div>
                  <div className="text-sm text-gray-600">
                    Created: {new Date(passkey.created_at).toLocaleDateString()}
                  </div>
                  <div className="text-sm text-gray-600">
                    Last used: {passkey.last_used_at ? new Date(passkey.last_used_at).toLocaleDateString() : 'Never'}
                  </div>
                </div>
                <button
                  onClick={() => handleDeletePasskey(passkey.id)}
                  className="text-red-600 hover:text-red-800 p-2 rounded-lg hover:bg-red-50 transition-colors"
                  title="Delete passkey"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Section */}
      <div className="bg-blue-50 rounded-lg border border-blue-100 p-4">
        <h4 className="font-medium text-blue-900 mb-2">How It Works</h4>
        <ul className="text-sm text-blue-700 space-y-2">
          <li>• Click "Register New Passkey" and follow your device's prompt</li>
          <li>• <strong>iOS:</strong> Use Face ID or Touch ID</li>
          <li>• <strong>Android:</strong> Use Fingerprint or Face Unlock</li>
          <li>• <strong>Desktop:</strong> Use Windows Hello, Touch ID, or security keys</li>
          <li>• Log in without entering your password</li>
          <li>• Your biometric data never leaves your device</li>
          <li>• You can register multiple passkeys for different devices</li>
        </ul>
      </div>
    </div>
  );
};

