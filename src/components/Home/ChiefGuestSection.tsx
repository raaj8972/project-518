import React, { startTransition } from 'react';
import { Instagram, Youtube, Music2 } from 'lucide-react';
import { ScrollReveal } from '../ui/ScrollReveal';
const AutoCarousel = React.lazy(() => import('../AutoCarousel'));
import PreserveNewlines from '../PreserveNewlines';
import { BRAND_NAME, BRAND_YEAR } from '../../constants/brand';

interface ChiefGuest {
  id: number;
  name: string;
  title: string;
  description: string;
  image: string;
  specialty?: string;
  enabled: boolean;
  achievements?: string[];
  social_links?: {
    instagram?: string;
    youtube?: string;
    spotify?: string;
  };
}

interface ChiefGuestSectionProps {
  chiefGuests: ChiefGuest[];
  setSelectedChiefGuest: (cg: ChiefGuest) => void;
  setChiefGuestModalOpen: (open: boolean) => void;
  detailOpen: boolean;
  videoModalOpen: boolean;
}

const ChiefGuestSection: React.FC<ChiefGuestSectionProps> = ({
  chiefGuests,
  setSelectedChiefGuest,
  setChiefGuestModalOpen,
  detailOpen,
  videoModalOpen
}) => {
  const enabledChiefs = chiefGuests.filter((c) => c.enabled);
  if (enabledChiefs.length === 0) return null;

  const multi = enabledChiefs.length > 1;

  const handleOpenModal = (cg: ChiefGuest) => {
    startTransition(() => {
      setSelectedChiefGuest(cg);
      setChiefGuestModalOpen(true);
    });
  };

  return (
    <section className="py-16 relative overflow-hidden gsap-fade-up">
      <div className="absolute inset-0 bg-gradient-to-br from-red-950/20 via-black to-red-950/20"></div>
      <div className="container mx-auto px-0 relative z-10">
        <ScrollReveal animation="fadeUp">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-6xl font-black mb-6 stranger-title-gradient">
              CHIEF GUEST{multi ? 'S' : ''}
            </h2>
            <div className="w-24 h-1 bg-red-600/40 mx-auto mb-8 rounded-full" />
            <p className="text-lg md:text-xl text-white/60 max-w-3xl mx-auto font-light">
              {multi
                ? 'Honoring our distinguished chief guests'
                : 'Honoring our distinguished chief guest'}{' '}
              for {BRAND_NAME} {BRAND_YEAR}
            </p>
          </div>
        </ScrollReveal>

        {multi ? (
          <React.Suspense
            fallback={
              <div className="h-[200px] flex items-center justify-center text-gray-400">
                Loading…
              </div>
            }
          >
            <div className="max-w-6xl mx-auto">
              <AutoCarousel
                intervalMs={5500}
                showArrows
                showDots
                className="pt-2"
                paused={detailOpen || videoModalOpen}
              >
                {enabledChiefs.map((cg) => (
                  <div
                    key={cg.id}
                    onClick={() => handleOpenModal(cg)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleOpenModal(cg);
                      }
                    }}
                    className="cursor-pointer w-[260px] sm:w-[300px] md:w-[340px] flex flex-col bg-gradient-to-br from-red-950/40 via-black/80 to-red-950/40 backdrop-blur-md rounded-xl shadow-xl ring-1 ring-red-900/30 overflow-hidden group relative hover:ring-red-600/50 transition"
                  >
                    <div className="relative h-56 sm:h-60 overflow-hidden">
                      <img
                        loading="lazy"
                        decoding="async"
                        src={cg.image}
                        alt={cg.name}
                        className="w-full h-full object-cover transition-transform duration-[3500ms] group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      {cg.specialty && (
                        <div className="absolute top-3 left-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-[10px] font-semibold px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-cyan-300 animate-ping opacity-70" />
                          <span>{cg.specialty}</span>
                        </div>
                      )}
                    </div>
                    <div className="p-4 flex flex-col flex-1 space-y-3">
                      <div>
                        <h3 className="text-lg font-extrabold text-white mb-1 tracking-wide group-hover:text-blue-300 transition-colors line-clamp-2">
                          {cg.name}
                        </h3>
                        <p className="text-xs font-semibold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2 line-clamp-1">
                          {cg.title}
                        </p>
                        <PreserveNewlines
                          text={cg.description}
                          className="text-gray-300 leading-relaxed text-[11px] line-clamp-5"
                        />
                      </div>
                      {cg.achievements && cg.achievements.length > 0 && (
                        <div>
                          <p className="uppercase text-[9px] tracking-wider font-bold text-blue-400 mb-1">
                            Key Highlights
                          </p>
                          <ul className="space-y-1 text-[10px] text-gray-400 list-disc list-inside">
                            {cg.achievements.slice(0, 4).map((a, i) => (
                              <li key={i}>{a}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <div className="flex gap-2 flex-wrap mt-auto pt-1">
                        {cg.social_links?.instagram && (
                          <a
                            title="Instagram"
                            href={cg.social_links.instagram}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-pink-600/70 hover:bg-pink-600 text-white transition-colors"
                          >
                            <Instagram className="w-3 h-3" />
                            <span className="hidden sm:inline">Insta</span>
                          </a>
                        )}
                        {cg.social_links?.youtube && (
                          <a
                            title="YouTube"
                            href={cg.social_links.youtube}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-red-600/70 hover:bg-red-600 text-white transition-colors"
                          >
                            <Youtube className="w-3 h-3" />
                            <span className="hidden sm:inline">YouTube</span>
                          </a>
                        )}
                        {cg.social_links?.spotify && (
                          <a
                            title="Spotify"
                            href={cg.social_links.spotify}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-green-600/70 hover:bg-green-600 text-white transition-colors"
                          >
                            <Music2 className="w-3 h-3" />
                            <span className="hidden sm:inline">Spotify</span>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </AutoCarousel>
            </div>
          </React.Suspense>
        ) : (
          <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-10 items-center">
            {enabledChiefs.map((cg) => (
              <React.Fragment key={cg.id}>
                <div className="relative group overflow-hidden rounded-xl shadow-xl ring-1 ring-red-900/30 bg-gradient-to-br from-red-950/40 via-black/80 to-red-950/40 backdrop-blur-md">
                  <div className="relative h-80 overflow-hidden">
                    <img
                      loading="lazy"
                      decoding="async"
                      src={cg.image}
                      alt={cg.name}
                      className="w-full h-full object-cover transition-transform duration-[3500ms] group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    {cg.specialty && (
                      <div className="absolute top-4 left-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-lg flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-cyan-300 animate-ping opacity-70" />
                        <span>{cg.specialty}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-5 flex-1 pl-0 md:pl-6">
                  <div>
                    <h3 className="text-3xl md:text-4xl font-extrabold text-white mb-2 tracking-wide">
                      {cg.name}
                    </h3>
                    <p className="text-lg font-semibold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-4">
                      {cg.title}
                    </p>
                    <PreserveNewlines
                      text={cg.description}
                      className="text-gray-300 leading-relaxed text-sm md:text-base line-clamp-6 md:line-clamp-none"
                    />
                  </div>
                  {cg.achievements && cg.achievements.length > 0 && (
                    <div>
                      <p className="uppercase text-[11px] tracking-wider font-bold text-blue-400 mb-2">
                        Key Highlights
                      </p>
                      <ul className="space-y-1.5 text-xs text-gray-400 list-disc list-inside">
                        {cg.achievements.slice(0, 6).map((a, i) => (
                          <li key={i}>{a}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="flex gap-3">
                    {cg.social_links?.instagram && (
                      <a
                        href={cg.social_links.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-full text-xs font-semibold bg-pink-600/70 hover:bg-pink-600 text-white transition-colors inline-flex items-center gap-1"
                      >
                        <Instagram className="w-4 h-4" /> Instagram
                      </a>
                    )}
                    {cg.social_links?.youtube && (
                      <a
                        href={cg.social_links.youtube}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-full text-xs font-semibold bg-red-600/70 hover:bg-red-600 text-white transition-colors inline-flex items-center gap-1"
                      >
                        <Youtube className="w-4 h-4" /> YouTube
                      </a>
                    )}
                    {cg.social_links?.spotify && (
                      <a
                        href={cg.social_links.spotify}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-full text-xs font-semibold bg-green-600/70 hover:bg-green-600 text-white transition-colors inline-flex items-center gap-1"
                      >
                        <Music2 className="w-4 h-4" /> Spotify
                      </a>
                    )}
                  </div>
                </div>
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default ChiefGuestSection;
