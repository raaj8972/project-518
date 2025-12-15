import { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { Plus, Trash2, Edit2, Save, X, Calendar, Clock, MapPin, Link as LinkIcon, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

export const ScheduleManagement = () => {
  const { schedule, addScheduleDay, deleteScheduleDay, addScheduleEvent, updateScheduleEvent, deleteScheduleEvent, events } = useData();
  
  // Schedule Type State
  const [activeTab, setActiveTab] = useState<'prelims' | 'mains'>('prelims');

  const [isAddingDay, setIsAddingDay] = useState(false);
  const [newDay, setNewDay] = useState({ date: '', day: '', title: '' });
  
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  
  const [addingEventDayId, setAddingEventDayId] = useState<number | null>(null);
  const [newEvent, setNewEvent] = useState({ title: '', time: '', venue: '', type: '', event_id: '' });

  // Function to auto-fill details when an event is selected
  const handleEventSelect = (e: React.ChangeEvent<HTMLSelectElement>, isEdit: boolean) => {
      const selectedEventId = parseInt(e.target.value);
      const selectedEvent = events.find((ev: any) => ev.id === selectedEventId);
      
      if (selectedEvent) {
          const updates = {
              title: selectedEvent.title,
              venue: selectedEvent.venue || '',
              type: selectedEvent.category || '',
              // Convert event time to string if needed, or keep blank if null
              time: selectedEvent.time ? String(selectedEvent.time) : '',
              event_id: selectedEventId
          };

          if (isEdit) {
              setEditForm((prev: any) => ({ ...prev, ...updates }));
          } else {
              setNewEvent((prev: any) => ({ ...prev, ...updates }));
          }
      } else {
          // If cleared
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
        toast.error('Failed to add day');
    }
  };
  const handleAddEvent = async (dayId: number) => {
    if (!newEvent.title || !newEvent.time) {
        toast.error('Title and Time are required');
        return;
    }
    try {
        const payload: any = {
            ...newEvent,
            schedule_day_id: dayId,
            event_id: newEvent.event_id ? parseInt(String(newEvent.event_id)) : null
        };
        // Remove empty strings
        if (!payload.venue) delete payload.venue;
        if (!payload.type) delete payload.type;

        await addScheduleEvent(dayId, payload);
        setAddingEventDayId(null);
        setNewEvent({ title: '', time: '', venue: '', type: '', event_id: '' });
        toast.success('Event added to schedule');
    } catch (error) {
        toast.error('Failed to add event');
    }
  };

  const handleUpdateEvent = async () => {
      if (!editForm.title || !editForm.time) return;
      try {
          const payload: any = {
              ...editForm,
              event_id: editForm.event_id ? parseInt(String(editForm.event_id)) : null
          };
          await updateScheduleEvent(editingEventId!, payload);
          setEditingEventId(null);
          toast.success('Event updated');
      } catch (error) {
          toast.error('Failed to update event');
      }
  };

  const formatDisplayTime = (time: string, _duration?: string) => {
      if (!time) return 'TBA';
      // Just return raw text for admin view if it looks like a range
      if (time.includes('-') || time.toLowerCase().includes('tba') || time.toLowerCase().includes('to')) return time;
      
      // Attempt to format standard times
      try {
           const match = time.match(/(\d{1,2})(?::(\d{2}))?\s*([AaPp][Mm])?/);
           if (match) {
             let h = parseInt(match[1], 10);
             const m = match[2] ? parseInt(match[2], 10) : 0;
             const ap = match[3]?.toUpperCase();
             let isPM = false;
             if (ap) isPM = ap === 'PM';
             else if (h > 12) { h -= 12; isPM = true; }
             else if (h === 12) isPM = true;
             else if (h === 0) { h = 12; isPM = false; }
             else if (h < 7) isPM = true;
             
             return `${h}${m > 0 ? ':'+m.toString().padStart(2,'0') : ''} ${isPM ? 'PM' : 'AM'}`;
           }
           return time;
      } catch { return time; }
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

        <button
          onClick={() => setIsAddingDay(true)}
          className="bg-cyan-500 text-black px-4 py-2 rounded-lg hover:bg-cyan-400 transition-colors flex items-center gap-2 font-bold"
        >
          <Plus size={18} /> Add Day
        </button>
      </div>

      {isAddingDay && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 animate-fade-in">
          <h3 className="text-lg font-bold text-white mb-4">Add Schedule Day ({activeTab.toUpperCase()})</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-gray-400 text-sm mb-1">Date (YYYY-MM-DD)</label>
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                      <div className="lg:col-span-1">
                          <label className="block text-xs text-gray-500 mb-1 flex items-center justify-between">
                             Link Event
                             <span className="text-[10px] text-cyan-500 cursor-help" title="Select to auto-fill. You can edit the Title afterwards.">?</span>
                          </label>
                          <select 
                            value={editForm.event_id || ''}
                            onChange={(e) => handleEventSelect(e, true)}
                            className="w-full bg-black border border-white/20 rounded-lg p-2 text-sm text-white"
                          >
                             <option value="">-- Manual Entry --</option>
                             {events.map((e:any) => <option key={e.id} value={e.id}>{e.title}</option>)}
                          </select>
                      </div>
                      <div className="lg:col-span-1">
                          <label className="block text-xs text-gray-500 mb-1">Title</label>
                          <input
                            type="text"
                            value={editForm.title}
                            onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                            className="w-full bg-black border border-white/20 rounded-lg p-2 text-sm text-white"
                          />
                      </div>
                      <div className="lg:col-span-1">
                          <label className="block text-xs text-gray-500 mb-1">Time (e.g. 9-11 AM)</label>
                          <input
                            type="text"
                            value={editForm.time}
                            onChange={(e) => setEditForm({ ...editForm, time: e.target.value })}
                            className="w-full bg-black border border-white/20 rounded-lg p-2 text-sm text-white"
                          />
                      </div>
                      <div className="lg:col-span-1">
                           <label className="block text-xs text-gray-500 mb-1">Duration (e.g. 2h)</label>
                           <input
                            type="text"
                            value={editForm.duration || ''}
                            onChange={(e) => setEditForm({ ...editForm, duration: e.target.value })}
                            placeholder="Optional"
                            className="w-full bg-black border border-white/20 rounded-lg p-2 text-sm text-white"
                           />
                      </div>
                       <div className="lg:col-span-1">
                           <label className="block text-xs text-gray-500 mb-1">Venue</label>
                           <input
                            type="text"
                            value={editForm.venue || ''}
                            onChange={(e) => setEditForm({ ...editForm, venue: e.target.value })}
                            className="w-full bg-black border border-white/20 rounded-lg p-2 text-sm text-white"
                           />
                       </div>
                       
                      <div className="flex gap-2 lg:col-span-5 justify-end mt-2">
                        <button onClick={() => setEditingEventId(null)} className="p-2 text-gray-400 hover:text-white"><X size={18} /></button>
                        <button onClick={handleUpdateEvent} className="p-2 text-green-400 hover:text-green-300"><Save size={18} /></button>
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
                      <h4 className="text-sm font-bold text-cyan-400 mb-3 block flex items-center gap-2">
                        New Event
                        <span className="text-xs font-normal text-gray-500">(Select to auto-fill or type manually)</span>
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                           <div className="lg:col-span-1">
                              <select 
                                value={newEvent.event_id || ''}
                                onChange={(e) => handleEventSelect(e, false)}
                                className="w-full bg-black border border-white/20 rounded-lg p-2 text-sm text-white"
                              >
                                 <option value="">-- Manual Entry --</option>
                                 {events.map((e:any) => <option key={e.id} value={e.id}>{e.title}</option>)}
                              </select>
                           </div>
                           <div className="lg:col-span-2">
                               <input
                                type="text"
                                placeholder="Event Title"
                                value={newEvent.title}
                                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                                className="w-full bg-black border border-white/20 rounded-lg p-2 text-sm text-white placeholder-gray-600"
                               />
                           </div>
                           <div className="lg:col-span-1">
                               <input
                                type="text"
                                placeholder="Time (9 AM)"
                                value={newEvent.time}
                                onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                                className="w-full bg-black border border-white/20 rounded-lg p-2 text-sm text-white placeholder-gray-600"
                               />
                           </div>
                           <div className="lg:col-span-1">
                               <input
                                type="text"
                                placeholder="Venue"
                                value={newEvent.venue}
                                onChange={(e) => setNewEvent({ ...newEvent, venue: e.target.value })}
                                className="w-full bg-black border border-white/20 rounded-lg p-2 text-sm text-white placeholder-gray-600"
                               />
                           </div>
                       </div>
                       <div className="flex gap-2 justify-end mt-4">
                           <button onClick={() => setAddingEventDayId(null)} className="px-3 py-1.5 text-sm rounded bg-gray-800 text-gray-300">Cancel</button>
                           <button onClick={() => handleAddEvent(day.id)} className="px-3 py-1.5 text-sm rounded bg-cyan-500 text-black font-bold">Save Event</button>
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
