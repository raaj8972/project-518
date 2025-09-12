import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, AlertCircle, Shield, Smartphone, Mail, Zap, Terminal } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [requiresTOTP, setRequiresTOTP] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  // Intersection Observer for scroll animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    const animatedElements = document.querySelectorAll('.scroll-animate');
    animatedElements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await login(email, password, totpCode || undefined);
      
      if (result.success) {
        navigate('/admin');
      } else if (result.requiresTOTP) {
        setRequiresTOTP(true);
        setError('');
      } else {
        setError(result.error || 'Authentication failed. Please try again.');
      }
    } catch (error) {
      setError('Authentication failed. Please try again.');
      console.error('Login error:', error);
    }
    
    setIsLoading(false);
  };

  const handleBackToPassword = () => {
    setRequiresTOTP(false);
    setTotpCode('');
    setError('');
  };

  return (
    <div className="cyberpunk-theme min-h-screen">
      {/* Hero Section */}
      <section className="hero-section relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 z-0">
          <div className="hero-bg parallax" data-speed="0.3">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-900/80 via-blue-900/60 to-pink-900/80"></div>
            <div className="absolute inset-0 bg-black/70"></div>
          </div>
          
          {/* Cyberpunk Grid Overlay */}
          <div className="absolute inset-0 cyberpunk-grid opacity-20"></div>
          
          {/* Floating Particles */}
          <div className="particles-container">
            {[...Array(30)].map((_, i) => (
              <div
                key={i}
                className="particle"
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 20}s`,
                  animationDuration: `${15 + Math.random() * 10}s`
                }}
              ></div>
            ))}
          </div>
        </div>

        {/* Login Content */}
        <div className="relative z-10 w-full max-w-md mx-auto px-4">
          <div className="scroll-animate opacity-0 transform translate-y-20">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="flex justify-center mb-6">
                {requiresTOTP ? (
                  <div className="relative">
                    <div className="cyberpunk-icon-container">
                      <Lock className="h-12 w-12 text-yellow-400" />
                      <Shield className="h-6 w-6 text-green-400 absolute -top-1 -right-1" />
                    </div>
                  </div>
                ) : (
                  <div className="cyberpunk-icon-container">
                    <Terminal className="h-16 w-16 text-yellow-400" />
                  </div>
                )}
              </div>
              <h1 className="text-4xl font-black mb-4 cyberpunk-title">
                {requiresTOTP ? 'CYBER <span class="neon-green">VERIFY</span>' : 'ADMIN'}
              </h1>
              <p className="text-lg text-gray-300">
                {requiresTOTP 
                  ? 'Enter the 6-digit code from your authenticator app'
                  : 'Access the RICORRENZA 2025 dashboard'
                }
              </p>
            </div>

            {/* Login Form */}
            <div className="cyberpunk-card">
              <form onSubmit={handleSubmit} className="space-y-6 p-8">
                {error && (
                  <div className="cyberpunk-alert">
                    <AlertCircle className="w-5 h-5 text-red-400 mr-3" />
                    <span className="text-red-400 text-sm">{error}</span>
                  </div>
                )}

                {!requiresTOTP ? (
                  <>
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                        Admin Email
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Mail className="w-5 h-5 text-gray-400" />
                        </div>
                        <input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="cyberpunk-input pl-10"
                          placeholder="Enter admin email"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                        Admin Password
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Lock className="w-5 h-5 text-gray-400" />
                        </div>
                        <input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="cyberpunk-input pl-10 pr-12"
                          placeholder="Enter admin password"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-300"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div>
                    <label htmlFor="totpCode" className="block text-sm font-medium text-gray-300 mb-2">
                      2FA Authentication Code
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Smartphone className="w-5 h-5 text-gray-400" />
                      </div>
                      <input
                        id="totpCode"
                        type="text"
                        value={totpCode}
                        onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="cyberpunk-input pl-10 text-center text-2xl tracking-widest"
                        placeholder="000000"
                        maxLength={6}
                        required
                      />
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      Open your authenticator app and enter the 6-digit code
                    </p>
                  </div>
                )}

                <div className="flex flex-col space-y-3">
                  <button
                    type="submit"
                    disabled={isLoading || (requiresTOTP && totpCode.length !== 6)}
                    className={`cyberpunk-btn cyberpunk-btn-primary w-full ${
                      isLoading || (requiresTOTP && totpCode.length !== 6) ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <span className="relative z-10 flex items-center justify-center">
                      {isLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin mr-2"></div>
                          {requiresTOTP ? 'VERIFYING...' : 'AUTHENTICATING...'}
                        </>
                      ) : (
                        <>
                          <Zap className="mr-2" size={20} />
                          {requiresTOTP ? 'VERIFY 2FA CODE' : 'ACCESS DASHBOARD'}
                        </>
                      )}
                    </span>
                  </button>

                  {requiresTOTP && (
                    <button
                      type="button"
                      onClick={handleBackToPassword}
                      className="cyberpunk-btn cyberpunk-btn-secondary w-full"
                    >
                      <span className="relative z-10">BACK TO PASSWORD</span>
                    </button>
                  )}
                </div>
              </form>

              <div className="px-8 pb-8">
                <div className="text-center text-xs text-gray-500">
                  <a href="#" className="hover:text-gray-400 transition-colors">
                    Forgot password? Contact system administrator
                  </a>
                </div>
              </div>
            </div>

            {/* Security Notice */}
            <div className="text-center text-xs text-gray-500 mt-8">
              <div className="flex items-center justify-center mb-2">
                <Shield className="w-4 h-4 mr-1" />
                <span>Secure access for RICORRENZA 2025</span>
              </div>
              <p>© 2025 College Festival Management</p>
            </div>
          </div>
        </div>
      </section>

      <style>{`
        .cyberpunk-theme {
          background: #0a0a0a;
          color: #ffffff;
          font-family: 'Orbitron', 'Rajdhani', sans-serif;
          min-height: 100vh;
        }

        .hero-section {
          position: relative;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
        }

        .cyberpunk-grid {
          background-image: 
            linear-gradient(rgba(0, 255, 255, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 255, 255, 0.1) 1px, transparent 1px);
          background-size: 50px 50px;
          animation: gridMove 20s linear infinite;
        }

        @keyframes gridMove {
          0% { transform: translate(0, 0); }
          100% { transform: translate(50px, 50px); }
        }

        .particles-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
        }

        .particle {
          position: absolute;
          width: 2px;
          height: 2px;
          background: linear-gradient(45deg, #ff00ff, #00ffff);
          border-radius: 50%;
          animation: particleFloat linear infinite;
        }

        @keyframes particleFloat {
          0% {
            transform: translateY(100vh) scale(0);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(-100px) scale(1);
            opacity: 0;
          }
        }

        .cyberpunk-title {
          background: linear-gradient(45deg, #ff00ff, #00ffff, #ff00ff);
          background-size: 200% 200%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: gradientShift 3s ease-in-out infinite;
        }

        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        .neon-yellow {
          color: #ffff00;
          text-shadow: 
            0 0 3px #ffff00,
            0 0 6px #ffff00;
        }

        .neon-green {
          color: #00ff00;
          text-shadow: 
            0 0 3px #00ff00,
            0 0 6px #00ff00;
        }

        .cyberpunk-icon-container {
          position: relative;
          display: inline-block;
          padding: 20px;
          border: 2px solid rgba(255, 255, 0, 0.3);
          border-radius: 50%;
          background: rgba(255, 255, 0, 0.1);
          box-shadow: 
            0 0 20px rgba(255, 255, 0, 0.2),
            inset 0 0 20px rgba(255, 255, 0, 0.1);
        }

        .cyberpunk-card {
          background: rgba(20, 20, 40, 0.9);
          border: 1px solid rgba(0, 255, 255, 0.3);
          border-radius: 8px;
          backdrop-filter: blur(15px);
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .cyberpunk-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, #ff00ff, #00ffff, #ff00ff);
          animation: borderGlow 3s ease-in-out infinite;
        }

        @keyframes borderGlow {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }

        .cyberpunk-input {
          width: 100%;
          padding: 12px 16px;
          background: rgba(0, 0, 0, 0.5);
          border: 2px solid rgba(0, 255, 255, 0.3);
          border-radius: 8px;
          color: white;
          font-family: 'Orbitron', monospace;
          transition: all 0.3s ease;
        }

        .cyberpunk-input:focus {
          outline: none;
          border-color: rgba(0, 255, 255, 0.8);
          box-shadow: 
            0 0 10px rgba(0, 255, 255, 0.3),
            inset 0 0 10px rgba(0, 255, 255, 0.1);
        }

        .cyberpunk-input::placeholder {
          color: rgba(255, 255, 255, 0.5);
        }

        .cyberpunk-btn {
          position: relative;
          padding: 12px 32px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          border: 2px solid;
          background: transparent;
          overflow: hidden;
          transition: all 0.3s ease;
          clip-path: polygon(0 0, calc(100% - 20px) 0, 100% 100%, 20px 100%);
        }

        .cyberpunk-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
          transition: left 0.5s;
        }

        .cyberpunk-btn:hover::before {
          left: 100%;
        }

        .cyberpunk-btn-primary {
          border-color: #ffff00;
          color: #ffff00;
          box-shadow: 
            0 0 10px rgba(255, 255, 0, 0.2),
            inset 0 0 10px rgba(255, 255, 0, 0.05);
        }

        .cyberpunk-btn-primary:hover {
          background: rgba(255, 255, 0, 0.1);
          box-shadow: 
            0 0 20px rgba(255, 255, 0, 0.4),
            inset 0 0 20px rgba(255, 255, 0, 0.1);
          transform: translateY(-2px);
        }

        .cyberpunk-btn-secondary {
          border-color: #00ffff;
          color: #00ffff;
          box-shadow: 
            0 0 10px rgba(0, 255, 255, 0.2),
            inset 0 0 10px rgba(0, 255, 255, 0.05);
        }

        .cyberpunk-btn-secondary:hover {
          background: rgba(0, 255, 255, 0.1);
          box-shadow: 
            0 0 20px rgba(0, 255, 255, 0.4),
            inset 0 0 20px rgba(0, 255, 255, 0.1);
          transform: translateY(-2px);
        }

        .cyberpunk-alert {
          background: rgba(255, 0, 0, 0.1);
          border: 1px solid rgba(255, 0, 0, 0.3);
          border-radius: 8px;
          padding: 12px;
          display: flex;
          align-items: center;
        }

        .scroll-animate {
          transition: all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }

        .scroll-animate.animate-in {
          opacity: 1 !important;
          transform: translateY(0) !important;
        }

        /* Mobile optimizations */
        @media (max-width: 768px) {
          .cyberpunk-title {
            font-size: 1.8rem;
          }
          
          .hero-section h1 {
            font-size: 2rem !important;
          }
          
          .hero-section p {
            font-size: 1rem !important;
          }
          
          .particles-container {
            display: none;
          }
          
          .cyberpunk-btn {
            padding: 10px 24px;
            font-size: 0.9rem;
            clip-path: polygon(0 0, calc(100% - 10px) 0, 100% 100%, 10px 100%);
          }
          
          .cyberpunk-input {
            padding: 10px 14px;
            font-size: 0.9rem;
          }
        }
        
        @media (max-width: 480px) {
          .cyberpunk-title {
            font-size: 1.5rem;
          }
          
          .hero-section h1 {
            font-size: 1.8rem !important;
          }
          
          .hero-section p {
            font-size: 0.9rem !important;
          }
          
          .cyberpunk-btn {
            padding: 8px 16px;
            font-size: 0.8rem;
            clip-path: polygon(0 0, calc(100% - 5px) 0, 100% 100%, 5px 100%);
          }
          
          .cyberpunk-input {
            padding: 8px 12px;
            font-size: 0.8rem;
          }
        }
      `}</style>
    </div>
  );
};