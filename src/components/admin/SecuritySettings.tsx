import React, { useState } from 'react';
import { Shield, Smartphone, Key, CheckCircle, AlertCircle, Copy, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const SecuritySettings: React.FC = () => {
  const { setupTOTP, verifyTOTP, enableTOTP, disableTOTP, isTOTPEnabled, isAuthenticated } = useAuth();
  const [isSettingUpTOTP, setIsSettingUpTOTP] = useState(false);
  const [totpSecret, setTotpSecret] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <Key className="w-5 h-5 text-gray-600 mr-3" />
              <div>
                <div className="font-medium text-gray-900">Password Protection</div>
                <div className="text-sm text-gray-600">Your account is protected with a secure password</div>
              </div>
            </div>
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>

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

      {/* Security Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">Security Tips</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li className="flex items-start">
            <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
            <span>Keep your authenticator app secure and backed up</span>
          </li>
          <li className="flex items-start">
            <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
            <span>Never share your admin password or 2FA codes with anyone</span>
          </li>
          <li className="flex items-start">
            <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
            <span>Log out when you're done using the admin panel</span>
          </li>
          <li className="flex items-start">
            <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
            <span>Use a secure device when accessing the admin panel</span>
          </li>
        </ul>
      </div>
    </div>
  );
};