import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOutletContext, useNavigate } from 'react-router-dom';
import {
  Calendar, ChevronDown, ChevronUp, Trophy, Users, CheckCircle, XCircle,
  Clock, ArrowRight, Star, Medal, Award, User, AlertCircle, IndianRupee, X, Loader2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { PaymentStep } from '../../components/PaymentStep';
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
  const [payments, setPayments] = useState<Record<string, any>>({});
  const [paymentTarget, setPaymentTarget] = useState<any | null>(null);
  const [fetchingPaymentDetails, setFetchingPaymentDetails] = useState<string | null>(null);
  const [globalRanks, setGlobalRanks] = useState<Record<string, { rank: number; tier: string; xp: number; likes: number; score: number }>>({});

  // Fetch global ranks list
  useEffect(() => {
    const fetchRanks = async () => {
      try {
        const { data: allProfiles } = await supabase
          .from('profiles')
          .select('id, username, likes_count, student_xp(tier, xp_total)')
          .eq('is_approved', true);

        const [regsResponse, roundsResponse, eventRoundsResponse] = await Promise.all([
          supabase.from('registrations').select('id, user_id, status, is_active, event_id, event:events(id, title)'),
          supabase.from('registration_rounds').select('id, registration_id, status, round_id, prize_rank'),
          supabase.from('event_rounds').select('id, name')
        ]);

        const regsList = regsResponse.data || [];
        const roundsList = roundsResponse.data || [];
        const eventRounds = eventRoundsResponse.data || [];

        const roundNameMap: Record<string, string> = {};
        eventRounds.forEach(er => {
          roundNameMap[er.id] = er.name;
        });

        // Count approved registrations per event to dynamically find the top 2 Major Events
        const eventCounts: Record<string, number> = {};
        regsList.forEach(r => {
          if (r.status === 'approved' && r.event_id) {
            eventCounts[r.event_id] = (eventCounts[r.event_id] || 0) + 1;
          }
        });

        const computedMajorEventIds = Object.entries(eventCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 2)
          .map(entry => entry[0]);

        // Map rounds by registration_id (O(N))
        const roundsByRegMap: Record<string, any[]> = {};
        roundsList.forEach(rd => {
          if (!roundsByRegMap[rd.registration_id]) {
            roundsByRegMap[rd.registration_id] = [];
          }
          roundsByRegMap[rd.registration_id].push(rd);
        });

        // Map registrations by user_id (O(N))
        const userRegsMap: Record<string, any[]> = {};
        regsList.forEach(r => {
          if (!userRegsMap[r.user_id]) {
            userRegsMap[r.user_id] = [];
          }
          const rRounds = roundsByRegMap[r.id] || [];
          userRegsMap[r.user_id].push({
            ...r,
            registration_rounds: rRounds
          });
        });

        if (allProfiles) {
          const sorted = allProfiles.map((p: any) => {
            const xpRecord = Array.isArray(p.student_xp) ? p.student_xp[0] : p.student_xp;
            const xp = xpRecord?.xp_total || 0;
            const likes = p.likes_count || 0;
            const pRegs = userRegsMap[p.id] || [];
            
            let likesPoints = likes * 10;
            let participationPoints = 0;
            let roundsPoints = 0;
            let finalRoundPoints = 0;
            let prizePoints = 0;
            let approvedEventsCount = 0;

            pRegs.forEach((r: any) => {
              const isMajor = computedMajorEventIds.includes(r.event_id || '');
              
              if (r.status === 'approved') {
                approvedEventsCount++;
                participationPoints += isMajor ? 30 : 15;
              }
              
              const rr = r.registration_rounds || [];
              rr.forEach((roundObj: any) => {
                if (roundObj.status === 'qualified') {
                  roundsCleared++;
                  roundsPoints += isMajor ? 40 : 20;
                  
                  const roundName = roundNameMap[roundObj.round_id] || '';
                  const isFinalRound = roundName.toLowerCase().includes('final');
                  if (isFinalRound) {
                    finalRoundPoints += isMajor ? 60 : 30;
                  }
                  
                  if (roundObj.prize_rank === '1st') {
                    prizePoints += isMajor ? 100 : 50;
                  } else if (roundObj.prize_rank === '2nd') {
                    prizePoints += isMajor ? 60 : 30;
                  } else if (roundObj.prize_rank === '3rd') {
                    prizePoints += isMajor ? 40 : 20;
                  }
                }
              });
            });

            const totalScore = likesPoints + participationPoints + roundsPoints + finalRoundPoints + prizePoints;

            const participatedEvents = Array.from(new Set(
              pRegs
                .filter((r: any) => r.status === 'approved' && r.event)
                .map((r: any) => r.event.title)
            )) as string[];

            return {
              id: p.id,
              username: p.username,
              tier: xpRecord?.tier || 'bronze',
              xp: xp,
              likes: likes,
              score: totalScore,
              rounds_cleared: roundsCleared,
              participated_events: participatedEvents,
              points_breakdown: {
                likes: likesPoints,
                participation: participationPoints,
                rounds: roundsPoints,
                finalRound: finalRoundPoints,
                prizes: prizePoints,
                events_count: approvedEventsCount
              }
            };
          }).sort((a, b) => b.score - a.score);

          const ranksMap: Record<string, any> = {};
          sorted.forEach((p, index) => {
            ranksMap[p.id] = {
              rank: index + 1,
              username: p.username,
              tier: p.tier,
              xp: p.xp,
              likes: p.likes,
              score: p.score,
              rounds_cleared: p.rounds_cleared,
              participated_events: p.participated_events,
              points_breakdown: p.points_breakdown
            };
          });
          setGlobalRanks(ranksMap);
        }
      } catch (err) {
        console.error('Error fetching global ranks:', err);
      }
    };
    fetchRanks();
  }, [registrations]);

  const handlePayNow = async (reg: any) => {
    setFetchingPaymentDetails(reg.id);
    try {
      const { data: eventData, error } = await supabase
        .from('events')
        .select('id, title, payment_enabled, payment_amount, coordinator_upi_id, coordinator_upi_name')
        .eq('id', reg.event_id)
        .single();
      
      if (!error && eventData) {
        reg.event = {
          ...reg.event,
          ...eventData
        };
      }
    } catch (err) {
      console.error('Failed to fetch latest event payment details:', err);
    } finally {
      setFetchingPaymentDetails(null);
      setPaymentTarget(reg);
    }
  };

  // Fetch payment submissions for student registrations
  useEffect(() => {
    if (!user) return;
    const fetchPayments = async () => {
      const { data } = await supabase
        .from('payment_submissions')
        .select('*')
        .eq('user_id', user.id);
      if (data) {
        const map: Record<string, any> = {};
        data.forEach(p => {
          map[p.registration_id] = p;
        });
        setPayments(map);
      }
    };
    fetchPayments();
  }, [user, registrations]);

  const handleCancelRegistration = async (regId: string) => {
    const confirmCancel = window.confirm("Are you sure you want to cancel this registration?");
    if (!confirmCancel) return;

    try {
      const { error } = await supabase.rpc('cancel_registration', { p_reg_id: regId });
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

      // Mock/append fake students up to 50 for testing scrollable layout if coList has less than 50
      if (coList.length < 50) {
        const batchOptions = ['CSE 2026', 'ECE 2025', 'ME 2027', 'BBA 2026', 'MBA 2025'];
        const firstNames = ['Amit', 'Rahul', 'Priya', 'Neha', 'Vikram', 'Rohan', 'Sneha', 'Ananya', 'Aarav', 'Kabir', 'Aditya', 'Ishaan', 'Diya', 'Karan', 'Sanya', 'Arjun', 'Simran', 'Rhea', 'Aryan', 'Varun'];
        const lastNames = ['Sharma', 'Verma', 'Kumar', 'Singh', 'Gupta', 'Patel', 'Joshi', 'Mehta', 'Reddy', 'Rao', 'Das', 'Sen', 'Nair', 'Choudhury', 'Mishra', 'Saxena', 'Kapoor'];
        
        const needed = 50 - coList.length;
        for (let i = 0; i < needed; i++) {
          const fName = firstNames[(i + 3) % firstNames.length];
          const lName = lastNames[(i + 7) % lastNames.length];
          const mockId = `mock-student-${i}`;
          coList.push({
            id: mockId,
            full_name: `${fName} ${lName}`,
            batch: batchOptions[(i + 2) % batchOptions.length],
            avatar_url: undefined,
            aura_color: null,
            user_id: mockId,
            registration_id: mockId,
          });
        }
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
            {registrations.filter(r => r.status !== 'rejected' && !r.is_active).map((reg) => {
              const isPayment = reg.status === 'payment_pending';
              const pDetails = payments[reg.id];
              return (
                <div key={reg.id} className={`neu-card p-4 rounded-2xl border flex items-center justify-between gap-4 ${
                  isPayment ? 'border-orange-500/30 bg-orange-500/[0.02]' : 'border-amber-500/20 bg-amber-500/[0.02]'
                }`}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider">
                      {isPayment ? (
                        <>
                          <IndianRupee size={10} className="text-orange-400 animate-pulse" />
                          <span className="text-orange-400">
                            {pDetails ? 'Verifying Payment' : 'Payment Required'}
                          </span>
                        </>
                      ) : (
                        <>
                          <Clock size={10} className="text-amber-400 animate-pulse" />
                          <span className="text-amber-400">Pending Approval</span>
                        </>
                      )}
                    </div>
                    <h3 className="text-sm font-black text-white truncate mt-1">{reg.event?.title || reg.event_title}</h3>
                    {reg.is_team_registration && reg.team_name && (
                      <p className="text-[9px] text-gray-500 font-bold mt-0.5">Team: {reg.team_name}</p>
                    )}
                    <p className="text-[9px] text-amber-400/80 font-bold mt-1.5 flex items-center gap-1.5">
                      <Clock size={10} className="animate-pulse" />
                      {isPayment
                        ? 'Approval will be processed within 24 hours after payment.'
                        : 'Approval will be processed within 24 hours.'}
                    </p>
                    {isPayment && pDetails && (
                      <div className="mt-1 text-[9px] text-gray-400 font-mono">
                        UTR: <span className="text-white font-bold">{pDetails.utr_number}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isPayment && !pDetails && (
                      <button
                        disabled={fetchingPaymentDetails === reg.id}
                        onClick={() => handlePayNow(reg)}
                        className="px-3 py-1.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-[10px] font-black uppercase tracking-wider text-white rounded-xl transition-all cursor-pointer font-bold flex items-center gap-1.5"
                      >
                        {fetchingPaymentDetails === reg.id ? (
                          <Loader2 size={10} className="animate-spin" />
                        ) : null}
                        <span>Pay Now</span>
                      </button>
                    )}
                    <button
                      onClick={() => handleCancelRegistration(reg.id)}
                      className="px-3 py-1.5 border border-rose-500/25 hover:bg-rose-500/10 text-[10px] font-black uppercase tracking-wider text-rose-400 rounded-xl transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              );
            })}
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
            
            // Auto pad up to 50 fake students for visual testing of the scrollable grid
            const rawParticipants = coParticipants[reg.id] || [];
            const participants = [...rawParticipants];
            if (participants.length < 50) {
              const batchOptions = ['CSE 2026', 'ECE 2025', 'ME 2027', 'BBA 2026', 'MBA 2025'];
              const firstNames = ['Amit', 'Rahul', 'Priya', 'Neha', 'Vikram', 'Rohan', 'Sneha', 'Ananya', 'Aarav', 'Kabir', 'Aditya', 'Ishaan', 'Diya', 'Karan', 'Sanya', 'Arjun', 'Simran', 'Rhea', 'Aryan', 'Varun'];
              const lastNames = ['Sharma', 'Verma', 'Kumar', 'Singh', 'Gupta', 'Patel', 'Joshi', 'Mehta', 'Reddy', 'Rao', 'Das', 'Sen', 'Nair', 'Choudhury', 'Mishra', 'Saxena', 'Kapoor'];
              const needed = 50 - participants.length;
              for (let i = 0; i < needed; i++) {
                const fName = firstNames[(i + 3) % firstNames.length];
                const lName = lastNames[(i + 7) % lastNames.length];
                const mockId = `mock-student-${i}`;
                participants.push({
                  id: mockId,
                  full_name: `${fName} ${lName}`,
                  batch: batchOptions[(i + 2) % batchOptions.length],
                  avatar_url: undefined,
                  aura_color: null,
                  user_id: mockId,
                  registration_id: mockId,
                });
              }
            }

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
                <div className="neu-card rounded-2xl overflow-hidden border border-white/[0.04] bg-white/[0.01]">
                  {/* Winner celebration banner */}
                  {winner && winner.prize_rank && (
                    <div
                      className="px-4 py-2 sm:px-6 sm:py-3 flex items-center gap-3 text-xs sm:text-sm font-black"
                      style={{ background: RANK_COLORS[winner.prize_rank]?.bg, color: RANK_COLORS[winner.prize_rank]?.text }}
                    >
                      <Trophy className="w-3.5 h-3.5" />
                      You won {RANK_COLORS[winner.prize_rank]?.label} in {eventTitle}!
                      {winner.feedback && <span className="font-normal text-[10px] opacity-70 ml-2 hidden sm:inline">"{winner.feedback}"</span>}
                    </div>
                  )}

                  {/* Card Main Row (Compact Horizontal Flex) */}
                  <div className="p-3 sm:p-5 flex items-center gap-3 sm:gap-5">
                    {/* Left: Thumbnail Image */}
                    {eventImage && (
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border border-white/10 shrink-0 bg-[#0e1117]">
                        <img src={eventImage} alt={eventTitle} className="w-full h-full object-cover" />
                      </div>
                    )}

                    {/* Middle: Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm sm:text-lg font-black text-white tracking-tight leading-tight truncate">{eventTitle}</h3>
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black text-green-400 bg-green-500/10 border border-green-500/20 uppercase tracking-widest shrink-0">
                          <CheckCircle className="w-3 h-3" /> Approved
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        {reg.event?.category && (
                          <span className="text-indigo-400 font-black uppercase tracking-widest text-[9px] sm:text-[10px]">
                            {typeof reg.event.category === 'object' ? reg.event.category.name : reg.event.category}
                          </span>
                        )}
                        {reg.team_name && (
                          <span className="text-gray-500 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest">
                            Team: <span className="text-gray-400">{reg.team_name}</span>
                          </span>
                        )}
                        {eventRounds.length > 0 && (
                          <span className="text-violet-400 font-black text-[9px] sm:text-[10px] uppercase tracking-widest">
                            {eventRounds.length} Round{eventRounds.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>

                      {latestQual && (
                        <div className={`mt-2 px-2.5 py-1 rounded-lg border text-[8px] sm:text-[9px] font-black uppercase tracking-wider flex items-center gap-1 w-fit ${latestQual.color}`}>
                          <Trophy className="w-3 h-3 text-indigo-400 shrink-0" />
                          <span>{latestQual.text}</span>
                        </div>
                      )}
                    </div>

                    {/* Right: Expand Toggle Button */}
                    <button
                      onClick={() => toggleExpand(reg)}
                      className="neu-icon-btn w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-gray-400 hover:text-white transition-colors shrink-0 rounded-lg bg-white/5 border border-white/5"
                    >
                      {isLoading
                        ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} className="w-3.5 h-3.5 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full" />
                        : isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                      }
                    </button>
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
                              <div 
                                data-lenis-prevent
                                className="space-y-2 max-h-60 overflow-y-auto pr-1.5 overscroll-contain visible-scrollbar"
                              >
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
                              <div 
                                data-lenis-prevent
                                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-80 overflow-y-auto pr-2 overscroll-contain visible-scrollbar"
                              >
                                {/* Self card */}
                                <div className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl border border-indigo-500/20"
                                  style={{ background: 'rgba(99,102,241,0.08)' }}>
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-[10px] font-black text-indigo-300 flex-shrink-0">
                                      You
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-xs font-black text-white truncate">You</p>
                                    </div>
                                  </div>
                                  {user && (() => {
                                    const myRInfo = globalRanks[user.id] || { rank: 5, tier: 'PLATINUM', xp: 1200, likes: 8, score: 3200 };
                                    const isTop5 = myRInfo.rank <= 5;
                                    return (
                                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full shrink-0 border ${
                                        isTop5 
                                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.15)]' 
                                          : 'bg-white/5 border-white/10 text-gray-400'
                                      }`}>
                                        #{myRInfo.rank}
                                      </span>
                                    );
                                  })()}
                                </div>

                                {participants.map(p => {
                                  // Deterministic fallback rank for mock/demo students so badges are visible
                                  let rInfo = globalRanks[p.user_id];
                                  if (!rInfo) {
                                    const nameVal = p.full_name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                                    const mockRank = (nameVal % 45) + 6; // Rank between 6 and 50
                                    rInfo = {
                                      rank: mockRank,
                                      tier: 'BRONZE',
                                      xp: mockRank * 12,
                                      likes: mockRank % 4,
                                      score: mockRank * 150
                                    };
                                  }
                                  const isTop5 = rInfo.rank <= 5;
                                  return (
                                    <button
                                      key={p.registration_id}
                                      onClick={() => p.user_id ? setSelectedProfile({ ...p, ...rInfo }) : null}
                                      disabled={!p.user_id}
                                      className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl border border-white/[0.06] hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all text-left group"
                                      style={{ background: 'rgba(255,255,255,0.03)' }}
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
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
                                          {p.batch && <p className="text-[9px] text-gray-500 truncate">{p.batch}</p>}
                                        </div>
                                      </div>

                                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full shrink-0 border ${
                                        isTop5 
                                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' 
                                          : 'bg-white/5 border-white/10 text-gray-400'
                                      }`}>
                                        #{rInfo.rank}
                                      </span>
                                    </button>
                                  );
                                })}
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
                  <div className="px-4 py-2 sm:px-6 sm:py-3 flex items-center gap-3 text-xs font-black bg-rose-500/10 border-b border-rose-500/20 text-rose-400">
                    <XCircle className="w-3.5 h-3.5 flex-shrink-0 animate-pulse" />
                    Deactivated / Kicked Out
                  </div>

                  {/* Card Main Row (Compact Horizontal Flex) */}
                  <div className="p-3 sm:p-5 flex items-center gap-3 sm:gap-5">
                    {/* Left: Thumbnail Image */}
                    {eventImage && (
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border border-rose-500/10 shrink-0 bg-[#0e1117] grayscale opacity-40">
                        <img src={eventImage} alt={eventTitle} className="w-full h-full object-cover" />
                      </div>
                    )}

                    {/* Middle: Info */}
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm sm:text-lg font-black text-gray-400 tracking-tight leading-tight line-through truncate">{eventTitle}</h3>
                      
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        {reg.event?.category && (
                          <span className="text-gray-500 font-bold uppercase tracking-widest text-[9px] sm:text-[10px]">
                            {typeof reg.event.category === 'object' ? reg.event.category.name : reg.event.category}
                          </span>
                        )}
                        {reg.is_team_registration && reg.team_name && (
                          <span className="text-gray-600 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest">
                            Team: <span className="text-gray-500">{reg.team_name}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Locked notice message details */}
                  <div className="px-3 pb-4 sm:px-5 sm:pb-5">
                    <div className="p-3 rounded-xl border border-rose-500/10 flex items-start gap-2.5 text-xs text-rose-400 font-medium"
                      style={{ background: 'rgba(239,68,68,0.03)' }}>
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <div>
                        <span>Your participation in this event has been deactivated. You cannot access rounds, results, or participant list. </span>
                        {reg.rejection_reason ? (
                          <div className="mt-2 p-2 bg-rose-500/10 border border-rose-500/20 text-rose-300 font-semibold rounded-lg">
                            Reason: "{reg.rejection_reason}"
                          </div>
                        ) : (
                          <strong className="block mt-1 font-black uppercase tracking-wider text-[10px]">Please ask the Event Coordinator for details.</strong>
                        )}
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
              tier: selectedProfile.tier || 'bronze',
              xp: selectedProfile.xp || 0,
              likes_count: selectedProfile.likes || 0,
              hype_score: selectedProfile.score || 0,
              rank: selectedProfile.rank || 0,
            }}
            onClose={() => setSelectedProfile(null)}
            onLike={() => {}}
            isLiked={false}
          />
        )}
      </AnimatePresence>

      {/* Payment Submission Modal */}
      <AnimatePresence>
        {paymentTarget && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPaymentTarget(null)}
              className="fixed inset-0 z-[500] bg-black/80 backdrop-blur-md"
            />
            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-x-4 top-[10%] bottom-[10%] md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 z-[501] w-full max-w-lg bg-[#0d0d0f]/95 border border-[#a855f7]/30 rounded-[2rem] shadow-[0_0_50px_rgba(168,85,247,0.15)] flex flex-col overflow-hidden max-h-[80vh]"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <IndianRupee className="w-5 h-5 text-orange-400" />
                  <h3 className="text-lg font-black text-white">Payment Submission</h3>
                </div>
                <button
                  onClick={() => setPaymentTarget(null)}
                  className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all cursor-pointer"
                >
                  <X size={16} className="text-gray-400" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <PaymentStep
                  eventId={paymentTarget.event_id}
                  eventTitle={paymentTarget.event?.title || paymentTarget.event_title}
                  registrationId={paymentTarget.id}
                  upiId={paymentTarget.event?.coordinator_upi_id || ''}
                  upiName={paymentTarget.event?.coordinator_upi_name || 'Event Coordinator'}
                  amount={paymentTarget.event?.payment_amount || 0}
                  userId={user?.id}
                  onSuccess={async () => {
                    toast.success("Payment details submitted successfully! Verification pending.");
                    setPaymentTarget(null);
                    if (fetchUserRegistrations) await fetchUserRegistrations();
                  }}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      <style dangerouslySetInnerHTML={{ __html: `
        .visible-scrollbar {
          -webkit-overflow-scrolling: touch !important;
          overscroll-behavior-y: contain !important;
        }
        .visible-scrollbar::-webkit-scrollbar {
          width: 5px !important;
          height: 5px !important;
          display: block !important;
        }
        .visible-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02) !important;
          border-radius: 4px !important;
        }
        .visible-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(99, 102, 241, 0.35) !important;
          border-radius: 4px !important;
        }
        .visible-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(99, 102, 241, 0.55) !important;
        }
      `}} />
    </motion.div>
  );
};

export default ActiveEvents;
