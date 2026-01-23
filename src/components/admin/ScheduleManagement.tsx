import { useState, useMemo, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { Plus, Trash2, Edit2, Save, X, Calendar, Clock, MapPin, Link as LinkIcon, AlertCircle, Mail } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';

export const ScheduleManagement = () => {
  const { schedule, addScheduleDay, deleteScheduleDay, addScheduleEvent, updateScheduleEvent, deleteScheduleEvent, events, siteSettings, updateSiteSettings } = useData();
  
  // Schedule Type State
  const [activeTab, setActiveTab] = useState<'prelims' | 'mains'>(siteSettings?.default_schedule_type || 'prelims');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
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

      const response = await fetch('/.netlify/functions/broadcast-schedule', {
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

  return (
    <div className="space-y-8 bg-gray-900 p-8 rounded-2xl shadow-2xl border border-gray-800">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Calendar className="text-cyan-400" />
          Schedule Management
        </h2>
        
        {/* Toggle TABS */}
        <div className="flex bg-white/5 rounded-lg p-1 border border-white/10">
            <button 
                onClick={() => setActiveTab('prelims')}
                className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'prelims' ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20' : 'text-gray-400 hover:text-white'}`}
            >
                PRELIMS
            </button>
            <button 
                onClick={() => setActiveTab('mains')}
                className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'mains' ? 'bg-purple-500 text-black shadow-lg shadow-purple-500/20' : 'text-gray-400 hover:text-white'}`}
            >
                MAINS
            </button>
        </div>

        {/* Set Default Button */}
        <button
            onClick={async () => {
                try {
                    await updateSiteSettings({ default_schedule_type: activeTab });
                    toast.success(`${activeTab.toUpperCase()} is now the default view`, {
                        icon: '📌',
                        style: { background: '#111', color: '#fff', border: '1px solid #333' }
                    });
                } catch (error) {
                    toast.error('Failed to update default view');
                }
            }}
            disabled={siteSettings?.default_schedule_type === activeTab}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black tracking-widest uppercase transition-all ${
                siteSettings?.default_schedule_type === activeTab 
                ? 'bg-green-500/20 text-green-400 border border-green-500/30 cursor-default' 
                : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 hover:text-white hover:border-white/20'
            }`}
        >
            {siteSettings?.default_schedule_type === activeTab ? (
                <>
                    <Save size={14} className="text-green-400" />
                    Currently Default
                </>
            ) : (
                <>
                    <LinkIcon size={14} />
                    Set as Default
                </>
            )}
        </button>

        <div className="flex flex-col items-end gap-3">
          {/* Email Stats Display */}
          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-1.5">
              <span className="text-green-400 font-bold">✓ {emailStats.sent}</span>
              <span className="text-gray-400">sent</span>
            </div>
            <div className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/30 rounded-lg px-3 py-1.5">
              <span className="text-orange-400 font-bold">⏳ {emailStats.pending}</span>
              <span className="text-gray-400">pending</span>
            </div>
            <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 rounded-lg px-3 py-1.5">
              <span className="text-blue-400 font-bold">👥 {emailStats.total}</span>
              <span className="text-gray-400">total</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
          <button
            onClick={handleBroadcastSchedule}
            disabled={isBroadcasting}
            className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-400 transition-colors flex items-center gap-2 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Mail size={18} />
            {isBroadcasting ? 'Sending...' : 'Broadcast Schedule'}
          </button>
          
          <button
            onClick={() => setIsAddingDay(true)}
            className="bg-cyan-500 text-black px-4 py-2 rounded-lg hover:bg-cyan-400 transition-colors flex items-center gap-2 font-bold"
          >
            <Plus size={18} /> Add Day
          </button>
        </div>
        </div>
      </div>

      {isAddingDay && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 animate-fade-in">
          <h3 className="text-lg font-bold text-white mb-4">Add Schedule Day ({activeTab.toUpperCase()})</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-gray-400 text-sm mb-1">Date</label>
              <input
                type="date"
                value={newDay.date}
                onChange={(e) => setNewDay({ ...newDay, date: e.target.value })}
                className="w-full bg-black/50 border border-white/20 rounded-lg p-2 text-white"
              />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1">Day Name</label>
              <input
                type="text"
                value={newDay.day}
                onChange={(e) => setNewDay({ ...newDay, day: e.target.value })}
                placeholder="e.g. Day 1 / Monday"
                className="w-full bg-black/50 border border-white/20 rounded-lg p-2 text-white"
              />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1">Title (Optional)</label>
              <input
                type="text"
                value={newDay.title}
                onChange={(e) => setNewDay({ ...newDay, title: e.target.value })}
                placeholder="e.g. Inauguration"
                className="w-full bg-black/50 border border-white/20 rounded-lg p-2 text-white"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setIsAddingDay(false)}
              className="px-4 py-2 rounded-lg text-gray-400 hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              onClick={handleAddDay}
              className="px-4 py-2 rounded-lg bg-cyan-500 text-black font-bold hover:bg-cyan-400"
            >
              Save Day
            </button>
          </div>
        </div>
      )}

      <div className="space-y-8">
        {filteredSchedule.map((day: any) => (
          <div key={day.id} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <div className="p-4 bg-white/5 border-b border-white/10 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-white">{day.date}</h3>
                <p className="text-cyan-400 font-medium">{day.day} <span className="text-gray-500 text-sm ml-2">{day.title}</span></p>
              </div>
              <div className="flex gap-2">
                <button
                   onClick={() => deleteScheduleDay(day.id)}
                   className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                   <Trash2 size={18} />
                </button>
              </div>
            </div>

            <div className="p-4 space-y-2">
              {day.events?.map((event: any) => (
                <div key={event.id} className="bg-black/30 rounded-lg p-4 border border-white/5 hover:border-white/10 transition-colors">
                  {editingEventId === event.id ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                           <label className="block text-xs text-gray-500 mb-1">Link Event (Optional)</label>
                           <select 
                             value={editForm.event_id || ''}
                             onChange={(e) => handleEventSelect(e, true)}
                             className="w-full bg-black border border-white/20 rounded-lg p-2 text-sm text-white"
                           >
                              <option value="">-- Manual Entry --</option>
                              {events.map((e:any) => <option key={e.id} value={e.id}>{e.title}</option>)}
                           </select>
                        </div>
                        <div>
                           <label className="block text-xs text-gray-500 mb-1">Title *</label>
                           <input
                             type="text"
                             value={editForm.title}
                             onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                             className="w-full bg-black border border-white/20 rounded-lg p-2 text-sm text-white"
                           />
                        </div>
                        <div>
                           <label className="block text-xs text-gray-500 mb-1">Time * (e.g. 9 AM - 1 PM)</label>
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
                             className="w-full bg-black border border-white/20 rounded-lg p-2 text-sm text-white"
                           />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Venue</label>
                            <input
                             type="text"
                             value={editForm.venue || ''}
                             onChange={(e) => setEditForm({ ...editForm, venue: e.target.value })}
                             placeholder="Main Hall"
                             className="w-full bg-black border border-white/20 rounded-lg p-2 text-sm text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Duration</label>
                            <input
                             type="text"
                             value={editForm.duration || ''}
                             onChange={(e) => setEditForm({ ...editForm, duration: e.target.value })}
                             placeholder="2 hours"
                             className="w-full bg-black border border-white/20 rounded-lg p-2 text-sm text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Type</label>
                            <input
                             type="text"
                             value={editForm.type || ''}
                             onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                             placeholder="Cultural"
                             className="w-full bg-black border border-white/20 rounded-lg p-2 text-sm text-white"
                            />
                        </div>
                       </div>
                       
                       <div className="flex gap-2 justify-end">
                         <button onClick={() => setEditingEventId(null)} className="px-4 py-2 rounded-lg text-gray-400 hover:bg-white/5 flex items-center gap-2">
                           <X size={18} /> Cancel
                         </button>
                         <button onClick={handleUpdateEvent} className="px-4 py-2 rounded-lg bg-green-500 text-white font-bold hover:bg-green-400 flex items-center gap-2">
                           <Save size={18} /> Save
                         </button>
                       </div>
                    </div>
                  ) : (
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                         <div className="flex items-center gap-2 mb-1">
                             <Clock size={14} className="text-cyan-400" />
                             <span className="font-mono text-cyan-300 font-bold">{formatDisplayTime(event.time)}</span>
                             {event.duration && <span className="text-gray-500 text-xs">({event.duration})</span>}
                         </div>
                         <h4 className="text-lg font-bold text-white">{event.title}</h4>
                         <div className="flex items-center gap-4 text-sm text-gray-400 mt-1">
                             {event.venue && <span className="flex items-center gap-1"><MapPin size={12} /> {event.venue}</span>}
                             {event.type && <span className="bg-white/10 px-2 py-0.5 rounded text-xs">{event.type}</span>}
                             {event.event_id && <span className="text-green-400 flex items-center gap-1 text-xs"><LinkIcon size={10} /> Linked</span>}
                         </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setEditingEventId(event.id); setEditForm({ ...event }); }}
                          className="p-2 text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => deleteScheduleEvent(event.id)}
                          className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Add Event Row */}
              {addingEventDayId === day.id ? (
                  <div className="bg-cyan-500/5 rounded-lg p-4 border border-cyan-500/20 animate-fade-in">
                      <h4 className="text-sm font-bold text-cyan-400 mb-3">Add New Event</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                           <div>
                              <label className="block text-xs text-gray-500 mb-1">Link Event (Optional)</label>
                              <select 
                                value={newEvent.event_id || ''}
                                onChange={(e) => handleEventSelect(e, false)}
                                className="w-full bg-black border border-white/20 rounded-lg p-2 text-sm text-white"
                              >
                                 <option value="">-- Manual Entry --</option>
                                 {events.map((e:any) => <option key={e.id} value={e.id}>{e.title}</option>)}
                              </select>
                           </div>
                           <div>
                               <label className="block text-xs text-gray-500 mb-1">Title *</label>
                               <input
                                type="text"
                                placeholder="Event Title"
                                value={newEvent.title}
                                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                                className="w-full bg-black border border-white/20 rounded-lg p-2 text-sm text-white placeholder-gray-600"
                               />
                           </div>
                           <div>
                               <label className="block text-xs text-gray-500 mb-1">Time * (e.g. 9 AM - 1 PM)</label>
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
                                className="w-full bg-black border border-white/20 rounded-lg p-2 text-sm text-white placeholder-gray-600"
                               />
                           </div>
                           <div>
                               <label className="block text-xs text-gray-500 mb-1">Venue</label>
                               <input
                                type="text"
                                placeholder="Main Hall"
                                value={newEvent.venue}
                                onChange={(e) => setNewEvent({ ...newEvent, venue: e.target.value })}
                                className="w-full bg-black border border-white/20 rounded-lg p-2 text-sm text-white placeholder-gray-600"
                               />
                           </div>
                           <div>
                               <label className="block text-xs text-gray-500 mb-1">Duration</label>
                               <input
                                type="text"
                                placeholder="2 hours"
                                value={newEvent.duration}
                                onChange={(e) => setNewEvent({ ...newEvent, duration: e.target.value })}
                                className="w-full bg-black border border-white/20 rounded-lg p-2 text-sm text-white placeholder-gray-600"
                               />
                           </div>
                           <div>
                               <label className="block text-xs text-gray-500 mb-1">Type</label>
                               <input
                                type="text"
                                placeholder="Cultural"
                                value={newEvent.type}
                                onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value })}
                                className="w-full bg-black border border-white/20 rounded-lg p-2 text-sm text-white placeholder-gray-600"
                               />
                           </div>
                       </div>
                       <div className="flex gap-2 justify-end mt-4">
                           <button onClick={() => setAddingEventDayId(null)} className="px-4 py-2 text-sm rounded-lg bg-gray-800 text-gray-300">Cancel</button>
                           <button onClick={() => handleAddEvent(day.id)} className="px-4 py-2 text-sm rounded-lg bg-cyan-500 text-black font-bold">Save Event</button>
                       </div>
                  </div>
              ) : (
                <button
                    onClick={() => setAddingEventDayId(day.id)}
                    className="w-full py-3 border-2 border-dashed border-white/10 rounded-lg text-gray-500 hover:border-cyan-500/50 hover:text-cyan-400 hover:bg-cyan-500/5 transition-all flex justify-center items-center gap-2"
                >
                    <Plus size={18} /> Add Event to {day.day}
                </button>
              )}
            </div>
          </div>
        ))}
        
        {filteredSchedule.length === 0 && (
             <div className="text-center py-12 bg-white/5 rounded-xl border border-white/10">
                 <AlertCircle className="mx-auto text-gray-600 mb-2" />
                 <p className="text-gray-500">No {activeTab} schedule days found.</p>
             </div>
        )}
      </div>
    </div>
  );
};
