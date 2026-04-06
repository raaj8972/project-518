import React from 'react';
import { Zap, Crown, ArrowRight } from 'lucide-react';
const AutoCarousel = React.lazy(() => import('../AutoCarousel'));
import { BRAND_NAME, BRAND_YEAR } from '../../constants/brand';

interface Event {
  id: number;
  title: string;
  description: string;
  image: string;
  category?: string;
  featured: boolean;
  visible?: boolean;
}

interface FeaturedEventsSectionProps {
  featuredEvents: Event[];
  hasManyEvents: boolean;
}

// Error boundary to catch dynamic-import chunk load failures and offer a reload
class ChunkErrorBoundary extends React.Component<{ fallback?: React.ReactNode; children: React.ReactNode }, { hasError: boolean; error: any }>{
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) { return { hasError: true, error }; }
  componentDidCatch(error: any) { try { console.error('Chunk load failed:', error); } catch {}
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-4 text-sm text-indigo-300 bg-indigo-900/30 border border-indigo-800 rounded">
          Failed to load module. This can happen after a rebuild. Please reload the page.
          <button
            onClick={() => window.location.reload()}
            className="ml-3 inline-flex items-center px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white"
          >Reload</button>
        </div>
      );
    }
    return this.props.children as any;
  }
}

const FeaturedEventsSection: React.FC<FeaturedEventsSectionProps> = ({
  featuredEvents,
  hasManyEvents
}) => {
  if (featuredEvents.length === 0) return null;

  return (
    <section className="py-12 relative overflow-hidden gsap-fade-up">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/30 via-black to-indigo-950/30"></div>
      <div className="container mx-auto px-0 relative z-10">
        <div className="scroll-animate-3d">
          <div className="text-center mb-14">
            <h2 className="text-4xl md:text-6xl font-black mb-6 stranger-title-gradient">
              FEATURED EVENTS
            </h2>
            <div className="w-24 h-1 bg-indigo-500/50 mx-auto mb-8 rounded-full"></div>
            <p className="text-xl text-white/60 max-w-3xl mx-auto font-light">
              Don't miss these highlighted experiences at {BRAND_NAME} {BRAND_YEAR}
            </p>
            {hasManyEvents && (
              <div className="mt-8">
                <a href="/events" className="inline-flex items-center text-indigo-400 hover:text-indigo-300 font-bold uppercase tracking-widest text-xs">
                  View all events <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </div>
            )}
          </div>
        </div>

        <ChunkErrorBoundary fallback={<div className="h-[200px] flex items-center justify-center text-indigo-300 bg-indigo-900/30 border border-indigo-800 rounded">Failed to load slider. <button onClick={() => window.location.reload()} className="ml-2 underline">Reload</button></div>}>
          <React.Suspense fallback={<div className="h-[200px] flex items-center justify-center text-gray-400">Loading events…</div>}>
            <AutoCarousel
              intervalMs={4200}
              pauseOnHover
              showArrows
              showDots
              className="mt-4"
            >
              {featuredEvents.map((event, index) => (
                <div
                  key={event.id}
                  className="w-64 sm:w-72 md:w-80 scroll-animate-3d animate-in-3d group"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="rico-glass-card rounded-[2.5rem] p-4 h-full tilt-3d transition-all duration-500 hover:shadow-[0_30px_60px_rgba(0,0,0,0.4)]">
                    <div className="relative h-64 md:h-72 mb-6 rounded-[2rem] overflow-hidden bg-black/40">
                      <img
                        src={event.image}
                        alt={event.title}
                        loading={index === 0 ? 'eager' : 'lazy'}
                        decoding="async"
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#030712]/80 to-transparent"></div>
                      
                      <div className="absolute top-4 left-4">
                        <div className="px-4 py-1.5 rounded-xl bg-[#030712]/60 backdrop-blur-xl border border-white/10 text-[9px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                          <Zap size={10} className="text-indigo-400" />
                          {event.category || 'EVENT'}
                        </div>
                      </div>
                    </div>

                    <div className="px-4 pb-4">
                      <h3 className="text-xl md:text-2xl font-black text-white mb-2 leading-tight uppercase tracking-tight">
                        {event.title}
                      </h3>
                      <p className="text-sm text-white/50 font-light mb-6 line-clamp-2">
                        {event.description}
                      </p>
                      
                      <div className="flex items-center justify-between pt-4 border-t border-white/5">
                        <div className="flex items-center gap-2 text-indigo-400">
                          <Crown size={14} />
                          <span className="text-[10px] font-black uppercase tracking-widest">Compete Now</span>
                        </div>
                        <a
                          href="/events"
                          className="text-blue-400 hover:text-blue-300 text-sm font-medium group"
                        >
                          More
                          <ArrowRight size={12} className="inline ml-1 group-hover:translate-x-1 transition-transform" />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </AutoCarousel>
          </React.Suspense>
        </ChunkErrorBoundary>
      </div>
    </section>
  );
};

export default FeaturedEventsSection;
