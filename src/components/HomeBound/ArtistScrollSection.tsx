import React, { useRef, useEffect } from 'react';
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

export const ArtistScrollSection: React.FC<BandMemberProps> = ({ member, index }) => {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    // Scroll animations simplified to ensure absolute visibility. 
    // IntersectionObserver removed to prevent opacity-0 lock in snap containers.
  }, []);

  // Stagger layout: even index = image left, odd index = image right
  const isEven = index % 2 === 0;

  return (
    <section 
      ref={sectionRef}
      className="relative w-full flex items-center justify-center font-sans antialiased"
    >
        <div className={`w-full max-w-7xl mx-auto px-6 lg:px-12 flex flex-col ${isEven ? 'md:flex-row' : 'md:flex-row-reverse'} items-center gap-12 md:gap-20`}>
          
          {/* PHOTO CACHE */}
          <div className="w-full md:w-1/2 flex justify-center perspective-1000">
             <div className="relative w-full aspect-[3/4] max-w-md overflow-hidden rounded-[2rem] bg-white/5 border border-white/10 group">
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10 pointer-events-none opacity-60"></div>
                
                <img 
                  src={member.image} 
                  alt={member.name} 
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover transition-transform duration-[1.5s] ease-out group-hover:scale-105"
                />
             </div>
          </div>

          {/* ARTIST DOSSIER */}
          <div className="w-full md:w-1/2 flex flex-col items-center md:items-start text-center md:text-left">
             
             {/* Role Badge */}
             <div className="inline-flex items-center justify-center gap-3 px-4 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-md mb-6 md:mb-8">
               <span className={`w-2 h-2 rounded-full ${member.category === 'Vocalist' ? 'bg-cyan-400' : 'bg-blue-400'}`}></span>
               <span className="text-[10px] md:text-xs font-semibold uppercase tracking-widest text-white/80">{member.role}</span>
             </div>

             {/* Name */}
             <h2 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black text-white tracking-tighter leading-[0.9] mb-4 md:mb-6">
               {member.name}
             </h2>

             {/* Description */}
             <div className="mb-8 md:mb-12 max-w-lg mx-auto md:mx-0">
                <PreserveNewlines 
                  text={member.description} 
                  className="text-sm sm:text-base md:text-lg text-white/60 font-light leading-relaxed" 
                />
             </div>

             {/* Social Links */}
             {member.social_links && (Object.values(member.social_links).some(Boolean)) && (
               <div className="flex flex-col gap-4">
                 <div className="text-[10px] text-white/30 font-semibold tracking-widest uppercase mb-1">Connect</div>
                 <div className="flex gap-4 justify-center md:justify-start">
                    {member.social_links?.instagram && (
                      <a href={member.social_links.instagram} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-full border border-white/10 bg-white/5 flex items-center justify-center hover:bg-white/10 hover:border-white/30 hover:scale-110 transition-all text-white/70 hover:text-white">
                        <Instagram size={18} />
                      </a>
                    )}
                    {member.social_links?.youtube && (
                      <a href={member.social_links.youtube} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-full border border-white/10 bg-white/5 flex items-center justify-center hover:bg-white/10 hover:border-white/30 hover:scale-110 transition-all text-white/70 hover:text-white">
                        <Youtube size={18} />
                      </a>
                    )}
                    {member.social_links?.spotify && (
                       <a href={member.social_links.spotify} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-full border border-white/10 bg-white/5 flex items-center justify-center hover:bg-white/10 hover:border-white/30 hover:scale-110 transition-all text-white/70 hover:text-white">
                        <Spotify size={18} />
                      </a>
                    )}
                 </div>
               </div>
             )}

          </div>

        </div>
    </section>
  );
};
