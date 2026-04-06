import React from 'react';
import { useData } from '../../context/DataContext';
import { Calendar, Save, MessageSquareOff, Timer, Plus, Minus, X, Zap, Infinity as InfinityIcon, ArrowUp, ArrowDown, Layout } from 'lucide-react';
import { ComingSoon } from '../../pages/ComingSoon';
import { useApprovals } from '../../hooks/useApprovals';
import { useLocalStorage } from '../../hooks/useLocalStorage';

export const SiteSettingsPanel: React.FC = () => {
  const { siteSettings, updateSiteSettings } = useData();
  const { submitForApproval, checkRequiresApproval } = useApprovals();
  const [requiresApproval, setRequiresApproval] = React.useState(false);

  React.useEffect(() => {
    checkRequiresApproval().then(setRequiresApproval);
  }, []);

  const INITIAL_LOCAL_STATE = {
    site_closed: false,
    coming_soon_enabled: false,
    chat_locked: false,
    locked_pages: {} as Record<string, boolean>,
    coming_soon_until: '',
    coming_soon_title: '',
    coming_soon_message: '',
    coming_soon_ended_text: '',
    show_timer: false,
    homepage_hero_title: '',
    sports_instagram_url: '',
    registration_institution_visible: true,
    registration_institution_optional: false,
    registration_participant_types: ['1st Year','2nd Year','3rd Year','4th Year'],
    locked_pages_until: {} as Record<string, string | null>,
    show_page_timers: {} as Record<string, boolean>,
    default_landing_page: '/',
    navigation_order: [] as string[],
    _is_draft: false, // Flag to track if the user has modified it
  };

  const [local, setLocal, clearLocal] = useLocalStorage('admin_site_settings_draft', INITIAL_LOCAL_STATE);
  const [saving, setSaving] = React.useState(false);
  const [savedAt, setSavedAt] = React.useState<number | null>(null);

  React.useEffect(() => {
    // Only sync from server if we don't have a local draft that was explicitly modified
    // or if the local state is still at its initial defaults.
    if (!siteSettings || local._is_draft) return;
    
    setLocal({
      site_closed: !!siteSettings.site_closed,
      coming_soon_enabled: !!siteSettings.coming_soon_enabled,
      chat_locked: !!(siteSettings as any).chat_locked,
      locked_pages: siteSettings.locked_pages || {},
      coming_soon_until: siteSettings.coming_soon_until ? new Date(siteSettings.coming_soon_until).toISOString().slice(0,16) : '',
      coming_soon_title: siteSettings.coming_soon_title || '',
      coming_soon_message: siteSettings.coming_soon_message || '',
      coming_soon_ended_text: (siteSettings as any).coming_soon_ended_text || '',
      show_timer: !!siteSettings.coming_soon_until,
      homepage_hero_title: (siteSettings as any)?.homepage_hero_title || '',
      sports_instagram_url: (siteSettings as any)?.sports_instagram_url || '',
      registration_institution_visible: (siteSettings as any)?.registration_institution_visible !== false,
      registration_institution_optional: (siteSettings as any)?.registration_institution_optional === true,
      registration_participant_types: Array.isArray((siteSettings as any)?.registration_participant_types) && (siteSettings as any).registration_participant_types.length
        ? (siteSettings as any).registration_participant_types
        : ['1st Year','2nd Year','3rd Year','4th Year'],
      locked_pages_until: siteSettings.locked_pages_until || {},
      show_page_timers: Object.keys(siteSettings.locked_pages_until || {}).reduce((acc, page) => {
        const value = siteSettings.locked_pages_until![page];
        acc[page] = !!value && new Date(value).getTime() > Date.now();
        return acc;
      }, {} as Record<string, boolean>),
      default_landing_page: (siteSettings as any).default_landing_page || '/',
      navigation_order: (siteSettings as any).navigation_order || [],
      _is_draft: false, // Maintain false since this is a server sync
    });
  }, [siteSettings, local._is_draft]);

  const onSave = async () => {
    setSaving(true);
    try {
      const newSettings = {
        site_closed: local.site_closed,
        coming_soon_enabled: local.coming_soon_enabled,
        chat_locked: local.chat_locked,
        locked_pages: local.locked_pages,
        coming_soon_until: local.show_timer && local.coming_soon_until ? new Date(local.coming_soon_until).toISOString() : null,
        coming_soon_title: local.coming_soon_title || null,
        coming_soon_message: local.coming_soon_message || null,
        coming_soon_ended_text: local.coming_soon_ended_text || null,
        // optional homepage hero title (stored in site_settings)
        homepage_hero_title: local.homepage_hero_title || null,
        sports_instagram_url: local.sports_instagram_url || null,
        registration_institution_visible: !!local.registration_institution_visible,
        registration_institution_optional: !!local.registration_institution_optional,
        registration_participant_types: Array.isArray(local.registration_participant_types) ? local.registration_participant_types : null,
        locked_pages_until: Object.keys(local.locked_pages_until).reduce((acc, page) => ({
          ...acc,
          [page]: local.show_page_timers[page] ? local.locked_pages_until[page] : null
        }), {}),
        default_landing_page: local.default_landing_page,
        navigation_order: local.navigation_order,
      };

      if (requiresApproval) {
        // Assuming siteSettings has an ID, or we use a fixed ID for singleton
        const settingsId = (siteSettings as any)?.id || 1;
        
        const result = await submitForApproval('site_settings', 'update', newSettings, settingsId);
        if (result.success) {
          alert('Request submitted for approval. An owner will review your changes.');
          setSavedAt(Date.now());
        } else {
          alert(`Failed to submit for approval: ${result.error}`);
        }
      } else {
        console.log('[SiteSettings] Saving locally...');
        await updateSiteSettings(newSettings as any);
        setSavedAt(Date.now());
        clearLocal(); // Successful save clears the draft
        console.log('[SiteSettings] Save complete.');
      }
    } catch (error: any) {
      console.error('Error saving site settings:', error);
      let msg = error.message || 'Failed to save settings. Please try again.';
      
      if (error.message === 'TIMEOUT') {
        msg = 'The request timed out. Please check your internet connection or try again later. Your changes might still be saving in the background.';
      } else if (error?.message?.includes('violates row-level security') || error?.code === '42501') {
        msg = 'Permission Denied: You do not have permission to update site settings in Supabase RLS.';
      }
      
      alert(msg);
    } finally {
      setSaving(false);
    }
  };

  const adjustTimer = (page: string, minutes: number) => {
    const current = local.locked_pages_until[page];
    let baseDate = current ? new Date(current) : new Date();
    
    // If current timer is in the past or not set, start from now
    if (isNaN(baseDate.getTime()) || baseDate.getTime() < Date.now()) {
      baseDate = new Date();
    }
    
    const newDate = new Date(baseDate.getTime() + minutes * 60000);
    setLocal(s => ({
      ...s,
      locked_pages_until: {
        ...s.locked_pages_until,
        [page]: newDate.toISOString()
      },
      // Automatically enable the lock if we are setting a timer
      locked_pages: {
        ...s.locked_pages,
        [page]: true
      },
      _is_draft: true
    }));
  };

  const clearTimer = (page: string) => {
    setLocal(s => ({
      ...s,
      locked_pages_until: {
        ...s.locked_pages_until,
        [page]: null
      },
      show_page_timers: {
        ...s.show_page_timers,
        [page]: false
      },
      _is_draft: true
    }));
  };

  const moveNavItem = (index: number, direction: 'up' | 'down') => {
    const defaultOrder = ['home', 'events', 'schedule', 'gallery', 'home-bound', 'rico-family', 'sports', 'sponsors'];
    const newOrder = local.navigation_order.length > 0 
      ? [...local.navigation_order] 
      : [...defaultOrder];
    
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newOrder.length) return;
    
    [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
    setLocal(s => ({ ...s, navigation_order: newOrder, _is_draft: true }));
  };

  const resetNavOrder = () => {
    if (confirm('Are you sure you want to reset the navigation menu to its default order?')) {
      setLocal(s => ({ ...s, navigation_order: [], _is_draft: true }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#181824]/60 backdrop-blur-md border border-white/5 rounded-2xl p-6 sm:p-8">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
           <div className="w-1 h-6 bg-yellow-500 rounded-full" />
           Site Settings
        </h2>
        
        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-6">
            
            {/* Toggles Group */}
            <div className="space-y-3 bg-black/20 p-4 rounded-xl border border-white/5">
              <label className="flex items-center gap-4 cursor-pointer group">
                <div className={`w-10 h-6 rounded-full p-1 transition-colors duration-300 ${local.site_closed ? 'bg-red-500' : 'bg-gray-700'}`}>
                   <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-300 ${local.site_closed ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
                <input type="checkbox" className="hidden" checked={local.site_closed} onChange={(e) => setLocal((s) => ({ ...s, site_closed: e.target.checked, _is_draft: true }))} />
                <span className="text-gray-300 group-hover:text-white transition-colors">Close entire site (hard maintenance)</span>
              </label>

              <label className="flex items-center gap-4 cursor-pointer group">
                <div className={`w-10 h-6 rounded-full p-1 transition-colors duration-300 ${local.coming_soon_enabled ? 'bg-yellow-500' : 'bg-gray-700'}`}>
                   <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-300 ${local.coming_soon_enabled ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
                <input type="checkbox" className="hidden" checked={local.coming_soon_enabled} onChange={(e) => setLocal((s) => ({ ...s, coming_soon_enabled: e.target.checked, _is_draft: true }))} />
                <span className="text-gray-300 group-hover:text-white transition-colors">Enable Coming Soon Mode</span>
              </label>

              {/* Chat Lock Toggle */}
              <label className="flex items-center gap-4 cursor-pointer group">
                <div className={`w-10 h-6 rounded-full p-1 transition-colors duration-300 ${local.chat_locked ? 'bg-orange-500' : 'bg-gray-700'}`}>
                   <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-300 ${local.chat_locked ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
                <input type="checkbox" className="hidden" checked={local.chat_locked} onChange={(e) => setLocal((s) => ({ ...s, chat_locked: e.target.checked, _is_draft: true }))} />
                <div className="flex items-center gap-2">
                  <MessageSquareOff className={`w-4 h-4 transition-colors ${local.chat_locked ? 'text-orange-400' : 'text-gray-500'}`} />
                  <span className="text-gray-300 group-hover:text-white transition-colors">Lock all chat (nobody can send messages)</span>
                </div>
              </label>
            </div>

            {/* Navigation & Landing Section */}
            <div className="space-y-4 bg-black/20 p-4 rounded-xl border border-white/5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <Layout className="w-4 h-4 text-indigo-400" />
                  Navigation & Landing
                </h3>
                {local.navigation_order.length > 0 && (
                  <button 
                    type="button"
                    onClick={resetNavOrder}
                    className="text-[10px] uppercase font-bold text-gray-500 hover:text-white transition-colors flex items-center gap-1 bg-white/5 px-2 py-1 rounded"
                  >
                    Reset Order
                  </button>
                )}
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">Default Landing Page</label>
                  <select 
                    value={local.default_landing_page}
                    onChange={(e) => setLocal(s => ({ ...s, default_landing_page: e.target.value, _is_draft: true }))}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500/50 text-white text-sm appearance-none cursor-pointer"
                  >
                    <option value="/">Home Page (Default)</option>
                    <option value="/events">Events Page</option>
                    <option value="/schedule">Schedule Page</option>
                    <option value="/gallery">Gallery Page</option>
                    <option value="/home-bound">Home Bound Page</option>
                    <option value="/rico-family">Rico Family Page</option>
                    <option value="/sports">Sports Page</option>
                    <option value="/sponsors">Sponsors Page</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 ml-1">Menu Item Order</label>
                  <div className="space-y-2">
                    {(local.navigation_order.length > 0 ? local.navigation_order : ['home', 'events', 'schedule', 'gallery', 'home-bound', 'rico-family', 'sports', 'sponsors']).map((item, idx, arr) => (
                      <div key={item} className="flex items-center justify-between bg-white/5 border border-white/5 rounded-lg px-3 py-2 group hover:border-white/10 transition-colors">
                        <span className="text-sm text-gray-300 capitalize font-medium">{item.replace('-', ' ')}</span>
                        <div className="flex items-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => moveNavItem(idx, 'up')}
                            disabled={idx === 0}
                            className="p-1 hover:bg-white/10 rounded transition-colors disabled:opacity-20"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveNavItem(idx, 'down')}
                            disabled={idx === arr.length - 1}
                            className="p-1 hover:bg-white/10 rounded transition-colors disabled:opacity-20"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-[9px] text-gray-500 mt-3 px-1 leading-relaxed">
                    * Reordering only affects the public navigation menu. Student Dashboard and Admin links remain fixed.
                  </p>
                </div>
              </div>
            </div>

            {/* Page Locks Group */}
            <div className="space-y-4 bg-black/20 p-4 rounded-xl border border-white/5">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Page Level Maintenance Locks</h3>
              <div className="space-y-3">
                {['home', 'events', 'schedule', 'gallery', 'home-bound', 'rico-family', 'sponsors', 'sports'].map(page => {
                  const timerExpiry = local.locked_pages_until[page];
                  const pageModeTimer = local.show_page_timers[page];
                  const hasTimer = !!timerExpiry && new Date(timerExpiry).getTime() > Date.now();
                  
                  return (
                    <div key={page} className="space-y-3 pb-3 border-b border-white/5 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between">
                         <label className="flex items-center gap-3 cursor-pointer group">
                           <div className={`w-10 h-6 rounded-full p-1 transition-colors duration-300 ${local.locked_pages[page] ? 'bg-indigo-500' : 'bg-gray-700'}`}>
                              <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-300 ${local.locked_pages[page] ? 'translate-x-4' : 'translate-x-0'}`} />
                           </div>
                           <input type="checkbox" className="hidden" checked={!!local.locked_pages[page]} onChange={(e) => setLocal((s) => ({ ...s, locked_pages: { ...s.locked_pages, [page]: e.target.checked }, _is_draft: true }))} />
                           <span className="text-gray-300 group-hover:text-white transition-colors capitalize text-sm font-bold tracking-wide">{page.replace('-', ' ')} Page Lock</span>
                         </label>

                         {/* Mode Toggle: Forever vs Timer */}
                         <div className="flex bg-black/40 p-1 rounded-lg border border-white/5">
                            <button 
                              type="button"
                              onClick={() => setLocal(s => ({ ...s, show_page_timers: { ...s.show_page_timers, [page]: false }, _is_draft: true }))}
                              className={`px-3 py-1 text-[10px] uppercase font-bold rounded-md transition-all ${!pageModeTimer ? 'bg-indigo-500 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                              Forever
                            </button>
                            <button 
                              type="button"
                              onClick={() => setLocal(s => ({ ...s, show_page_timers: { ...s.show_page_timers, [page]: true }, _is_draft: true }))}
                              className={`px-3 py-1 text-[10px] uppercase font-bold rounded-md transition-all ${pageModeTimer ? 'bg-indigo-500 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                              Timer
                            </button>
                         </div>
                      </div>
                      
                      {/* Timer Display/Controls */}
                      <div className="flex items-center gap-3 pl-2">
                        {!pageModeTimer ? (
                          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-amber-500/10 border-amber-500/30 text-amber-500 text-[10px] uppercase font-bold animate-in fade-in zoom-in-95 duration-300">
                             <InfinityIcon className="w-3 h-3" />
                             <span>Locked For Infinity</span>
                          </div>
                        ) : (
                          <>
                            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] uppercase font-bold transition-all ${hasTimer ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' : 'bg-white/5 border-white/10 text-gray-500'}`}>
                              <Timer className="w-3 h-3" />
                              {hasTimer ? (
                                <span>Until {new Date(timerExpiry!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              ) : (
                                <span>Pending...</span>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-1">
                              <button 
                                type="button" 
                                onClick={() => {
                                  adjustTimer(page, 5);
                                  setLocal(s => ({ ...s, show_page_timers: { ...s.show_page_timers, [page]: true }, _is_draft: true }));
                                }}
                                className="p-1.5 rounded-md bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all active:scale-[0.98]"
                                title="Add 5 Minutes"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                              <button 
                                type="button" 
                                onClick={() => adjustTimer(page, -5)}
                                className="p-1.5 rounded-md bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all active:scale-[0.98]"
                                title="Subtract 5 Minutes"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              {hasTimer && (
                                <button 
                                  type="button" 
                                  onClick={() => clearTimer(page)}
                                  className="p-1.5 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all"
                                  title="Clear Timer"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-5">
              <div className="bg-[#0f0f13] border border-white/10 rounded-2xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-widest">Maintenance Timing</h4>
                    <p className="text-[10px] text-gray-500 mt-1">Configure how long the blackout persists.</p>
                  </div>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <span className="text-[10px] font-bold text-gray-400 group-hover:text-white transition-colors uppercase">Show Timer</span>
                    <div className={`w-8 h-4 rounded-full p-0.5 transition-colors duration-300 ${local.show_timer ? 'bg-cyan-500' : 'bg-gray-700'}`}>
                       <div className={`w-3 h-3 bg-white rounded-full shadow-sm transform transition-transform duration-300 ${local.show_timer ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                    <input type="checkbox" className="hidden" checked={local.show_timer} onChange={(e) => setLocal((s) => ({ ...s, show_timer: e.target.checked, _is_draft: true }))} />
                  </label>
                </div>

                {local.show_timer ? (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-300">
                    <label className="block text-[10px] font-bold text-cyan-500/70 uppercase tracking-widest ml-1">Countdown Ends At</label>
                    <div className="relative group">
                      <input
                        type="datetime-local"
                        value={local.coming_soon_until}
                        onChange={(e) => setLocal((s) => ({ ...s, coming_soon_until: e.target.value, _is_draft: true }))}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 pr-10 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 text-white transition-all text-sm"
                      />
                      <Calendar className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 group-focus-within:text-cyan-500 transition-colors" />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 px-4 py-3 bg-yellow-500/5 border border-yellow-500/20 rounded-xl text-yellow-200/60 animate-in fade-in duration-500">
                    <Timer className="w-4 h-4 shrink-0" />
                    <span className="text-[10px] font-medium leading-tight">
                      <strong className="text-yellow-500 block uppercase tracking-wider mb-0.5">Indefinite Mode Active</strong>
                      Site will remain in maintenance mode until manually disabled.
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Page Title</label>
                <input
                  value={local.coming_soon_title}
                  onChange={(e) => setLocal((s) => ({ ...s, coming_soon_title: e.target.value, _is_draft: true }))}
                  className="w-full bg-[#0f0f13] border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50 text-white transition-all placeholder-gray-600"
                  placeholder="Coming Soon"
                />
              </div>

              <div>
                 <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Homepage Hero Title</label>
                <input
                  value={local.homepage_hero_title}
                  onChange={(e) => setLocal((s) => ({ ...s, homepage_hero_title: e.target.value, _is_draft: true }))}
                  className="w-full bg-[#0f0f13] border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50 text-white transition-all placeholder-gray-600"
                  placeholder="RICORRENZA"
                />
                <p className="text-[10px] text-gray-500 mt-1.5 ml-1">The big text on the main landing page.</p>
              </div>

              <div>
                 <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Sports Instagram URL</label>
                <input
                  value={local.sports_instagram_url}
                  onChange={(e) => setLocal((s) => ({ ...s, sports_instagram_url: e.target.value, _is_draft: true }))}
                  className="w-full bg-[#0f0f13] border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50 text-white transition-all placeholder-gray-600"
                  placeholder="https://instagram.com/..."
                />
                <p className="text-[10px] text-gray-500 mt-1.5 ml-1">Optional URL for the Sports page's dedicated Instagram.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Message Body</label>
                <textarea
                  value={local.coming_soon_message}
                  onChange={(e) => setLocal((s) => ({ ...s, coming_soon_message: e.target.value, _is_draft: true }))}
                  className="w-full bg-[#0f0f13] border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50 min-h-[96px] text-white transition-all placeholder-gray-600"
                  placeholder="We are preparing something amazing..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Post-Timer Text</label>
                <input
                  value={local.coming_soon_ended_text}
                  onChange={(e) => setLocal((s) => ({ ...s, coming_soon_ended_text: e.target.value, _is_draft: true }))}
                  className="w-full bg-[#0f0f13] border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50 text-white transition-all placeholder-gray-600"
                  placeholder="We'll be back soon"
                />
              </div>

              {/* Other settings can follow... */}
            </div>

            <button
              onClick={onSave}
              className={`
                w-full inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-bold shadow-lg transition-all
                ${saving 
                  ? 'bg-gray-800 text-gray-400 cursor-not-allowed' 
                  : 'bg-yellow-500 text-black hover:bg-yellow-400 hover:shadow-yellow-500/20 active:scale-[0.98]'
                }
              `}
              disabled={saving}
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving changes...' : 'Save Settings'}
            </button>
            
            {savedAt && (
              <div className="text-center text-xs font-bold text-green-400 animate-pulse">
                Settings saved successfully at {new Date(savedAt).toLocaleTimeString()}
              </div>
            )}
          </div>
          
          <div className="space-y-4">
             <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">Live Preview</div>
             <div className="border border-white/10 rounded-2xl overflow-hidden shadow-2xl shadow-black/50">
               <div className="aspect-[9/16] sm:aspect-video bg-black relative">
                 <div className="absolute inset-0 transform scale-[0.4] origin-top-left w-[250%] h-[250%] pointer-events-none select-none">
                   <ComingSoon previewSettings={local} />
                 </div>
               </div>
             </div>
             <p className="text-xs text-gray-500 text-center">
               This is an approximation of what users will see.
             </p>

             <div className="pt-2">
                <a 
                  href="/coming-soon" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 hover:border-cyan-500/30 transition-all text-xs font-bold uppercase tracking-widest group"
                >
                  <Zap className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
                  View Full Live Experience
                </a>
                <p className="text-[9px] text-gray-600 text-center mt-2 px-4">
                  Opens the actual maintenance page in a new tab. Use this to verify cinematic animations and HUD layout.
                </p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SiteSettingsPanel;
