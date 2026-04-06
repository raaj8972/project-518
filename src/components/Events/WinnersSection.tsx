import React from 'react';
import { Trophy, Flame } from 'lucide-react';
import { yearLabelFor } from '../../utils/eventUtils';

interface WinnersSectionProps {
  eventWinners: any[];
}

export const WinnersSection: React.FC<WinnersSectionProps> = ({ eventWinners }) => {
  if (!eventWinners || eventWinners.length === 0) return null;

  // Group winners by event
  const eventsWithWinners = eventWinners.reduce((acc: any, winner: any) => {
    if (!acc[winner.event_id]) {
      acc[winner.event_id] = {
        title: winner.event_title || 'Event',
        winners: []
      };
    }
    acc[winner.event_id].winners.push(winner);
    return acc;
  }, {});

  return (
    <section className="relative py-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col items-center mb-16 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-600/10 border border-violet-600/20 text-violet-400 text-sm font-bold tracking-widest uppercase mb-4 animate-bounce">
            <Trophy size={14} /> Event Champions
          </div>
          <h2 className="text-4xl md:text-6xl font-black text-white nebula-title-text mb-6">
            HALL OF <span className="text-cyan-500">FAME</span>
          </h2>
          <div className="w-24 h-1 bg-cyan-500 rounded-full mb-8 shadow-[0_0_15px_rgba(6,182,212,0.8)]" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {Object.entries(eventsWithWinners).map(([eventId, data]: [string, any]) => (
            <div 
              key={eventId}
              className="group relative bg-[#0a0a0a]/80 backdrop-blur-md border border-white/5 rounded-2xl p-6 hover:border-violet-600/50 transition-all duration-500 hover:shadow-[0_0_30px_rgba(139,92,246,0.15)] scroll-animate"
            >
              <div className="absolute -top-3 -right-3 w-12 h-12 bg-violet-600 rounded-xl flex items-center justify-center shadow-lg transform rotate-12 group-hover:rotate-0 transition-transform duration-500">
                <Flame className="text-white" size={24} />
              </div>

              <h3 className="text-xl font-bold text-white mb-6 pr-8 group-hover:text-cyan-400 transition-colors">
                {data.title}
              </h3>

              <div className="space-y-4">
                {[1, 2, 3].map((pos) => {
                  const winnersAtPos = data.winners.filter((w: any) => Number(w.position) === pos);
                  if (winnersAtPos.length === 0) return null;

                  return (
                    <div key={pos} className="flex items-start gap-3">
                      <div className={`
                        w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm shrink-0
                        ${pos === 1 ? 'bg-violet-600 text-white shadow-[0_0_12px_rgba(139, 92, 246, 0.5)]' : 
                          pos === 2 ? 'bg-zinc-400 text-black' : 
                          'bg-amber-600 text-black'}
                      `}>
                        {pos === 1 ? '1' : pos === 2 ? '2' : '3'}
                      </div>
                      <div className="pt-1">
                        {winnersAtPos.map((w: any, idx: number) => {
                          const year = yearLabelFor(w.registration_year || w.year);
                          return (
                            <div key={w.id} className="text-gray-300 font-medium">
                              <span className="text-white">{w.name}</span>
                              {year && <span className="text-gray-500 text-xs ml-2">({year})</span>}
                              {idx < winnersAtPos.length - 1 && <div className="h-px w-full my-2 bg-white/5" />}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Decorative corner accent */}
              <div className="absolute bottom-0 right-0 w-16 h-16 bg-gradient-to-br from-transparent to-violet-600/10 rounded-br-2xl pointer-events-none" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
