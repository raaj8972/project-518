import React from 'react';
import { motion } from 'framer-motion';
import { Instagram, Youtube, AlignJustify as Spotify } from 'lucide-react';
import PreserveNewlines from '../PreserveNewlines';

interface BandMemberProps {
  member: {
    id: string;
    name: string;
    role: string;
    category: string;
    specialty: string;
    description: string;
    image: string;
    is_featured: boolean;
    social_links?: {
      instagram?: string;
      youtube?: string;
      spotify?: string;
    };
  };
  index: number;
}

export const ArtistScrollSection: React.FC<BandMemberProps> = ({ member }) => {
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const photoVariants = {
    hidden: { 
      x: 0, 
      y: 0, 
      scale: 0.9,
      opacity: 0,
      transition: { 
        duration: 0.6,
        ease: [0.4, 0, 1, 1] as const // easeIn custom
      }
    },
    visible: { 
      x: isMobile ? 0 : "-25%",
      y: isMobile ? "-10%" : 0,
      scale: 1,
      opacity: 1,
      transition: { 
        duration: 1, 
        ease: [0.16, 1, 0.3, 1] as const // Apple easeOut
      }
    }
  };

  const textVariants = {
    hidden: { 
      opacity: 0, 
      x: isMobile ? 0 : 50, 
      y: isMobile ? 50 : 0,
      transition: { 
        duration: 0.6,
        ease: [0.4, 0, 1, 1] as const
      }
    },
    visible: { 
      opacity: 1, 
      x: 0, 
      y: 0,
      transition: { 
        duration: 0.8, 
        delay: 0.3,
        ease: [0, 0, 0.2, 1] as const // standard easeOut
      }
    }
  };
  
  return (
    <section className="h-[100dvh] w-full relative flex flex-col md:flex-row items-center justify-center snap-start bg-black overflow-hidden support-[height:100dvh]:h-[100dvh]">
        
        {/* Cinematic Background - Subtle */}
        <div className="absolute inset-0 pointer-events-none">
           <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] rounded-full blur-[150px] opacity-[0.10] ${member.is_featured ? 'bg-pink-900' : 'bg-blue-900'}`}></div>
        </div>

        {/* Content Container */}
        <div className="relative w-full max-w-[1400px] h-full flex flex-col md:flex-row items-center justify-center p-4">
          
          {/* PHOTO COMPONENT */}
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ amount: 0.1, once: false }}
            variants={photoVariants}
            className="absolute md:relative z-10 flex items-center justify-center w-full h-[50vh] md:h-auto md:w-auto perspective-1000 top-0 md:top-auto will-change-transform"
          >
             <div className="relative group w-[280px] h-[350px] md:w-[500px] md:h-[650px] rounded-[2rem] overflow-hidden shadow-2xl bg-black border border-white/5 transition-shadow duration-500 hover:shadow-pink-500/20">
                {/* Spotlight Sheen */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent skew-x-12 translate-x-[-150%] group-hover:animate-sheen pointer-events-none z-20"></div>
                
                <img 
                  src={member.image} 
                  alt={member.name} 
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover brightness-90 contrast-110"
                />
             </div>
          </motion.div>

          {/* TEXT COMPONENT */}
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ amount: 0.1, once: false }}
            variants={textVariants}
            className="absolute md:relative z-20 w-full md:w-[600px] md:ml-[5%] text-center md:text-left bottom-0 md:bottom-auto px-6 pb-[env(safe-area-inset-bottom,20px)] md:pb-0 flex flex-col justify-end md:justify-center max-h-[60vh] md:max-h-full pointer-events-none will-change-transform"
          >
             <div className="pointer-events-auto bg-gradient-to-t from-black via-black/90 to-transparent md:bg-none p-6 md:p-0 pt-20 md:pt-0 rounded-t-3xl md:rounded-none">
               
               {/* Role Badge */}
               <div className={`inline-flex items-center justify-center md:justify-start gap-2 mb-4 md:mb-6 text-xs md:text-sm font-bold uppercase tracking-[0.25em] ${member.category === 'Vocalist' ? 'text-purple-400' : 'text-blue-400'}`}>
                 <span className="w-6 h-[2px] md:w-8 bg-current opacity-50"></span>
                 {member.role}
               </div>

               {/* Name */}
               <h2 className="text-4xl md:text-8xl font-black text-white tracking-tight leading-[0.9] mb-4 md:mb-8 drop-shadow-xl">
                 {member.name}
               </h2>

               {/* Description Card - Simplified on mobile */}
               <div className="backdrop-blur-md bg-white/5 rounded-2xl md:rounded-3xl p-4 md:p-8 border border-white/10 mb-6 md:mb-10 shadow-lg relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-pink-500 to-purple-500"></div>
                  <PreserveNewlines 
                    text={member.description} 
                    className="text-sm md:text-2xl text-gray-200 font-medium leading-relaxed line-clamp-4 md:line-clamp-none" 
                  />
               </div>

               {/* Social Links */}
               <div className="flex gap-4 justify-center md:justify-start items-center">
                  {member.social_links?.instagram && (
                    <a href={member.social_links.instagram} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-3 px-6 py-3 rounded-full bg-white/5 hover:bg-white/10 transition-all border border-white/10 hover:border-pink-500/50">
                      <Instagram size={24} className="text-pink-400 group-hover:scale-110 transition-transform" />
                      <span className="text-sm font-bold uppercase tracking-widest text-white/70 group-hover:text-white">Instagram</span>
                    </a>
                  )}
                  {member.social_links?.youtube && (
                    <a href={member.social_links.youtube} target="_blank" rel="noopener noreferrer" className="group p-3 rounded-full bg-white/5 hover:bg-white/10 transition-all border border-white/10 hover:border-red-500/50">
                      <Youtube size={24} className="text-red-500 group-hover:scale-110 transition-transform" />
                    </a>
                  )}
                  {member.social_links?.spotify && (
                     <a href={member.social_links.spotify} target="_blank" rel="noopener noreferrer" className="group p-3 rounded-full bg-white/5 hover:bg-white/10 transition-all border border-white/10 hover:border-green-500/50">
                      <Spotify size={24} className="text-green-500 group-hover:scale-110 transition-transform" />
                    </a>
                  )}
               </div>

             </div>
          </motion.div>

        </div>

      <style>{`
        @keyframes sheen {
          0% { transform: translateX(-150%) skewX(12deg); }
          100% { transform: translateX(250%) skewX(12deg); }
        }
        .group:hover .group-hover\\:animate-sheen {
          animation: sheen 1s cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>
    </section>
  );
};
