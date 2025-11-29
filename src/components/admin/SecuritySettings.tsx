import React, { useState } from 'react';
import { Shield, Smartphone, Key, CheckCircle, AlertCircle, Copy, Eye, EyeOff, Lock, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { supabase } from '../../lib/supabase';

export const SecuritySettings: React.FC = () => {
  const { setupTOTP, verifyTOTP, enableTOTP, disableTOTP, isTOTPEnabled, isAuthenticated, user } = useAuth();
  const { adminUsers } = useData();
  const [isSettingUpTOTP, setIsSettingUpTOTP] = useState(false);
  const [totpSecret, setTotpSecret] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Admin user management state
  const [usersStatus, setUsersStatus] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // PIN Protection State
  const [pin, setPin] = useState('');
  const [isPinVerified, setIsPinVerified] = useState(false);
  const [pinError, setPinError] = useState('');

  // Password Management State
  const [selectedUserId, setSelectedUserId] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  const isOwner = React.useMemo(() => {
    if (!user) return false;
    if (user.user_metadata?.is_super_admin) return true;
    if (!adminUsers) return false;
    return !!adminUsers.find(a => a.user_id === user.id && (a.role === 'owner' || a.is_primary));
  }, [user, adminUsers]);

  React.useEffect(() => {
    if (user && !selectedUserId) {
      setSelectedUserId(user.id);
    }
  }, [user]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/.netlify/functions/admin-security-controls', {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
          action: 'update_password', 
          targetUserId: selectedUserId, 
          newPassword 
        })
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Password updated successfully' });
        setNewPassword('');
        setConfirmPassword('');
      } else {
        const err = await res.json().catch(() => ({}));
        setMessage({ type: 'error', text: err.error || 'Failed to update password' });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Error updating password' });
    }
    setIsUpdatingPassword(false);
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin) {
      setIsPinVerified(true);
      setPinError('');
    } else {
      setPinError('Incorrect PIN');
      setPin('');
    }
  };

  const fetchUsersStatus = async () => {
    setIsLoadingUsers(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (isPinVerified) {
      }

      const res = await fetch('/.netlify/functions/admin-security-controls', {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'list_users' })
      });

      if (res.ok) {
        const data = await res.json();
        setUsersStatus(data);
      } else {
        const err = await res.json().catch(() => ({ error: 'Failed to load users' }));
        setMessage({ type: 'error', text: `Failed to load user list: ${err.error || res.statusText}` });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: `Error loading user list: ${error.message || 'Unknown'}` });
    }
    setIsLoadingUsers(false);
  };

  const handleToggleUser2FA = async (userId: string, enable: boolean) => {
    if (!confirm(`Are you sure you want to ${enable ? 'enable' : 'disable'} 2FA for this user?`)) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (isPinVerified) {
        // headers['x-master-key'] = '9693'; // Removed insecure key
      }

      const res = await fetch('/.netlify/functions/admin-security-controls', {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'toggle_2fa', targetUserId: userId, enable })
      });

      if (res.ok) {
        const data = await res.json();
        setMessage({ type: 'success', text: data.message || `2FA ${enable ? 'enabled' : 'disabled'} successfully` });
        fetchUsersStatus();
      } else {
        const err = await res.json().catch(() => ({}));
        setMessage({ type: 'error', text: err.error || 'Failed to update 2FA status' });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Error updating 2FA status' });
    }
  };

  const handleForceLogout = async (userId: string) => {
    const isSelf = user?.id === userId;
    const confirmMsg = isSelf 
      ? 'Are you sure you want to sign out of all devices? You will be redirected to login.'
      : 'Are you sure you want to force logout this user? They will be signed out of all devices.';

    if (!confirm(confirmMsg)) return;

    try {
      // Safely get session, ignoring errors if we have the master key
      let token: string | undefined;
      try {
        const { data } = await supabase.auth.getSession();
        token = data?.session?.access_token;
      } catch (e) {
        console.warn('Session error ignored during force logout:', e);
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (isPinVerified) {
        // headers['x-master-key'] = '9693'; // Removed insecure key
      }

      const res = await fetch('/.netlify/functions/force-logout', {
        method: 'POST',
        headers,
        body: JSON.stringify({ targetUserId: userId })
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'User logged out successfully' });
        
        // Broadcast logout event to all connected clients
        await supabase.channel('admin_security').send({
          type: 'broadcast',
          event: 'force_logout',
          payload: { targetUserId: userId }
        });

        if (isSelf) {
          // Force client-side logout immediately, ignoring errors
          try {
            await supabase.auth.signOut();
          } catch (e) {
            console.warn('SignOut error ignored:', e);
          }
          // Clear local storage manually to be sure
          localStorage.removeItem('supabase.auth.token');
          // Also clear any other supabase keys
          Object.keys(localStorage).forEach(key => {
            if (key.startsWith('sb-')) localStorage.removeItem(key);
          });
          window.location.href = '/';
        } else {
          fetchUsersStatus();
        }
      } else {
        const err = await res.json().catch(() => ({}));
        const errorText = err.details ? `${err.error}: ${err.details}` : (err.error || 'Failed to logout user');
        setMessage({ type: 'error', text: errorText });
      }
    } catch (e: any) {
      setMessage({ type: 'error', text: `Error logging out user: ${e.message || 'Unknown error'}` });
    }
  };

  if (!isPinVerified) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-lg shadow-md p-8">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <Lock className="w-8 h-8 text-gray-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Security Access</h2>
        <p className="text-gray-600 mb-6 text-center max-w-md">
          Please enter the security PIN to access these settings.
        </p>
        <form onSubmit={handlePinSubmit} className="w-full max-w-xs">
          <div className="mb-4">
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter PIN"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-center text-lg tracking-widest"
              autoFocus
            />
            {pinError && <p className="text-red-500 text-sm mt-2 text-center">{pinError}</p>}
          </div>
          <button
            type="submit"
            className="w-full bg-gray-900 text-white py-2 px-4 rounded-lg hover:bg-gray-800 transition-colors font-medium"
          >
            Access Settings
          </button>
        </form>
      </div>
    );
  }

  const handleSetupTOTP = async () => {
    setIsLoading(true);
    try {
      if (!isAuthenticated) {
        setMessage({ type: 'error', text: 'You must be logged in to enable 2FA. Please sign in and try again.' });
        setIsLoading(false);
        return;
      }
      const result = await setupTOTP();
      if (result && 'secret' in result) {
        setTotpSecret(result.secret);
        setQrCodeUrl(result.qrCode);
        setIsSettingUpTOTP(true);
        setMessage(null);
      } else {
        const errMsg = result && 'error' in result ? result.error : 'Failed to setup 2FA';
        setMessage({ type: 'error', text: `${errMsg}. Please try again.` });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to setup 2FA. Please try again.' });
    }
    setIsLoading(false);
  };

  const handleVerifyAndEnable = async () => {
    if (verificationCode.length !== 6) {
      setMessage({ type: 'error', text: 'Please enter a 6-digit code.' });
      return;
    }

    setIsLoading(true);
    try {
      const isValid = await verifyTOTP(verificationCode, totpSecret);
      if (isValid) {
        const enabled = await enableTOTP(verificationCode, totpSecret);
        if (enabled) {
          setMessage({ type: 'success', text: '2FA has been successfully enabled!' });
          setIsSettingUpTOTP(false);
          setVerificationCode('');
          setTotpSecret('');
          setQrCodeUrl('');
        } else {
          setMessage({ type: 'error', text: 'Failed to enable 2FA. Please try again.' });
        }
      } else {
        setMessage({ type: 'error', text: 'Invalid verification code. Please try again.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to verify code. Please try again.' });
    }
    setIsLoading(false);
  };

  const handleDisableTOTP = async () => {
    if (!confirm('Are you sure you want to disable 2FA? This will make your account less secure.')) {
      return;
    }

    setIsLoading(true);
    try {
      const disabled = await disableTOTP();
      if (disabled) {
        setMessage({ type: 'success', text: '2FA has been disabled.' });
      } else {
        setMessage({ type: 'error', text: 'Failed to disable 2FA. Please try again.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to disable 2FA. Please try again.' });
    }
    setIsLoading(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setMessage({ type: 'success', text: 'Secret key copied to clipboard!' });
    setTimeout(() => setMessage(null), 3000);
  };

  const cancelSetup = () => {
    setIsSettingUpTOTP(false);
    setTotpSecret('');
    setQrCodeUrl('');
    setVerificationCode('');
    setMessage(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Security Settings</h2>
          <p className="text-gray-600">Manage your account security and two-factor authentication</p>
        </div>
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

      {/* Current Security Status */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Shield className="w-6 h-6 text-blue-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900">Account Security</h3>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            isTOTPEnabled 
              ? 'bg-green-100 text-green-800 border border-green-200' 
              : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
          }`}>
            {isTOTPEnabled ? 'Highly Secure' : 'Basic Security'}
          </div>
        </div>

        <div className="space-y-4">
          {isOwner && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Key className="w-5 h-5 text-gray-600 mr-3" />
                  <div>
                    <div className="font-medium text-gray-900">Password Protection</div>
                    <div className="text-sm text-gray-600">Your account is protected with a secure password</div>
                  </div>
                </div>
                {isUpdatingPassword ? (
                  <span className="text-sm text-blue-600">Updating...</span>
                ) : (
                  <button 
                    onClick={() => setShowPasswordForm(!showPasswordForm)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    {showPasswordForm ? 'Cancel' : 'Change Password'}
                  </button>
                )}
              </div>

              {/* Password Update Form */}
              {showPasswordForm && (
                <form onSubmit={handleUpdatePassword} className="mt-4 space-y-4 border-t border-gray-200 pt-4">
                  {isOwner && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Select User to Update</label>
                      <select
                        value={selectedUserId}
                        onChange={(e) => setSelectedUserId(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      >
                        {adminUsers?.map(u => (
                          <option key={u.user_id} value={u.user_id}>
                            {u.email} ({u.role}) {u.user_id === user?.id ? '(You)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                    <div className="relative">
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isUpdatingPassword || !newPassword || !confirmPassword}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Update Password
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <Smartphone className="w-5 h-5 text-gray-600 mr-3" />
              <div>
                <div className="font-medium text-gray-900">Two-Factor Authentication (2FA)</div>
                <div className="text-sm text-gray-600">
                  {isTOTPEnabled 
                    ? 'Your account has an extra layer of security with 2FA'
                    : 'Add an extra layer of security to your account'
                  }
                </div>
              </div>
            </div>
            {isTOTPEnabled ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <AlertCircle className="w-5 h-5 text-yellow-500" />
            )}
          </div>
        </div>
      </div>

      {/* Session Management (Self) */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <LogOut className="w-6 h-6 text-red-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900">Session Management</h3>
          </div>
        </div>
        <div className="p-4 bg-red-50 rounded-lg border border-red-100">
          <h4 className="font-medium text-red-900 mb-2">Force Logout All Devices</h4>
          <p className="text-sm text-red-700 mb-4">
            This will sign you out from all devices, including this one. You will need to sign in again.
            Useful if you suspect unauthorized access or want to clear old sessions.
          </p>
          <button
            onClick={() => user && handleForceLogout(user.id)}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
          >
            Sign Out Everywhere
          </button>
        </div>
      </div>

      {/* 2FA Management */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Two-Factor Authentication</h3>

        {!isTOTPEnabled && !isSettingUpTOTP && (
          <div className="text-center py-8">
            <Smartphone className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h4 className="text-xl font-semibold text-gray-900 mb-2">Secure Your Account</h4>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Two-factor authentication adds an extra layer of security to your admin account. 
              You'll need your phone to sign in.
            </p>
            <button
              onClick={handleSetupTOTP}
              disabled={isLoading}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-500 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Setting up...' : 'Enable 2FA'}
            </button>
          </div>
        )}

        {isSettingUpTOTP && (
          <div className="space-y-6">
            <div className="text-center">
              <h4 className="text-xl font-semibold text-gray-900 mb-2">Set up 2FA</h4>
              <p className="text-gray-600">Follow these steps to enable two-factor authentication</p>
            </div>

            {/* Step 1: Download App */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center mb-3">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">
                  1
                </div>
                <h5 className="font-semibold text-gray-900">Download an Authenticator App</h5>
              </div>
              <p className="text-sm text-gray-600 ml-11">
                Download Google Authenticator, Authy, or any TOTP-compatible app on your phone.
              </p>
            </div>

            {/* Step 2: Scan QR Code */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center mb-3">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">
                  2
                </div>
                <h5 className="font-semibold text-gray-900">Scan QR Code</h5>
              </div>
              <div className="ml-11 space-y-4">
                <p className="text-sm text-gray-600">
                  Scan this QR code with your authenticator app:
                </p>
                <div className="flex justify-center">
                  <img src={qrCodeUrl} alt="QR Code" className="border border-gray-300 rounded-lg" />
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">Manual entry key:</span>
                    <button
                      onClick={() => setShowSecret(!showSecret)}
                      className="text-blue-600 hover:text-blue-700 text-xs"
                    >
                      {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <div className="flex items-center mt-2">
                    <code className="text-sm font-mono bg-white px-2 py-1 rounded border flex-1">
                      {showSecret ? totpSecret : '••••••••••••••••••••••••••••••••'}
                    </code>
                    <button
                      onClick={() => copyToClipboard(totpSecret)}
                      className="ml-2 p-1 text-gray-600 hover:text-gray-800"
                      title="Copy to clipboard"
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3: Verify */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center mb-3">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">
                  3
                </div>
                <h5 className="font-semibold text-gray-900">Enter Verification Code</h5>
              </div>
              <div className="ml-11 space-y-4">
                <p className="text-sm text-gray-600">
                  Enter the 6-digit code from your authenticator app:
                </p>
                <div className="flex items-center space-x-4">
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-400"
                    maxLength={6}
                  />
                  <button
                    onClick={handleVerifyAndEnable}
                    disabled={isLoading || verificationCode.length !== 6}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-500 transition-colors disabled:opacity-50"
                  >
                    {isLoading ? 'Verifying...' : 'Verify & Enable'}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <button
                onClick={cancelSetup}
                className="text-gray-600 hover:text-gray-800 font-medium"
              >
                Cancel Setup
              </button>
            </div>
          </div>
        )}

        {isTOTPEnabled && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h4 className="text-xl font-semibold text-gray-900 mb-2">2FA is Enabled</h4>
            <p className="text-gray-600 mb-6">
              Your account is protected with two-factor authentication. You'll need your authenticator app to sign in.
            </p>
            <button
              onClick={handleDisableTOTP}
              disabled={isLoading}
              className="bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-500 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Disabling...' : 'Disable 2FA'}
            </button>
          </div>
        )}
      </div>

      {/* Admin User Management (Owner Only) */}
      {isOwner && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Admin User Management</h3>
            <button 
              onClick={fetchUsersStatus} 
              className="text-sm text-blue-600 hover:text-blue-800"
              disabled={isLoadingUsers}
            >
              {isLoadingUsers ? 'Refreshing...' : 'Refresh List'}
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">2FA</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Seen</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {usersStatus.map((u) => (
                  <tr key={u.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{u.email}</div>
                      <div className="text-xs text-gray-500">{u.id === user?.id ? '(You)' : ''}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {u.is_online ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          Online
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                          Offline
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {u.totp_enabled ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Enabled</span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">Disabled</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {u.last_sign_in_at || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <button onClick={() => handleToggleUser2FA(u.id, !u.totp_enabled)} className="text-blue-600 hover:text-blue-800 mr-3">
                        {u.totp_enabled ? 'Disable 2FA' : 'Enable 2FA'}
                      </button>
                      {isOwner && (
                        <button onClick={() => handleForceLogout(u.id)} className="text-red-600 hover:text-red-800">
                          Force Logout
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};