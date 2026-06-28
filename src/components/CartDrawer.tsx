import React, { useState, useEffect } from 'react';
import { X, ShoppingCart, Trash2, CheckCircle, Loader2, Calendar, Users, User, Sparkles, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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

  const [creatingDemo, setCreatingDemo] = useState(false);

  const handleCreateDemoGroup = async () => {
    if (!user) return;
    setCreatingDemo(true);
    try {
      // 1. Get 3 other profiles
      const { data: profiles, error: pErr } = await supabase
        .from('profiles')
        .select('id')
        .neq('id', user.id)
        .limit(3);

      if (pErr) throw pErr;
      if (!profiles || profiles.length === 0) {
        toast.error('No other users found in database to invite!');
        return;
      }

      // 2. Create the group
      const { data: newGroup, error: gErr } = await supabase
        .from('student_groups')
        .insert({
          name: 'Demo Team Alpha',
          owner_id: user.id
        })
        .select()
        .single();

      if (gErr) throw gErr;
      if (!newGroup) throw new Error('Failed to create group');

      // 3. Add members as accepted
      const membersToInsert = profiles.map((p: any) => ({
        group_id: newGroup.id,
        user_id: p.id,
        status: 'accepted'
      }));

      const { error: mErr } = await supabase
        .from('student_group_members')
        .insert(membersToInsert);

      if (mErr) throw mErr;

      toast.success('⚡ Demo Group "Demo Team Alpha" created!');
      // 4. Refresh groups
      await fetchMyGroups();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to create demo group');
    } finally {
      setCreatingDemo(false);
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

            {/* Events List */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 custom-scrollbar">
              {cartItems.length === 0 ? (
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
                              <div className="p-2.5 rounded-xl border border-yellow-500/20 bg-yellow-500/5 text-[10px] text-yellow-500 font-bold flex items-center gap-1.5">
                                <AlertCircle size={12} />
                                <span>No groups created.</span>
                              </div>
                              <button
                                type="button"
                                onClick={handleCreateDemoGroup}
                                disabled={creatingDemo}
                                className="w-full py-2 bg-indigo-500/15 hover:bg-indigo-500/25 disabled:opacity-50 text-indigo-400 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border border-indigo-500/25 flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                {creatingDemo ? <Loader2 size={10} className="animate-spin" /> : '⚡ Create Demo Group (For Testing)'}
                              </button>
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

            {/* Footer Actions */}
            {cartItems.length > 0 && (
              <div className="px-4 pb-6 pt-3 border-t border-white/[0.08] space-y-2">
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
