import { useState, useEffect } from 'react';
import { Clock, X } from 'lucide-react';

interface SessionTimeoutProps {
  timeoutMinutes?: number;
  warningMinutes?: number;
  onTimeout: () => void;
  onExtend?: () => void;
}

export default function SessionTimeout({
  timeoutMinutes = 30,
  warningMinutes = 5,
  onTimeout,
  onExtend
}: SessionTimeoutProps) {
  const [showWarning, setShowWarning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [lastActivity, setLastActivity] = useState(Date.now());

  const resetTimer = () => {
    setLastActivity(Date.now());
    setShowWarning(false);
  };

  const handleExtend = () => {
    resetTimer();
    if (onExtend) onExtend();
  };

  useEffect(() => {
    // Track user activity
    const activities = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    
    const handleActivity = () => {
      resetTimer();
    };

    activities.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    return () => {
      activities.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = (now - lastActivity) / 1000 / 60; // minutes
      const remaining = timeoutMinutes - elapsed;

      if (remaining <= 0) {
        // Session expired
        clearInterval(interval);
        onTimeout();
      } else if (remaining <= warningMinutes && !showWarning) {
        // Show warning
        setShowWarning(true);
        setRemainingSeconds(Math.floor(remaining * 60));
      } else if (showWarning) {
        // Update countdown
        setRemainingSeconds(Math.floor(remaining * 60));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lastActivity, timeoutMinutes, warningMinutes, showWarning, onTimeout]);

  if (!showWarning) return null;

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl p-6 max-w-md w-full border border-yellow-500/30 shadow-2xl">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-500" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Session Expiring Soon</h3>
              <p className="text-sm text-gray-400">Your session will end in:</p>
            </div>
          </div>
          <button
            onClick={() => setShowWarning(false)}
            className="text-gray-500 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="bg-black/50 rounded-lg p-6 mb-6 text-center">
          <div className="text-5xl font-bold text-yellow-500 font-mono">
            {minutes}:{seconds.toString().padStart(2, '0')}
          </div>
          <p className="text-sm text-gray-400 mt-2">minutes remaining</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleExtend}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl"
          >
            Extend Session
          </button>
          <button
            onClick={onTimeout}
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-all"
          >
            Logout Now
          </button>
        </div>
      </div>
    </div>
  );
}
