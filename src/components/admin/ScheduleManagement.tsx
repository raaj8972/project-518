import { useState, useMemo, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { Plus, Trash2, Edit2, Save, X, Calendar, Clock, MapPin, Link as LinkIcon, Mail, Loader2, BarChart2, ScanText } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { AIScheduleScanner } from './schedule/AIScheduleScanner';

export const ScheduleManagement = () => {
  const { schedule, addScheduleDay, deleteScheduleDay, addScheduleEvent, updateScheduleEvent, deleteScheduleEvent, events, siteSettings, updateSiteSettings } = useData();
  
  // Schedule Type State
  const [activeTab, setActiveTab] = useState<'prelims' | 'mains'>(siteSettings?.default_schedule_type || 'prelims');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [isProcessingImport, setIsProcessingImport] = useState(false);
  const [emailStats, setEmailStats] = useState({ sent: 0, pending: 0, total: 0 });

  // Fetch email statistics
  useEffect(() => {
    const fetchEmailStats = async () => {
      try {
        // Get total approved registrations (unique emails)
        const { data: registrations } = await supabase
          .from('registrations')
          .select('email')
          .eq('status', 'approved');
        
        const uniqueEmails = new Set(registrations?.map((r: any) => r.email.toLowerCase()) || []);
        const total = uniqueEmails.size;
        
        // Get unique emails that received broadcast in last 24 hours
        const { data: sentEmails, error: logError } = await supabase
          .from('email_logs')
          .select('recipient_email, sent_at')
          .eq('email_type', 'schedule_broadcast');
        
        if (logError) {
          console.error('Error fetching email_logs details:', logError);
          console.error('Error message:', logError.message);
          console.error('Error details:', logError.details);
          console.error('Error hint:', logError.hint);
        }

        const sentEmailSet = new Set(sentEmails?.map((e: any) => e.recipient_email.toLowerCase()) || []);
        console.log('Unique sent emails:', sentEmailSet.size);
        
        // Only count sent emails that match current approved registrations
        let validSentCount = 0;
        uniqueEmails.forEach(email => {
            if (sentEmailSet.has(email)) validSentCount++;
        });
        console.log('Valid intersection count:', validSentCount);
        
        setEmailStats({
          sent: validSentCount,
          pending: total - validSentCount,
          total: total
        });
      } catch (error) {
        console.error('[ScheduleManagement] Failed to fetch email stats:', error);
      }
    };
    
    fetchEmailStats();
    
    // Refresh stats every 30 seconds as fallback
    const interval = setInterval(fetchEmailStats, 30000);

    // Subscribe to realtime changes
    const channel = supabase
      .channel('email_stats_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'email_logs', filter: 'email_type=eq.schedule_broadcast' },
        () => {
             fetchEmailStats();
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  const [isAddingDay, setIsAddingDay] = useState(false);
  const [newDay, setNewDay] = useState({ date: '', day: '', title: '' });
  
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  
  const [addingEventDayId, setAddingEventDayId] = useState<number | null>(null);
  const [newEvent, setNewEvent] = useState({ 
    title: '', 
    time: '', 
    venue: '', 
    type: '', 
    duration: '',
    event_id: '' 
  });

  // Helper: Auto-calculate duration from time range (e.g., "9 AM - 1 PM" → "4 hours")
  const calculateDuration = (timeStr: string): string => {
    if (!timeStr) return '';
    
    // Match patterns like "9 AM - 1 PM" or "9:00 AM - 1:30 PM" or "09:00 - 13:00"
    const rangeMatch = timeStr.match(/(\d{1,2})(?::(\d{2}))?\s*([AaPp][Mm])?\s*[-–—to]+\s*(\d{1,2})(?::(\d{2}))?\s*([AaPp][Mm])?/i);
    
    if (!rangeMatch) return ''; // Not a time range
    
    try {
      let startHour = parseInt(rangeMatch[1], 10);
      const startMin = rangeMatch[2] ? parseInt(rangeMatch[2], 10) : 0;
      const startPeriod = rangeMatch[3]?.toLowerCase();
      
      let endHour = parseInt(rangeMatch[4], 10);
      const endMin = rangeMatch[5] ? parseInt(rangeMatch[5], 10) : 0;
      const endPeriod = rangeMatch[6]?.toLowerCase();
      
      // Convert to 24-hour format if AM/PM present
      if (startPeriod) {
        if (startPeriod === 'pm' && startHour !== 12) startHour += 12;
        if (startPeriod === 'am' && startHour === 12) startHour = 0;
      }
      if (endPeriod) {
        if (endPeriod === 'pm' && endHour !== 12) endHour += 12;
        if (endPeriod === 'am' && endHour === 12) endHour = 0;
      }
      
      // Calculate total minutes
      const startTotalMin = startHour * 60 + startMin;
      let endTotalMin = endHour * 60 + endMin;
      
      // Handle overnight events (end time is next day)
      if (endTotalMin <= startTotalMin) {
        endTotalMin += 24 * 60;
      }
      
      const durationMin = endTotalMin - startTotalMin;
      const hours = Math.floor(durationMin / 60);
      const mins = durationMin % 60;
      
      if (hours === 0 && mins === 0) return '';
      if (mins === 0) return `${hours} hour${hours !== 1 ? 's' : ''}`;
      if (hours === 0) return `${mins} min${mins !== 1 ? 's' : ''}`;
      return `${hours} hour${hours !== 1 ? 's' : ''} ${mins} min${mins !== 1 ? 's' : ''}`;
      
    } catch (e) {
      return ''; // Failed to parse
    }
  };

  // Auto-fill details when an event is selected
  const handleEventSelect = (e: React.ChangeEvent<HTMLSelectElement>, isEdit: boolean) => {
      const selectedEventId = parseInt(e.target.value);
      const selectedEvent = events.find((ev: any) => ev.id === selectedEventId);
      
      if (selectedEvent) {
          const updates = {
              title: selectedEvent.title,
              venue: selectedEvent.venue || '',
              type: selectedEvent.category || '',
              time: selectedEvent.time ? String(selectedEvent.time) : '',
              event_id: selectedEventId
          };

          if (isEdit) {
              setEditForm((prev: any) => ({ ...prev, ...updates }));
          } else {
              setNewEvent((prev: any) => ({ ...prev, ...updates }));
          }
      } else {
          if (isEdit) {
              setEditForm((prev: any) => ({ ...prev, event_id: '' }));
          } else {
              setNewEvent((prev: any) => ({ ...prev, event_id: '' }));
          }
      }
  };

  const handleAddDay = async () => {
    if (!newDay.date || !newDay.day) {
        toast.error('Date and Day are required');
        return;
    }
    try {
        await addScheduleDay({
            ...newDay,
            schedule_type: activeTab
        });
        setIsAddingDay(false);
        setNewDay({ date: '', day: '', title: '' });
        toast.success('Schedule day added');
    } catch (error) {
        console.error('[ScheduleManagement] Add day failed:', error);
        toast.error('Failed to add day');
    }
  };

  const handleAddEvent = async (dayId: number) => {
    if (!newEvent.title || !newEvent.time) {
        toast.error('Title and Time are required');
        return;
    }
    try {
        // Build payload - time is stored as-is (TEXT column)
        const payload: any = {
            title: newEvent.title,
            time: newEvent.time, // Pass directly - no normalization needed
            venue: newEvent.venue || null,
            type: newEvent.type || null,
            duration: newEvent.duration || null,
            event_id: newEvent.event_id ? parseInt(String(newEvent.event_id)) : null
        };

        console.log('[ScheduleManagement] Adding event:', payload);
        await addScheduleEvent(dayId, payload);
        
        setAddingEventDayId(null);
        setNewEvent({ 
          title: '', 
          time: '', 
          venue: '', 
          type: '', 
          duration: '',
          event_id: '' 
        });
        toast.success('Event added to schedule');
    } catch (error) {
        console.error('[ScheduleManagement] Add event failed:', error);
        toast.error(`Failed to add event: ${(error as any)?.message || 'Unknown error'}`);
    }
  };

  const handleUpdateEvent = async () => {
      if (!editForm.title || !editForm.time) {
         toast.error('Title and Time are required');
         return;
      }
      try {
          // Build payload - time is stored as-is (TEXT column)
          const payload: any = {
              title: editForm.title,
              time: editForm.time, // Pass directly - no normalization needed
              venue: editForm.venue || null,
              type: editForm.type || null,
              duration: editForm.duration || null,
              event_id: editForm.event_id ? parseInt(String(editForm.event_id)) : null
          };
          
          console.log('[ScheduleManagement] Updating event:', payload);
          await updateScheduleEvent(editingEventId!, payload);
          
          setEditingEventId(null);
          toast.success('Event updated');
      } catch (error) {
          console.error('[ScheduleManagement] Update event failed:', error);
          toast.error(`Failed to update event: ${(error as any)?.message || 'Unknown error'}`);
      }
  };

  const handleBroadcastSchedule = async () => {
    const confirmed = window.confirm(
      `Send schedule to all approved registrations?\n\nThis will send an email with the complete schedule to all approved participants.`
    );
    
    if (!confirmed) return;

    setIsBroadcasting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in to broadcast schedule');
        return;
      }

      const response = await fetch('/api/broadcast-schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ provider: 'smtp' })
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        if (text.trim().startsWith('<')) {
            throw new Error('Broadcast function not found. Are you running "npm run dev:netlify"? (HTML response received)');
        }
        throw new Error(`Invalid server response: ${text.substring(0, 100)}`);
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to broadcast schedule');
      }

      toast.success(
        `Schedule sent successfully!\n${result.sent} emails sent, ${result.failed || 0} failed`,
        { duration: 5000 }
      );
    } catch (error: any) {
      console.error('[ScheduleManagement] Broadcast failed:', error);
      toast.error(`Failed to broadcast: ${error.message}`);
    } finally {
      setIsBroadcasting(false);
    }
  };

  const formatDisplayTime = (time: string) => {
      if (!time) return 'TBA';
      // Return raw text as-is for display
      return time;
  };

  // Filter days by active tab
  const filteredSchedule = useMemo(() => {
    return schedule.filter((day: any) => (day.schedule_type || 'prelims') === activeTab);
  }, [schedule, activeTab]);

  const handleScanComplete = async (scannedSchedule: any[], scannedType: 'prelims' | 'mains') => {
    setShowScanner(false);
    setIsProcessingImport(true);
    const toastId = toast.loading(`Importing ${scannedType.toUpperCase()} schedule into database...`);
    
    try {
      let daysCount = 0;
      let eventsCount = 0;
      
      for (const day of scannedSchedule) {
        // Find existing day or create a new one
        const existingDay = schedule.find((d: any) => 
            d.date === day.date && d.day === day.day
        );
        
        let targetDayId = existingDay?.id;
        
        if (!targetDayId) {
            // Tag the title with schedule type for filtering
            const dayTitle = day.title 
              ? `[${scannedType.toUpperCase()}] ${day.title}` 
              : `[${scannedType.toUpperCase()}]`;
              
            const addedDays: any = await addScheduleDay({
              date: day.date || new Date().toISOString().split('T')[0],
              day: day.day || 'Day 1',
              title: dayTitle
            });
            targetDayId = addedDays?.[0]?.id;
            daysCount++;
        }
        
        if (!targetDayId) {
            console.error('Could not determine Day ID for', day);
            continue;
        }
        
        // Add events
        if (Array.isArray(day.events)) {
           for (const evt of day.events) {
              await addScheduleEvent(targetDayId, {
                  title: evt.title || 'Untitled Event',
                  time: evt.time || 'TBA',
                  venue: evt.venue || '',
                  type: evt.type || '',
                  duration: evt.duration || ''
              });
              eventsCount++;
           }
        }
      }
      
      toast.success(`${scannedType.toUpperCase()} schedule imported! Created ${daysCount} days and ${eventsCount} events.`, { id: toastId });
    } catch (error: any) {
      console.error('[ScheduleManagement] Scan import failed:', error);
      toast.error(`Import failed: ${error.message}`, { id: toastId });
    } finally {
      setIsProcessingImport(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            <div className="w-1.5 h-8 bg-gradient-to-b from-cyan-400 to-blue-600 rounded-full" />
            Schedule Management
          </h2>
          <p className="text-gray-400 mt-1">Manage event timelines and broadcasts</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          {/* TABS & Default Toggle */}
          <div className="flex items-center gap-3 bg-[#181824]/60 backdrop-blur-md p-1.5 rounded-xl border border-white/5">
            <div className="flex p-1 bg-black/40 rounded-lg">
              <button 
                  onClick={() => setActiveTab('prelims')}
                  className={`px-4 sm:px-6 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all uppercase tracking-widest ${
                    activeTab === 'prelims' 
                      ? 'bg-gradient-to-r from-cyan-600 to-cyan-500 text-white shadow-lg shadow-cyan-500/20' 
                      : 'text-gray-500 hover:text-white'
                  }`}
              >
                  Prelims
              </button>
              <button 
                  onClick={() => setActiveTab('mains')}
                  className={`px-4 sm:px-6 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all uppercase tracking-widest ${
                    activeTab === 'mains' 
                      ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-lg shadow-purple-500/20' 
                      : 'text-gray-500 hover:text-white'
                  }`}
              >
                  Mains
              </button>
            </div>

            <div className="w-px h-8 bg-white/10 mx-1" />

            <button
              onClick={async () => {
                  try {
                      // Try DB first, fallback to localStorage
                      try {
                        await updateSiteSettings({ default_schedule_type: activeTab });
                      } catch {
                        localStorage.setItem('default_schedule_type', activeTab);
                      }
                      toast.success(`${activeTab.toUpperCase()} is now the default view`);
                  } catch (error) {
                      toast.error('Failed to update default view');
                  }
              }}
              disabled={siteSettings?.default_schedule_type === activeTab}
              className={`p-2 rounded-lg transition-all ${
                  siteSettings?.default_schedule_type === activeTab 
                  ? 'text-green-400 bg-green-500/10 cursor-default' 
                  : 'text-gray-500 hover:text-white hover:bg-white/5'
              }`}
              title={siteSettings?.default_schedule_type === activeTab ? "Currently Default View" : "Set as Default View"}
            >
              <Save size={18} />
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
             <button
              onClick={() => setShowScanner(true)}
              className="bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-5 py-2.5 rounded-xl hover:bg-indigo-500/30 transition-all flex items-center justify-center gap-2 font-bold shadow-lg text-sm uppercase tracking-widest"
            >
              <ScanText size={16} /> <span className="hidden sm:inline">AI Scan</span>
            </button>
             <button
              onClick={() => setIsAddingDay(true)}
              className="bg-[#181824]/60 backdrop-blur-md border border-white/5 text-white px-5 py-2.5 rounded-xl hover:bg-white/5 transition-all flex items-center justify-center gap-2 font-bold shadow-lg text-sm uppercase tracking-widest"
            >
              <Plus size={16} /> <span className="hidden sm:inline">Add Day</span>
            </button>
             <button
              onClick={handleBroadcastSchedule}
              disabled={isBroadcasting}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-6 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 font-bold shadow-lg shadow-purple-900/20 text-sm uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isBroadcasting ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
              <span className="hidden sm:inline">{isBroadcasting ? 'Sending...' : 'Broadcast'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#181824]/40 backdrop-blur-sm border border-emerald-500/20 rounded-xl p-4 flex items-center gap-4 group hover:bg-emerald-500/5 transition-colors">
          <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 group-hover:scale-110 transition-transform">
             <Mail className="text-emerald-400" size={20} />
          </div>
          <div>
             <p className="text-xs font-bold text-emerald-500/60 uppercase tracking-widest">Sent</p>
             <p className="text-2xl font-bold text-white">{emailStats.sent}</p>
          </div>
        </div>
        
        <div className="bg-[#181824]/40 backdrop-blur-sm border border-amber-500/20 rounded-xl p-4 flex items-center gap-4 group hover:bg-amber-500/5 transition-colors">
          <div className="w-12 h-12 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/20 group-hover:scale-110 transition-transform">
             <Clock className="text-amber-400" size={20} />
          </div>
          <div>
             <p className="text-xs font-bold text-amber-500/60 uppercase tracking-widest">Pending</p>
             <p className="text-2xl font-bold text-white">{emailStats.pending}</p>
          </div>
        </div>
        
        <div className="bg-[#181824]/40 backdrop-blur-sm border border-blue-500/20 rounded-xl p-4 flex items-center gap-4 group hover:bg-blue-500/5 transition-colors">
          <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20 group-hover:scale-110 transition-transform">
             <BarChart2 className="text-blue-400" size={20} />
          </div>
          <div>
             <p className="text-xs font-bold text-blue-500/60 uppercase tracking-widest">Total Users</p>
             <p className="text-2xl font-bold text-white">{emailStats.total}</p>
          </div>
        </div>
      </div>

      {showScanner && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
             <AIScheduleScanner 
                onScanComplete={handleScanComplete} 
                onCancel={() => setShowScanner(false)} 
             />
         </div>
      )}

      {isAddingDay && (
        <div className="bg-[#181824]/60 backdrop-blur-md border border-white/5 rounded-2xl p-6 md:p-8 animate-in slide-in-from-top-4 duration-300 mb-8 border-l-4 border-l-cyan-500">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-10 h-10 bg-cyan-500/10 rounded-xl flex items-center justify-center border border-cyan-500/20">
               <Plus className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
               <h3 className="text-xl font-bold text-white tracking-tight">Add {activeTab === 'prelims' ? 'Prelims' : 'Mains'} Day</h3>
               <p className="text-sm text-gray-400">Create a new day for the schedule</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Date *</label>
              <input
                type="date"
                value={newDay.date}
                onChange={(e) => setNewDay({ ...newDay, date: e.target.value })}
                className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Day Name *</label>
              <input
                type="text"
                value={newDay.day}
                onChange={(e) => setNewDay({ ...newDay, day: e.target.value })}
                placeholder="e.g. Day 1 / Monday"
                className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white placeholder-gray-600 transition-all font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Title (Optional)</label>
              <input
                type="text"
                value={newDay.title}
                onChange={(e) => setNewDay({ ...newDay, title: e.target.value })}
                placeholder="e.g. Inauguration"
                className="w-full px-4 py-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white placeholder-gray-600 transition-all"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 border-t border-white/5 pt-6">
            <button
              onClick={() => setIsAddingDay(false)}
              className="px-6 py-2.5 rounded-xl font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-all text-sm uppercase tracking-widest"
            >
              Cancel
            </button>
            <button
              onClick={handleAddDay}
              className="px-8 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black rounded-xl font-bold shadow-lg shadow-cyan-500/20 transition-all text-sm uppercase tracking-widest"
            >
              Save Day
            </button>
          </div>
        </div>
      )}

      <div className="space-y-8">
        {filteredSchedule.map((day: any) => (
          <div key={day.id} className="bg-[#181824]/60 backdrop-blur-md border border-white/5 rounded-2xl overflow-hidden shadow-xl">
            {/* Day Header */}
            <div className="p-6 bg-gradient-to-r from-gray-900 to-gray-900/50 border-b border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-2xl font-bold text-white tracking-tight">{day.date}</h3>
                <div className="flex items-center gap-3 mt-1">
                  <span className="px-2 py-0.5 rounded-md bg-white/5 text-cyan-400 text-xs font-bold uppercase tracking-wider">{day.day}</span>
                  {day.title && <span className="text-gray-500 text-sm font-medium border-l border-white/10 pl-3">{day.title}</span>}
                </div>
              </div>
              <button
                 onClick={() => deleteScheduleDay(day.id)}
                 className="p-2 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                 title="Delete Day"
              >
                 <Trash2 size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {day.events?.map((event: any) => (
                <div key={event.id} className="group relative">
                  {/* Connector Line */}
                  <div className="absolute left-[19px] top-8 bottom-[-16px] w-[2px] bg-white/5 group-last:hidden" />
                  
                  {editingEventId === event.id ? (
                    <div className="bg-[#181824] rounded-xl p-6 border border-cyan-500/30 shadow-lg shadow-cyan-900/10 mb-4 animate-in fade-in zoom-in-95 duration-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                        <div className="col-span-1 lg:col-span-3 pb-4 border-b border-white/5 mb-2">
                           <h5 className="text-xs font-bold text-cyan-500 uppercase tracking-widest mb-1">Edit Event</h5>
                        </div>
                        <div>
                           <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Link Event Data</label>
                           <select 
                             value={editForm.event_id || ''}
                             onChange={(e) => handleEventSelect(e, true)}
                             className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                           >
                              <option value="">-- Manual Entry --</option>
                              {events.map((e:any) => <option key={e.id} value={e.id}>{e.title}</option>)}
                           </select>
                        </div>
                        <div>
                           <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Title *</label>
                           <input
                             type="text"
                             value={editForm.title}
                             onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                             className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 font-bold"
                           />
                        </div>
                        <div>
                           <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Time *</label>
                           <input
                             type="text"
                             value={editForm.time}
                             onChange={(e) => {
                               const newTime = e.target.value;
                               const autoDuration = calculateDuration(newTime);
                               setEditForm({ 
                                 ...editForm, 
                                 time: newTime,
                                 duration: autoDuration || editForm.duration
                               });
                             }}
                             placeholder="9 AM - 1 PM"
                             className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono"
                           />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Venue</label>
                            <input
                             type="text"
                             value={editForm.venue || ''}
                             onChange={(e) => setEditForm({ ...editForm, venue: e.target.value })}
                             placeholder="Main Hall"
                             className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Duration</label>
                            <input
                             type="text"
                             value={editForm.duration || ''}
                             onChange={(e) => setEditForm({ ...editForm, duration: e.target.value })}
                             placeholder="2 hours"
                             className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Type</label>
                            <input
                             type="text"
                             value={editForm.type || ''}
                             onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                             placeholder="Cultural"
                             className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                            />
                        </div>
                       </div>
                       
                       <div className="flex gap-3 justify-end pt-4 border-t border-white/5">
                         <button onClick={() => setEditingEventId(null)} className="px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 text-xs font-bold uppercase tracking-widest transition-all">
                           Cancel
                         </button>
                         <button onClick={handleUpdateEvent} className="px-6 py-2 rounded-lg bg-green-500 hover:bg-green-400 text-white text-xs font-bold uppercase tracking-widest transition-all shadow-lg shadow-green-500/20 flex items-center gap-2">
                           <Save size={14} /> Save Changes
                         </button>
                       </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-4 p-3 rounded-xl hover:bg-white/[0.02] transition-colors border border-transparent hover:border-white/5">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border mt-1 ${
                        event.type?.toLowerCase().includes('break') || event.type?.toLowerCase().includes('lunch')
                          ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                          : 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
                      }`}>
                        <Clock size={18} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                         <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                               <div className="flex items-center gap-2 mb-1">
                                   <span className="font-mono text-cyan-300 font-bold text-sm tracking-tight">{formatDisplayTime(event.time)}</span>
                                   {event.duration && <span className="text-gray-500 text-xs font-mono">({event.duration})</span>}
                               </div>
                               <h4 className="text-lg font-bold text-white leading-tight">{event.title}</h4>
                            </div>
                            
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => { setEditingEventId(event.id); setEditForm({ ...event }); }}
                                className="p-2 text-cyan-400 hover:text-white hover:bg-cyan-500/20 rounded-lg transition-all"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => deleteScheduleEvent(event.id)}
                                className="p-2 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                         </div>
                         
                         <div className="flex flex-wrap items-center gap-3 mt-2">
                             {event.venue && (
                               <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5 border border-white/5">
                                 <MapPin size={12} className="text-gray-400" /> 
                                 <span className="text-xs text-gray-300">{event.venue}</span>
                               </div>
                             )}
                             {event.type && (
                               <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border ${
                                 event.type.toLowerCase().includes('break') 
                                   ? 'bg-amber-500/5 border-amber-500/10 text-amber-500' 
                                   : 'bg-blue-500/5 border-blue-500/10 text-blue-400'
                               }`}>
                                 {event.type}
                               </span>
                             )}
                             {event.event_id && (
                               <span className="text-green-400 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-green-500/5 border border-green-500/10 px-2 py-1 rounded-md">
                                 <LinkIcon size={10} /> Linked
                               </span>
                             )}
                         </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Add Event Row */}
              {addingEventDayId === day.id ? (
                  <div className="bg-[#181824] rounded-xl p-6 border border-white/10 shadow-xl animate-in slide-in-from-top-2 duration-200 ml-14 relative">
                      {/* Connector Line */}
                      <div className="absolute left-[-27px] top-8 w-4 h-[2px] bg-cyan-500/30" />
                      <div className="absolute left-[-31px] top-[29px] w-2 h-2 rounded-full bg-cyan-500" />
                      
                      <div className="flex items-center gap-2 mb-6 pb-4 border-b border-white/5">
                        <Plus className="text-cyan-400" size={18} />
                        <h4 className="text-sm font-bold text-white uppercase tracking-widest">Add New Event</h4>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                           <div>
                              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Link Event Data</label>
                              <select 
                                value={newEvent.event_id || ''}
                                onChange={(e) => handleEventSelect(e, false)}
                                className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                              >
                                 <option value="">-- Manual Entry --</option>
                                 {events.map((e:any) => <option key={e.id} value={e.id}>{e.title}</option>)}
                              </select>
                           </div>
                           <div>
                               <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Title *</label>
                               <input
                                type="text"
                                placeholder="Event Title"
                                value={newEvent.title}
                                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                                className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-sm text-white font-bold focus:outline-none focus:ring-1 focus:ring-cyan-500"
                               />
                           </div>
                           <div>
                               <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Time *</label>
                               <input
                                type="text"
                                placeholder="9 AM - 1 PM"
                                value={newEvent.time}
                                onChange={(e) => {
                                  const newTime = e.target.value;
                                  const autoDuration = calculateDuration(newTime);
                                  setNewEvent({ 
                                    ...newEvent, 
                                    time: newTime,
                                    duration: autoDuration || newEvent.duration
                                  });
                                }}
                                className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-sm text-white font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500"
                               />
                           </div>
                           <div>
                               <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Venue</label>
                               <input
                                type="text"
                                placeholder="Main Hall"
                                value={newEvent.venue}
                                onChange={(e) => setNewEvent({ ...newEvent, venue: e.target.value })}
                                className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                               />
                           </div>
                           <div>
                               <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Duration</label>
                               <input
                                type="text"
                                placeholder="2 hours"
                                value={newEvent.duration}
                                onChange={(e) => setNewEvent({ ...newEvent, duration: e.target.value })}
                                className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                               />
                           </div>
                           <div>
                               <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Type</label>
                               <input
                                type="text"
                                placeholder="Cultural"
                                value={newEvent.type}
                                onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value })}
                                className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                               />
                           </div>
                       </div>
                       <div className="flex gap-3 justify-end mt-6 border-t border-white/5 pt-4">
                           <button onClick={() => setAddingEventDayId(null)} className="px-6 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 text-xs font-bold uppercase tracking-widest transition-all">Cancel</button>
                           <button onClick={() => handleAddEvent(day.id)} className="px-6 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold uppercase tracking-widest transition-all shadow-lg shadow-cyan-500/20">Save Event</button>
                       </div>
                  </div>
              ) : (
                <div className="ml-14 mt-4 relative group/add">
                    <div className="absolute left-[-27px] top-[50%] w-4 h-[2px] bg-white/5 group-hover/add:bg-cyan-500/30 transition-colors" />
                    <button
                        onClick={() => setAddingEventDayId(day.id)}
                        className="w-full py-3 border border-dashed border-white/10 rounded-xl text-xs font-bold text-gray-500 hover:border-cyan-500/30 hover:text-cyan-400 hover:bg-cyan-500/5 transition-all flex justify-center items-center gap-2 uppercase tracking-widest"
                    >
                        <Plus size={14} /> Add Event
                    </button>
                </div>
              )}
            </div>
          </div>
        ))}
        
        {filteredSchedule.length === 0 && (
             <div className="text-center py-20 bg-[#181824]/40 border-2 border-dashed border-white/5 rounded-3xl">
                 <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Calendar className="text-gray-600" size={32} />
                 </div>
                 <h3 className="text-lg font-bold text-white mb-1">No {activeTab} Schedule</h3>
                 <p className="text-gray-500 text-sm">Add a day to start building the {activeTab} schedule.</p>
             </div>
        )}
      </div>
    </div>
  );
};
