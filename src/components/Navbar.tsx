import React, { useMemo, useState, useEffect, startTransition } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Calendar, Image, Clock, LogIn, Music, Heart, Trophy, HeartHandshake, Home, ShieldCheck, LayoutDashboard } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useStudentAuth } from '../context/StudentAuthContext';
import BrandLogo3D from './BrandLogo3D';
import { BRAND_YEAR } from '../constants/brand';

export const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  // Single subscription to DataContext to avoid multiple context subscribers
  const { homepageSettings, prefetchEvents, prefetchGalleryImages, adminUsers } = useData() as any;
  const { user } = useAuth();
  const { user: studentUser } = useStudentAuth();
  const currentUserId = user?.id || null;
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

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
  const logoSrc = useMemo(() => {
    const hs = homepageSettings as Record<string, any>;
    const raw = hs?.brand_logo_url;
    if (!raw) return '';
    let u = String(raw).trim();
    if (!u) return '';
    if (u.startsWith('//')) u = 'https:' + u; 
    if (u.startsWith('http://')) u = 'https://' + u.slice(7);
    
    // Cache-bust when branding updates
    const ver = hs?.updated_at || hs?.brand_logo_size_px || '1';
    const sep = u.includes('?') ? '&' : '?';
    return ver ? `${u}${sep}v=${encodeURIComponent(String(ver))}` : u;
  }, [homepageSettings?.brand_logo_url, (homepageSettings as any)?.updated_at]);

  // Safe defaults for size and glow
  const hs = homepageSettings as Record<string, any>;
  const logoSize = Math.max(8, Number(hs?.brand_logo_size_px) || 36);
  const glowStrength = Math.max(0, Number(hs?.brand_logo_glow_strength) || 1);

  // Handle navigation clicks immediately for snappy response
  const handleNavClick = (e: React.MouseEvent, path: string) => {
    // Allow standard browser behaviors: new tab/window, etc.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button === 1) return;
    
    // Snappy UI: Close menu first
    setIsOpen(false);
    
    // If we're already on this path, just close the menu and do nothing else
    if (location.pathname === path) {
      e.preventDefault();
      return;
    }

    // Let React handle the state transitions smoothly
    startTransition(() => {
      navigate(path);
    });
    
    e.preventDefault();
  };

  const navItems = useMemo(() => {
    const base = [
      { name: 'Home', path: '/', icon: Home, color: 'text-red-500' },
      { name: 'Events', path: '/events', icon: Calendar, color: 'text-red-600', onHover: prefetchEvents },
      { name: 'Schedule', path: '/schedule', icon: Clock, color: 'text-orange-600' },
      { name: 'Gallery', path: '/gallery', icon: Image, color: 'text-amber-700', onHover: prefetchGalleryImages },
      { name: 'Home Bound', path: '/home-bound', icon: Music, color: 'text-red-800' },
      { name: 'Rico Family', path: '/rico-family', icon: Heart, color: 'text-rose-900' },
      { name: 'Sports', path: '/sports', icon: Trophy, color: 'text-orange-800' },
      { name: 'Sponsors', path: '/sponsors', icon: HeartHandshake, color: 'text-red-400' },
      { 
        name: studentUser ? 'Dashboard' : 'Student Login', 
        path: studentUser ? '/dashboard' : '/student/login', 
        icon: studentUser ? LayoutDashboard : LogIn, 
        color: 'text-blue-500' 
      },
      { name: 'Login', path: '/login', icon: ShieldCheck, color: 'text-zinc-500' },
    ];

    // If current user appears in adminUsers, add Admin link that prefetches admin chunk on hover
    try {
      const uid = currentUserId;
      const isAdmin = uid && Array.isArray(adminUsers) && !!adminUsers.find((a: any) => a.user_id === uid && (a.role === 'owner' || a.role === 'admin' || a.is_primary));
      if (isAdmin) base.splice(base.length - 1, 0, { name: 'Admin', path: '/admin', icon: ShieldCheck, color: 'text-rose-500', onHover: () => import('../pages/AdminDashboard').catch(() => {}) });
    } catch {}

    return base;
  }, [prefetchEvents, prefetchGalleryImages, adminUsers, currentUserId]);

  const isActive = (path: string) => location.pathname === path;

  // Detect touch-capable devices so we can call hover-prefetch on touch
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  useEffect(() => {
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

  // Reset visibility on location change to avoid getting stuck in hidden state
  useEffect(() => {
    setIsVisible(true);
    setLastScrollY(window.scrollY);
  }, [location.pathname]);

  // Handle scroll effect with rAF-throttle for both background and auto-hide visibility
  useEffect(() => {
    let raf = 0 as number | null;
    const handleScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        const currentScrollY = window.scrollY;
        
        // Background blur threshold
        setScrolled(currentScrollY > 50);

        // Auto-hide visibility logic
        // Always show at top of page
        if (currentScrollY < 80) {
          setIsVisible(true);
        } else {
          const isHome = location.pathname === '/';
          // On Home page, increase threshold to allow room for Hero animations
          const hideThreshold = isHome ? window.innerHeight * 2.5 : 200;
          
          // If scrolling down, hide; If scrolling up, show
          if (currentScrollY > lastScrollY && currentScrollY > hideThreshold) {
            setIsVisible(false);
          } else if (currentScrollY < lastScrollY - 10) { // Slightly larger threshold on home
            // If on home, only force show if we are well outside the hero cinematic zone Or near the top
            if (!isHome || currentScrollY < 100 || currentScrollY > window.innerHeight * 1.6) {
              setIsVisible(true);
            }
          }
        }
        
        setLastScrollY(currentScrollY);
        raf = 0;
      });
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (raf) cancelAnimationFrame(raf as number);
    };
  }, [lastScrollY, location.pathname]);

  // Handle mouse movement to top of screen to restore navbar
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Don't show if a modal is open
      if (document.body.classList.contains('modal-open')) return;
      if (e.clientY < 60) setIsVisible(true);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Monitor body class for modal-open to suppress navbar
  useEffect(() => {
    const observer = new MutationObserver(() => {
      if (document.body.classList.contains('modal-open')) {
        setIsVisible(false);
      }
    });

    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    
    // Initial check
    if (document.body.classList.contains('modal-open')) {
      setIsVisible(false);
    }

    return () => observer.disconnect();
  }, []);

  // Stable Shell: Return null internally for non-public routes so the component 
  // remains mounted as a sibling in AppShell but doesn't render visual content.
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isSecurityRoute = location.pathname.startsWith('/security-');
  const isCoordinatorRoute = location.pathname.startsWith('/coordinator/dashboard');
  if (isAdminRoute || isSecurityRoute || isCoordinatorRoute) return null;

  return (
    <div className={`stranger-navbar fixed inset-x-0 z-[70] transition-all duration-500 ease-in-out flex justify-center w-full pointer-events-none p-2 sm:p-4 pt-[calc(env(safe-area-inset-top,8px)+4px)] ${
      isVisible ? 'top-0' : '-top-32 opacity-0'
    } ${scrolled ? '' : 'sm:top-2'} `}>
      <div className={`w-full max-w-[1600px] flex items-center justify-between gap-2 md:gap-4 px-2 sm:px-4 transition-transform duration-500 ${
        isVisible ? 'translate-y-0' : '-translate-y-full'
      }`}>
        
        {/* Left: Brand Pill */}
        <div className={`glass-pill pointer-events-auto transition-all duration-300 flex items-center h-10 md:h-14 px-3 md:px-4 ${
          scrolled ? 'bg-black/90' : 'bg-black/60'
        } ${!isVisible ? 'opacity-0 scale-95' : 'opacity-100 scale-100'} shadow-xl border border-white/10`}>
          <Link to="/" onClick={(e)=>handleNavClick(e, '/')} className="flex items-center space-x-2 md:space-x-3 group">
            {logoSrc && ((homepageSettings as any)?.brand_logo_side ?? 'left') === 'left' && (
              <div className="relative scale-90 md:scale-100" style={{ transform: `translate(${offX}px, ${offY}px)` }}>
                <BrandLogo3D src={logoSrc} size={logoSize * (vw < 768 ? 1.2 : 1)} glowStrength={glowStrength} glowColor={(homepageSettings as any)?.brand_logo_glow_color || undefined} />
              </div>
            )}
            <span className="text-xl sm:text-2xl md:text-3xl font-black tracking-wider leading-none stranger-things-text whitespace-nowrap">
              RICORRENZA {homepageSettings?.brand_year ?? BRAND_YEAR}
            </span>
            {logoSrc && ((homepageSettings as any)?.brand_logo_side ?? 'left') === 'right' && (
              <div className="relative scale-90 md:scale-100" style={{ transform: `translate(${offX}px, ${offY}px)` }}>
                <BrandLogo3D src={logoSrc} size={logoSize * (vw < 768 ? 1.2 : 1)} glowStrength={glowStrength} glowColor={(homepageSettings as any)?.brand_logo_glow_color || undefined} />
              </div>
            )}
          </Link>
        </div>

        {/* Center: Nav Pill (Desktop Only) */}
        <nav className={`hidden lg:flex glass-pill pointer-events-auto items-center h-12 md:h-14 px-2 gap-0.5 xl:gap-1 overflow-visible ${
          scrolled ? 'bg-black/80 shadow-[0_8px_32px_rgba(0,0,0,0.6)]' : 'bg-black/40'
        }`}>
          {navItems.filter(i => i.name !== 'Login' && i.name !== 'Admin').map((item) => {
            const Icon = item.icon;
            // Adaptive visibility for smaller desktop screens
            const isPriority = ['Home', 'Events', 'Schedule', 'Sports'].includes(item.name);
            return (
              <Link
                key={item.path}
                to={item.path}
                onMouseEnter={() => schedulePrefetch(item.onHover)}
                onTouchStart={() => { if (isTouchDevice) schedulePrefetch(item.onHover); }}
                onClick={(e)=>handleNavClick(e, item.path)}
                className={`group relative px-3 py-2 rounded-full transition-all duration-300 whitespace-nowrap ${
                  !isPriority ? 'hidden xl:flex' : 'flex'
                }`}
              >
                <div className={`flex items-center space-x-1.5 text-xs xl:text-sm font-bold tracking-wide transition-colors ${isActive(item.path) ? 'text-white' : 'text-white/60 group-hover:text-white'}`}>
                  {Icon && <Icon size={14} className={`group-hover:scale-110 transition-transform ${item.color || ''}`} />}
                  <span>{item.name}</span>
                </div>
                {isActive(item.path) && (
                  <span className="absolute inset-x-2 -bottom-1 h-[2px] bg-gradient-to-r from-red-600 via-orange-600 to-red-800 rounded-full blur-[1px] shadow-[0_0_10px_rgba(220,38,38,0.8)]"></span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right: Actions Pill */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Action links */}
          <div className={`hidden lg:flex glass-pill items-center h-12 md:h-14 px-2 gap-2 ${
            scrolled ? 'bg-black/80' : 'bg-black/40'
          }`}>
            {navItems.filter(i => i.name === 'Login' || i.name === 'Admin').map((item) => {
              const Icon = item.icon;
              const isAdmin = item.name === 'Admin';
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onMouseEnter={() => schedulePrefetch(item.onHover)}
                  onClick={(e)=>handleNavClick(e, item.path)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-full font-bold text-xs xl:text-sm transition-all hover:scale-105 active:scale-95 ${
                    isAdmin 
                      ? 'bg-gradient-to-r from-red-700 to-black text-white shadow-[0_0_15px_rgba(220,38,38,0.3)] border border-red-900/50'
                      : 'text-white hover:bg-white/10'
                  }`}
                >
                  {Icon && <Icon size={14} />}
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>

          {/* Mobile Menu Trigger */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="lg:hidden glass-pill flex items-center justify-center w-10 h-10 md:w-14 md:h-14 bg-black/60 text-white active:scale-95 transition-transform"
            aria-label="Toggle menu"
          >
            {isOpen ? <X size={20} className="md:w-6 md:h-6" /> : <Menu size={20} className="md:w-6 md:h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation - Enhanced */}
      {isOpen && (
        <div className="lg:hidden stranger-mobile-menu">
          <div className="px-3 pt-3 pb-4 space-y-2 bg-black/95 backdrop-blur-md border-t border-red-600/30">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={(e) => handleNavClick(e, item.path)}
                  className={`stranger-mobile-nav-item ${
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
        .glass-pill {
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 9999px;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .stranger-things-text {
          font-family: 'Benguiat', 'Crimson Pro', serif;
          background: linear-gradient(45deg, #ff0000, #990000, #ff0000);
          background-size: 200% 200%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: gradientShift 4s ease-in-out infinite;
          text-shadow: 0 0 10px rgba(255, 0, 0, 0.5);
          letter-spacing: 0.1em;
          font-weight: 900;
        }

        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        .stranger-mobile-menu {
          position: fixed;
          top: calc(80px + env(safe-area-inset-top, 0px));
          left: 16px;
          right: 16px;
          background: rgba(0, 0, 0, 0.95);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(220, 38, 38, 0.3);
          border-radius: 24px;
          overflow: hidden;
          animation: slideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          z-index: 1000;
          pointer-events: auto;
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .stranger-mobile-nav-item {
          display: block;
          color: rgba(255, 255, 255, 0.7);
          transition: all 0.2s ease;
        }

        .stranger-mobile-nav-item.active {
          color: #fff;
          background: rgba(255, 255, 255, 0.05);
        }

        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};