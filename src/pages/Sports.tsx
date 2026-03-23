import React, { useState, useEffect, useMemo, useRef, startTransition } from 'react';
import { 
  Trophy, 
  X,
  Instagram
} from 'lucide-react';
import { useAnnualSports } from '../context/AnnualSportsContext';
import { useSportsData } from '../context/SportsContext';
import { usePersonnelData } from '../context/PersonnelContext';
import { SEO } from '../components/SEO';
import { useData } from '../context/DataContext';
import { ModernRegistrationModal } from '../components/ModernRegistrationModal';
import { AnnualSportsRegistrationModal } from '../components/AnnualSportsRegistrationModal';
import SportsProfileModal from '../components/SportsProfileModal';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { AnnualSportsEvent, SportsSeason, SportsTeamMember } from '../types/data';
import SportDetailsContent from '../components/sports/SportDetailsContent';

// Extracted Components
import SportsStats from '../components/sports/SportsStats';
import SportsFilters from '../components/sports/SportsFilters';
import SportCard from '../components/sports/SportCard';
import SportsCommitteeSection from '../components/sports/SportsCommitteeSection';

import '../styles/Sports.css';

gsap.registerPlugin(ScrollTrigger);

type SportItem = AnnualSportsEvent | SportsSeason;

export const Sports: React.FC = () => {
    const { annualEvents, annualRegistrations } = useAnnualSports();
    const { sportsSeasons, sportsPlayers, sportsTeams } = useSportsData();
    const { sportsCommittees, sportsTeamMembers } = usePersonnelData();
    const { siteSettings, loading, isAdmin } = useData();
  
    const [selectedCategory, setSelectedCategory] = useState<'All' | 'Indoor' | 'Outdoor'>('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSportForReg, setSelectedSportForReg] = useState<string | null>(null);
    const [selectedSportForView, setSelectedSportForView] = useState<SportItem | null>(null);
    const [selectedCommitteeMember, setSelectedCommitteeMember] = useState<SportsTeamMember | null>(null);
  
    const containerRef = useRef<HTMLDivElement>(null);
    const isAnnualMode = siteSettings?.annual_sports_mode_enabled;
  
    const isSportRegistrationOpen = (sport: SportItem): boolean => {
      const globalSportsOpen = (siteSettings as any)?.sports_registration_config?.registration_open ?? true;
      if (!globalSportsOpen) return false;
      if (sport.registration_open) return true;
  
      if ('registration_timer_enabled' in sport && sport.registration_timer_enabled) {
        const now = Date.now();
        const openAt = sport.registration_opens_at ? new Date(sport.registration_opens_at).getTime() : null;
        const closesAt = sport.registration_closes_at ? new Date(sport.registration_closes_at).getTime() : null;
        if (openAt && !isNaN(openAt) && now < openAt) return false;
        if (closesAt && !isNaN(closesAt) && now >= closesAt) return false;
        if (!openAt) return false;
        return true;
      }
  
      if ('owner_registration_open' in sport || 'player_registration_open' in sport) {
        return !!(sport.registration_open || (sport as any).owner_registration_open || (sport as any).player_registration_open);
      }
      return !!sport.registration_open;
    };
  
    useEffect(() => {
      if (loading) return;

      const ctx = gsap.context(() => {
        gsap.from('.stat-box', {
          scale: 0.8,
          opacity: 0,
          duration: 0.8,
          stagger: 0.1,
          ease: 'back.out(1.7)'
        });
      }, containerRef);
      return () => ctx.revert();
    }, [loading]);

    const filteredSports = useMemo(() => {
      let baseList: SportItem[] = isAnnualMode ? (annualEvents as SportItem[]) : (sportsSeasons.filter(s => s.enabled) as SportItem[]);
      
      if (!isAdmin()) {
        baseList = baseList.filter(item => {
          if ('visible' in item) return item.visible !== false;
          return true;
        });
      }
  
      return baseList.filter(item => {
        const nameMatch = (item.name || '').toLowerCase().includes(searchQuery.toLowerCase());
        const cat = 'category' in item ? item.category : 'Division';
        const catMatch = selectedCategory === 'All' || cat === selectedCategory;
        return nameMatch && catMatch;
      });
    }, [isAnnualMode, annualEvents, sportsSeasons, searchQuery, selectedCategory, isAdmin]);
  
    if (loading) return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center">
        <div className="relative">
          <div className="w-24 h-24 border-2 border-red-600/20 rounded-full animate-ping" />
          <Trophy className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-red-600 animate-pulse" size={40} />
        </div>
      </div>
    );
  
    return (
      <div className="stranger-theme min-h-screen relative overflow-hidden">
        <SEO />
        <div ref={containerRef} className="text-white selection:bg-red-500/30 overflow-x-hidden pt-32">
          
          <div className="container mx-auto px-4 mb-12 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex-1 w-full">
              <SportsStats 
                disciplineCount={filteredSports.length}
                competitorCount={isAnnualMode ? annualRegistrations.length : sportsPlayers.length}
                teamCount={sportsTeams.length}
              />
            </div>
            
            {siteSettings?.sports_instagram_url && (
              <a 
                href={siteSettings.sports_instagram_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-pink-500/10 to-purple-500/10 hover:from-pink-500/20 hover:to-purple-500/20 border border-pink-500/30 rounded-2xl text-pink-100 transition-all hover:scale-105 active:scale-95 group shadow-lg shadow-pink-500/10"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-0.5">
                  <div className="w-full h-full bg-[#030712] rounded-full flex items-center justify-center group-hover:bg-transparent transition-colors">
                    <Instagram size={20} className="text-white relative z-10" />
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-pink-400 font-bold tracking-widest uppercase">Follow Us</span>
                  <span className="font-bold text-lg tracking-tight">@SportsCouncil</span>
                </div>
              </a>
            )}
          </div>
  
          <SportsFilters 
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
  
          <section className="py-24 container mx-auto px-4">
            <div className="sports-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredSports.map((sportItem) => (
                <SportCard 
                  key={sportItem.id}
                  sportItem={sportItem}
                  regCount={isAnnualMode 
                    ? annualRegistrations.filter(r => r.event_id === String(sportItem.id)).length
                    : sportsPlayers.filter(p => p.sport_id === sportItem.id).length
                  }
                  isOpen={isSportRegistrationOpen(sportItem)}
                  onViewDetails={setSelectedSportForView}
                  onRegister={setSelectedSportForReg}
                />
              ))}
            </div>
          </section>
  
          <SportsCommitteeSection 
            sportsCommittees={sportsCommittees}
            sportsTeamMembers={sportsTeamMembers}
            onMemberClick={(member) => startTransition(() => setSelectedCommitteeMember(member))}
          />
        </div>
  
        {selectedSportForView && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/95 backdrop-blur-3xl animate-in fade-in duration-500">
            <div className="relative w-full max-w-5xl bg-[#0c0c14] border border-white/10 rounded-[4rem] overflow-hidden max-h-[90vh] flex flex-col shadow-[0_0_100px_rgba(0,0,0,1)]">
              <div className="p-10 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                <div>
                  <h2 className="text-4xl font-black text-white uppercase tracking-tighter">{selectedSportForView.name}</h2>
                </div>
                <button 
                  onClick={() => setSelectedSportForView(null)} 
                  className="w-14 h-14 bg-white/5 hover:bg-white/10 rounded-2xl transition-all flex items-center justify-center border border-white/10"
                >
                  <X size={24} />
                </button>
              </div>
              <div className="p-10 overflow-y-auto custom-scrollbar flex-grow">
                <SportDetailsContent sport={selectedSportForView} />
              </div>
            </div>
          </div>
        )}
  
        {selectedSportForReg && (
          <div className="relative z-[10001]">
            {isAnnualMode ? (
              <AnnualSportsRegistrationModal
                isOpen={!!selectedSportForReg}
                onClose={() => setSelectedSportForReg(null)}
                registrationTargetId={selectedSportForReg}
                registrationTargetTitle={annualEvents.find(ev => String(ev.id) === selectedSportForReg)?.name || 'Registration'}
              />
            ) : (
              <ModernRegistrationModal
                isOpen={!!selectedSportForReg}
                onClose={() => setSelectedSportForReg(null)}
                type="legacy"
                targetId={selectedSportForReg}
                targetTitle={sportsSeasons.find(ev => String(ev.id) === selectedSportForReg)?.name || 'Registration'}
                targetData={sportsSeasons.find(ev => String(ev.id) === selectedSportForReg) as SportsSeason}
                config={{ customFields: [] }}
              />
            )}
          </div>
        )}
  
        {selectedCommitteeMember && (
          <div className="relative z-[10002]">
            <SportsProfileModal
              open={!!selectedCommitteeMember}
              onClose={() => setSelectedCommitteeMember(null)}
              person={selectedCommitteeMember}
            />
          </div>
        )}
      </div>
    );
};

export default Sports;
