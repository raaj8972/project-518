import React from 'react';
import { Calendar, UserCheck, Image, Building, Sparkles } from 'lucide-react';

interface StatsOverviewProps {
  stats: {
    eventsCount: number;
    registrationsCount: number;
    galleryCount: number;
    sponsorsCount: number;
  };
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({ stats }) => {
  const items = [
    {
      name: 'Network Events',
      value: stats.eventsCount,
      icon: Calendar,
      color: 'indigo',
      glow: 'shadow-indigo-500/20',
      description: 'Active & upcoming'
    },
    {
      name: 'Verified Registrations',
      value: stats.registrationsCount,
      icon: UserCheck,
      color: 'emerald',
      glow: 'shadow-emerald-500/20',
      description: 'Total applications'
    },
    {
      name: 'Media Assets',
      value: stats.galleryCount,
      icon: Image,
      color: 'purple',
      glow: 'shadow-purple-500/20',
      description: 'Gallery content'
    },
    {
      name: 'Global Sponsors',
      value: stats.sponsorsCount,
      icon: Building,
      color: 'amber',
      glow: 'shadow-amber-500/20',
      description: 'Strategic partners'
    },
  ];

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'indigo': return 'from-indigo-500 to-blue-600 text-indigo-400';
      case 'emerald': return 'from-emerald-500 to-teal-600 text-emerald-400';
      case 'purple': return 'from-purple-500 to-violet-600 text-purple-400';
      case 'amber': return 'from-amber-500 to-orange-600 text-amber-400';
      default: return 'from-gray-500 to-gray-600 text-gray-400';
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
      {items.map((item, index) => {
        const Icon = item.icon;
        const colorClasses = getColorClasses(item.color);
        
        return (
          <div 
            key={item.name}
            className="group relative"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            {/* Floating Card - Superia Glass */}
            <div className="superia-glass-card rounded-[2rem] p-8 h-full transition-all duration-700 hover:translate-y-[-10px] hover:shadow-[0_20px_50px_rgba(0,0,0,0.6)] relative overflow-hidden group/card">
              
              {/* Animated Background Gradient Orb */}
              <div className={`absolute -right-10 -top-10 w-32 h-32 rounded-full bg-gradient-to-br ${colorClasses.split(' ').slice(0,2).join(' ')} opacity-5 blur-3xl group-hover/card:opacity-15 transition-opacity duration-1000`} />
              
              <div className="relative z-10 flex flex-col h-full">
                <div className="flex justify-between items-start mb-8">
                  <div className={`p-4 rounded-2xl bg-white/[0.03] border border-white/5 shadow-inner ${item.glow} group-hover/card:scale-110 transition-all duration-500`}>
                    <Icon className={`w-7 h-7 ${colorClasses.split(' ')[2]}`} />
                  </div>
                  
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.02] border border-white/5 opacity-0 group-hover/card:opacity-100 transition-all duration-500 transform translate-x-4 group-hover/card:translate-x-0">
                    <Sparkles size={10} className="text-white/40" />
                    <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">Real-time</span>
                  </div>
                </div>
                
                <div className="mt-auto space-y-2">
                  <h3 className="text-4xl font-black text-white tracking-tighter tabular-nums leading-none">
                    {item.value.toLocaleString()}
                  </h3>
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">
                      {item.name}
                    </p>
                    <div className="flex-1 h-[1px] bg-white/5" />
                  </div>
                  <p className="text-[10px] font-medium text-gray-600 italic">
                    {item.description}
                  </p>
                </div>
              </div>

              {/* Progress Bar Accent */}
              <div className="absolute bottom-0 left-0 w-full h-[2px] bg-white/5">
                <div className={`h-full bg-gradient-to-r ${colorClasses.split(' ').slice(0,2).join(' ')} w-0 group-hover/card:w-full transition-all duration-1000 ease-[cubic-bezier(0.2,0.8,0.2,1)]`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
