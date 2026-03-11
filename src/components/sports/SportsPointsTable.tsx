import React, { useMemo } from 'react';
import { useSportsData } from '../../context/SportsContext';

interface SportsPointsTableProps {
  sportId: number;
}

export const SportsPointsTable: React.FC<SportsPointsTableProps> = ({ sportId }) => {
  const { sportsTeams } = useSportsData();

  const teams = useMemo(() => {
    return sportsTeams
      .filter(t => String(t.sport_id) === String(sportId) && t.enabled)
      .sort((a, b) => {
        // Sort by points, then by NRR
        if ((b.points || 0) !== (a.points || 0)) return (b.points || 0) - (a.points || 0);
        return (parseFloat(String(b.nrr || '0')) - parseFloat(String(a.nrr || '0')));
      });
  }, [sportsTeams, sportId]);

  if (teams.length === 0) return null;

  return (
    <div className="bg-[#030712] border border-white/10 rounded-3xl overflow-hidden mt-8">
      <div className="overflow-x-auto">
        <table className="w-full text-left whitespace-nowrap">
          <thead className="bg-white/5 border-b border-white/10 text-xs uppercase tracking-widest text-white/50">
            <tr>
              <th className="px-6 py-4 font-semibold">Team</th>
              <th className="px-4 py-4 font-semibold text-center">P</th>
              <th className="px-4 py-4 font-semibold text-center">W</th>
              <th className="px-4 py-4 font-semibold text-center">L</th>
              <th className="px-4 py-4 font-semibold text-center">D</th>
              <th className="px-4 py-4 font-semibold text-center">NRR</th>
              <th className="px-6 py-4 font-semibold text-right text-emerald-400">PTS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {teams.map((team, index) => {
              const played = (team.wins || 0) + (team.losses || 0) + (team.draws || 0);
              return (
                <tr key={team.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 flex items-center justify-center font-bold text-white/30 text-xs">
                        {index + 1}
                      </div>
                      <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 bg-black/50" style={{ borderColor: team.color || 'transparent', borderWidth: '1px' }}>
                        {team.logo && <img src={team.logo} alt={team.short_name} className="w-full h-full object-cover" />}
                      </div>
                      <div className="font-bold text-white text-sm" style={{ color: team.color || '#fff' }}>
                        {team.name}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center text-white/70 font-mono text-sm">{played}</td>
                  <td className="px-4 py-4 text-center text-white/70 font-mono text-sm">{team.wins || 0}</td>
                  <td className="px-4 py-4 text-center text-white/70 font-mono text-sm">{team.losses || 0}</td>
                  <td className="px-4 py-4 text-center text-white/70 font-mono text-sm">{team.draws || 0}</td>
                  <td className="px-4 py-4 text-center text-white/50 font-mono text-xs">{team.nrr || '0.000'}</td>
                  <td className="px-6 py-4 text-right">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-400 font-black text-sm">
                      {team.points || 0}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
