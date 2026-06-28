import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOutletContext, useNavigate } from 'react-router-dom';
import {
  Calendar, ChevronDown, ChevronUp, Trophy, Users, CheckCircle, XCircle,
  Clock, ArrowRight, Star, Medal, Award, Sparkles, User, AlertCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useStudentAuth } from '../../context/StudentAuthContext';
import { BRAND_NAME } from '../../constants/brand';
import ProfileModal from '../../components/dashboard/ProfileModal';
import { toast } from 'react-hot-toast';

interface DashboardContextType {
  registrations: any[];
  dataLoading: boolean;
  fetchUserRegistrations?: () => Promise<void>;
}

interface EventRound {
  id: string;
  event_id: string;
  round_number: number;
  name: string;
  is_active: boolean;
  created_at: string;
}

interface RegistrationRound {
  id: string;
  registration_id: string;
  round_id: string;
  status: 'pending' | 'qualified' | 'disqualified';
  prize_rank: '1st' | '2nd' | '3rd' | 'Special Mention' | null;
  feedback: string | null;
}

interface CoParticipant {
  id: string;
  full_name: string;
  batch: string | null;
  avatar_url: string | null;
  aura_color: string | null;
  user_id: string;
  registration_id: string;
}

const RANK_COLORS: Record<string, { bg: string; text: string; icon: React.ElementType; label: string }> = {
  '1st':             { bg: 'rgba(251,191,36,0.15)',  text: '#fbbf24', icon: Trophy,  label: '🥇 1st Place' },
  '2nd':             { bg: 'rgba(156,163,175,0.15)', text: '#9ca3af', icon: Medal,   label: '🥈 2nd Place' },
  '3rd':             { bg: 'rgba(180,83,9,0.15)',    text: '#b45309', icon: Award,   label: '🥉 3rd Place' },
  'Special Mention': { bg: 'rgba(99,102,241,0.15)',  text: '#818cf8', icon: Star,    label: '⭐ Special Mention' },
};

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string; icon: React.ElementType }> = {
  pending:      { bg: 'rgba(255,255,255,0.06)', text: '#9ca3af', label: 'Awaiting Result', icon: Clock },
  qualified:    { bg: 'rgba(34,197,94,0.12)',   text: '#4ade80', label: 'Qualified ✓',     icon: CheckCircle },
  disqualified: { bg: 'rgba(239,68,68,0.12)',   text: '#f87171', label: 'Eliminated',       icon: XCircle },
};

const ActiveEvents: React.FC = () => {
  const { registrations, dataLoading, fetchUserRegistrations } = useOutletContext<DashboardContextType>();
  const { user } = useStudentAuth();
  const navigate = useNavigate();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rounds, setRounds] = useState<Record<string, EventRound[]>>({});
  const [myRoundStatus, setMyRoundStatus] = useState<Record<string, RegistrationRound[]>>({});
  const [coParticipants, setCoParticipants] = useState<Record<string, CoParticipant[]>>({});
  const [loadingExpand, setLoadingExpand] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<any | null>(null);

  const handleCancelRegistration = async (regId: string) => {
    const confirmCancel = window.confirm("Are you sure you want to cancel this registration?");
    if (!confirmCancel) return;

    try {
      const { data, error } = await supabase.rpc('cancel_registration', { p_reg_id: regId });
      if (error) {
        toast.error(`Failed to cancel: ${error.message}`);
      } else {
        toast.success("Registration cancelled successfully!");
        if (fetchUserRegistrations) await fetchUserRegistrations();
      }
    } catch (e: any) {
      toast.error(e.message || "An error occurred");
    }
  };

  // Only show approved registrations as "active"
  const approvedRegs = registrations.filter(r => r.status === 'approved' && r.is_active === true);
  const rejectedRegs = registrations.filter(r => r.status === 'rejected');

  const loadEventDetails = useCallback(async (reg: any) => {
    if (!user) return;
    const eventId = reg.event_id || reg.event?.id;
    const regId = reg.id;
    if (!eventId) return;

    setLoadingExpand(regId);
    try {
      // 1. Fetch event rounds
      const { data: roundsData } = await supabase
        .from('event_rounds')
        .select('*')
        .eq('event_id', String(eventId))
        .order('round_number', { ascending: true });

      // 2. Fetch my qualification statuses for each round
      const { data: myStatuses } = await supabase
        .from('registration_rounds')
        .select('*')
        .eq('registration_id', regId);

      // 3. Fetch co-participants (other approved registrations for this event)
      let coQuery = supabase
        .from('registrations')
        .select('id, full_name, batch, user_id, photo_url')
        .eq('event_id', String(eventId))
        .eq('status', 'approved')
        .eq('is_active', true)
        .neq('id', regId);

      if (reg.is_team_registration && reg.team_name) {
        coQuery = coQuery.eq('team_name', reg.team_name);
      }

      const { data: coRegs } = await coQuery.limit(50);

      // 4. Fetch profiles for co-participants who are registered students
      let coList: CoParticipant[] = [];
      if (coRegs && coRegs.length > 0) {
        const userIds = coRegs.map((r: any) => r.user_id).filter(Boolean);
        let profilesMap: Record<string, any> = {};
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, batch, avatar_url, aura_color')
            .in('id', userIds);
          if (profiles) {
            profiles.forEach((p: any) => { profilesMap[p.id] = p; });
          }
        }
        coList = coRegs.map((r: any) => {
          const profile = profilesMap[r.user_id] || {};
          return {
            id: r.user_id || r.id,
            full_name: profile.full_name || r.full_name,
            batch: profile.batch || r.batch,
            avatar_url: profile.avatar_url || r.photo_url,
            aura_color: profile.aura_color || null,
            user_id: r.user_id,
            registration_id: r.id,
          };
        });
      }

      setRounds(prev => ({ ...prev, [regId]: roundsData || [] }));
      setMyRoundStatus(prev => ({ ...prev, [regId]: myStatuses || [] }));
      setCoParticipants(prev => ({ ...prev, [regId]: coList }));
    } catch (err) {
      console.error('[ActiveEvents] load error:', err);
    } finally {
      setLoadingExpand(null);
    }
  }, [user]);

  const toggleExpand = async (reg: any) => {
    const regId = reg.id;
    if (expandedId === regId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(regId);
    if (!rounds[regId]) {
      await loadEventDetails(reg);
    }
  };

  // Realtime: subscribe to round changes when expanded
  useEffect(() => {
    if (!expandedId) return;
    const reg = approvedRegs.find(r => r.id === expandedId);
    if (!reg) return;
    const eventId = reg.event_id || reg.event?.id;
    if (!eventId) return;

    const channel = supabase.channel(`event-rounds-${expandedId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'registration_rounds', filter: `registration_id=eq.${expandedId}` }, () => {
        loadEventDetails(reg);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_rounds', filter: `event_id=eq.${String(eventId)}` }, () => {
        loadEventDetails(reg);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [expandedId, approvedRegs, loadEventDetails]);

  const getRoundStatus = (regId: string, roundId: string): RegistrationRound | undefined => {
    return myRoundStatus[regId]?.find(s => s.round_id === roundId);
  };

  const getMyWinner = (regId: string): RegistrationRound | undefined => {
    return myRoundStatus[regId]?.find(s => s.prize_rank != null);
  };

  if (dataLoading) {
    return (
      <div className="space-y-4">
        {[0, 1, 2].map(i => (
          <div key={i} className="neu-card rounded-2xl h-40 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <motion.div
      key="active-events"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="neu-card p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-black text-gray-600 uppercase tracking-widest mb-1">My Registrations</p>
          <h1 className="text-2xl font-black text-white tracking-tight">Active Events</h1>
          <p className="text-gray-500 text-sm mt-1">
            {approvedRegs.length} confirmed event{approvedRegs.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => navigate('/events')}
          className="neu-nav-item px-5 py-2.5 flex items-center gap-2 text-indigo-400 hover:text-indigo-300 transition-colors w-fit"
        >
          <span className="text-xs font-black uppercase tracking-widest">Discover Events</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Registered events that are NOT yet active */}
      {registrations.filter(r => r.status !== 'rejected' && !r.is_active).length > 0 && (
        <div className="space-y-3">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-500">Pending Activations</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {registrations.filter(r => r.status !== 'rejected' && !r.is_active).map((reg) => (
              <div key={reg.id} className="neu-card p-4 rounded-2xl border border-amber-500/20 bg-amber-500/[0.02] flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                    <Clock size={10} className="animate-pulse" />
                    <span>Pending Activation</span>
                  </div>
                  <h3 className="text-sm font-black text-white truncate mt-1">{reg.event?.title || reg.event_title}</h3>
                  {reg.is_team_registration && reg.team_name && (
                    <p className="text-[9px] text-gray-500 font-bold mt-0.5">Team: {reg.team_name}</p>
                  )}
                </div>
                
                <button
                  onClick={() => handleCancelRegistration(reg.id)}
                  className="px-3 py-1.5 border border-rose-500/25 hover:bg-rose-500/10 text-[10px] font-black uppercase tracking-wider text-rose-400 rounded-xl transition-all cursor-pointer flex-shrink-0"
                >
                  Cancel
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active event cards */}
      {(approvedRegs.length > 0 || rejectedRegs.length > 0) ? (
        <div className="space-y-4">
          {/* Approved & Active events */}
          {approvedRegs.map((reg, idx) => {
            const isOpen = expandedId === reg.id;
            const isLoading = loadingExpand === reg.id;
            const eventRounds = rounds[reg.id] || [];
            const participants = coParticipants[reg.id] || [];
            const winner = getMyWinner(reg.id);
            const eventTitle = reg.event?.title || reg.event_title || 'Untitled Event';
            const eventImage = reg.event?.image_url || reg.event?.image;

            const getLatestQualificationText = () => {
              const myStatuses = myRoundStatus[reg.id] || [];
              const qualifiedStatuses = myStatuses.filter((s: any) => s.status === 'qualified');
              if (qualifiedStatuses.length === 0) {
                const disqualified = myStatuses.find((s: any) => s.status === 'disqualified');
                if (disqualified) return { text: 'Eliminated', color: 'text-red-400 bg-red-500/10 border-red-500/20' };
                return null;
              }
              
              let maxRoundNum = 0;
              let roundName = '';
              qualifiedStatuses.forEach((qs: any) => {
                const round = eventRounds.find((r: any) => r.id === qs.round_id);
                if (round && round.round_number > maxRoundNum) {
                  maxRoundNum = round.round_number;
                  roundName = round.name;
                }
              });
              
              if (maxRoundNum > 0) {
                return { text: `Qualified for Round ${maxRoundNum} (${roundName})`, color: 'text-green-400 bg-green-500/10 border-green-500/20 animate-pulse' };
              }
              return null;
            };
            const latestQual = getLatestQualificationText();

            return (
              <motion.div
                key={reg.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.06 }}
              >
                <div className="neu-card rounded-2xl overflow-hidden">
                  {/* Winner celebration banner */}
                  {winner && winner.prize_rank && (
                    <div
                      className="px-6 py-3 flex items-center gap-3 text-sm font-black"
                      style={{ background: RANK_COLORS[winner.prize_rank]?.bg, color: RANK_COLORS[winner.prize_rank]?.text }}
                    >
                      <Trophy className="w-4 h-4" />
                      You won {RANK_COLORS[winner.prize_rank]?.label} in {eventTitle}!
                      {winner.feedback && <span className="font-normal text-[11px] opacity-70 ml-2">"{winner.feedback}"</span>}
                    </div>
                  )}

                  {/* Event image strip */}
                  {eventImage && (
                    <div className="relative h-28 overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-t from-[#131720] via-[#131720]/50 to-transparent z-10" />
                      <img src={eventImage} alt={eventTitle} className="w-full h-full object-cover opacity-40" />
                      <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-black text-green-400 uppercase tracking-widest"
                        style={{ background: 'rgba(14,17,23,0.85)', border: '1px solid rgba(34,197,94,0.2)' }}>
                        <CheckCircle className="w-3.5 h-3.5" /> Approved
                      </div>
                    </div>
                  )}

                  {/* Card info row */}
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-black text-white tracking-tight leading-tight">{eventTitle}</h3>
                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                          {reg.event?.category && (
                            <span className="text-indigo-400 font-black uppercase tracking-widest text-[10px]">
                              {typeof reg.event.category === 'object' ? reg.event.category.name : reg.event.category}
                            </span>
                          )}
                          {reg.team_name && (
                            <span className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">
                              Team: <span className="text-gray-400">{reg.team_name}</span>
                            </span>
                          )}
                          {eventRounds.length > 0 && (
                            <span className="text-violet-400 font-black text-[10px] uppercase tracking-widest">
                              {eventRounds.length} Round{eventRounds.length !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        {latestQual && (
                          <div className={`mt-3 px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 w-fit ${latestQual.color}`}>
                            <Trophy className="w-3 h-3 text-indigo-400" />
                            <span>{latestQual.text}</span>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => toggleExpand(reg)}
                        className="neu-icon-btn w-9 h-9 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                      >
                        {isLoading
                          ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} className="w-4 h-4 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full" />
                          : isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                        }
                      </button>
                    </div>
                  </div>

                  {/* Expanded panel */}
                  <AnimatePresence>
                    {isOpen && !isLoading && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-6 space-y-6" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>

                          {/* ── Round Timeline ── */}
                          {eventRounds.length > 0 ? (
                            <div className="pt-5">
                              <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <Trophy className="w-3 h-3" /> Round Roadmap
                              </p>
                              <div className="space-y-2">
                                {eventRounds.map((round, ri) => {
                                  const myStatus = getRoundStatus(reg.id, round.id);
                                  const st = STATUS_STYLE[myStatus?.status || 'pending'];
                                  const Icon = st.icon;
                                  const hasRank = myStatus?.prize_rank;
                                  const rankInfo = hasRank ? RANK_COLORS[myStatus!.prize_rank!] : null;
                                  const RankIcon = rankInfo?.icon;

                                  return (
                                    <div key={round.id} className="flex items-center gap-3">
                                      {/* Step connector */}
                                      <div className="flex flex-col items-center">
                                        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-black"
                                          style={{ background: st.bg, border: `1px solid ${st.text}30`, color: st.text }}>
                                          {ri + 1}
                                        </div>
                                        {ri < eventRounds.length - 1 && (
                                          <div className="w-px h-4 bg-white/10 mt-1" />
                                        )}
                                      </div>

                                      <div className="flex-1 flex items-center justify-between p-3 rounded-xl"
                                        style={{ background: st.bg, border: `1px solid ${st.text}20` }}>
                                        <div>
                                          <p className="text-xs font-black text-white">{round.name}</p>
                                          {myStatus?.feedback && (
                                            <p className="text-[11px] text-gray-500 mt-0.5">"{myStatus.feedback}"</p>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                          {hasRank && rankInfo && RankIcon && (
                                            <span className="flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-lg"
                                              style={{ background: rankInfo.bg, color: rankInfo.text }}>
                                              <RankIcon className="w-3 h-3" />
                                              {rankInfo.label}
                                            </span>
                                          )}
                                          <div className="flex items-center gap-1 text-[10px] font-black" style={{ color: st.text }}>
                                            <Icon className="w-3.5 h-3.5" />
                                            {st.label}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            <div className="pt-5">
                              <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2">Round Status</p>
                              <p className="text-gray-600 text-sm">No rounds set yet — coordinator will update soon.</p>
                            </div>
                          )}

                          {/* ── Co-Participants ── */}
                          <div>
                            <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                              <Users className="w-3 h-3" /> Participants ({participants.length + 1})
                            </p>

                            {participants.length === 0 ? (
                              <p className="text-gray-600 text-sm">You are the only confirmed participant so far.</p>
                            ) : (
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {/* Self card */}
                                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-indigo-500/20"
                                  style={{ background: 'rgba(99,102,241,0.08)' }}>
                                  <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-[10px] font-black text-indigo-300 flex-shrink-0">
                                    You
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs font-black text-white truncate">You</p>
                                  </div>
                                </div>

                                {participants.map(p => (
                                  <button
                                    key={p.registration_id}
                                    onClick={() => p.user_id ? setSelectedProfile(p) : null}
                                    disabled={!p.user_id}
                                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-white/[0.06] hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all text-left group"
                                    style={{ background: 'rgba(255,255,255,0.03)' }}
                                  >
                                    <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-white/5 border border-white/10 flex items-center justify-center">
                                      {p.avatar_url
                                        ? <img src={p.avatar_url} alt={p.full_name} className="w-full h-full object-cover" />
                                        : <User className="w-4 h-4 text-gray-600" />
                                      }
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-xs font-black text-white truncate group-hover:text-indigo-300 transition-colors">
                                        {p.full_name}
                                      </p>
                                      {p.batch && <p className="text-[10px] text-gray-600 truncate">{p.batch}</p>}
                                    </div>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}

          {/* Kicked Out / Deactivated events */}
          {rejectedRegs.map((reg, idx) => {
            const eventTitle = reg.event?.title || reg.event_title || 'Untitled Event';
            const eventImage = reg.event?.image_url || reg.event?.image;

            return (
              <motion.div
                key={reg.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 0.65, y: 0 }}
                transition={{ delay: (approvedRegs.length + idx) * 0.06 }}
              >
                <div className="neu-card rounded-2xl overflow-hidden border border-rose-500/20" style={{ background: 'rgba(239,68,68,0.02)' }}>
                  {/* Warning banner */}
                  <div className="px-6 py-3 flex items-center gap-3 text-xs font-black bg-rose-500/10 border-b border-rose-500/20 text-rose-400">
                    <XCircle className="w-3.5 h-3.5 flex-shrink-0 animate-pulse" />
                    Deactivated / Kicked Out
                  </div>

                  {/* Event image strip */}
                  {eventImage && (
                    <div className="relative h-20 overflow-hidden grayscale opacity-30">
                      <div className="absolute inset-0 bg-gradient-to-t from-[#131720] via-[#131720]/60 to-transparent z-10" />
                      <img src={eventImage} alt={eventTitle} className="w-full h-full object-cover" />
                    </div>
                  )}

                  {/* Card info row */}
                  <div className="p-5">
                    <div>
                      <h3 className="text-lg font-black text-gray-400 tracking-tight leading-tight line-through">{eventTitle}</h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        {reg.event?.category && (
                          <span className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">
                            {typeof reg.event.category === 'object' ? reg.event.category.name : reg.event.category}
                          </span>
                        )}
                        {reg.is_team_registration && reg.team_name && (
                          <span className="text-gray-600 text-[10px] font-bold uppercase tracking-widest">
                            Team: <span className="text-gray-500">{reg.team_name}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Locked notice message */}
                    <div className="mt-4 p-3 rounded-xl border border-rose-500/10 flex items-start gap-2.5 text-xs text-rose-400 font-medium"
                      style={{ background: 'rgba(239,68,68,0.03)' }}>
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <div>
                        <span>Your participation in this event has been deactivated. You cannot access rounds, results, or participant list. </span>
                        <strong className="block mt-1 font-black uppercase tracking-wider text-[10px]">Please ask the Event Coordinator for details.</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="neu-card p-16 rounded-2xl flex flex-col items-center text-center">
          <div className="neu-icon-btn w-16 h-16 flex items-center justify-center mb-6">
            <Calendar className="w-7 h-7 text-gray-600" />
          </div>
          <h3 className="text-xl font-black text-white mb-2 tracking-tight">No Active Events</h3>
          <p className="text-gray-600 max-w-sm mb-8 text-sm leading-relaxed">
            {registrations.filter(r => r.status === 'approved' && !r.is_active).length > 0
              ? 'Your registrations are pending coordinator activation. Check back soon!'
              : `You haven't registered for any events yet. Don't miss out on ${BRAND_NAME}!`
            }
          </p>
          <button
            onClick={() => navigate('/events')}
            className="px-8 py-3 rounded-xl font-black text-sm uppercase tracking-widest text-white transition-all flex items-center gap-2"
            style={{ background: 'linear-gradient(135deg, #6366f1, #7c3aed)', boxShadow: '0 8px 24px rgba(99,102,241,0.4)' }}
          >
            Explore Events <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Profile modal */}
      <AnimatePresence>
        {selectedProfile && (
          <ProfileModal
            profile={{
              id: selectedProfile.user_id,
              full_name: selectedProfile.full_name,
              avatar_url: selectedProfile.avatar_url,
              aura_color: selectedProfile.aura_color,
              background_url: null,
              batch: selectedProfile.batch,
              tier: 'bronze',
              xp: 0,
              likes_count: 0,
              hype_score: 0,
              rank: 0,
            }}
            onClose={() => setSelectedProfile(null)}
            onLike={() => {}}
            isLiked={false}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ActiveEvents;
