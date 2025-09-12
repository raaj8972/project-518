import React from 'react';
import { useLocation } from 'react-router-dom';
import { Instagram, Youtube } from 'lucide-react';
import { useData } from '../context/DataContext';

export const Footer: React.FC = () => {
  const { socialMediaSettings } = useData();
  const location = useLocation();
  const isHomeBound = location.pathname === '/home-bound' || location.pathname.startsWith('/home-bound');

  // Check if social media links should be shown
  const showInstagram = socialMediaSettings?.instagramEnabled && socialMediaSettings?.instagramUrl;
  const showYoutube = socialMediaSettings?.youtubeEnabled && socialMediaSettings?.youtubeUrl;
  const showSocialMedia = (showInstagram || showYoutube) && !isHomeBound;

  return (
    <footer className="cyberpunk-footer relative overflow-hidden">
  {/* Animated Background */}
  <div className="absolute inset-0 bg-gradient-to-br from-[#0b0b12]/60 via-[#0a0a0a]/70 to-[#0b0b12]/60"></div>
  <div className="absolute inset-0 cyberpunk-grid opacity-10"></div>
      
      {/* Floating Particles */}
      <div className="particles-container">
        {[...Array(20)].map((_, i) => (
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

      <div className="container mx-auto px-4 py-1 relative z-10">
        {/* Social Media Section */}
        {showSocialMedia && (
          <div className="text-center mb-8">
            <div className="flex justify-center">
              <div className="glass-panel inline-block px-5 py-4 sm:px-6 sm:py-5">
                <h3 className="text-base sm:text-lg md:text-xl font-bold mb-3 sm:mb-4 cyberpunk-title">
                  Connect With Us
                </h3>
                <div className="flex justify-center items-center space-x-5 sm:space-x-6">
                  {showInstagram && (
                    <a
                      href={socialMediaSettings.instagramUrl || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center space-x-2 text-pink-400 hover:text-pink-300 transition-all duration-300 hover:scale-110 hover-float"
                    >
                      <Instagram size={24} className="group-hover:rotate-12 transition-transform pulse-ring" />
                      <span className="text-sm font-medium hidden sm:block">Instagram</span>
                    </a>
                  )}
                  {showYoutube && (
                    <a
                      href={socialMediaSettings.youtubeUrl || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center space-x-2 text-red-400 hover:text-red-300 transition-all duration-300 hover:scale-110 hover-float"
                    >
                      <Youtube size={24} className="group-hover:rotate-12 transition-transform pulse-ring" />
                      <span className="text-sm font-medium hidden sm:block">YouTube</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Fallback strip: always visible */}
        <div className="mt-4">
          <div className="h-px w-full bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
          <div className="py-4 text-center text-xs text-gray-300/80">
            © {new Date().getFullYear()} RICORRENZA 2025 • All rights reserved
          </div>
        </div>
      </div>

      <style>{`
        .cyberpunk-footer {
          background: #0a0a0a;
          color: #ffffff;
          font-family: 'Orbitron', 'Rajdhani', sans-serif;
          position: relative;
          margin-top: auto;
        }

        /* Frosted glass panel for social section */
        .glass-panel {
          background: rgba(10, 10, 10, 0.55); /* match page color with subtle tint */
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 16px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04);
          -webkit-backdrop-filter: blur(10px);
          backdrop-filter: blur(10px);
        }

        @supports not ((-webkit-backdrop-filter: blur(10px)) or (backdrop-filter: blur(10px))) {
          .glass-panel { background: rgba(10, 10, 10, 0.75); }
        }

        .cyberpunk-grid {
          background-image: 
            linear-gradient(rgba(0, 255, 255, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 255, 255, 0.1) 1px, transparent 1px);
          background-size: 30px 30px;
          animation: gridMove 30s linear infinite;
        }

        @keyframes gridMove {
          0% { transform: translate(0, 0); }
          100% { transform: translate(30px, 30px); }
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
          width: 1px;
          height: 1px;
          background: linear-gradient(45deg, #ff00ff, #00ffff);
          border-radius: 50%;
          animation: particleFloat linear infinite;
        }

        @keyframes particleFloat {
          0% {
            transform: translateY(100%) scale(0);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(-100%) scale(1);
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

        .cyberpunk-text {
          background: linear-gradient(45deg, #ff00ff, #00ffff, #ff00ff);
          background-size: 200% 200%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: gradientShift 3s ease-in-out infinite;
        }

        .neon-pink {
          color: #ff00ff;
          text-shadow: 
            0 0 5px #ff00ff,
            0 0 10px #ff00ff;
        }

        .hover-float:hover {
          animation: float 3s ease-in-out infinite;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }

        .pulse-ring {
          position: relative;
        }

        .pulse-ring::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 100%;
          height: 100%;
          border: 2px solid rgba(255, 0, 255, 0.3);
          border-radius: 50%;
          transform: translate(-50%, -50%);
          animation: pulseRing 2s ease-out infinite;
        }

        @keyframes pulseRing {
          0% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) scale(2);
            opacity: 0;
          }
        }

        /* Mobile optimizations */
        @media (max-width: 768px) {
          .cyberpunk-title {
            font-size: 1rem;
          }
          
          .particles-container {
            display: none;
          }
          .glass-panel {
            border-radius: 12px;
            -webkit-backdrop-filter: blur(8px);
            backdrop-filter: blur(8px);
          }
        }
        
        @media (max-width: 480px) {
          .cyberpunk-title {
            font-size: 0.9rem;
          }
        }
      `}</style>
    </footer>
  );
};