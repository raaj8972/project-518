import React from 'react';

type Props = {
  scheduleType: 'prelims' | 'mains';
  setScheduleType: (type: 'prelims' | 'mains') => void;
};

const ScheduleTypeToggle: React.FC<Props> = ({ scheduleType, setScheduleType }) => {
  return (
    <div className="flex justify-center gap-6 mb-16">
      <button 
        onClick={() => setScheduleType('prelims')}
        className={`relative px-10 py-4 font-black tracking-[0.2em] transition-all duration-500 rounded-2xl uppercase border-2 ${
          scheduleType === 'prelims' 
            ? 'text-white bg-[#ff3333] border-[#ff3333] shadow-[0_0_30px_rgba(255,51,51,0.3)]' 
            : 'text-gray-500 border-white/10 hover:border-[#ff3333]/50 hover:text-[#ff3333]'
        }`}
      >
        Prelims
      </button>
      <button 
        onClick={() => setScheduleType('mains')}
        className={`relative px-10 py-4 font-black tracking-[0.2em] transition-all duration-500 rounded-2xl uppercase border-2 ${
          scheduleType === 'mains' 
            ? 'text-white bg-[#ff3333] border-[#ff3333] shadow-[0_0_30px_rgba(255,51,51,0.3)]' 
            : 'text-gray-500 border-white/10 hover:border-[#ff3333]/50 hover:text-[#ff3333]'
        }`}
      >
        Mains
      </button>
    </div>
  );
};

export default ScheduleTypeToggle;
