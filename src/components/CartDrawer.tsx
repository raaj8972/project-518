import React, { useState, useEffect } from 'react';
import { X, ShoppingCart, Trash2, CheckCircle, Loader2, Calendar, Users, User, Sparkles, AlertCircle, IndianRupee } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { useEventCart } from '../context/EventCartContext';
import { useStudentAuth } from '../context/StudentAuthContext';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

interface CartDrawerProps {
  onRegisterSuccess?: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ onRegisterSuccess }) => {
  const { cartItems, removeFromCart, clearCart, isDrawerOpen, closeDrawer, cartCount } = useEventCart();
  const { user, profile } = useStudentAuth();
  const [registering, setRegistering] = useState(false);
  const [done, setDone] = useState<string[]>([]);

  // Group events state
  const [myGroups, setMyGroups] = useState<any[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState<Record<string, string>>({}); // event.id -> group.id
  
  // Payment step states
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'payment'>('cart');
  const [utrs, setUtrs] = useState<Record<string, string>>({}); // event.id -> UTR number
  const [localEventOverrides, setLocalEventOverrides] = useState<Record<string, any>>({});

  // Reset steps on close
  useEffect(() => {
    if (!isDrawerOpen) {
      setCheckoutStep('cart');
      setUtrs({});
      setLocalEventOverrides({});
    }
  }, [isDrawerOpen]);

  // Load latest event details for paid events when step becomes 'payment'
  useEffect(() => {
    if (checkoutStep !== 'payment') return;
    
    const refreshCartEvents = async () => {
      const paidIds = cartItems.filter(e => e.payment_enabled && e.coordinator_upi_id).map(e => e.id.toString());
      if (paidIds.length === 0) return;
      
      try {
        const { data, error } = await supabase
          .from('events')
          .select('id, title, payment_enabled, payment_amount, coordinator_upi_id, coordinator_upi_name')
          .in('id', paidIds);
        
        if (!error && data) {
          const overrideMap: Record<string, any> = {};
          data.forEach(item => {
            overrideMap[item.id] = item;
          });
          setLocalEventOverrides(overrideMap);
        }
      } catch (err) {
        console.error('Failed to refresh cart events:', err);
      }
    };

    refreshCartEvents();
  }, [checkoutStep, cartItems]);

  const fetchMyGroups = async () => {
    if (!user) return;
    setLoadingGroups(true);
    try {
      const { data: owned } = await supabase
        .from('student_groups')
        .select('id, name, owner_id')
        .eq('owner_id', user.id);

      const { data: memberOf } = await supabase
        .from('student_group_members')
        .select('student_groups(id, name, owner_id)')
        .eq('user_id', user.id)
        .eq('status', 'accepted');

      const memberGroups = (memberOf || []).map((m: any) => m.student_groups).filter(Boolean);
      const allGroupIds = [...(owned || []), ...memberGroups].map((g: any) => g.id);

      if (allGroupIds.length === 0) {
        setMyGroups([]);
        return;
      }

      const groups = await Promise.all([...(owned || []), ...memberGroups.filter((g: any) => !(owned || []).find((o: any) => o.id === g.id))].map(async (g: any) => {
        const { data: members } = await supabase
          .from('student_group_members')
          .select('id, user_id, status, profile:profiles!user_id(id, full_name, username, avatar_url, batch, phone, college)')
          .eq('group_id', g.id);
        return { ...g, members: members || [] };
      }));

      setMyGroups(groups);

      // Auto-select first group for each team event
      const initialSelected: Record<string, string> = {};
      cartItems.forEach(event => {
        if (event.isTeam && groups.length > 0) {
          initialSelected[event.id] = groups[0].id;
        }
      });
      setSelectedGroups(prev => ({ ...initialSelected, ...prev }));
    } catch (err) {
      console.error('fetchMyGroups error:', err);
    } finally {
      setLoadingGroups(false);
    }
  };

  useEffect(() => {
    if (isDrawerOpen) {
      fetchMyGroups();
    }
  }, [isDrawerOpen, user]);

  const handleRegisterAll = async () => {
    if (!user || !profile) { toast.error('Profile incomplete!'); return; }
    if (cartItems.length === 0) return;

    // Check if there are paid items that need payment verification
    const paidItems = cartItems.filter(event => event.payment_enabled && event.coordinator_upi_id && (event.payment_amount || 0) > 0);
    
    if (checkoutStep === 'cart' && paidItems.length > 0) {
      setCheckoutStep('payment');
      return;
    }

    // Validate that all paid events in the cart have a valid UTR number entered (minimum 6 characters)
    if (checkoutStep === 'payment') {
      for (const event of paidItems) {
        const utr = utrs[event.id]?.trim();
        if (!utr || utr.length < 6) {
          toast.error(`Please enter a valid UTR / Transaction ID (min 6 characters) for ${event.title}`);
          return;
        }
      }
    }

    // First validate all group size limits before starting any registrations!
    for (const event of cartItems) {
      if (event.isTeam) {
        const groupId = selectedGroups[event.id];
        if (!groupId) {
          toast.error(`Please select a group for ${event.title}`);
          return;
        }

        const group = myGroups.find(g => g.id === groupId);
        if (!group) {
          toast.error(`Selected group not found for ${event.title}`);
          return;
        }

        const acceptedMembersCount = (group.members || []).filter((m: any) => m.status === 'accepted').length + 1; // +1 for self
        const minSize = event.min_team || 1;
        const maxSize = event.max_team || 1;

        if (acceptedMembersCount < minSize) {
          toast.error(`"${group.name}" has only ${acceptedMembersCount} members. "${event.title}" requires at least ${minSize} members.`);
          return;
        }
        if (acceptedMembersCount > maxSize) {
          toast.error(`"${group.name}" has ${acceptedMembersCount} members. "${event.title}" allows at most ${maxSize} members.`);
          return;
        }
      }
    }

    setRegistering(true);
    const registered: string[] = [];
    const failed: string[] = [];

    for (const event of cartItems) {
      try {
        const isPaidEvent = event.payment_enabled && event.coordinator_upi_id && (event.payment_amount || 0) > 0;
        
        if (event.isTeam) {
          const groupId = selectedGroups[event.id];
          const group = myGroups.find(g => g.id === groupId);
          if (!group) throw new Error('Selected group not found');
          
          const acceptedMembers = (group.members || []).filter((m: any) => m.status === 'accepted');
          
          const allUserIds = [
            user.id,
            ...acceptedMembers.map((m: any) => m.user_id)
          ];

          const participantDetails = [
            { full_name: profile.full_name, email: user.email, phone: profile.phone, college: profile.college, batch: profile.batch },
            ...acceptedMembers.map((m: any) => ({
              full_name: m.profile?.full_name || '',
              email: '',
              phone: m.profile?.phone || '',
              college: m.profile?.college || '',
              batch: m.profile?.batch || '',
            }))
          ];

          const { data, error } = await supabase.rpc('register_cart_event', {
            p_event_id: event.id.toString(),
            p_user_ids: allUserIds,
            p_team_name: group.name,
            p_participant_details: participantDetails
          });

          if (error) {
            console.error(error);
            toast.error(`[${event.title}] ${error.message}`);
            failed.push(event.id);
          } else {
            registered.push(event.id);

            // Handle payment submission insert if paid
            if (isPaidEvent) {
              const utr = utrs[event.id]?.trim().toUpperCase();
              await new Promise(r => setTimeout(r, 400)); // stabilization gap
              
              const { data: latestReg } = await supabase
                .from('registrations')
                .select('id')
                .eq('event_id', event.id.toString())
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();
              
              if (latestReg) {
                await supabase.from('payment_submissions').insert({
                  registration_id: latestReg.id,
                  event_id: event.id.toString(),
                  user_id: user.id,
                  utr_number: utr,
                  amount: event.payment_amount,
                  submitted_at: new Date().toISOString()
                });
              }
            }
          }
        } else {
          // Individual Registration using the same RPC (concurrency-safe!)
          const allUserIds = [user.id];
          const participantDetails = [
            { full_name: profile.full_name, email: user.email, phone: profile.phone, college: profile.college, batch: profile.batch }
          ];

          const { data, error } = await supabase.rpc('register_cart_event', {
            p_event_id: event.id.toString(),
            p_user_ids: allUserIds,
            p_team_name: null,
            p_participant_details: participantDetails
          });

          if (error) {
            console.error(error);
            toast.error(`[${event.title}] ${error.message}`);
            failed.push(event.id);
          } else {
            registered.push(event.id);

            // Handle payment submission insert if paid
            if (isPaidEvent) {
              const utr = utrs[event.id]?.trim().toUpperCase();
              await new Promise(r => setTimeout(r, 400)); // stabilization gap
              
              const { data: latestReg } = await supabase
                .from('registrations')
                .select('id')
                .eq('event_id', event.id.toString())
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();
              
              if (latestReg) {
                await supabase.from('payment_submissions').insert({
                  registration_id: latestReg.id,
                  event_id: event.id.toString(),
                  user_id: user.id,
                  utr_number: utr,
                  amount: event.payment_amount,
                  submitted_at: new Date().toISOString()
                });
              }
            }
          }
        }
      } catch (e: any) {
        console.error(e);
        toast.error(`[${event.title}] ${e.message || 'Registration failed'}`);
        failed.push(event.id);
      }
    }

    setDone(registered);
    setRegistering(false);

    if (failed.length === 0) {
      toast.success(`🎉 Registered successfully for ${registered.length} event${registered.length > 1 ? 's' : ''}!`);
      if (onRegisterSuccess) {
        onRegisterSuccess();
      }
      setTimeout(() => { clearCart(); setDone([]); closeDrawer(); }, 2000);
    } else {
      if (registered.length > 0 && onRegisterSuccess) {
        onRegisterSuccess();
      }
      toast.error(`${failed.length} failed, ${registered.length} succeeded`);
    }
  };

  return (
    <AnimatePresence>
      {isDrawerOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm"
            onClick={closeDrawer}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 z-[201] w-full max-w-sm bg-[#0d0d0f] border-l border-white/10 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                  <ShoppingCart size={16} className="text-indigo-400" />
                </div>
                <div>
                  <p className="text-white font-black text-sm">My Event Cart</p>
                  <p className="text-gray-500 text-[10px]">{cartCount} event{cartCount !== 1 ? 's' : ''} selected</p>
                </div>
              </div>
              <button onClick={closeDrawer} className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all">
                <X size={14} className="text-gray-400" />
              </button>
            </div>

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

                  {cartItems.filter(e => e.payment_enabled && e.coordinator_upi_id && (e.payment_amount || 0) > 0).map(eventItem => {
                    const event = localEventOverrides[eventItem.id] || eventItem;
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
                            UTR / Transaction Reference (12 digits)
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
                cartItems.map(event => {
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
                          <button onClick={() => removeFromCart(event.id)} className="w-7 h-7 rounded-xl bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center transition-all shrink-0">
                            <Trash2 size={11} className="text-red-400" />
                          </button>
                        )}
                      </div>

                      {/* Group selection if it's a team event */}
                      {event.isTeam && !isDone && (
                        <div className="pt-2.5 border-t border-white/5 space-y-2">
                          <div className="flex items-center gap-1.5">
                            <Users size={12} className="text-indigo-400" />
                            <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">Select Group</label>
                          </div>
                          {loadingGroups ? (
                            <div className="h-9 bg-white/5 rounded-xl animate-pulse" />
                          ) : myGroups.length === 0 ? (
                            <div className="space-y-2">
                              <div className="p-2.5 rounded-xl border border-yellow-500/20 bg-yellow-500/5 text-[10px] text-yellow-500 font-bold flex flex-col gap-1.5">
                                <span className="flex items-center gap-1.5"><AlertCircle size={12} /> No groups created.</span>
                                <span className="text-[9px] text-gray-400 font-normal leading-relaxed">Please go to the "My Teams" tab to create your team and invite your team members.</span>
                              </div>
                            </div>
                          ) : (
                            <>
                              <select
                                value={selectedGroups[event.id] || ''}
                                onChange={(e) => setSelectedGroups(prev => ({ ...prev, [event.id]: e.target.value }))}
                                className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500/50"
                              >
                                <option value="">-- Choose a group --</option>
                                {myGroups.map((g) => (
                                  <option key={g.id} value={g.id}>
                                    {g.name} ({g.members.filter((m: any) => m.status === 'accepted').length + 1} members)
                                  </option>
                                ))}
                              </select>

                              {(() => {
                                const selGroupId = selectedGroups[event.id];
                                if (!selGroupId) return null;
                                const group = myGroups.find(g => g.id === selGroupId);
                                if (!group) return null;
                                const count = (group.members || []).filter((m: any) => m.status === 'accepted').length + 1;
                                const minSize = event.min_team || 1;
                                const maxSize = event.max_team || 1;
                                const isSizeInvalid = count < minSize || count > maxSize;

                                if (isSizeInvalid) {
                                  return (
                                    <div className="text-[10px] text-rose-400 font-bold flex items-center gap-1 mt-1.5 bg-rose-500/5 p-2 rounded-xl border border-rose-500/10">
                                      <AlertCircle size={12} className="shrink-0" />
                                      <span>Invalid size: Group has {count} members, but event requires {minSize}-{maxSize}.</span>
                                    </div>
                                  );
                                }
                                return (
                                  <div className="text-[10px] text-green-400 font-bold flex items-center gap-1 mt-1.5 bg-green-500/5 p-2 rounded-xl border border-green-500/10">
                                    <CheckCircle size={12} className="shrink-0" />
                                    <span>Valid size ({count} members)</span>
                                  </div>
                                );
                              })()}
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
               <div className="px-4 pb-6 pt-3 border-t border-white/[0.08] space-y-2">
                 {checkoutStep === 'payment' ? (
                   <>
                     <button
                       onClick={handleRegisterAll}
                       disabled={registering || cartItems.filter(e => e.payment_enabled && e.coordinator_upi_id && (e.payment_amount || 0) > 0).some(e => !(utrs[e.id]?.trim() && utrs[e.id].trim().length >= 6))}
                       className="w-full py-4 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 disabled:opacity-50 text-white rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-600/20"
                     >
                       {registering ? (
                         <><Loader2 size={16} className="animate-spin" /> Completing Checkout...</>
                       ) : (
                         <><CheckCircle size={16} /> Complete Checkout & Pay</>
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
                       disabled={registering || done.length === cartItems.length}
                       className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
                     >
                       {registering ? (
                         <><Loader2 size={16} className="animate-spin" /> Registering...</>
                       ) : done.length === cartItems.length && done.length > 0 ? (
                         <><CheckCircle size={16} /> All Registered! 🎉</>
                       ) : (
                         <><CheckCircle size={16} /> Register for All {cartCount} Events</>
                       )}
                     </button>
                     {!registering && done.length < cartItems.length && (
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
    </AnimatePresence>
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
