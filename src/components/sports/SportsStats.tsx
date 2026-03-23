import React from 'react';

interface SportsStatsProps {
  disciplineCount: number;
  competitorCount: number;
  teamCount: number;
}

const SportsStats: React.FC<SportsStatsProps> = ({ disciplineCount, competitorCount, teamCount }) => {
  return (
    <div className="flex flex-wrap justify-center gap-8 md:gap-16">
      <div className="stat-box">
        <div className="text-4xl md:text-5xl font-black mb-1">{disciplineCount}</div>
        <div className="text-[10px] text-red-500/50 font-black uppercase tracking-[0.2em]">Disciplines</div>
      </div>
      <div className="stat-box">
        <div className="text-4xl md:text-5xl font-black mb-1">{competitorCount}</div>
        <div className="text-[10px] text-red-500/50 font-black uppercase tracking-[0.2em]">Competitors</div>
      </div>
      <div className="stat-box">
        <div className="text-4xl md:text-5xl font-black mb-1">{teamCount}</div>
        <div className="text-[10px] text-red-500/50 font-black uppercase tracking-[0.2em]">Elite Teams</div>
      </div>
    </div>
  );
};

export default React.memo(SportsStats);
