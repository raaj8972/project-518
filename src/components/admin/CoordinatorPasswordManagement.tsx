import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useData } from '../../context/DataContext';
import { useEventsData } from '../../context/EventsContext';
import { Lock, Save, Eye, EyeOff, Wand2, Search, Filter, ShieldCheck, ChevronDown } from 'lucide-react';
import { useToast } from '../ToastProvider';
import { AICoordinatorScanner } from './coordinator/AICoordinatorScanner';

interface ExtractedPasswordData {
  event_name: string;
  coordinator_name: string;
  password: string;
}

export const CoordinatorPasswordManagement: React.FC = () => {
  const { events, refreshAll, isOwner: checkIsOwner } = useData() as any;
  const { eventCoordinators } = useEventsData();
  const { push } = useToast();
  
  const isOwner = typeof checkIsOwner === 'function' ? checkIsOwner() : false;

  const [stagedPasswords, setStagedPasswords] = useState<{ [key: string]: string }>({});
  const [stagedGrouping, setStagedGrouping] = useState<{ [key: string]: boolean }>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  
  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const [showPasswords, setShowPasswords] = useState<{ [key: string]: boolean }>({});

  const categories = useMemo(() => {
    if (!events) return [];
    const cats = new Set(events.map((e: any) => e.category).filter(Boolean));
    return Array.from(cats) as string[];
  }, [events]);

  // Get coordinators for a specific event from the normalized table
  const getCoordinatorsForEvent = (eventId: string | number) =>
    (eventCoordinators || []).filter((c: any) => String(c.event_id) === String(eventId));

  const filteredEvents = useMemo(() => {
    if (!events) return [];
    return events.filter((event: any) => {
      const coordNames = (eventCoordinators || [])
        .filter((c: any) => String(c.event_id) === String(event.id))
        .map((c: any) => c.name?.toLowerCase() || '')
        .join(' ');
      const matchesSearch =
        (event.title?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        coordNames.includes(searchQuery.toLowerCase());
      const matchesCategory = filterCategory === 'all' || event.category === filterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [events, eventCoordinators, searchQuery, filterCategory]);

  const handlePasswordChange = (eventId: string | number, value: string) => {
    setStagedPasswords(prev => ({ ...prev, [String(eventId)]: value }));
  };

  const handleGroupingToggle = (eventId: string | number, value: boolean) => {
    setStagedGrouping(prev => ({ ...prev, [String(eventId)]: value }));
  };

  const toggleShowPassword = (eventId: string | number) => {
    setShowPasswords(prev => ({ ...prev, [String(eventId)]: !prev[String(eventId)] }));
  };

  const getCurrentPassword = (event: any) => {
    return stagedPasswords[String(event.id)] !== undefined ? stagedPasswords[String(event.id)] : (event.coordinator_password || '');
  };

  const getCurrentGrouping = (event: any) => {
    return stagedGrouping[String(event.id)] !== undefined ? stagedGrouping[String(event.id)] : (event.special_grouping_enabled || false);
  };

  const hasUnsavedChanges = (eventId: string | number) => {
    const original = events?.find((e: any) => String(e.id) === String(eventId))?.coordinator_password || '';
    const staged = stagedPasswords[String(eventId)];
    return staged !== undefined && staged !== original;
  };

  const hasUnsavedChangesGrouping = (eventId: string | number) => {
    const original = events?.find((e: any) => String(e.id) === String(eventId))?.special_grouping_enabled || false;
    const staged = stagedGrouping[String(eventId)];
    return staged !== undefined && staged !== original;
  };

  const hasAnyUnsavedChanges = (eventId: string | number) => {
    return hasUnsavedChanges(eventId) || hasUnsavedChangesGrouping(eventId);
  };

  const totalUnsavedChanges = 
    Object.keys(stagedPasswords).filter(id => hasUnsavedChanges(id)).length + 
    Object.keys(stagedGrouping).filter(id => hasUnsavedChangesGrouping(id)).length;

  const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzZnFoYXNjcmR6YW9lYmh1b2hzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzUwMDE0MSwiZXhwIjoyMDczMDc2MTQxfQ.RiLXG5KPvN62KlnW1v8c2mVbg6Nu3bEYHjKUhvlSYJM';
  const SUPA_URL = 'https://isfqhascrdzaoebhuohs.supabase.co';

  const handleBulkSave = async () => {
    const changedEventIds = Array.from(new Set([
      ...Object.keys(stagedPasswords).filter(id => hasUnsavedChanges(id)),
      ...Object.keys(stagedGrouping).filter(id => hasUnsavedChangesGrouping(id))
    ]));

    if (changedEventIds.length === 0) return;

    // Validation
    const emptyPasswords = changedEventIds.filter(id => hasUnsavedChanges(id) && !stagedPasswords[id]?.trim());
    if (emptyPasswords.length > 0) {
      push({ message: 'Passwords cannot be empty', type: 'error' });
      return;
    }

    try {
      setIsSaving(true);
      push({ message: `Saving changes for ${changedEventIds.length} event${changedEventIds.length > 1 ? 's' : ''}...`, type: 'info' });

      // Use service-role key to bypass RLS (admin-only page, owner-gated)
      for (const eventId of changedEventIds) {
        const payload: any = {};
        if (hasUnsavedChanges(eventId)) {
          payload.coordinator_password = stagedPasswords[eventId];
        }
        if (hasUnsavedChangesGrouping(eventId)) {
          payload.special_grouping_enabled = stagedGrouping[eventId];
        }

        const resp = await fetch(
          `${SUPA_URL}/rest/v1/events?id=eq.${eventId}`,
          {
            method: 'PATCH',
            headers: {
              'apikey': SERVICE_KEY,
              'Authorization': `Bearer ${SERVICE_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation',
            },
            body: JSON.stringify(payload),
          }
        );
        if (!resp.ok) {
          const errText = await resp.text();
          throw new Error(errText || `Failed to save event ${eventId}`);
        }
      }

      push({ message: `✅ Successfully saved changes for ${changedEventIds.length} event${changedEventIds.length > 1 ? 's' : ''}!`, type: 'success' });
      setStagedPasswords({});
      setStagedGrouping({});
      // Refresh events so the table reflects the newly saved changes
      if (typeof refreshAll === 'function') refreshAll();
    } catch (error: any) {
      console.error('Error updating passwords:', error);
      push({ message: error?.message || 'Failed to update some passwords', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  // --- AI Scanner Integration ---
  
  // Basic fuzzy string matcher for event names
  const normalizeText = (text: string) => text.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  const handleAIScanComplete = (extractedData: ExtractedPasswordData[]) => {
    if (!events) return;
    
    let matchedCount = 0;
    const newStagedPasswords = { ...stagedPasswords };

    extractedData.forEach((extracted) => {
      if (!extracted.event_name || !extracted.password) return;
      
      const normalizedExtracted = normalizeText(extracted.event_name);
      
      // Find the best match in our database events
      const match = events.find((e: any) => {
        const normalizedDbTitle = normalizeText(e.title);
        // Direct inclusion check: Does "Hackathon 2026" contain "Hackathon"?
        return normalizedDbTitle.includes(normalizedExtracted) || normalizedExtracted.includes(normalizedDbTitle);
      });

      if (match) {
        // Only stage if we're actually changing it
        if ((match.coordinator_password || '') !== extracted.password) {
          newStagedPasswords[match.id] = extracted.password;
          matchedCount++;
        }
      }
    });

    setStagedPasswords(newStagedPasswords);
    setShowScanner(false);

    if (matchedCount > 0) {
      push({ message: `AI successfully matched and staged ${matchedCount} passwords!`, type: 'success' });
    } else {
      push({ message: 'AI scan complete, but no new passwords were automatically matched.', type: 'info' });
    }
  };

  if (!isOwner) {
    return (
      <div className="p-8 bg-white/5 border border-red-500/20 rounded-2xl backdrop-blur-sm">
        <div className="flex items-center gap-4 text-red-400">
          <div className="p-3 bg-red-500/10 rounded-xl">
            <ShieldCheck size={32} />
          </div>
          <div>
            <h3 className="font-bold text-xl text-white tracking-wide">Owner Access Required</h3>
            <p className="text-sm text-red-200/60 mt-1">Only the primary owner can manage and view coordinator passwords due to strict security policies.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      
      {/* Header & Stats */}
      <div className="bg-black/40 border border-white/10 rounded-2xl p-6 lg:p-8 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/10 via-teal-900/10 to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.15)]">
              <Lock className="w-8 h-8 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-3xl font-bold font-display text-white tracking-tight">Coordinator Access</h2>
              <p className="text-sm text-emerald-200/60 mt-1.5 font-medium max-w-md">
                Manage login credentials for all event coordinators. Changes must be saved explicitly.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowScanner(!showScanner)}
              className="px-5 py-2.5 bg-black/50 border border-emerald-500/30 text-emerald-400 font-bold rounded-xl hover:bg-emerald-500/10 hover:border-emerald-400 transition-all flex items-center gap-2 group"
            >
              <Wand2 size={18} className="group-hover:scale-110 group-hover:rotate-12 transition-transform" />
              {showScanner ? 'Close Scanner' : 'AI Bulk Scan'}
            </button>
            
            <button
              onClick={handleBulkSave}
              disabled={totalUnsavedChanges === 0 || isSaving}
              className={`
                px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg
                ${totalUnsavedChanges > 0 
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:-translate-y-0.5' 
                  : 'bg-white/5 text-white/30 cursor-not-allowed border border-white/5'
                }
              `}
            >
              {isSaving ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save size={18} />
              )}
              Save {totalUnsavedChanges > 0 ? `(${totalUnsavedChanges}) Changes` : 'Changes'}
            </button>
          </div>
        </div>
      </div>

      {/* AI Scanner Integration */}
      {showScanner && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-500">
          <AICoordinatorScanner 
            onScanComplete={handleAIScanComplete}
            onCancel={() => setShowScanner(false)}
          />
        </div>
      )}

      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1 group">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500/50 group-focus-within:text-emerald-400 transition-colors" />
          <input
            type="text"
            name="coordinator-event-search"
            autoComplete="new-password"
            placeholder="Search by event or coordinator name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
          />
        </div>

        {/* Filter */}
        <div className="relative min-w-[200px] group">
          <Filter size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500/50 group-focus-within:text-emerald-400 transition-colors pointer-events-none z-10" />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="w-full appearance-none bg-black/40 border border-white/10 rounded-xl py-3 pl-11 pr-10 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all cursor-pointer"
          >
            <option value="all">All Categories</option>
            {categories.map((cat, i) => (
              <option key={i} value={cat}>{cat}</option>
            ))}
          </select>
          <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
        </div>
      </div>

      {/* Database Table View */}
      <div className="bg-black/40 border border-white/10 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-emerald-500/20 bg-emerald-950/30">
                <th className="py-4 px-6 text-xs font-bold text-emerald-400/80 uppercase tracking-widest bg-emerald-950/20">Event Name</th>
                <th className="py-4 px-6 text-xs font-bold text-emerald-400/80 uppercase tracking-widest bg-emerald-950/20">Category</th>
                <th className="py-4 px-6 text-xs font-bold text-emerald-400/80 uppercase tracking-widest bg-emerald-950/20">Assigned Coordinator</th>
                <th className="py-4 px-6 text-xs font-bold text-emerald-400/80 uppercase tracking-widest bg-emerald-950/20">Manual Grouping</th>
                <th className="py-4 px-6 text-xs font-bold text-emerald-400/80 uppercase tracking-widest bg-emerald-950/20 w-[350px]">Login Password</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredEvents.map((event: any) => {
                const isUnsaved = hasAnyUnsavedChanges(event.id);
                const passwordVal = getCurrentPassword(event);
                const showPwd = showPasswords[event.id];

                return (
                  <tr 
                    key={event.id} 
                    className={`
                      group hover:bg-white/5 transition-colors
                      ${isUnsaved ? 'bg-emerald-900/10' : ''}
                    `}
                  >
                    <td className="py-4 px-6">
                      <div className="font-bold text-white mb-0.5">{event.title}</div>
                      <div className="text-xs text-white/40 flex items-center gap-2">
                        ID: {event.id}
                        {isUnsaved && (
                          <span className="bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-mono text-[10px] border border-emerald-500/30 animate-pulse">
                            STAGED
                          </span>
                        )}
                      </div>
                    </td>
                    
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-white/5 text-white/70 border border-white/10 group-hover:border-white/20 transition-colors">
                        {event.category}
                      </span>
                    </td>
                    
                    <td className="py-4 px-6">
                      {(() => {
                        const coords = getCoordinatorsForEvent(event.id);
                        if (coords.length === 0) {
                          return <span className="text-sm text-white/30 italic">Unassigned</span>;
                        }
                        return (
                          <div className="flex flex-col gap-1.5">
                            {coords.map((c: any) => (
                              <div key={c.id} className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-indigo-500/20 border border-indigo-500/50 flex items-center justify-center text-indigo-300 text-xs font-bold uppercase shrink-0">
                                  {c.name?.charAt(0) ?? '?'}
                                </div>
                                <div className="min-w-0">
                                  <span className="text-sm font-medium text-white/80 block truncate">{c.name}</span>
                                  {c.phone && (
                                    <span className="text-xs text-white/30 font-mono">{c.phone}</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </td>
                    
                    <td className="py-4 px-6">
                      <button
                        type="button"
                        onClick={() => handleGroupingToggle(event.id, !getCurrentGrouping(event))}
                        className={`w-11 h-6 rounded-full transition-all flex items-center p-1 cursor-pointer outline-none ${
                          getCurrentGrouping(event)
                            ? 'bg-emerald-500 justify-end'
                            : 'bg-white/10 justify-start'
                        }`}
                        title={getCurrentGrouping(event) ? 'Grouping enabled' : 'Grouping disabled'}
                      >
                        <motion.div 
                          layout
                          className="w-4 h-4 rounded-full bg-white shadow-md"
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        />
                      </button>
                    </td>
                    
                    <td className="py-4 px-6">
                      <div className="relative group/input">
                        <Lock size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${isUnsaved ? 'text-emerald-400' : 'text-white/30 group-focus-within/input:text-white/70'}`} />
                        <input
                          type={showPwd ? 'text' : 'password'}
                          value={passwordVal}
                          onChange={(e) => handlePasswordChange(event.id, e.target.value)}
                          placeholder="e.g. 123@Rajaevent"
                          className={`
                            w-full pl-9 pr-10 py-2.5 rounded-xl text-sm font-mono transition-all focus:outline-none focus:ring-2 
                            ${isUnsaved 
                              ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-300 focus:ring-emerald-500/50 focus:border-emerald-400' 
                              : 'bg-black/40 border-white/10 text-white placeholder-white/20 focus:ring-white/20 focus:border-white/30 hover:bg-white/5'
                            }
                          `}
                        />
                        <button
                          type="button"
                          onClick={() => toggleShowPassword(event.id)}
                          className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors
                            ${showPwd ? 'text-emerald-400' : isUnsaved ? 'text-emerald-500/50 hover:text-emerald-400' : 'text-white/30 hover:text-white/70'}
                          `}
                        >
                          {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredEvents.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-white/40">
                    <div className="flex flex-col items-center gap-3">
                      <Lock className="w-8 h-8 opacity-20" />
                      <p>No events found for "{searchQuery}"</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
    </div>
  );
};
