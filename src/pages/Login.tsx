import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Volume2, Heart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Login.css';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
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
    <div className="cyberpunk-theme min-h-screen flex items-center justify-center overflow-hidden relative">
      {/* Background - Keeping the existing background but ensuring it works with the new box */}
      <div className="absolute inset-0 z-0">
        <div className="hero-bg parallax" data-speed="0.3">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/80 via-blue-900/60 to-pink-900/80"></div>
          <div className="absolute inset-0 bg-black/70"></div>
        </div>
        <div className="absolute inset-0 cyberpunk-grid opacity-20"></div>
      </div>

      {/* New Login Box Structure */}
      <div className="relative z-10">
        <div className="custom-login-box">
          <div className="custom-login-content">
            <div className="custom-login-title">
              <Volume2 className="w-5 h-5 text-[#ff2770] mr-3" />
              {requiresTOTP ? 'VERIFY' : 'LOGIN'}
              <Heart className="w-5 h-5 text-[#ff2770] ml-3 fill-[#ff2770]" />
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {error && (
                <div className="text-red-400 text-xs text-center bg-red-900/20 p-2 rounded border border-red-500/30">
                  {error}
                </div>
              )}

              {!requiresTOTP ? (
                <>
                  <input
                    type="email"
                    className="custom-input"
                    placeholder="Username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <input
                    type="password"
                    className="custom-input"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </>
              ) : (
                <input
                  type="text"
                  className="custom-input text-center tracking-widest text-xl"
                  placeholder="000000"
                  maxLength={6}
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                  required
                  autoFocus
                />
              )}

              <button type="submit" className="custom-button" disabled={isLoading}>
                {isLoading ? 'Processing...' : (requiresTOTP ? 'Verify Code' : 'Sign in')}
              </button>

              <div className="custom-links">
                {requiresTOTP ? (
                  <button type="button" onClick={handleBackToPassword} className="custom-link hover:text-white bg-transparent border-none cursor-pointer">
                    Back to Login
                  </button>
                ) : (
                  <>
                    <a href="#" className="custom-link">Forgot Password</a>
                    <a href="#" className="custom-link signup">Sign up</a>
                  </>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};