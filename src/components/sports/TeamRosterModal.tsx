import React from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles, User, Shield } from 'lucide-react';
import { getSportTheme } from '../../utils/sportBranding';

interface TeamRosterModalProps {
  isOpen: boolean;
  onClose: () => void;
  registration: any;
  sportTitle: string;
}


const TeamRosterModal: React.FC<TeamRosterModalProps> = ({ isOpen, onClose, registration, sportTitle }) => {
  if (!isOpen || !registration) return null;

  const theme = getSportTheme(sportTitle);
  
  const members = [
    { 
      name: registration.full_name, 
      photo: registration.photo_url, 
      role: 'Captain',
      metadata: registration.metadata || {}
    },
    ...(registration.team_members || []).map((m: any) => ({
      ...m,
      photo: m.photo_url,
      role: m.metadata?.role || m.role || 'Player'
    }))
  ];

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/95 backdrop-blur-2xl" onClick={onClose} />
      
      <div className="relative w-full max-w-6xl h-[85vh] bg-[#0a0a0f] border border-white/10 rounded-[2.5rem] overflow-hidden flex flex-col shadow-[0_0_100px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-300">
        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
          <div className="flex items-center gap-4">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg shadow-red-600/20 overflow-hidden"
              style={{ background: registration.metadata?.team_logo_url ? 'transparent' : `linear-gradient(to bottom right, #991b1b, #dc2626)` }}
            >
              {registration.metadata?.team_logo_url ? (
                <img src={registration.metadata.team_logo_url} alt="" className="w-full h-full object-contain p-1 bg-black/40" />
              ) : (
                <Shield size={24} className="text-white" />
              )}
            </div>
            <div>
              <h2 className="text-3xl font-black text-white uppercase tracking-tight leading-none">
                {registration.team_name || registration.metadata?.team_name || registration.full_name}
              </h2>
              <p className="text-[10px] text-white/30 font-bold uppercase tracking-[0.3em] mt-1.5 flex items-center gap-2">
                <Sparkles size={10} className="text-red-500" /> Team Squad • {sportTitle}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all border border-white/10">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {members.map((player, idx) => (
              <div key={idx} className="group relative">
                <div className="relative h-[420px] w-full bg-[#12121a] rounded-[2.5rem] border border-white/5 overflow-hidden transition-all duration-500 hover:border-red-600/40 hover:-translate-y-2 hover:shadow-[0_30px_60px_rgba(0,0,0,0.6)]">
                  <div className={`absolute inset-0 bg-gradient-to-br from-red-950 to-red-900 opacity-[0.03] group-hover:opacity-[0.1] transition-opacity`} />
                  
                  <div className="absolute inset-0 flex items-end justify-center pointer-events-none">
                    {player.photo ? (
                      <img src={player.photo} alt={player.name} className="h-full w-full object-cover object-top" />
                    ) : (
                      <div className="relative w-full h-full flex items-end justify-center">
                         <User className="w-[85%] h-[85%] text-white/[0.02] mb-[-10%]" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#12121a] via-transparent to-transparent" />
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 p-7 z-10">
                    <div className="flex flex-col gap-1 mb-5">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black text-red-500 uppercase tracking-[0.2em]">{player.role}</span>
                        <div className="h-px bg-red-600/20 flex-grow" />
                      </div>
                      <h3 className="text-2xl font-black text-white uppercase tracking-tight line-clamp-1">{player.name}</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      {theme.attributes.slice(0, 4).map(attr => (
                        <div key={attr.key} className="bg-white/5 border border-white/5 backdrop-blur-md rounded-2xl p-3 flex flex-col gap-0.5">
                          <span className="text-[7px] font-bold text-white/20 uppercase tracking-widest leading-none">{attr.label}</span>
                          <span className="text-[12px] font-black text-white/90 truncate leading-tight">
                            {player.metadata?.[attr.key] || '—'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="absolute top-6 left-6 z-20">
                    <div className="w-12 h-12 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 flex items-center justify-center font-black text-red-500 text-xl shadow-xl">
                      {player.metadata?.jersey_number || '00'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="px-8 py-5 border-t border-white/5 bg-black/40 flex justify-between items-center backdrop-blur-xl">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Shield size={14} className="text-red-600/50" />
              <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">{members.length} Squad Members</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <div className="w-2 h-2 rounded-full bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.5)] animate-pulse" />
             <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Verified Rosters</span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default TeamRosterModal;
