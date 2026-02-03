import React from 'react';
import { Calendar, UserCheck, Image, Building, TrendingUp } from 'lucide-react';

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
      name: 'Total Events',
      value: stats.eventsCount,
      icon: Calendar,
      from: 'from-blue-500',
      to: 'to-cyan-400',
      description: 'Active & upcoming'
    },
    {
      name: 'Registrations',
      value: stats.registrationsCount,
      icon: UserCheck,
      from: 'from-emerald-500',
      to: 'to-green-400',
      description: 'Total applications'
    },
    {
      name: 'Gallery Images',
      value: stats.galleryCount,
      icon: Image,
      from: 'from-violet-500',
      to: 'to-purple-400',
      description: 'Media assets'
    },
    {
      name: 'Sponsors',
      value: stats.sponsorsCount,
      icon: Building,
      from: 'from-amber-500',
      to: 'to-orange-400',
      description: 'partners' // Lowercase intentional for style
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {items.map((item, index) => {
        const Icon = item.icon;
        return (
          <div 
            key={item.name}
            className="group relative overflow-hidden rounded-2xl bg-[#181824]/60 backdrop-blur-md border border-white/5 p-6 hover:bg-[#181824]/80 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-black/20"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            {/* Ambient Background Gradient */}
            <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full bg-gradient-to-br ${item.from} ${item.to} opacity-10 blur-2xl group-hover:opacity-20 transition-opacity duration-500`} />
            
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${item.from} ${item.to} bg-opacity-10 shadow-lg shadow-black/10 group-hover:shadow-${item.from}/20 transition-shadow`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex items-center gap-1 text-[10px] font-medium text-green-400 bg-green-400/10 px-2 py-1 rounded-full border border-green-400/20 opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-1 group-hover:translate-y-0">
                  <TrendingUp size={10} />
                  <span>LIVE</span>
                </div>
              </div>
              
              <div className="space-y-1">
                <h3 className="text-3xl font-bold text-white tracking-tight tabular-nums">
                  {item.value.toLocaleString()}
                </h3>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                  {item.name}
                </p>
              </div>
            </div>

            {/* Bottom Accent Line */}
            <div className={`absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r ${item.from} ${item.to} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
          </div>
        );
      })}
    </div>
  );
};
