import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Calendar, Image, Clock, Users, LogIn } from 'lucide-react';
import { useData } from '../context/DataContext';
import BrandLogo3D from './BrandLogo3D';

export const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  // Single subscription to DataContext to avoid multiple context subscribers
  const { homepageSettings, prefetchEvents, prefetchGalleryImages } = useData();

  // Compute responsive offsets with fallback to base values
  const [vw, setVw] = useState<number>(typeof window !== 'undefined' ? window.innerWidth : 1024);
  useEffect(() => {
    // rAF-throttled resize handler to avoid layout thrash on rapid resizes
    let raf = 0 as number | null;
    const onResize = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        setVw(window.innerWidth);
        raf = 0;
      });
    };
    window.addEventListener('resize', onResize, { passive: true });
    return () => {
      window.removeEventListener('resize', onResize);
      if (raf) cancelAnimationFrame(raf as number);
    };
  }, []);
  const bp = vw >= 1024 ? 'lg' : vw >= 768 ? 'md' : 'sm';
  const offX = (() => {
    const hs: any = homepageSettings || {};
    if (bp === 'lg' && typeof hs.brand_logo_offset_x_lg_px === 'number') return hs.brand_logo_offset_x_lg_px;
    if (bp === 'md' && typeof hs.brand_logo_offset_x_md_px === 'number') return hs.brand_logo_offset_x_md_px;
    if (bp === 'sm' && typeof hs.brand_logo_offset_x_sm_px === 'number') return hs.brand_logo_offset_x_sm_px;
    return Number(hs.brand_logo_offset_x_px || 0);
  })();
  const offY = (() => {
    const hs: any = homepageSettings || {};
    if (bp === 'lg' && typeof hs.brand_logo_offset_y_lg_px === 'number') return hs.brand_logo_offset_y_lg_px;
    if (bp === 'md' && typeof hs.brand_logo_offset_y_md_px === 'number') return hs.brand_logo_offset_y_md_px;
    if (bp === 'sm' && typeof hs.brand_logo_offset_y_sm_px === 'number') return hs.brand_logo_offset_y_sm_px;
    return Number(hs.brand_logo_offset_y_px || 0);
  })();

  // Defensive URL normalization for logo (avoid mixed-content / protocol-relative issues)
  const logoSrc = React.useMemo(() => {
    const raw = (homepageSettings as any)?.brand_logo_url as string | undefined;
    if (!raw) return '';
    let u = String(raw).trim();
    if (!u) return '';
    if (u.startsWith('//')) u = 'https:' + u; // protocol-relative -> https
    if (u.startsWith('http://')) u = 'https://' + u.slice(7); // force https
    // Cache-bust when branding updates so the newest logo shows up immediately
    const ver = (homepageSettings as any)?.updated_at || (homepageSettings as any)?.brand_logo_size_px || '1';
    const sep = u.includes('?') ? '&' : '?';
    return ver ? `${u}${sep}v=${encodeURIComponent(String(ver))}` : u;
  }, [homepageSettings?.brand_logo_url, (homepageSettings as any)?.updated_at]);

  // Safe defaults for size and glow
  const logoSize = Math.max(8, Number((homepageSettings as any)?.brand_logo_size_px) || 36);
  const glowStrength = Math.max(0, Number((homepageSettings as any)?.brand_logo_glow_strength) || 1);

  // Handle navigation clicks immediately for snappy response
  const handleNavClick = (e: React.MouseEvent, path: string) => {
    // Allow standard browser behaviors: new tab/window, etc.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button === 1) return;
    e.preventDefault();
    // Close menu immediately for snappy UI, then navigate synchronously
    setIsOpen(false);
    try { navigate(path); } catch {}
  };

  const navItems = React.useMemo(() => [
    { name: 'Home', path: '/', icon: null },
    { name: 'Events', path: '/events', icon: Calendar, onHover: prefetchEvents },
    { name: 'Schedule', path: '/schedule', icon: Clock },
    { name: 'Gallery', path: '/gallery', icon: Image, onHover: prefetchGalleryImages },
    { name: 'Home Bound', path: '/home-bound', icon: Users },
    { name: 'Rico Family', path: '/rico-family', icon: Users },
    { name: 'Sponsors', path: '/sponsors', icon: Users },
    { name: 'Login', path: '/login', icon: LogIn },
  ], [prefetchEvents, prefetchGalleryImages]);

  const isActive = (path: string) => location.pathname === path;

  // Detect touch-capable devices so we can call hover-prefetch on touch
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  React.useEffect(() => {
    try {
      const mq = window.matchMedia('(hover: none), (pointer: coarse)');
      const update = () => setIsTouchDevice(mq.matches || ('ontouchstart' in window));
      update();
      mq.addEventListener?.('change', update);
      return () => mq.removeEventListener?.('change', update);
    } catch {
      setIsTouchDevice(('ontouchstart' in window));
    }
  }, []);

  // Helper to schedule low-priority hover prefetch work without blocking the main thread
  const schedulePrefetch = (fn?: (() => void) | undefined) => {
    if (!fn) return;
    try {
      if (typeof (window as any).requestIdleCallback === 'function') {
        (window as any).requestIdleCallback(fn, { timeout: 300 });
      } else {
        setTimeout(fn, 200);
      }
    } catch {
      setTimeout(fn, 200);
    }
  };

  // Handle scroll effect with rAF-throttle to avoid many re-renders during scroll
  useEffect(() => {
    let raf = 0 as number | null;
    const handleScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        setScrolled(window.scrollY > 50);
        raf = 0;
      });
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (raf) cancelAnimationFrame(raf as number);
    };
  }, []);

  return (
    <nav className={`cyberpunk-navbar fixed top-0 w-full z-50 transition-all duration-300 ${
      scrolled ? 'backdrop-blur-md bg-black/80 border-b border-pink-500/30' : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
  <div className="flex justify-between items-center h-16 md:h-20">
          {/* Logo + Title */}
          <Link to="/" onClick={(e)=>handleNavClick(e, '/')} className="cyberpunk-logo group">
            <div className="flex items-center space-x-3 relative">
              {/* Left side logo */}
              {logoSrc && ((homepageSettings as any)?.brand_logo_side ?? 'left') === 'left' && (
                <div
                  className="relative"
                  style={{
                    transform: `translate(${offX}px, ${offY}px)`
                  }}
                >
                  <BrandLogo3D
                    src={logoSrc}
                    size={logoSize}
                    glowStrength={glowStrength}
                    glowColor={(homepageSettings as any)?.brand_logo_glow_color || undefined}
                  />
                </div>
              )}

              {/* Title */}
              <span className="text-2xl md:text-3xl font-black tracking-wider leading-none cyberpunk-text">
                RICORRENZA {homepageSettings?.brand_year ?? 2025}
              </span>

              {/* Right side logo */}
              {logoSrc && ((homepageSettings as any)?.brand_logo_side ?? 'left') === 'right' && (
                <div
                  className="relative"
                  style={{
                    transform: `translate(${offX}px, ${offY}px)`
                  }}
                >
                  <BrandLogo3D
                    src={logoSrc}
                    size={logoSize}
                    glowStrength={glowStrength}
                    glowColor={(homepageSettings as any)?.brand_logo_glow_color || undefined}
                  />
                </div>
              )}

              {/* No fallback icon when logo is missing to avoid flashing during initial load */}
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
              onMouseEnter={() => schedulePrefetch(item.onHover)}
              onTouchStart={() => { if (isTouchDevice) schedulePrefetch(item.onHover); }}
                  onClick={(e)=>handleNavClick(e, item.path)}
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
                  onClick={(e) => handleNavClick(e, item.path)}
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

      <style>{`
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
          text-shadow: 0 0 2px rgba(255, 0, 255, 0.28);
        }

        .cyberpunk-nav-item.active {
          color: #00ffff;
          text-shadow: 0 0 2px rgba(0, 255, 255, 0.28);
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
          text-shadow: 0 0 2px rgba(255, 0, 255, 0.28);
        }

        .cyberpunk-mobile-nav-item.active {
          color: #80449eff;
          text-shadow: 0 0 2px rgba(0, 255, 255, 0.28);
        }

        /* Smooth page transitions */
        .cyberpunk-nav-item,
        .cyberpunk-mobile-nav-item {
          transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }

        /* Mobile optimizations */
        @media (max-width: 768px) {
          .cyberpunk-text {
            font-size: 1.1rem;
          }
          
          .cyberpunk-nav-item,
          .cyberpunk-mobile-nav-item {
            font-size: 0.9rem;
          }
        }
        
        @media (max-width: 480px) {
          .cyberpunk-text {
            font-size: 1rem;
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
        /* Dev-only helper outline handled inline next to BrandLogo3D */
      `}</style>
    </nav>
  );
};