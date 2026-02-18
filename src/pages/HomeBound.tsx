import React, { useState, startTransition } from 'react';
import { Music, Instagram, ChevronDown } from 'lucide-react';
import { useData } from '../context/DataContext';
import { AuditionModal } from '../components/AuditionModal';
import { SEO } from '../components/SEO';
import { BRAND_NAME, BRAND_YEAR } from '../constants/brand';
import { ArtistScrollSection } from '../components/HomeBound/ArtistScrollSection';
import { motion } from 'framer-motion';

export const HomeBound: React.FC = () => {
  const { bandMembers, formSettings, homeboundSettings, heroMedia, fetchHeroMedia } = useData();
  const [auditionModal, setAuditionModal] = useState(false);

  React.useEffect(() => {
    fetchHeroMedia('homebound').catch(err => console.warn('[HomeBound] failed to fetch hero media', err));
  }, [fetchHeroMedia]);

  const hero = heroMedia['homebound'];

  // Filter enabled band members and sort by order
  // Optimization: Memoize this list if possible, but useData already provides state
  const enabledBandMembers = (bandMembers || [])
    .filter(member => member.enabled)
    .sort((a, b) => {
       if (a.is_featured && !b.is_featured) return -1;
       if (!a.is_featured && b.is_featured) return 1;
       return a.order_position - b.order_position;
    })
    .map(member => ({
      ...member,
      id: String(member.id)
    }));

  // Performance Optimization: Prefetch critical assets
  React.useEffect(() => {
    if (enabledBandMembers.length > 0) {
      // Prefetch first two artist images to avoid flicker on scroll
      enabledBandMembers.slice(0, 2).forEach(member => {
        if (member.image) {
          const img = new Image();
          img.src = member.image;
        }
      });
    }
  }, [enabledBandMembers]);

  return (
    <div className="cyberpunk-theme bg-[#050505] selection:bg-pink-500/30 overflow-x-hidden h-[100dvh]">
      <SEO 
        title="Home Bound" 
        description={`The official band of ${BRAND_NAME} ${BRAND_YEAR}.`} 
        canonical="https://ricorrenza.fun/home-bound" 
      />

      <div className="relative snap-y snap-mandatory h-full overflow-y-scroll no-scrollbar">

        {/* STICKY HERO BACKGROUND (Shared by Phase 1 & 2) */}
        <div className="sticky top-0 h-[100dvh] w-full z-0 overflow-hidden">
           <motion.div 
             initial={{ opacity: 0, scale: 1.1 }}
             whileInView={{ opacity: 1, scale: 1 }}
             viewport={{ amount: 0.1 }}
             transition={{ duration: 1.5, ease: "easeOut" }}
             className="absolute inset-0"
           >
             <div className="absolute inset-0 bg-black/40 z-10 transition-colors duration-1000"></div>
             <video 
               autoPlay 
               loop 
               muted 
               playsInline 
               preload="auto"
               key={hero?.video_url}
               poster={hero?.mobile_poster_url || hero?.mobile_image_url || undefined}
               className="w-full h-full object-cover"
             >
               <source src={hero?.mobile_video_url || hero?.video_url || "https://assets.mixkit.co/videos/preview/mixkit-concert-crowd-with-lights-2292-large.mp4"} type="video/mp4" />
             </video>
           </motion.div>
        </div>

        {/* HERO PHASE 1: VIDEO INTRO (SNAP POINT 1) */}
        <section className="relative h-[100dvh] w-full flex items-center justify-center snap-start z-10 pointer-events-none">
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 text-white/50 flex flex-col items-center gap-2 pointer-events-auto">
             <span className="text-[10px] uppercase tracking-[0.4em] font-medium pulse">Scroll to Reveal</span>
             <ChevronDown size={20} className="animate-bounce" />
          </div>
        </section>

        {/* HERO PHASE 2: TEXT REVEAL (SNAP POINT 2) */}
        <section className="relative h-[100dvh] w-full flex items-center justify-center snap-start z-20 overflow-hidden">
          <div className="relative text-center px-6">
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ amount: 0.5, once: false }}
              transition={{ duration: 1, ease: "easeOut" }}
            >
              <div className="inline-flex items-center gap-2 px-4 md:px-6 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-6 md:mb-8">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                <span className="text-[10px] md:text-sm font-bold tracking-[0.3em] uppercase">Official Band</span>
              </div>
              
              <h1 className="text-5xl md:text-9xl font-black text-white mb-2 tracking-tighter mix-blend-overlay">
                HOME<span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600">BOUND</span>
              </h1>
              
              <p className="text-lg md:text-2xl text-gray-300 font-light tracking-wide max-w-2xl mx-auto mt-4 md:mt-6">
                The Sonic Heartbeat of {BRAND_NAME} {BRAND_YEAR}
              </p>
            </motion.div>
          </div>

          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ amount: 0.3 }}
            transition={{ delay: 1, duration: 1 }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 text-white/50 flex flex-col items-center gap-2"
          >
            <span className="text-[10px] md:text-xs uppercase tracking-[0.2em]">Down to Lineup</span>
            <ChevronDown size={16} className="animate-bounce" />
          </motion.div>
        </section>

        {/* 2. ARTIST SCROLL SECTIONS */}
        {enabledBandMembers.map((member, index) => (
          <ArtistScrollSection key={member.id} member={member} index={index} />
        ))}
        
        {enabledBandMembers.length === 0 && (
           <div className="h-screen flex items-center justify-center snap-start">
              <p className="text-2xl text-gray-500 uppercase tracking-widest">Lineup Announcing Soon</p>
           </div>
        )}

        {/* 3. GROUP PHOTO / FINAL CTA SECTION */}
        <section className="relative h-[100dvh] flex flex-col items-center justify-center overflow-hidden snap-start">
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-pink-900/20 to-transparent pointer-events-none"></div>
          
          <div className="container mx-auto px-4 z-10 text-center flex flex-col h-full py-12 md:py-20">
            <div className="flex-1 flex flex-col justify-center">
              {/* Removed Group Photo as requested */}

              {/* CTA */}
              <div className="max-w-2xl mx-auto">
                <motion.h3 
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  className="text-xl md:text-3xl font-bold text-white mb-6 uppercase tracking-widest opacity-80"
                >
                  Join The Experience
                </motion.h3>
                
                <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
                  {formSettings?.audition_form_enabled ? (
                    <button 
                      onClick={() => startTransition(() => setAuditionModal(true))}
                      className="px-8 md:px-12 py-4 md:py-6 bg-white text-black font-black text-lg md:text-xl rounded-full hover:scale-105 active:scale-95 transition-all duration-300 shadow-[0_0_30px_rgba(255,255,255,0.3)] flex items-center gap-3 uppercase tracking-widest"
                    >
                      <Music className="w-5 h-5 md:w-6 md:h-6" />
                      Audition Now
                    </button>
                  ) : (
                    <div className="px-8 py-4 rounded-full bg-white/5 border border-white/10 flex items-center gap-3 text-gray-400">
                      <Music className="w-5 h-5" />
                      <span className="text-sm font-bold uppercase tracking-widest">Auditions Closed</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Integrated Social Footer */}
            {(homeboundSettings?.instagram_enabled && homeboundSettings?.instagram_url) && (
              <motion.div 
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-auto pt-8 border-t border-white/5"
              >
                <a
                  href={homeboundSettings.instagram_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 text-gray-500 hover:text-white transition-colors group"
                >
                  <div className="p-2 rounded-full bg-white/5 group-hover:bg-white/10 transition-colors">
                    <Instagram className="w-4 h-4" />
                  </div>
                  <span className="font-bold tracking-[0.2em] text-xs uppercase transition-all">Official Instagram</span>
                </a>
              </motion.div>
            )}
          </div>
        </section>
      </div>

      {formSettings?.audition_form_enabled && (
        <AuditionModal
          isOpen={auditionModal}
          onClose={() => startTransition(() => setAuditionModal(false))}
        />
      )}
      
      <style>{`
        .cyberpunk-theme {
          background: #0a0a0a;
          color: #ffffff;
          font-family: 'Orbitron', 'Rajdhani', sans-serif;
          min-height: 100vh;
        }
        
        /* Smooth scrolling behavior for the whole page */
        html {
          scroll-behavior: smooth;
        }
      `}</style>
    </div>
  );
};