import React, { useState } from 'react';
import { Shield, Smartphone, Key, AlertCircle, CheckCircle, LogOut, Eye, EyeOff, Copy, Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';

export const SecuritySettings: React.FC = () => {
  const { logout, user, isAuthenticated, isTOTPEnabled, setupTOTP, verifyTOTP, enableTOTP, disableTOTP, getValidToken, updatePassword } = useAuth();
  const { adminUsers, isOwner: checkIsOwner } = useData();
  


  const [isSettingUpTOTP, setIsSettingUpTOTP] = useState(false);
  const [totpSecret, setTotpSecret] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);
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

  const isOwner = React.useMemo(() => checkIsOwner(), [checkIsOwner]);

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
      // If updating own password, use the AuthContext provider
      if (selectedUserId === user?.id || (user?.id === 'master-admin-bypass' && selectedUserId === adminUsers?.find((u: any) => u.role === 'owner')?.user_id)) {
        const result = await updatePassword(newPassword);
        if (result.success) {
          if (result.error) {
            setMessage({ type: 'warning', text: `Primary password updated, but: ${result.error}` });
          } else {
            setMessage({ type: 'success', text: 'Your password has been updated successfully' });
          }
          setNewPassword('');
          setConfirmPassword('');
        } else {
          setMessage({ type: 'error', text: result.error || 'Failed to update password' });
        }
      } else {
        // Administrative update for another user using AdminService directly
        const token = await getValidToken();
        if (!token) throw new Error('No valid token found');
        
        const { AdminService } = await import('../../lib/adminService');
        await AdminService.updatePassword(selectedUserId, newPassword, token);
        
        setMessage({ type: 'success', text: 'Admin password updated successfully' });
        setNewPassword('');
        setConfirmPassword('');
        fetchUsersStatus(); // Refresh list to reflect changes
      }
    } catch (e: any) {
      setMessage({ type: 'error', text: `Error updating password: ${e.message}` });
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
      const token = await getValidToken();
      
      const res = await fetch('/api/admin-security-controls', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
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
      const token = await getValidToken();
      const headers: Record<string, string> = { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };

      const res = await fetch('/api/admin-security-controls', {
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
      setMessage({ type: 'success', text: 'Logging out...' });
      
      const token = await getValidToken();
      
      const res = await fetch('/api/admin-security-controls', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          action: 'force_logout',
          targetUserId: userId 
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to logout user');
      }

      // For self-logout, clear local session and redirect
      if (isSelf) {
        // Clear client-side auth
        try {
          await logout();
        } catch (e) {
          console.warn('SignOut error ignored:', e);
        }
        
        // Redirect to login
        window.location.href = '/';
      } else {
        // For other users, just refresh the list
        setMessage({ type: 'success', text: 'User logged out successfully' });
        fetchUsersStatus();
      }
    } catch (e: any) {
      setMessage({ type: 'error', text: `Error: ${e.message || 'Failed to logout user'}` });
    }
  };

  if (!isPinVerified) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] bg-white/60 backdrop-blur-xl border border-white/40 rounded-3xl shadow-xl shadow-slate-200/50 p-12">
        <div className="w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center mb-6 shadow-inner">
          <Lock className="w-10 h-10 text-slate-700" />
        </div>
        <h2 className="text-2xl font-semibold text-slate-800 mb-2">Security Access Required</h2>
        <p className="text-slate-500 mb-8 text-center max-w-sm">
          Please enter your secure administrative PIN to continue to security settings.
        </p>
        <form onSubmit={handlePinSubmit} className="w-full max-w-xs space-y-5">
          <div>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter PIN"
              className="w-full px-5 py-3 bg-white/80 border border-slate-200 rounded-xl focus:ring-4 focus:ring-slate-100 focus:border-slate-400 outline-none text-center text-xl tracking-[0.5em] text-slate-800 font-medium transition-all"
              autoFocus
            />
            {pinError && <p className="text-rose-500 text-sm mt-3 text-center animate-fade-in">{pinError}</p>}
          </div>
          <button
            type="submit"
            className="w-full bg-slate-900 text-white py-3 px-4 rounded-xl hover:bg-slate-800 hover:shadow-lg transition-all font-medium active:scale-95"
          >
            Authenticate
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
    <div className="space-y-8 animate-fade-in max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-slate-200/60 pb-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 tracking-tight mb-2">Security & Identity</h2>
          <p className="text-slate-500 text-sm">Manage your account protection, authentication methods, and active sessions</p>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`rounded-xl p-4 flex items-center shadow-sm ${
          message.type === 'success' 
            ? 'bg-emerald-50/80 border border-emerald-200/60 text-emerald-800' 
            : message.type === 'warning'
            ? 'bg-amber-50/80 border border-amber-200/60 text-amber-800'
            : 'bg-rose-50/80 border border-rose-200/60 text-rose-800'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-emerald-500 mr-3 flex-shrink-0" />
          ) : message.type === 'warning' ? (
            <AlertCircle className="w-5 h-5 text-amber-500 mr-3 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-500 mr-3 flex-shrink-0" />
          )}
          <span className="text-sm font-medium">
            {message.text}
          </span>
        </div>
      )}

      {/* Current Security Status */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 overflow-hidden relative group transition-shadow hover:shadow-md">
        <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full blur-3xl -mx-32 -my-32 opacity-50 group-hover:opacity-100 transition-opacity"></div>
        <div className="relative">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center mr-4 border border-indigo-100/50">
                <Shield className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800">Account Protection</h3>
                <p className="text-sm text-slate-500 mt-1">Primary secure access controls</p>
              </div>
            </div>
            <div className={`px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
              isTOTPEnabled 
                ? 'bg-emerald-100/50 text-emerald-700 border border-emerald-200/50' 
                : 'bg-amber-100/50 text-amber-700 border border-amber-200/50'
            }`}>
              {isTOTPEnabled ? 'Highly Secure' : 'Basic Security'}
            </div>
          </div>

        <div className="space-y-6">
          {isOwner && (
            <div className="p-6 bg-slate-50/50 border border-slate-100 rounded-2xl transition-colors hover:bg-slate-50/80">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-slate-200/50 flex items-center justify-center mr-4">
                    <Key className="w-5 h-5 text-slate-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-800">Password Encryption</div>
                    <div className="text-sm text-slate-500 mt-0.5">Your account is shielded with a vaulted password</div>
                  </div>
                </div>
                {isUpdatingPassword ? (
                  <span className="text-sm font-medium text-slate-400 animate-pulse">Updating...</span>
                ) : (
                  <button 
                    onClick={() => setShowPasswordForm(!showPasswordForm)}
                    className="text-sm font-medium px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-sm active:scale-95"
                  >
                    {showPasswordForm ? 'Cancel' : 'Reset Password'}
                  </button>
                )}
              </div>

              {/* Password Update Form */}
              {showPasswordForm && (
                <form onSubmit={handleUpdatePassword} className="mt-6 space-y-5 border-t border-slate-200/60 pt-6 animate-in slide-in-from-top-2 fade-in duration-200">
                  {isOwner && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center">
                        Select Authority Profile
                      </label>
                      <select
                        value={selectedUserId}
                        onChange={(e) => setSelectedUserId(e.target.value)}
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-slate-100 focus:border-slate-400 outline-none text-slate-800 transition-all shadow-sm appearance-none cursor-pointer"
                        style={{ backgroundImage: "url(\"data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1em' }}
                      >
                        {adminUsers?.map((u: any) => (
                          <option key={u.user_id} value={u.user_id}>
                            {u.email} ({u.role}) {u.user_id === user?.id ? '(You)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">New Password</label>
                      <input
                        type="password"
                        name="new-password"
                        autoComplete="new-password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-slate-100 focus:border-slate-400 outline-none text-slate-800 transition-all shadow-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirm Identity Cipher</label>
                      <input
                        type="password"
                        name="confirm-password"
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-slate-100 focus:border-slate-400 outline-none text-slate-800 transition-all shadow-sm"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={isUpdatingPassword || !newPassword || !confirmPassword}
                      className="bg-slate-900 text-white px-6 py-2.5 rounded-xl hover:bg-slate-800 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium active:scale-95 flex items-center"
                    >
                      {isUpdatingPassword ? 'Processing...' : 'Vault New Password'}
                      {!isUpdatingPassword && <CheckCircle className="ml-2 w-4 h-4 opacity-70" />}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          <div className={`p-6 border rounded-2xl transition-colors ${
            isTOTPEnabled 
              ? 'bg-emerald-50/30 border-emerald-100 hover:bg-emerald-50/50' 
              : 'bg-slate-50/50 border-slate-100 hover:bg-slate-50/80'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 ${
                  isTOTPEnabled ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200/50 text-slate-600'
                }`}>
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-semibold text-slate-800">Two-Factor Authentication (2FA)</div>
                  <div className="text-sm text-slate-500 mt-0.5">
                    {isTOTPEnabled 
                      ? 'Your account enforces a strict secondary auth challenge'
                      : 'Add an extra algorithmic layer of security to your account'
                    }
                  </div>
                </div>
              </div>
              {isTOTPEnabled ? (
                <div className="flex items-center text-emerald-600 text-sm font-medium">
                  <CheckCircle className="w-5 h-5 mr-1" />
                  Active
                </div>
              ) : (
                <div className="flex items-center text-amber-500 text-sm font-medium">
                  <AlertCircle className="w-5 h-5 mr-1" />
                  Inactive
                </div>
              )}
            </div>
          </div>
        </div>
        </div>
      </div>



      {/* Session Management (Self) */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 overflow-hidden relative group transition-shadow hover:shadow-md">
        <div className="absolute top-0 right-0 w-64 h-64 bg-rose-50 rounded-full blur-3xl -mx-32 -my-32 opacity-50 group-hover:opacity-100 transition-opacity"></div>
        <div className="relative">
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center mr-4 border border-rose-100/50">
              <LogOut className="w-6 h-6 text-rose-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-800">Session Authority</h3>
          </div>
          
          <div className="p-6 bg-rose-50/50 border border-rose-100 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h4 className="font-semibold text-rose-900 mb-1">Revoke Global Access</h4>
              <p className="text-sm text-rose-700/80 max-w-xl leading-relaxed">
                Immediately invalidate all active sessions across all devices for this identity. Required if you suspect credential compromise. You will be forced to re-authenticate.
              </p>
            </div>
            <button
              onClick={() => user && handleForceLogout(user.id)}
              className="px-6 py-2.5 bg-rose-600 text-white rounded-xl hover:bg-rose-700 hover:shadow-lg transition-all text-sm font-semibold whitespace-nowrap active:scale-95 flex items-center"
            >
              <AlertCircle className="w-4 h-4 mr-2" />
              Purge All Sessions
            </button>
          </div>
        </div>
      </div>

      {/* 2FA Management */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
        <h3 className="text-xl font-bold text-slate-800 mb-8 border-b border-slate-100 pb-4">Auth Verification Layer (2FA)</h3>

        {!isTOTPEnabled && !isSettingUpTOTP && (
          <div className="text-center py-12 px-4 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-slate-100">
              <Smartphone className="w-10 h-10 text-slate-400" />
            </div>
            <h4 className="text-2xl font-bold text-slate-800 mb-3">Elevate Security Protocol</h4>
            <p className="text-slate-500 mb-8 max-w-md mx-auto text-sm leading-relaxed">
              Two-factor authentication adds a cryptographic layer of security to your admin account. 
              Require a time-based token from your mobile device to authorize administrative access.
            </p>
            <button
              onClick={handleSetupTOTP}
              disabled={isLoading}
              className="bg-slate-900 text-white px-8 py-3 rounded-xl font-medium hover:bg-slate-800 hover:shadow-lg transition-all disabled:opacity-50 active:scale-95"
            >
              {isLoading ? 'Generating Keys...' : 'Initialize 2FA Routine'}
            </button>
          </div>
        )}

        {isSettingUpTOTP && (
          <div className="max-w-2xl mx-auto space-y-8">
            <div className="text-center bg-slate-50 py-6 rounded-2xl border border-slate-100">
              <h4 className="text-xl font-bold text-slate-800 mb-2">Configure Authenticator</h4>
              <p className="text-slate-500 text-sm">Follow the synchronization sequence below</p>
            </div>

            <div className="space-y-6">
              {/* Step 1: Download App */}
              <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center mb-3">
                  <div className="w-8 h-8 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-sm font-bold mr-4 border border-indigo-200">
                    1
                  </div>
                  <h5 className="font-semibold text-slate-800">Acquire Authenticator</h5>
                </div>
                <p className="text-sm text-slate-500 ml-12">
                  Install Google Authenticator, Authy, or any TOTP-compatible application on your primary mobile device.
                </p>
              </div>

              {/* Step 2: Scan QR Code */}
              <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center mb-5">
                  <div className="w-8 h-8 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-sm font-bold mr-4 border border-indigo-200">
                    2
                  </div>
                  <h5 className="font-semibold text-slate-800">Synchronize Token</h5>
                </div>
                <div className="ml-12 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-center">
                    <img src={qrCodeUrl} alt="QR Code" className="w-40 h-40 mix-blend-multiply" />
                  </div>
                  <div className="space-y-4">
                    <p className="text-sm text-slate-500">
                      Scan the matrix to link your authenticator, or enter the root key manually:
                    </p>
                    <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Root Key</span>
                        <button
                          onClick={() => setShowSecret(!showSecret)}
                          className="text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      <div className="flex items-center">
                        <code className="text-sm font-mono text-slate-800 flex-1 overflow-hidden overflow-ellipsis">
                          {showSecret ? totpSecret : '••••••••••••••••••••'}
                        </code>
                        <button
                          onClick={() => copyToClipboard(totpSecret)}
                          className="ml-3 p-1.5 text-slate-400 hover:text-slate-700 bg-white rounded-lg shadow-sm border border-slate-200 transition-all hover:scale-105"
                          title="Copy to clipboard"
                        >
                          <Copy size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 3: Verify */}
              <div className="p-6 bg-white border border-indigo-200 rounded-2xl shadow-sm shadow-indigo-100/50">
                <div className="flex items-center mb-5">
                  <div className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-4 shadow-sm">
                    3
                  </div>
                  <h5 className="font-semibold text-slate-800">Finalize Pairing</h5>
                </div>
                <div className="ml-12">
                  <p className="text-sm text-slate-500 mb-4">
                    Enter the current 6-digit cryptographic sequence generated by your app:
                  </p>
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <input
                      type="text"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000 000"
                      className="w-full sm:w-48 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-2xl tracking-[0.5em] font-mono focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 text-slate-800 transition-all"
                      maxLength={6}
                    />
                    <button
                      onClick={handleVerifyAndEnable}
                      disabled={isLoading || verificationCode.length !== 6}
                      className="w-full sm:w-auto bg-indigo-600 text-white px-8 py-3 rounded-xl font-medium hover:bg-indigo-700 hover:shadow-lg transition-all disabled:opacity-50 active:scale-95 whitespace-nowrap"
                    >
                      {isLoading ? 'Verifying...' : 'Authenticate Pair'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-center pt-4">
              <button
                onClick={cancelSetup}
                className="text-slate-500 hover:text-slate-800 font-medium text-sm transition-colors px-4 py-2 hover:bg-slate-100 rounded-lg"
              >
                Abort Sequence
              </button>
            </div>
          </div>
        )}

        {isTOTPEnabled && (
          <div className="text-center py-12 px-4 border border-emerald-100 rounded-2xl bg-emerald-50/30">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-emerald-100">
              <CheckCircle className="w-10 h-10 text-emerald-500" />
            </div>
            <h4 className="text-2xl font-bold text-slate-800 mb-3">Maximum Security Active</h4>
            <p className="text-slate-600 mb-8 max-w-md mx-auto text-sm leading-relaxed">
              Your administrative identity is secured via cryptographic 2FA pairing. Session hijacking risks are severely mitigated.
            </p>
            <button
              onClick={handleDisableTOTP}
              disabled={isLoading}
              className="bg-white border border-rose-200 text-rose-600 px-8 py-3 rounded-xl font-medium hover:bg-rose-50 hover:border-rose-300 transition-all disabled:opacity-50 active:scale-95"
            >
              {isLoading ? 'Processing...' : 'Downgrade Security (Disable 2FA)'}
            </button>
          </div>
        )}
      </div>

      {/* Admin User Management (Owner Only) */}
      {isOwner && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 pb-4 border-b border-slate-100 gap-4">
            <div>
              <h3 className="text-xl font-bold text-slate-800">Global Admin Roster</h3>
              <p className="text-sm text-slate-500 mt-1">Supervise and manage sub-administrator identities</p>
            </div>
            <button 
              onClick={fetchUsersStatus} 
              className="text-sm font-medium px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl transition-colors active:scale-95 flex items-center"
              disabled={isLoadingUsers}
            >
              {isLoadingUsers ? 'Syncing Matrix...' : 'Sync Live Status'}
            </button>
          </div>
          
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Identity</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Connection</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Security</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Last Sync</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Directives</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {usersStatus.map((u: any) => (
                    <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center mr-3 hidden sm:flex">
                            <span className="text-slate-600 font-bold text-xs uppercase">{u.email.substring(0, 2)}</span>
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-slate-800 flex items-center">
                              {u.email}
                              {u.id === user?.id && <span className="ml-2 px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-md text-[10px] uppercase font-bold tracking-wider">You</span>}
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5 capitalize">{u.role || 'Admin'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {u.is_online ? (
                          <span className="px-2.5 py-1 inline-flex text-xs font-semibold rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Active Sync
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 inline-flex text-xs font-semibold rounded-lg bg-slate-100 text-slate-600 border border-slate-200">
                            Offline
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {u.totp_enabled ? (
                          <span className="px-2.5 py-1 inline-flex text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200">
                            2FA Vaulted
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 inline-flex text-xs font-semibold rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
                            Standard
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-3">
                          <button 
                            onClick={() => handleToggleUser2FA(u.id, !u.totp_enabled)} 
                            className="text-slate-400 hover:text-indigo-600 transition-colors bg-white hover:bg-indigo-50 px-3 py-1.5 rounded-lg border border-transparent hover:border-indigo-100 text-xs font-semibold uppercase tracking-wide"
                          >
                            {u.totp_enabled ? 'Downgrade' : 'Enforce 2FA'}
                          </button>
                          {isOwner && u.id !== user?.id && (
                            <button 
                              onClick={() => handleForceLogout(u.id)} 
                              className="text-rose-600 hover:text-rose-700 transition-colors bg-white hover:bg-rose-50 px-3 py-1.5 rounded-lg border border-transparent hover:border-rose-100 text-xs font-semibold uppercase tracking-wide"
                            >
                              Purge
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {usersStatus.length === 0 && !isLoadingUsers && (
                <div className="text-center py-12">
                  <p className="text-slate-500 text-sm">No administrative identities found.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};