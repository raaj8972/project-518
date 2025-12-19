import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import WinnerCard from './WinnerCard';
import AutoCarousel from './AutoCarousel';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const WinnersSection: React.FC = () => {
  const { eventWinners = [], events = [] } = useData();
  const [showSwipeGuide, setShowSwipeGuide] = useState(true);

  // Auto-hide swipe guide after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSwipeGuide(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  if (!eventWinners || eventWinners.length === 0) {
    return null;
  }

  // const displayWinners = eventWinners; // Logic below uses validWinners directly

  // Enrich winner data with event titles (only for real data needed, mocks have it)
  const validWinners = eventWinners
      .map((winner: any) => {
        const event = events.find((e) => e.id === winner.event_id);
        return {
          ...winner,
          eventTitle: event?.title || 'Unknown Event',
          eventVisible: event?.visible ?? true, // Default to true if undefined
          members: (() => {
            try {
              if (Array.isArray(winner.team_members)) return winner.team_members;
              if (typeof winner.team_members === 'string') return JSON.parse(winner.team_members);
              return [];
            } catch (e) {
              console.warn('Failed to parse team_members for winner:', winner.id, e);
              return [];
            }
          })(),
          // Use resolved team name (Team) or registration name (Leader) or fallback
          displayName: winner.resolved_name || winner.registration_name || winner.name 
        };
      })
      .filter((w: any) => {
        // Debugging logs
        const isUnknown = !w.eventTitle || w.eventTitle === 'Unknown Event' || w.eventTitle.trim().toLowerCase() === 'unknown event';
        if (isUnknown) console.log('Filtered out winner due to Unknown Event:', w.id, w.name, w.eventTitle);
        if (w.eventVisible === false) console.log('Filtered out winner due to Hidden Event:', w.id, w.name, w.eventTitle);

        if (isUnknown) return false;
        return w.eventVisible !== false;
      })
      // De-duplicate if same ID appears (unlikely but possible with weird joins)
      .filter((w: any, index: number, self: any[]) => 
          index === self.findIndex((t: any) => (
            t.id === w.id
          ))
      )
      .sort((a: any, b: any) => a.position - b.position);

  console.log('Valid Winners:', validWinners);

  if (validWinners.length === 0) return null;


  return (
    <section className="pt-4 pb-16 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-gray-900 to-black"></div>
      <div className="absolute inset-0 bg-[url('/noise.png')] opacity-5 mix-blend-overlay"></div>
      
      {/* Glow Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[100px] pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-600/20 rounded-full blur-[100px] pointer-events-none animate-pulse" style={{ animationDelay: '1s' }}></div>

      <div className="container mx-auto relative z-10 w-full">
        <div className="scroll-animate animate-in">
          <div className="text-center mb-8">
            <h2 className="text-4xl md:text-6xl font-black mb-4 cyberpunk-title tracking-tight">
              HALL OF <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">GLORY</span>
            </h2>
            <div className="w-40 h-1 bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 mx-auto mb-6 expand-width"></div>
            <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto font-mono">
              Celebrating the champions of RICORRENZA
            </p>
          </div>
        </div>

        <div className="mt-4 relative">
          {/* Swipe Guide Overlay */}
          {showSwipeGuide && validWinners.length > 1 && (
            <div 
              className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center animate-fade-in"
              style={{
                animation: 'fadeOut 5s forwards',
              }}
            >
              <div className="bg-black/60 backdrop-blur-sm border border-cyan-500/30 rounded-lg px-6 py-4 flex items-center gap-4 shadow-[0_0_30px_rgba(6,182,212,0.3)]">
                <ChevronLeft className="w-6 h-6 text-cyan-400 animate-pulse" style={{ animation: 'slideLeft 1.5s infinite' }} />
                <div className="text-center">
                  <p className="text-cyan-300 font-mono text-sm font-bold uppercase tracking-wider">Swipe to See More</p>
                  <p className="text-gray-400 font-mono text-xs mt-1">← Drag or Use Arrows →</p>
                </div>
                <ChevronRight className="w-6 h-6 text-cyan-400 animate-pulse" style={{ animation: 'slideRight 1.5s infinite' }} />
              </div>
            </div>
          )}

          <div 
            onMouseEnter={() => setShowSwipeGuide(false)}
            onTouchStart={() => setShowSwipeGuide(false)}
          >
            <AutoCarousel
              intervalMs={3000}
              showArrows
              showDots={false}
              className="py-10"
              pauseOnHover
              stopOnInteraction
            >
              {validWinners.map((winner: any) => (
                <div key={winner.id} className="px-4 flex justify-center">
                  <WinnerCard
                    name={winner.displayName || winner.name}
                    position={winner.position}
                    eventName={winner.eventTitle}
                    category={winner.category || undefined}
                    year={winner.year || undefined}
                    photoUrl={winner.photo_url || undefined}

                    members={winner.members}
                    className="mx-auto"
                  />
                </div>
              ))}
            </AutoCarousel>
          </div>
        </div>

        {/* Swipe Guide Animations */}
        <style>{`
          @keyframes fadeOut {
            0%, 80% { opacity: 1; }
            100% { opacity: 0; }
          }
          @keyframes slideLeft {
            0%, 100% { transform: translateX(0); }
            50% { transform: translateX(-8px); }
          }
          @keyframes slideRight {
            0%, 100% { transform: translateX(0); }
            50% { transform: translateX(8px); }
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
          }
          .animate-fade-in {
            animation: fadeIn 0.3s ease-out;
          }
        `}</style>
      </div>
    </section>
  );
};

export default WinnersSection;
