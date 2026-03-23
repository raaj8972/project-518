import React from 'react';
import { AlertCircle } from 'lucide-react';
import EventCard from './EventCard';

type Props = {
  day: any;
  idx: number;
  now: Date;
};

const DailyScheduleSection: React.FC<Props> = ({ day, idx, now }) => {
  return (
    <div
      className="animate-fade-in-up"
      style={{ animationDelay: `${idx * 150}ms`, animationFillMode: 'both' }}
    >
      <div className="flex items-center gap-6 mb-10">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-[#ff3333]/20"></div>
        <div className="text-center">
          <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase mb-1">
            {day.date}
          </h2>
          <p className="text-[#ff3333] text-sm font-bold tracking-[0.3em] uppercase">{day.day}</p>
        </div>
        <div className="h-px flex-1 bg-gradient-to-l from-transparent via-white/10 to-[#ff3333]/20"></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        {day.events?.length === 0 ? (
          <div className="col-span-full p-20 text-center bg-white/5 border border-white/10 rounded-3xl">
             <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
             <p className="text-gray-500 font-medium tracking-wide">No events found for this criteria.</p>
          </div>
        ) : (
          day.events?.map((event: any, evIdx: number) => (
            <EventCard key={event.id || evIdx} event={event} currentTime={now} />
          ))
        )}
      </div>
    </div>
  );
};

export default DailyScheduleSection;
