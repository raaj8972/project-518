import React from 'react';
import { ScrollReveal } from '../ui/ScrollReveal';
const CoverflowCarousel = React.lazy(() => import('../CoverflowCarousel'));
import FeaturedArtistCard from '../FeaturedArtistCard';
import type { GuestArtist } from '../../types/data';
import { BRAND_NAME, BRAND_YEAR } from '../../constants/brand';

interface ArtistCarouselProps {
  artists: GuestArtist[];
  openDetailModal: (artist: GuestArtist, options?: { userInitiated?: boolean }) => void;
  setVideoModalOpen: (open: boolean) => void;
  setSelectedArtistForVideo: (artist: GuestArtist | null) => void;
  detailOpen: boolean;
  videoModalOpen: boolean;
  showInteractive: boolean;
  prefetchDetailModal: () => void;
}

const ArtistCarousel: React.FC<ArtistCarouselProps> = ({
  artists,
  openDetailModal,
  setVideoModalOpen,
  setSelectedArtistForVideo,
  detailOpen,
  videoModalOpen,
  showInteractive,
  prefetchDetailModal
}) => {
  if (artists.length === 0) return null;

  return (
    <section className="pt-28 pb-14 md:pt-36 md:pb-20 relative overflow-hidden gsap-fade-up">
      <div className="container mx-auto px-0 sm:px-4 relative z-10">
        <ScrollReveal animation="fadeUp">
          <div className="text-center mb-10 md:mb-16">
            <h2 className="text-4xl md:text-6xl font-black mb-6 stranger-title-gradient">
              FEATURED ARTISTS
            </h2>
            <div className="w-24 h-1 bg-red-600/50 mx-auto mb-8 rounded-full"></div>
            <p className="text-lg md:text-xl text-white/60 max-w-3xl mx-auto font-light">
              Meet the incredible artists who will light up {BRAND_NAME} {BRAND_YEAR}
            </p>
          </div>
        </ScrollReveal>

        {showInteractive ? (
          <React.Suspense fallback={<div className="h-[420px] flex items-center justify-center text-gray-400">Preparing featured artists…</div>}>
            <CoverflowCarousel
              items={artists as any[]}
              intervalMs={3200}
              paused={detailOpen || videoModalOpen}
              visibleRange={2}
              pauseOnHover={true}
              pauseOnTouch={true}
              showArrows={true}
              showDots={false}
              onItemClick={(artist: any) => openDetailModal(artist, { userInitiated: true })}
              className="mt-6 md:mt-8"
              stageHeight={'var(--featured-stage-height)'}
              renderItem={(artist: any, _: number, isActive: boolean) => (
                <div className="w-[280px] sm:w-[320px] md:w-[450px] lg:w-[500px] h-full px-2 py-4 flex items-center justify-center">
                  <FeaturedArtistCard 
                    artist={artist}
                    priority={isActive}
                    onClick={() => openDetailModal(artist, { userInitiated: true })}
                    onPlayVideo={(a: GuestArtist) => {
                      setSelectedArtistForVideo(a);
                      setVideoModalOpen(true);
                    }}
                    onMouseEnter={prefetchDetailModal}
                  />
                </div>
              )}
            />
          </React.Suspense>
        ) : (
          <div className="h-[420px] flex items-center justify-center text-gray-400">Preparing featured artists…</div>
        )}
      </div>
    </section>
  );
};

export default ArtistCarousel;
