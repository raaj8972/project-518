import { canRegisterNow } from '../utils/eventUtils';
import { useScheduleClashCheck } from '../hooks/useScheduleClashCheck';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useFestivalDialog } from '../hooks/useFestivalDialog';
import { useDomainRealtime } from '../hooks/useDomainRealtime';
import '../styles/EventCart.css';
import { X, ShoppingCart, Trash2, CheckCircle, Loader2, Calendar, Users, User, Sparkles, AlertCircle, IndianRupee } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { useEventCart, type CartEvent } from '../context/EventCartContext';
import { useStudentAuth } from '../context/StudentAuthContext';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { groupParticipantIds } from '../utils/cartParticipants';

interface CartGroup {
  id: string; name: string; owner_id: string;
  members: Array<{ user_id: string; status: string }>;
}
function teamProblem(event: CartEvent, group?: CartGroup) {
  if (!event.isTeam) return null;
  if (!group) return `Choose a team for ${event.title}.`;
  const count = groupParticipantIds(group).length;
  const min = event.min_team || 1, max = event.max_team || 1;
  return count < min || count > max ? `${event.title} needs ${min === max ? min : `${min}–${max}`} accepted participants; this team has ${count}.` : null;
}

interface CartDrawerProps {
  onRegisterSuccess?: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ onRegisterSuccess }) => {
  const navigate = useNavigate();
  const clashCheck = useScheduleClashCheck();
  const { cartItems, addToCart, removeFromCart, clearCart, isDrawerOpen, closeDrawer, cartCount } = useEventCart();
  const { user, profile, isProfileComplete } = useStudentAuth();
  const [registering, setRegistering] = useState(false);
  const registerLock = useRef(false);
  const [done, setDone] = useState<string[]>([]);

  // Group events state
  const [myGroups, setMyGroups] = useState<CartGroup[]>([]);
  const [groupsError, setGroupsError] = useState(false);
  const [groupsFor, setGroupsFor] = useState<string>();
  const groupRequest = useRef(0);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState<Record<string, string>>({}); // event.id -> group.id
  
  // Payment step states
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'payment'>('cart');
  const [utrs, setUtrs] = useState<Record<string, string>>({}); // event.id -> UTR number
  const [localEventOverrides, setLocalEventOverrides] = useState<Record<string, any>>({});
  const paymentReviewed = useRef<Record<string, any>>({});

  // Reset steps on close
  useEffect(() => {
    if (!isDrawerOpen) {
      clashCheck.reset();
      setCheckoutStep('cart');
      setUtrs({});
      setLocalEventOverrides({});
      paymentReviewed.current = {};
    }
  }, [isDrawerOpen]);

  // Load latest event details for paid events when step becomes 'payment'
  useEffect(() => {
    if (checkoutStep !== 'payment') return;
    
    const refreshCartEvents = async () => {
      const paidIds = cartItems.map(e => ({ ...e, ...localEventOverrides[e.id] })).filter(e => e.payment_enabled && e.coordinator_upi_id).map(e => e.id.toString());
      if (paidIds.length === 0) return;
      
      try {
        const { data, error } = await supabase
          .from('events')
          .select('id, title, payment_enabled, payment_amount, coordinator_upi_id, coordinator_upi_name')
          .in('id', paidIds);
        
        if (!error && data) {
          setLocalEventOverrides(previous => {
            const next = { ...previous };
            data.forEach(item => { next[item.id] = { ...previous[item.id], ...item }; });
            return next;
          });
        }
      } catch (err) {
        console.error('Failed to refresh cart events:', err);
      }
    };

    refreshCartEvents();
  }, [checkoutStep, cartItems]);

  const fetchMyGroups = useCallback(async (): Promise<CartGroup[] | null> => {
    if (!user) return null;
    const request = ++groupRequest.current;
    setLoadingGroups(true); setGroupsError(false);
    try {
      const [owned, memberOf] = await Promise.all([
        supabase.from('student_groups').select('id, name, owner_id').eq('owner_id', user.id),
        supabase.from('student_group_members').select('student_groups(id, name, owner_id)').eq('user_id', user.id).eq('status', 'accepted'),
      ]);
      if (owned.error || memberOf.error) throw owned.error || memberOf.error;
      const joined = (memberOf.data || []).map((row: any) => row.student_groups).filter(Boolean);
      const unique = [...new Map([...(owned.data || []), ...joined].map(group => [group.id, group])).values()];
      const groups = await Promise.all(unique.map(async group => {
        const members = await supabase.from('student_group_members').select('id, user_id, status').eq('group_id', group.id);
        if (members.error) throw members.error;
        return { ...group, members: members.data || [] } as CartGroup;
      }));
      if (request !== groupRequest.current) return null;
      setMyGroups(groups); setGroupsFor(user.id);
      return groups;
    } catch {
      if (request === groupRequest.current) { setMyGroups([]); setGroupsFor(undefined); setGroupsError(true); }
      return null;
    } finally { if (request === groupRequest.current) setLoadingGroups(false); }
  }, [user?.id]);

  useEffect(() => {
    if (isDrawerOpen) void fetchMyGroups();
    return () => { groupRequest.current += 1; };
  }, [isDrawerOpen, fetchMyGroups]);

  useEffect(() => {
    if (groupsFor !== user?.id) return;
    setSelectedGroups(previous => {
      const next = { ...previous };
      cartItems.forEach(item => {
        const event = { ...item, ...localEventOverrides[item.id] };
        if(event.isTeam && event.team_id && myGroups.some(group=>group.id===event.team_id))next[event.id]=event.team_id;
        if (event.isTeam && !myGroups.some(group => group.id === next[event.id])) {
          next[event.id] = (myGroups.find(group => !teamProblem(event, group)) || myGroups[0])?.id || '';
        }
      });
      return next;
    });
  }, [cartItems, myGroups, groupsFor, user?.id, localEventOverrides]);

  const checkoutItems = cartItems.map(item => ({ ...item, ...localEventOverrides[item.id] }));
  const teamItems = checkoutItems.filter(event => event.isTeam && !done.includes(event.id));
  const groupsReady = groupsFor === user?.id && !loadingGroups && !groupsError;
  const teamIssues = teamItems.map(event => teamProblem(event, myGroups.find(group => group.id === selectedGroups[event.id]))).filter(Boolean);
  const teamBlocked = teamItems.length > 0 && (!groupsReady || teamIssues.length > 0);
  useDomainRealtime('cart-team-readiness', isDrawerOpen && !!user && teamItems.length > 0, ['student_groups', 'student_group_members'], fetchMyGroups);
  const pendingCount = cartItems.filter(event => !done.includes(event.id)).length;
  const allDone = cartItems.length > 0 && pendingCount === 0;
  const hasPayment = checkoutItems.some(event => event.payment_enabled && Number(event.payment_amount) > 0);
  const dialogRef = useFestivalDialog(isDrawerOpen, () => { if (!registering) closeDrawer(); });
  const openTeams = (create = false) => {
    closeDrawer();
    navigate(`/dashboard/teams?from=cart${create ? '&create=1' : ''}`);
  };

  const handleRegisterAll = async () => {
    if (registerLock.current) return;
    if (!user || !profile?.is_approved) { toast.error('Your profile must be approved before registering.'); return; }
    if (!isProfileComplete) { setCheckoutError('Complete your student profile and college IQMG number before registering.'); return; }
    if (!cartItems.length) return;
    registerLock.current = true;
    setCheckoutError(null);
    setRegistering(true);
    const registered: string[] = [];
    const failed: string[] = [];
    const failedMessages: string[] = [];
    try {
      // Always read current pricing, availability and limits, including old persisted carts.
      const { data: events, error } = await supabase.from('events')
        .select('id, title, date, time, venue, payment_enabled, payment_amount, coordinator_upi_id, coordinator_upi_name, registration_default_mode, team_min_members, team_max_members, registration_open, registration_mode_locked, visible, registration_timer_enabled, registration_opens_at, registration_closes_at')
        .in('id', cartItems.map(e => e.id));
      if (error) throw error;
      const overrides: Record<string, any> = {};
      const checkoutItems = cartItems.map(item => {
        const current = events?.find(e => String(e.id) === item.id);
        if (!current) throw new Error(`${item.title} is no longer available.`);
        if (!canRegisterNow(current) || current.visible === false) throw new Error(`Registration is closed for ${current.title}.`);
        const event = { ...item, ...current, id: String(current.id),
          isTeam: current.registration_mode_locked ? current.registration_default_mode === 'team' : item.isTeam ?? current.registration_default_mode === 'team',
          min_team: current.team_min_members || 1, max_team: current.team_max_members || 1 };
        overrides[item.id] = event;
        return event;
      });
      setLocalEventOverrides(overrides);
      const freshGroups = checkoutItems.some(event => event.isTeam) ? await fetchMyGroups() : [];
      if (!freshGroups) throw new Error('Your teams could not be checked. Please retry before continuing.');
      for (const event of checkoutItems) {
        const issue = teamProblem(event, freshGroups.find(group => group.id === selectedGroups[event.id]));
        if (issue) { setCheckoutStep('cart'); throw new Error(issue); }
      }
      if (!await clashCheck.check(checkoutItems)) return;
      const paidItems = checkoutItems.filter(e => e.payment_enabled && Number(e.payment_amount) > 0);
      if (checkoutStep === 'payment') {
        const changed = checkoutItems.find(event => {
          const previous = paymentReviewed.current[event.id];
          if (!previous) return true;
          const wasPaid = previous.payment_enabled === true && Number(previous.payment_amount) > 0;
          const isPaid = event.payment_enabled === true && Number(event.payment_amount) > 0;
          return wasPaid !== isPaid || (isPaid && (Number(previous.payment_amount) !== Number(event.payment_amount) || previous.coordinator_upi_id !== event.coordinator_upi_id));
        });
        if (changed) {
          setUtrs({}); setCheckoutStep('cart');
          throw new Error(`Payment details for ${changed.title} changed. If you already paid, contact the event coordinator before paying again.`);
        }
      }
      if (paidItems.some(e => !e.coordinator_upi_id)) throw new Error('Payment details are missing. Please contact the coordinator.');
      if (paidItems.length && checkoutStep === 'cart') { paymentReviewed.current = overrides; setCheckoutStep('payment'); return; }
      for (const event of paidItems) {
        if (!/^[a-zA-Z0-9-]{6,64}$/.test(utrs[event.id]?.trim() || '')) throw new Error(`Enter a valid transaction reference for ${event.title}.`);
      }
      for (const event of checkoutItems) {
        try {
          let ids = [user.id];
          let teamName: string | null = null;
          if (event.isTeam) {
            const group = freshGroups.find(g => g.id === selectedGroups[event.id]);
            if (!group) throw new Error('Select a group for this team event.');
            ids = groupParticipantIds(group);
            teamName = group.name;
            if (ids.length < event.min_team || ids.length > event.max_team) throw new Error(`Group must have ${event.min_team}–${event.max_team} accepted participants.`);
          }
          const { data: profiles, error: profilesError } = await supabase.from('profiles')
            .select('id, full_name, phone, college, batch').in('id', ids);
          if (profilesError) throw profilesError;
          if (profiles?.length !== ids.length) throw new Error('Could not load all group members. Refresh your groups and try again.');
          const details = ids.map(id => {
            const p = profiles!.find(p => p.id === id)!;
            return { ...p, email: id === user.id ? user.email : '' };
          });
          const { error: checkoutError } = await supabase.rpc('checkout_student_event', {
            p_event_id: event.id, p_user_ids: ids, p_team_name: teamName,
            p_participant_details: details,
            p_utr: paidItems.some(e => e.id === event.id) ? utrs[event.id].trim().toUpperCase() : null,
            p_expected_payment: {enabled: event.payment_enabled === true && Number(event.payment_amount) > 0, amount: Number(event.payment_amount) || 0, upi: event.coordinator_upi_id || null}
          });
          if (checkoutError) throw checkoutError;
          registered.push(event.id);
        } catch (error: any) {
          failed.push(event.id);
          failedMessages.push(`${event.title}: ${error.message || 'Registration failed'}`);
          toast.error(`[${event.title}] ${error.message || 'Registration failed'}`);
        }
      }
      setDone(registered);
      if (failedMessages.length) { setCheckoutError(failedMessages.join(' ')); setCheckoutStep('cart'); }
      if (registered.length) {
        registered.forEach(id => removeFromCart(id));
        onRegisterSuccess?.();
        toast.success(`Registered for ${registered.length} event${registered.length === 1 ? '' : 's'}.`);
      }
      if (!failed.length) { clearCart(); closeDrawer(); setDone([]); }
    } catch (error: any) {
      const message = error.message || 'Unable to check registration details. Please retry.';
      if (checkoutStep === 'payment') setCheckoutStep('cart');
      setCheckoutError(message); toast.error(message);
    } finally { registerLock.current = false; setRegistering(false); }
  };

  return createPortal(
    <AnimatePresence>
      {isDrawerOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="event-cart-backdrop fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => { if (!registering) closeDrawer(); }}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="event-cart-title" tabIndex={-1}
            className="event-cart-drawer fixed right-0 top-0 bottom-0 w-full sm:max-w-md bg-[#0d0d0f] border-l border-white/10 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                  <ShoppingCart size={16} className="text-indigo-400" />
                </div>
                <div>
                  <h2 id="event-cart-title" className="text-white font-black text-sm">My event cart</h2>
                  <p className="text-gray-500 text-[10px]">{cartCount} event{cartCount !== 1 ? 's' : ''} selected</p>
                </div>
              </div>
              <button aria-label="Close event cart" disabled={registering} onClick={closeDrawer} className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all">
                <X size={14} className="text-gray-400" />
              </button>
            </div>

            {!isProfileComplete && user && <div className="event-cart-error" role="alert">Complete your profile and college IQMG number before registering. <button className="event-cart-team-action" onClick={() => { closeDrawer(); navigate('/dashboard'); }}>Open profile setup</button></div>}
            {/* Profile Preview */}
            {profile && (
              <div className="mx-4 mt-4 p-3 rounded-2xl bg-indigo-500/[0.05] border border-indigo-500/15">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles size={11} className="text-indigo-400" />
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-wider">Auto-filling from your profile</p>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center overflow-hidden shrink-0">
                    {(profile as any)?.avatar_url
                      ? <img src={(profile as any).avatar_url} alt="" className="w-full h-full object-cover" />
                      : <User size={14} className="text-indigo-400" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-white truncate">{profile.full_name}</p>
                    <p className="text-[10px] text-gray-500 truncate">{user?.email} · {(profile as any)?.phone}</p>
                  </div>
                </div>
              </div>
            )}

            {clashCheck.notice}
            {checkoutError && <div className="event-cart-error" role="alert"><p>{checkoutError}</p><button className="event-cart-team-action" onClick={() => { closeDrawer(); navigate(`/dashboard/messages?type=event${cartItems.length === 1 ? `&event=${encodeURIComponent(cartItems[0].id)}` : ''}`); }}>Get help with this event</button></div>}
            {/* Events List / Payment view */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 custom-scrollbar">
              {checkoutStep === 'payment' ? (
                <div className="space-y-6">
                  <div className="space-y-3">
                    <div>
                      <h3 className="text-sm font-black text-white flex items-center gap-1.5 text-orange-400">
                        <IndianRupee size={15} /> Payment Required
                      </h3>
                      <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">
                        Please transfer the exact amount via UPI to each coordinator, then enter the UTR Number below to complete your registration.
                      </p>
                    </div>
                    <div className="p-3 rounded-xl border border-yellow-500/20 bg-yellow-500/5 text-[9px] text-yellow-300 font-medium space-y-1">
                      <p className="font-bold flex items-center gap-1">
                        <AlertCircle size={10} className="text-yellow-400" /> IMPORTANT NOTICE
                      </p>
                      <p className="leading-relaxed">
                        Please submit the correct UTR number. Submitting incorrect/fake UTRs will result in immediate registration rejection.
                      </p>
                      <p className="leading-relaxed font-bold">
                        In case of rejection, please contact the coordinator within 24 hours.
                      </p>
                    </div>
                  </div>

                  {checkoutItems.filter(e => e.payment_enabled && e.coordinator_upi_id && (e.payment_amount || 0) > 0).map(event => {
                    const upiLink = `upi://pay?pa=${encodeURIComponent(event.coordinator_upi_id)}&pn=${encodeURIComponent(event.coordinator_upi_name || 'Coordinator')}&am=${event.payment_amount}&cu=INR&tn=${encodeURIComponent(`${event.title} Registration`)}`;
                    return (
                      <div key={event.id} className="p-4 rounded-2xl border border-orange-500/20 bg-orange-500/[0.02] space-y-4">
                        {/* Event Title */}
                        <div className="flex items-center justify-between border-b border-white/5 pb-2">
                          <p className="text-xs font-black text-white truncate max-w-[150px]">{event.title}</p>
                          <p className="text-xs font-black text-orange-400">₹{event.payment_amount}</p>
                        </div>

                        {/* UPI QR Code */}
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <div className="p-2.5 bg-white rounded-2xl w-fit">
                            <QRCodeSVG value={upiLink} size={110} />
                          </div>
                          <p className="text-[9px] text-gray-400 font-mono text-center truncate max-w-xs">{event.coordinator_upi_id}</p>
                          <p className="text-[9px] font-bold text-white text-center">{event.coordinator_upi_name}</p>
                        </div>

                        {/* UTR Input */}
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black uppercase tracking-wider text-gray-400">
                            UTR / Transaction reference
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. 407812345678"
                            required
                            value={utrs[event.id] || ''}
                            onChange={(e) => setUtrs(prev => ({ ...prev, [event.id]: e.target.value.trim().toUpperCase() }))}
                            className="w-full px-3 py-2 bg-black/40 border border-white/10 focus:border-orange-500/50 rounded-xl text-xs text-white focus:outline-none placeholder:text-gray-600 font-mono"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : cartItems.length === 0 ? (
                <div className="text-center py-16">
                  <ShoppingCart size={40} className="text-gray-700 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm font-bold">Cart is empty</p>
                  <p className="text-gray-700 text-xs mt-1">Go to Events and tap + to add</p>
                </div>
              ) : (
                checkoutItems.map(event => {
                  const isDone = done.includes(event.id);
                  return (
                    <div key={event.id} className={`p-4 rounded-2xl border transition-all ${isDone ? 'border-green-500/30 bg-green-500/5' : 'border-white/[0.08] bg-white/[0.02]'} space-y-3`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${isDone ? 'bg-green-500/20' : 'bg-indigo-500/15'}`}>
                          {isDone ? <CheckCircle size={14} className="text-green-400" /> : <Calendar size={14} className="text-indigo-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-black text-white truncate">{event.title}</p>
                          {event.category && <p className="text-[10px] text-gray-500">{event.category}</p>}
                          {isDone && <p className="text-[10px] text-green-400 font-bold">✓ Registered!</p>}
                        </div>
                        {!isDone && (
                          <button aria-label={`Remove ${event.title} from cart`} disabled={registering} onClick={() => removeFromCart(event.id)} className="w-7 h-7 rounded-xl bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center transition-all shrink-0">
                            <Trash2 size={11} className="text-red-400" />
                          </button>
                        )}
                      </div>

                      {/* Group selection if it's a team event */}
                      {event.isTeam && !isDone && (
                        <div className="pt-2.5 border-t border-white/5 space-y-2">
                          <div className="flex items-center gap-1.5">
                            <Users size={12} className="text-indigo-400" />
                            <label className="text-[10px] font-black uppercase tracking-wider text-gray-400" htmlFor={`cart-team-${event.id}`}>Select team</label>
                          </div>
                          <p className="event-cart-team-rule">{event.min_team || 1}–{event.max_team || 1} participants, including the captain. Only accepted invitations count.</p>
                          {loadingGroups ? (
                            <div className="h-9 bg-white/5 rounded-xl animate-pulse" />
                          ) : groupsError ? (
                            <div className="event-cart-team-notice" role="alert"><p>Your teams could not load.</p><button className="event-cart-team-action" disabled={registering} onClick={() => void fetchMyGroups()}>Try again</button></div>
                          ) : myGroups.length === 0 || groupsFor !== user?.id ? (
                            <div className="space-y-2">
                              <div className="p-2.5 rounded-xl border border-yellow-500/20 bg-yellow-500/5 text-[10px] text-yellow-500 font-bold flex flex-col gap-1.5">
                                <span className="flex items-center gap-1.5"><AlertCircle size={12} /> Create a team to continue.</span>
                                <span className="text-[9px] text-gray-400 font-normal leading-relaxed">This is a team event. Create your team and ask members to accept their invitations before registering.</span>
                              </div>
                              <button className="event-cart-team-action" disabled={registering} onClick={() => openTeams(true)}><Users size={16} /> Create a team</button>
                            </div>
                          ) : (
                            <>
                              <select id={`cart-team-${event.id}`} disabled={registering}
                                value={selectedGroups[event.id] || ''}
                                onChange={(e) => {setSelectedGroups(prev => ({ ...prev, [event.id]: e.target.value }));addToCart({...event,team_id:e.target.value});}}
                                className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500/50"
                              >
                                <option value="">Choose a team</option>
                                {myGroups.map((g) => (
                                  <option key={g.id} value={g.id}>
                                    {g.name} ({groupParticipantIds(g).length} accepted participants)
                                  </option>
                                ))}
                              </select>

                              {(() => {
                                const selGroupId = selectedGroups[event.id];
                                if (!selGroupId) return null;
                                const group = myGroups.find(g => g.id === selGroupId);
                                if (!group) return null;
                                const count = groupParticipantIds(group).length;
                                const minSize = event.min_team || 1;
                                const maxSize = event.max_team || 1;
                                const isSizeInvalid = count < minSize || count > maxSize;

                                if (isSizeInvalid) {
                                  return (
                                    <div className="text-[10px] text-rose-400 font-bold flex items-center gap-1 mt-1.5 bg-rose-500/5 p-2 rounded-xl border border-rose-500/10">
                                      <AlertCircle size={12} className="shrink-0" />
                                      <span>Team has {count} accepted participant{count === 1 ? '' : 's'}. This event needs {minSize === maxSize ? minSize : `${minSize}–${maxSize}`}, including the captain.</span>
                                    </div>
                                  );
                                }
                                return (
                                  <div className="text-[10px] text-green-400 font-bold flex items-center gap-1 mt-1.5 bg-green-500/5 p-2 rounded-xl border border-green-500/10">
                                    <CheckCircle size={12} className="shrink-0" />
                                    <span>Team ready · {count} accepted participant{count === 1 ? '' : 's'}</span>
                                  </div>
                                );
                              })()}
                              <button className="event-cart-team-action" disabled={registering} onClick={() => openTeams()}><Users size={16} /> Manage teams & invitations</button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

             {cartItems.length > 0 && (
               <div className="event-cart-footer px-4 pb-6 pt-3 border-t border-white/[0.08] space-y-2">
                 {teamBlocked && <p className="event-cart-checkout-hint">{loadingGroups ? 'Checking your teams…' : groupsError ? 'Retry loading your teams to continue.' : 'Choose a team with the required accepted participants to continue.'}</p>}
                 {checkoutStep === 'payment' ? (
                   <>
                     <button
                       onClick={handleRegisterAll}
                       disabled={registering || !isProfileComplete || teamBlocked || checkoutItems.filter(e => e.payment_enabled && Number(e.payment_amount) > 0).some(e => !/^[a-zA-Z0-9-]{6,64}$/.test(utrs[e.id]?.trim() || ''))}
                       className="event-cart-submit w-full py-4 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 disabled:opacity-50 text-white rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-600/20"
                     >
                       {registering ? (
                         <><Loader2 size={16} className="animate-spin" /> Completing Checkout...</>
                       ) : (
                         <><CheckCircle size={16} /> Submit payment for review</>
                       )}
                     </button>
                     <button
                       onClick={() => setCheckoutStep('cart')}
                       disabled={registering}
                       className="w-full py-2 bg-white/5 hover:bg-white/10 disabled:opacity-50 text-gray-300 rounded-xl text-xs font-bold transition-all"
                     >
                       Back to Cart
                     </button>
                   </>
                 ) : (
                   <>
                     <button
                       onClick={handleRegisterAll}
                       disabled={registering || !isProfileComplete || teamBlocked || allDone}
                       className="event-cart-submit w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
                     >
                       {registering ? (
                         <><Loader2 size={16} className="animate-spin" /> Registering...</>
                       ) : allDone ? (
                         <><CheckCircle size={16} /> All Registered! 🎉</>
                       ) : (
                         <><CheckCircle size={16} /> {hasPayment ? 'Continue to payment' : `Register for ${pendingCount} event${pendingCount === 1 ? '' : 's'}`}</>
                       )}
                     </button>
                     {!registering && pendingCount > 0 && (
                       <button onClick={() => { clearCart(); }} className="w-full py-2 text-gray-600 hover:text-gray-400 text-xs font-bold transition-all">
                         Clear Cart
                       </button>
                     )}
                   </>
                 )}
               </div>
             )}
          </motion.div>
        </>
      )}
      </AnimatePresence>, document.body
  );
};

// Floating Cart Button for header
export const CartButton: React.FC = () => {
  const { cartCount, openDrawer } = useEventCart();
  if (cartCount === 0) return null;
  return (
    <motion.button
      initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
      onClick={openDrawer}
      className="relative flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white text-xs font-black transition-all shadow-lg shadow-indigo-600/30"
    >
      <ShoppingCart size={14} />
      <span className="hidden sm:inline">Events</span>
      <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full text-[10px] font-black flex items-center justify-center">
        {cartCount}
      </span>
    </motion.button>
  );
};
