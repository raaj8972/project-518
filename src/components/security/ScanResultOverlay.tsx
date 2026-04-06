import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Crown } from 'lucide-react';

interface ScanResult {
  valid: boolean;
  result: string;
  message: string;
  name?: string;
  pass_type?: string;
}

interface ScanResultOverlayProps {
  result: ScanResult;
  onDismiss: () => void;
  autoDismissMs?: number;
}

export function ScanResultOverlay({ 
  result, 
  onDismiss, 
  autoDismissMs = 3000 
}: ScanResultOverlayProps) {
  const [countdown, setCountdown] = useState(Math.ceil(autoDismissMs / 1000));
  const [isExiting, setIsExiting] = useState(false);

  // Determine result type
  const isAlreadyUsed = result.result === 'already_used';
  const isValid = result.valid;
  
  // Calculate display properties based on result
  const getResultStyle = () => {
    if (isValid) {
      return {
        bg: 'bg-cyan-600/95',
        border: 'border-cyan-300',
        icon: CheckCircle2,
        iconColor: 'text-cyan-100',
        title: 'PASS ✓',
        titleColor: 'text-cyan-50',
        gradient: 'from-cyan-700 to-cyan-500'
      };
    } else if (isAlreadyUsed) {
      return {
        bg: 'bg-indigo-600/95',
        border: 'border-indigo-300',
        icon: AlertTriangle,
        iconColor: 'text-indigo-100',
        title: 'ALREADY USED ⚠',
        titleColor: 'text-indigo-50',
        gradient: 'from-indigo-700 to-indigo-500'
      };
    } else {
      return {
        bg: 'bg-rose-600/95',
        border: 'border-rose-300',
        icon: XCircle,
        iconColor: 'text-rose-100',
        title: 'REJECT ✗',
        titleColor: 'text-rose-50',
        gradient: 'from-rose-700 to-rose-500'
      };
    }
  };

  const style = getResultStyle();
  const Icon = style.icon;

  useEffect(() => {
    // RESET state when a new result arrives (background scanning)
    setIsExiting(false);
    setCountdown(Math.ceil(autoDismissMs / 1000));

    if (autoDismissMs <= 0) return;

    // Countdown timer
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          handleDismiss();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownInterval);
  }, [autoDismissMs, result]);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss();
    }, 300); // Match animation duration
  };

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center p-0 transition-all duration-300 touch-manipulation cursor-pointer active:backdrop-blur-lg ${
        isExiting ? 'opacity-0' : 'opacity-100'
      }`}
      onClick={handleDismiss}
      onTouchEnd={(e) => {
        // Instant dismiss on touch end (prevents 300ms delay on some old Androids)
        e.preventDefault(); 
        handleDismiss();
      }}
    >
      {/* Backdrop */}
      <div className={`absolute inset-0 backdrop-blur-md transition-colors duration-500 ${
        isValid ? 'bg-cyan-600/20 animate-pulse' : 'bg-rose-900/30'
      }`} />
      <div className="absolute inset-0 bg-black/60" />

      {/* Result Card */}
      <div
        className={`relative w-full h-full md:h-auto md:max-w-2xl md:min-h-[600px] md:rounded-3xl border-0 md:border-4 ${style.border} shadow-2xl overflow-hidden transform transition-all duration-300 flex flex-col justify-center ${
          isExiting ? 'scale-110' : 'scale-100'
        }`}
        style={{ backgroundColor: isValid ? '#0891b2' : '#9d174d' }} 
      >
        {/* Progress Bar (Visual feedback of time remaining) */}
        {autoDismissMs > 0 && (
          <div className="absolute top-0 left-0 w-full h-1.5 bg-black/10 z-20">
            <div 
              className={`h-full bg-white/60 transition-all duration-1000 ease-linear`}
              style={{ width: `${(countdown / (Math.max(1, autoDismissMs / 1000))) * 100}%` }}
            />
          </div>
        )}

        {/* Gradient Header */}
        <div className={`h-3 bg-gradient-to-r ${style.gradient}`} />

        {/* Content */}
        <div className="p-8 space-y-6">
          {/* Icon and Status */}
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className={`w-40 h-40 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center animate-scale-in border-4 border-white/30 shadow-2xl`}>
                <Icon className={`w-28 h-28 ${style.iconColor} animate-bounce-once`} strokeWidth={3} />
              </div>
            </div>

            {/* Status Text */}
            <h1 className={`text-5xl md:text-6xl font-black ${style.titleColor} tracking-tight drop-shadow-lg animate-fade-in uppercase`}>
              {style.title}
            </h1>
          </div>

          {/* Participant Information */}
          {result.name && (
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 border-2 border-white/30 animate-slide-up relative overflow-hidden">
              <p className="text-white/80 text-sm font-semibold uppercase tracking-widest mb-2">
                Participant
              </p>
              <div className="flex flex-col items-center gap-4 relative">
                <p 
                  className="text-white font-black tracking-tighter break-words leading-[0.9] text-center w-full"
                  style={{ 
                    fontSize: 'clamp(3rem, 12vw, 5rem)',
                    textShadow: '0 4px 12px rgba(0,0,0,0.3)'
                  }}
                >
                  {result.name}
                </p>
                {result.pass_type === 'vip' && (
                  <div className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-4 py-2 rounded-xl border-2 border-violet-400/50 flex items-center gap-2 shadow-xl animate-pulse transform scale-90 sm:scale-100">
                    <Crown className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-300" />
                    <span className="font-black text-xs sm:text-sm uppercase tracking-tighter">VIP ELITE</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Message */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
            <p className="text-white text-center font-bold text-xl uppercase tracking-wide">
              {result.message}
            </p>
          </div>

          {/* Countdown */}
          {autoDismissMs > 0 && (
            <div className="flex items-center justify-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-2 border-white/40">
                <span className="text-white text-xl font-bold">{countdown}</span>
              </div>
              <p className="text-white/70 text-sm font-black uppercase tracking-widest">
                CLOSING IN {countdown}S
              </p>
            </div>
          )}
          {/* Footer Hint */}
          <div className="text-center">
            <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.3em] animate-pulse">
              Tap anywhere to dismiss
            </p>
          </div>
        </div>

        {/* Gradient Footer */}
        <div className={`h-3 bg-gradient-to-r ${style.gradient}`} />
      </div>

      {/* Animations */}
      <style>{`
        @keyframes scale-in {
          0% {
            transform: scale(0.5);
            opacity: 0;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes bounce-once {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        @keyframes fade-in {
          0% {
            opacity: 0;
            transform: translateY(-20px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slide-up {
          0% {
            opacity: 0;
            transform: translateY(20px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-scale-in {
          animation: scale-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .animate-bounce-once {
          animation: bounce-once 0.6s ease-out;
        }

        .animate-fade-in {
          animation: fade-in 0.5s ease-out 0.2s both;
        }

        .animate-slide-up {
          animation: slide-up 0.5s ease-out 0.3s both;
        }
      `}</style>
    </div>
  );
}
