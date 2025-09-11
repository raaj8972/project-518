import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Calendar, Image, Clock, Users, LogIn, Zap } from 'lucide-react';

export const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  const navItems = [
    { name: 'Home', path: '/', icon: null },
    { name: 'Events', path: '/events', icon: Calendar },
    { name: 'Schedule', path: '/schedule', icon: Clock },
    { name: 'Gallery', path: '/gallery', icon: Image },
    { name: 'Home Bound', path: '/home-bound', icon: Users },
    { name: 'Rico Family', path: '/rico-family', icon: Users },
    { name: 'Sponsors', path: '/sponsors', icon: Users },
    { name: 'Login', path: '/login', icon: LogIn },
  ];

  const isActive = (path: string) => location.pathname === path;

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`cyberpunk-navbar fixed top-0 w-full z-50 transition-all duration-300 ${
      scrolled ? 'backdrop-blur-md bg-black/80 border-b border-pink-500/30' : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="cyberpunk-logo group">
            <div className="flex items-center space-x-2">
              <Zap className="w-8 h-8 text-pink-400 group-hover:text-pink-300 transition-colors animate-pulse" />
              <span className="text-xl font-black tracking-wider cyberpunk-text">
                RICORRENZA 2025
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`cyberpunk-nav-item group ${
                    isActive(item.path) ? 'active' : ''
                  }`}
                >
                  <div className="flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200">
                    {Icon && <Icon size={16} className="group-hover:scale-110 transition-transform" />}
                    <span className="font-medium">{item.name}</span>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="cyberpunk-menu-btn p-2 rounded-lg transition-all duration-200"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="md:hidden cyberpunk-mobile-menu">
          <div className="px-2 pt-2 pb-3 space-y-1 bg-black/95 backdrop-blur-md border-t border-pink-500/30">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className={`cyberpunk-mobile-nav-item ${
                    isActive(item.path) ? 'active' : ''
                  }`}
                >
                  <div className="flex items-center space-x-3 px-3 py-3 rounded-lg transition-all duration-200">
                    {Icon && <Icon size={20} />}
                    <span className="font-medium text-base">{item.name}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <style jsx>{`
        .cyberpunk-navbar {
          font-family: 'Orbitron', 'Rajdhani', sans-serif;
        }

        .cyberpunk-logo {
          position: relative;
        }

        .cyberpunk-text {
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

        .cyberpunk-nav-item {
          position: relative;
          color: #ffffff;
          text-decoration: none;
          overflow: hidden;
        }

        .cyberpunk-nav-item::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 0;
          height: 100%;
          background: linear-gradient(90deg, rgba(255, 0, 255, 0.2), rgba(0, 255, 255, 0.2));
          transition: width 0.3s ease;
          border-radius: 8px;
        }

        .cyberpunk-nav-item:hover::before,
        .cyberpunk-nav-item.active::before {
          width: 100%;
        }

        .cyberpunk-nav-item:hover {
          color: #ff00ff;
          text-shadow: 0 0 5px rgba(255, 0, 255, 0.3);
        }

        .cyberpunk-nav-item.active {
          color: #00ffff;
          text-shadow: 0 0 5px rgba(0, 255, 255, 0.3);
        }

        .cyberpunk-menu-btn {
          color: #ffffff;
          border: 1px solid rgba(255, 0, 255, 0.3);
          background: rgba(255, 0, 255, 0.1);
        }

        .cyberpunk-menu-btn:hover {
          border-color: rgba(255, 0, 255, 0.6);
          background: rgba(255, 0, 255, 0.2);
          color: #ff00ff;
          box-shadow: 0 0 10px rgba(255, 0, 255, 0.2);
        }

        .cyberpunk-mobile-menu {
          animation: slideDown 0.3s ease-out;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .cyberpunk-mobile-nav-item {
          display: block;
          color: #ffffff;
          text-decoration: none;
          position: relative;
          overflow: hidden;
        }

        .cyberpunk-mobile-nav-item::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 0;
          height: 100%;
          background: linear-gradient(90deg, rgba(255, 0, 255, 0.2), rgba(0, 255, 255, 0.2));
          transition: width 0.3s ease;
          border-radius: 8px;
        }

        .cyberpunk-mobile-nav-item:hover::before,
        .cyberpunk-mobile-nav-item.active::before {
          width: 100%;
        }

        .cyberpunk-mobile-nav-item:hover {
          color: #ff00ff;
          text-shadow: 0 0 5px rgba(255, 0, 255, 0.3);
        }

        .cyberpunk-mobile-nav-item.active {
          color: #00ffff;
          text-shadow: 0 0 5px rgba(0, 255, 255, 0.3);
        }

        /* Smooth page transitions */
        .cyberpunk-nav-item,
        .cyberpunk-mobile-nav-item {
          transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }

        /* Mobile optimizations */
        @media (max-width: 768px) {
          .cyberpunk-text {
            font-size: 0.9rem;
          }
          
          .cyberpunk-nav-item,
          .cyberpunk-mobile-nav-item {
            font-size: 0.9rem;
          }
        }
        
        @media (max-width: 480px) {
          .cyberpunk-text {
            font-size: 0.8rem;
          }
          
          .cyberpunk-nav-item,
          .cyberpunk-mobile-nav-item {
            font-size: 0.8rem;
          }
          
          .cyberpunk-navbar .max-w-7xl {
            padding-left: 1rem;
            padding-right: 1rem;
          }
        }
      `}</style>
    </nav>
  );
};