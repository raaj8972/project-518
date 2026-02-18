import React from 'react';
import { useLocation } from 'react-router-dom';
import { Instagram, Youtube } from 'lucide-react';
import { useData } from '../context/DataContext';
import { BRAND_NAME, COPYRIGHT_YEAR } from '../constants/brand';

export const Footer: React.FC = () => {
  const { socialMediaSettings } = useData();
  const location = useLocation();
  const isHomeBound = location.pathname === '/home-bound' || location.pathname.startsWith('/home-bound');

  // Check if social media links should be shown
  const showInstagram = socialMediaSettings?.instagramEnabled && socialMediaSettings?.instagramUrl;
  const showYoutube = socialMediaSettings?.youtubeEnabled && socialMediaSettings?.youtubeUrl;
  const showSocialMedia = (showInstagram || showYoutube) && !isHomeBound;

  return (
    <footer className="relative pt-24 pb-12 overflow-hidden bg-[#030712]">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,rgba(99,102,241,0.08),transparent_50%)]"></div>
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Social Media Section */}
        {showSocialMedia && (
          <div className="text-center mb-16">
            <div className="inline-block">
              <h3 className="text-sm font-black uppercase tracking-[0.3em] text-white/30 mb-8">
                Connect With Us
              </h3>
              <div className="flex justify-center items-center gap-6">
                {showInstagram && (
                  <a
                    href={socialMediaSettings.instagramUrl || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-14 h-14 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/[0.08] hover:-translate-y-1 transition-all duration-300"
                  >
                    <Instagram size={22} />
                  </a>
                )}
                {showYoutube && (
                  <a
                    href={socialMediaSettings.youtubeUrl || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-14 h-14 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/[0.08] hover:-translate-y-1 transition-all duration-300"
                  >
                    <Youtube size={22} />
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer Bottom */}
        <div className="pt-12 border-t border-white/5">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-[10px] font-black tracking-widest text-white/20 uppercase">
              © 2026-{COPYRIGHT_YEAR} {BRAND_NAME} • ALL RIGHTS RESERVED
            </div>
            
            <div className="flex items-center gap-4 text-[10px] font-black tracking-widest text-white/20 uppercase">
              <span>CRAFTED BY</span>
              <a 
                href="https://www.instagram.com/i_amraaj__?igsh=a2ZxaTBubnpmYmhu&utm_source=qr" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-white/40 hover:text-indigo-400 transition-colors flex items-center gap-2"
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
};