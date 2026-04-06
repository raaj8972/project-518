import React from 'react';
import { useLocation } from 'react-router-dom';
import { Instagram, Youtube } from 'lucide-react';
import { useData } from '../context/DataContext';
import { BRAND_NAME, COPYRIGHT_YEAR } from '../constants/brand';

/**
 * Performance-optimized Footer.
 * Wrapped in React.memo to prevent unnecessary re-renders.
 */
export const Footer: React.FC = React.memo(() => {
  const { socialMediaSettings } = useData();
  const location = useLocation();
  const isHomeBound = location.pathname === '/home-bound' || location.pathname.startsWith('/home-bound');

  // Stable Shell: Return null internally for non-public routes
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isSecurityRoute = location.pathname.startsWith('/security-');
  const isCoordinatorRoute = location.pathname.startsWith('/coordinator/dashboard');
  if (isAdminRoute || isSecurityRoute || isCoordinatorRoute) return null;

  // Check if social media links should be shown
  const showInstagram = socialMediaSettings?.instagram_enabled && socialMediaSettings?.instagram_url;
  const showYoutube = socialMediaSettings?.youtube_enabled && socialMediaSettings?.youtube_url;
  const showSocialMedia = (showInstagram || showYoutube) && !isHomeBound;

  return (
    <footer className="relative pt-24 pb-12 overflow-hidden bg-[#030712]">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,rgba(0,255,255,0.08),transparent_50%)]"></div>
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Social Media Section */}
        {showSocialMedia && (
          <div className="text-center mb-16">
            <div className="inline-block">
              <h3 className="text-sm font-black uppercase tracking-[0.3em] text-white/30 mb-8 font-serif">
                Connect With Us
              </h3>
              <div className="flex justify-center items-center gap-6">
                {showInstagram && (
                  <a
                    href={socialMediaSettings.instagram_url || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-14 h-14 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/10 flex items-center justify-center text-white/60 hover:text-cyan-400 hover:bg-white/[0.08] hover:-translate-y-1 transition-all duration-300 shadow-[0_0_0_rgba(34,211,238,0)] hover:shadow-[0_0_15px_rgba(34,211,238,0.5)] border-transparent hover:border-cyan-500/50"
                  >
                    <Instagram size={22} />
                  </a>
                )}
                {showYoutube && (
                  <a
                    href={socialMediaSettings.youtube_url || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-14 h-14 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/10 flex items-center justify-center text-white/60 hover:text-fuchsia-400 hover:bg-white/[0.08] hover:-translate-y-1 transition-all duration-300 shadow-[0_0_0_rgba(217,70,239,0)] hover:shadow-[0_0_15px_rgba(217,70,239,0.5)] border-transparent hover:border-fuchsia-500/50"
                  >
                    <Youtube size={22} />
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer Bottom */}
        <div className="pt-12 border-t border-white/5 font-serif">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-[10px] font-black tracking-widest text-white/20 uppercase">
              © 2026-{COPYRIGHT_YEAR} {BRAND_NAME} • ALL RIGHTS RESERVED
            </div>
            
            <div className="flex items-center gap-4 text-[10px] font-black tracking-widest text-white/20 uppercase">
              <span>CRAFTED BY</span>
              <a 
                href="https://www.instagram.com/i_amraaj__?igsh=a2ZxaTBubnpmYmhu&utm_source=qr" 
                target="_blank" 
                className="text-white/40 hover:text-cyan-400 transition-colors flex items-center gap-2"
              >
                RAAJ
                <Instagram size={12} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
});

export default Footer;