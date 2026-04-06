import React, { useMemo, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Calendar, Image, Clock, LogIn, Music, Heart, Trophy, HeartHandshake, Home, ShieldCheck, LayoutDashboard } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useStudentAuth } from '../context/StudentAuthContext';
import BrandLogo3D from './BrandLogo3D';
import { BRAND_YEAR } from '../constants/brand';

interface NavItem {
  name: string;
  path: string;
  icon: any; // Lucide icon components are functions
  color?: string;
  onHover?: () => void;
}

/**
 * Performance-optimized Navbar.
 * Wrapped in React.memo to prevent unnecessary re-renders when global context updates.
 * Throttles scroll and resize events.
 */
export const Navbar = React.memo(function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const { 
    homepageSettings, 
    prefetchEvents, 
    prefetchGalleryImages, 
    adminUsers, 
    siteSettings 
  } = useData();
  const { user } = useAuth();
  const { user: studentUser } = useStudentAuth();
  const currentUserId = user?.id || null;
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Compute responsive offsets
  const [vw, setVw] = useState<number>(typeof window !== 'undefined' ? window.innerWidth : 1024);
  useEffect(() => {
    let raf = 0;
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
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);



  const logoSrc = useMemo(() => {
    const hs = homepageSettings as Record<string, any>;
    const raw = hs?.brand_logo_url;
    if (!raw) return '';
    let u = String(raw).trim();
    if (!u) return '';
    if (u.startsWith('//')) u = 'https:' + u; 
    if (u.startsWith('http://')) u = 'https://' + u.slice(7);
    const ver = hs?.updated_at || hs?.brand_logo_size_px || '1';
    const sep = u.includes('?') ? '&' : '?';
    return `${u}${sep}v=${encodeURIComponent(String(ver))}`;
  }, [homepageSettings?.brand_logo_url, (homepageSettings as any)?.updated_at]);

  const hs = homepageSettings as Record<string, any>;
  const logoSize = Math.max(8, Number(hs?.brand_logo_size_px) || 36);
  const glowStrength = Math.max(0, Number(hs?.brand_logo_glow_strength) || 1);

  const handleNavClick = () => {
    setIsOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navItems = useMemo<NavItem[]>(() => {
    // Define all possible public navigation items
    const publicItems: Record<string, NavItem> = {
      'home': { name: 'Home', path: '/', icon: Home, color: 'text-indigo-400' },
      'events': { name: 'Events', path: '/events', icon: Calendar, color: 'text-violet-400', onHover: prefetchEvents },
      'schedule': { name: 'Schedule', path: '/schedule', icon: Clock, color: 'text-cyan-400' },
      'gallery': { name: 'Gallery', path: '/gallery', icon: Image, color: 'text-indigo-500', onHover: prefetchGalleryImages },
      'home-bound': { name: 'Home Bound', path: '/home-bound', icon: Music, color: 'text-violet-500' },
      'rico-family': { name: 'Rico Family', path: '/rico-family', icon: Heart, color: 'text-purple-400' },
      'sports': { name: 'Sports', path: '/sports', icon: Trophy, color: 'text-indigo-600' },
      'sponsors': { name: 'Sponsors', path: '/sponsors', icon: HeartHandshake, color: 'text-cyan-500' },
    };

    // 1. Get the order from site settings, or use default order
    const defaultOrder = ['home', 'events', 'schedule', 'gallery', 'home-bound', 'rico-family', 'sports', 'sponsors'];
    const order = (siteSettings as any)?.navigation_order && (siteSettings as any).navigation_order.length > 0
      ? (siteSettings as any).navigation_order
      : defaultOrder;
    
    // 2. Map the order to actual items
    const base: NavItem[] = order.map((key: string) => publicItems[key]).filter(Boolean);

    // 3. Ensure any missing public items are added (fallback)
    defaultOrder.forEach(key => {
      if (!order.includes(key) && publicItems[key]) base.push(publicItems[key]);
    });

    // 4. Add fixed private/auth items at the end
    base.push({ 
      name: studentUser ? 'Dashboard' : 'Student Login', 
      path: studentUser ? '/dashboard' : '/student/login', 
      icon: studentUser ? LayoutDashboard : LogIn, 
      color: 'text-blue-500' 
    });

    try {
      const uid = currentUserId;
      const isAdminFlag = uid && Array.isArray(adminUsers) && !!adminUsers.find((a: any) => a.user_id === uid && (a.role === 'owner' || a.role === 'admin' || a.is_primary));
      if (isAdminFlag) base.push({ name: 'Admin', path: '/admin', icon: ShieldCheck, color: 'text-indigo-400', onHover: () => import('../pages/AdminDashboard').catch(() => {}) });
    } catch {}

    base.push({ name: 'Login', path: '/login', icon: ShieldCheck, color: 'text-zinc-500' });

    return base;
  }, [prefetchEvents, prefetchGalleryImages, adminUsers, currentUserId, studentUser, (siteSettings as any)?.navigation_order]);

  const isActive = (path: string) => location.pathname === path;

  // Optimized Scroll Handler
  useEffect(() => {
    let raf = 0;
    const handleScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        const currentScrollY = window.scrollY;
        setScrolled(currentScrollY > 50);
        if (currentScrollY < 80) {
          setIsVisible(true);
        } else {
          const isHome = location.pathname === '/';
          const hideThreshold = isHome ? window.innerHeight * 2.5 : 200;
          if (currentScrollY > lastScrollY && currentScrollY > hideThreshold) {
            setIsVisible(false);
          } else if (currentScrollY < lastScrollY - 20) {
            setIsVisible(true);
          }
        }
        setLastScrollY(currentScrollY);
        raf = 0;
      });
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [lastScrollY, location.pathname]);

  // Handle mouse move to top
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (e.clientY < 50) setIsVisible(true);
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const isAdminRoute = location.pathname.startsWith('/admin');
  const isSecurityRoute = location.pathname.startsWith('/security-');
  const isCoordinatorRoute = location.pathname.startsWith('/coordinator/dashboard');
  if (isAdminRoute || isSecurityRoute || isCoordinatorRoute) return null;

  return (
    <div className={`cyberpunk-navbar fixed inset-x-0 z-[100] transition-all duration-500 ease-in-out flex justify-center w-full pointer-events-none p-2 sm:p-4 pt-[calc(env(safe-area-inset-top,8px)+4px)] ${
      isVisible ? 'top-0' : '-top-32 opacity-0'
    } ${scrolled ? '' : 'sm:top-2'} `}>
      <div className={`w-full max-w-[1600px] flex items-center justify-between gap-2 md:gap-4 px-2 sm:px-4 transition-transform duration-500 ${
        isVisible ? 'translate-y-0' : '-translate-y-full'
      }`}>
        
        {/* Left: Brand Pill */}
        <div className={`glass-pill pointer-events-auto transition-all duration-300 flex items-center h-10 md:h-14 px-3 md:px-4 ${
          scrolled ? 'bg-black/90' : 'bg-black/60'
        } shadow-xl border border-white/10`}>
          <Link to="/" onClick={handleNavClick} className="flex items-center space-x-2 md:space-x-3 group">
            <BrandLogo3D 
              src={logoSrc} 
              prioritySrc="/favicon.svg"
              size={logoSize * (vw < 768 ? 1.2 : 1)} 
              glowStrength={glowStrength} 
              glowColor={(homepageSettings as any)?.brand_logo_glow_color || undefined} 
            />
            <span className="text-xl sm:text-2xl md:text-3xl font-black tracking-wider leading-none bollywood-text whitespace-nowrap">
              RICORRENZA {homepageSettings?.brand_year ?? BRAND_YEAR}
            </span>
          </Link>
        </div>

        {/* Center: Nav Pill */}
        <nav className={`hidden lg:flex glass-pill pointer-events-auto items-center h-12 md:h-14 px-2 gap-0.5 xl:gap-1 overflow-visible ${
          scrolled ? 'bg-black/80 shadow-[0_8px_32px_rgba(0,0,0,0.6)]' : 'bg-black/40'
        }`}>
          {navItems.filter(i => i.name !== 'Login' && i.name !== 'Admin').map((item) => {
            const Icon = item.icon;
            const isPriority = ['Home', 'Events', 'Schedule', 'Sports'].includes(item.name);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={handleNavClick}
                className={`group relative px-3 py-2 rounded-full transition-all duration-300 whitespace-nowrap ${
                  !isPriority ? 'hidden xl:flex' : 'flex'
                }`}
              >
                <div className={`flex items-center space-x-1.5 text-xs xl:text-sm font-bold tracking-wide transition-colors ${isActive(item.path) ? 'text-white' : 'text-white/60 group-hover:text-white'}`}>
                  {Icon && <Icon size={14} className={`group-hover:scale-110 transition-transform ${item.color || ''}`} />}
                  <span>{item.name}</span>
                </div>
                {isActive(item.path) && (
                  <span className="absolute inset-x-2 -bottom-1 h-[2px] bg-dynamic/80 rounded-full blur-[1px] shadow-[0_0_10px_rgba(var(--dynamic-accent-rgb),0.8)] transition-all duration-700"></span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right: Actions Pill */}
        <div className="flex items-center gap-2 pointer-events-auto">
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
                  onClick={handleNavClick}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-full font-bold text-xs xl:text-sm transition-all hover:scale-105 active:scale-95 ${
                    isAdmin 
                      ? 'bg-dynamic text-black shadow-[0_0_15px_rgba(var(--dynamic-accent-rgb),0.3)] border border-dynamic/50'
                      : 'text-white hover:bg-white/10'
                  }`}
                >
                  {Icon && <Icon size={14} />}
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="lg:hidden glass-pill flex items-center justify-center w-10 h-10 md:w-14 md:h-14 bg-black/60 text-white active:scale-95 transition-transform pointer-events-auto"
            aria-label="Toggle menu"
          >
            {isOpen ? <X size={20} className="md:w-6 md:h-6" /> : <Menu size={20} className="md:w-6 md:h-6" />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="lg:hidden absolute top-full inset-x-4 mt-2 bg-black/95 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden pointer-events-auto shadow-2xl">
           <div className="px-2 py-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={handleNavClick}
                  className={`flex items-center space-x-4 px-4 py-3 rounded-xl transition-all ${
                    isActive(item.path) ? 'bg-white/10 text-indigo-400' : 'text-white/60'
                  }`}
                >
                  {Icon && <Icon size={20} />}
                  <span className="font-bold text-sm tracking-widest uppercase">{item.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .glass-pill {
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 9999px;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .bollywood-text {
          font-family: 'Playfair Display', 'Merriweather', serif;
          font-style: italic;
          background: linear-gradient(to right, #bc13fe, #00ffff, #bc13fe);
          background-size: 200% auto;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: gradientShift 2s linear infinite;
          filter: drop-shadow(0 0 15px rgba(188, 19, 254, 0.8));
          text-shadow: 0 0 10px rgba(0, 255, 255, 0.2);
          letter-spacing: 0.08em;
          font-weight: 950;
          display: inline-block;
        }

        body.theme-vaporwave .bollywood-text {
          filter: drop-shadow(0 0 12px rgba(99, 102, 241, 0.7));
          /* Updated to indigo glow for brand consistency */
        }

        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}} />
    </div>
  );
});

export default Navbar;