import React, { useState } from 'react';
import { Plus, Edit, Trash2, Save, X, Calendar, Clock, MapPin, ChevronDown, ChevronUp, Link as LinkIcon, Unlink, Loader2 } from 'lucide-react';
import { useData } from '../../context/DataContext';
import type { ScheduleDay, ScheduleEvent } from '../../context/DataContext';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useSavingProgress } from '../../context/SavingProgressContext';

export const ScheduleManagement: React.FC = () => {
  const { 
    schedule, 
    eventCategories,
    events,
    guestArtists,
    addScheduleDay, 
    updateScheduleDay, 
    deleteScheduleDay,
    addScheduleEvent, 
    updateScheduleEvent, 
    deleteScheduleEvent 
  } = useData();
  const savingProgress = useSavingProgress();

  const [isAddingDay, setIsAddingDay] = useState(false);
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [isAddingEvent, setIsAddingEvent] = useState<number | null>(null);
  const [editingEvent, setEditingEvent] = useState<number | null>(null);
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set());

  // Inline banner state (replaces alert())
  const [banner, setBanner] = useState<null | { type: 'success' | 'error' | 'info'; message: string }>(null);

  // Loading flags for UX feedback and double-submit prevention
  const [loading, setLoading] = useState<{
    addDay: boolean;
    updateDay: boolean;
    deleteDayId: number | null;
    addEvent: boolean;
    updateEvent: boolean;
    deleteEventId: number | null;
  }>({ addDay: false, updateDay: false, deleteDayId: null, addEvent: false, updateEvent: false, deleteEventId: null });

  const [dayForm, setDayForm] = useLocalStorage('admin_schedule_day_form_draft', {
    date: '',
    day: '',
    title: ''
  });

  const [eventForm, setEventForm] = useLocalStorage('admin_schedule_event_form_draft', {
    time: '',
    title: '',
    venue: '',
    type: '',
    duration: '',
    event_id: '' as any,
    guest_artist_id: '' as any,
  });

  const resetDayForm = () => {
    setDayForm({
      date: '',
      day: '',
      title: ''
    });
  };

  const resetEventForm = () => {
    setEventForm({
      time: '',
      title: '',
      venue: '',
      type: '',
      duration: '',
      event_id: '',
      guest_artist_id: '',
    });
  };

  // Normalize various human formats to an <input type="time"> value HH:MM
  const toTimeInputValue = (raw: string): string => {
    if (!raw) return '';
    const s = String(raw).trim();
    // Matches: H, HH, H:MM, HH:MM, optional AM/PM
    const m = s.match(/^(\d{1,2})(?::(\d{2}))?\s*([AaPp][Mm])?$/);
    if (!m) return '';
    let h = parseInt(m[1], 10);
    let min = m[2] ? parseInt(m[2], 10) : 0;
    const ap = m[3]?.toLowerCase();
    if (ap) {
      if (ap === 'pm' && h < 12) h += 12;
      if (ap === 'am' && h === 12) h = 0;
    }
    h = Math.max(0, Math.min(23, h));
    min = Math.max(0, Math.min(59, min));
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(h)}:${pad(min)}`;
  };

  const handleAddDay = async () => {
    if (!dayForm.date || !dayForm.day || !dayForm.title) {
      setBanner({ type: 'error', message: 'Please fill in all required fields for the day (Date, Day Label, Title).' });
      return;
    }
    
    try {
      setLoading(prev => ({ ...prev, addDay: true }));
      await addScheduleDay(dayForm);
      setIsAddingDay(false);
      resetDayForm();
      try { localStorage.removeItem('admin_schedule_day_form_draft'); } catch {}
      setBanner({ type: 'success', message: 'Schedule day added successfully.' });
    } catch (error) {
      console.error('Error adding schedule day:', error);
      setBanner({ type: 'error', message: 'Failed to add schedule day. Please try again.' });
    } finally {
      setLoading(prev => ({ ...prev, addDay: false }));
    }
  };

  const handleUpdateDay = async (id: number) => {
    if (!dayForm.date || !dayForm.day || !dayForm.title) {
      setBanner({ type: 'error', message: 'Please fill in all required fields for the day (Date, Day Label, Title).' });
      return;
    }
    
    try {
      setLoading(prev => ({ ...prev, updateDay: true }));
      const steps = savingProgress.withSteps(3, 'Preparing…');
      steps.next('Validating');
      await updateScheduleDay(id, dayForm);
      steps.next('Finalizing');
      setEditingDay(null);
      resetDayForm();
      try { localStorage.removeItem('admin_schedule_day_form_draft'); } catch {}
      setBanner({ type: 'success', message: 'Schedule day updated.' });
    } catch (error) {
      console.error('Error updating schedule day:', error);
      setBanner({ type: 'error', message: 'Failed to update schedule day. Please try again.' });
    } finally {
      setLoading(prev => ({ ...prev, updateDay: false }));
      savingProgress.done();
    }
  };

  const handleDeleteDay = async (id: number) => {
    if (confirm('Are you sure you want to delete this day and all its events?')) {
      try {
        setLoading(prev => ({ ...prev, deleteDayId: id }));
        await deleteScheduleDay(id);
        setBanner({ type: 'success', message: 'Schedule day deleted.' });
      } catch (error) {
        console.error('Error deleting schedule day:', error);
        setBanner({ type: 'error', message: 'Failed to delete schedule day. Please try again.' });
      } finally {
        setLoading(prev => ({ ...prev, deleteDayId: null }));
      }
    }
  };

  const handleAddEvent = async (dayId: number) => {
    if (!eventForm.time || !eventForm.title || !eventForm.venue || !eventForm.type || !eventForm.duration) {
      setBanner({ type: 'error', message: 'Please fill in all required fields for the event (Time, Title, Venue, Type, Duration).' });
      return;
    }
    // Extra safeguard: ensure not both links are present
    if (eventForm.event_id && eventForm.guest_artist_id) {
      setBanner({ type: 'error', message: 'Please link either an Event OR a Guest Artist, not both.' });
      return;
    }
    
    try {
      setLoading(prev => ({ ...prev, addEvent: true }));
      await addScheduleEvent(dayId, eventForm);
      setIsAddingEvent(null);
      resetEventForm();
      try { localStorage.removeItem('admin_schedule_event_form_draft'); } catch {}
      setBanner({ type: 'success', message: 'Schedule event added.' });
    } catch (error: any) {
      const msg = error?.message || 'Unknown error';
      console.error('Error adding schedule event:', error);
      setBanner({ type: 'error', message: `Failed to add schedule event. ${msg}` });
    } finally {
      setLoading(prev => ({ ...prev, addEvent: false }));
    }
  };

  const handleUpdateEvent = async (eventId: number) => {
    if (!eventForm.time || !eventForm.title || !eventForm.venue || !eventForm.type || !eventForm.duration) {
      setBanner({ type: 'error', message: 'Please fill in all required fields for the event (Time, Title, Venue, Type, Duration).' });
      return;
    }
    
    try {
      setLoading(prev => ({ ...prev, updateEvent: true }));
      const steps = savingProgress.withSteps(3, 'Preparing…');
      steps.next('Validating');
      await updateScheduleEvent(eventId, eventForm);
      steps.next('Finalizing');
      setEditingEvent(null);
      resetEventForm();
      try { localStorage.removeItem('admin_schedule_event_form_draft'); } catch {}
      setBanner({ type: 'success', message: 'Schedule event updated.' });
    } catch (error) {
      console.error('Error updating schedule event:', error);
      setBanner({ type: 'error', message: 'Failed to update schedule event. Please try again.' });
    } finally {
      setLoading(prev => ({ ...prev, updateEvent: false }));
      savingProgress.done();
    }
  };

  const handleDeleteEvent = async (eventId: number) => {
    if (confirm('Are you sure you want to delete this event?')) {
      try {
        setLoading(prev => ({ ...prev, deleteEventId: eventId }));
        await deleteScheduleEvent(eventId);
        setBanner({ type: 'success', message: 'Schedule event deleted.' });
      } catch (error) {
        console.error('Error deleting schedule event:', error);
        setBanner({ type: 'error', message: 'Failed to delete schedule event. Please try again.' });
      } finally {
        setLoading(prev => ({ ...prev, deleteEventId: null }));
      }
    }
  };

  const startEditingDay = (day: ScheduleDay) => {
    setDayForm({
      date: day.date,
      day: day.day,
      title: day.title
    });
    setEditingDay(day.id!);
  };

  const startEditingEvent = (event: ScheduleEvent) => {
    setEventForm({
      time: toTimeInputValue((event as any).time as any),
      title: event.title,
      venue: event.venue,
      type: event.type,
      duration: event.duration,
      event_id: (event as any).event_id || '',
      guest_artist_id: (event as any).guest_artist_id || '',
    });
    setEditingEvent(event.id!);
  };

  const toggleDayExpansion = (dayId: number) => {
    const newExpanded = new Set(expandedDays);
    if (newExpanded.has(dayId)) {
      newExpanded.delete(dayId);
    } else {
      newExpanded.add(dayId);
    }
    setExpandedDays(newExpanded);
  };

  const getTypeColor = (type: string) => {
    const category = eventCategories.find(cat => cat.name === type);
    return category ? category.color : '#6B7280';
  };

  return (
    <div className="space-y-6">
      {/* Inline Banner */}
      {banner && (
        <div
          className={
            `rounded-md border p-3 ${
              banner.type === 'error'
                ? 'bg-red-50 border-red-300 text-red-800'
                : banner.type === 'success'
                ? 'bg-green-50 border-green-300 text-green-800'
                : 'bg-blue-50 border-blue-300 text-blue-800'
            }`
          }
        >
          <div className="flex items-start">
            <div className="flex-1 text-sm">{banner.message}</div>
            <button
              className="ml-3 text-xs opacity-70 hover:opacity-100"
              onClick={() => setBanner(null)}
              aria-label="Dismiss message"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Schedule Management</h2>
          <p className="text-gray-600">Manage festival days and events</p>
        </div>
        <button
          onClick={() => setIsAddingDay(true)}
          className="bg-yellow-400 text-black px-4 py-2 rounded-lg hover:bg-yellow-300 transition-colors flex items-center"
        >
          <Plus size={16} className="mr-2" />
          Add Day
        </button>
      </div>

      {/* Add Day Form */}
      {isAddingDay && (
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-400">
          <h3 className="text-lg font-semibold mb-4">Add New Schedule Day</h3>
          <div className="grid md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
              <input
                type="date"
                value={dayForm.date}
                onChange={(e) => setDayForm(prev => ({ ...prev, date: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Day Label</label>
              <input
                type="text"
                value={dayForm.day}
                onChange={(e) => setDayForm(prev => ({ ...prev, day: e.target.value }))}
                placeholder="e.g., Day 1, Friday"
                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
              <input
                type="text"
                value={dayForm.title}
                onChange={(e) => setDayForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Cultural Day"
                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <button
              onClick={() => {
                setIsAddingDay(false);
                resetDayForm();
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 flex items-center"
            >
              <X size={16} className="mr-1" />
              Cancel
            </button>
            <button
              onClick={handleAddDay}
              disabled={loading.addDay}
              aria-busy={loading.addDay}
              className={`px-4 py-2 bg-yellow-400 text-black rounded-lg flex items-center ${loading.addDay ? 'opacity-60 cursor-not-allowed' : 'hover:bg-yellow-300'}`}
            >
              {loading.addDay ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Save size={16} className="mr-1" />}
              {loading.addDay ? 'Adding…' : 'Add Day'}
            </button>
          </div>
        </div>
      )}

      {/* Schedule Days */}
      <div className="space-y-4">
        {schedule.map((day) => (
          <div key={day.id} className="bg-white rounded-lg shadow-md overflow-hidden">
            {/* Day Header */}
            <div className="bg-gradient-to-r from-gray-800 to-gray-900 text-white p-4">
              {editingDay === day.id ? (
                <div className="grid md:grid-cols-3 gap-4">
                  <input
                    type="date"
                    value={dayForm.date}
                    onChange={(e) => setDayForm(prev => ({ ...prev, date: e.target.value }))}
                    className="p-2 rounded bg-gray-700 text-white border border-gray-600"
                  />
                  <input
                    type="text"
                    value={dayForm.day}
                    onChange={(e) => setDayForm(prev => ({ ...prev, day: e.target.value }))}
                    className="p-2 rounded bg-gray-700 text-white border border-gray-600"
                  />
                  <input
                    type="text"
                    value={dayForm.title}
                    onChange={(e) => setDayForm(prev => ({ ...prev, title: e.target.value }))}
                    className="p-2 rounded bg-gray-700 text-white border border-gray-600"
                  />
                  <div className="md:col-span-3 flex justify-end space-x-2 mt-2">
                    <button
                      onClick={() => {
                        setEditingDay(null);
                        resetDayForm();
                      }}
                      className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-500 flex items-center"
                    >
                      <X size={14} className="mr-1" />
                      Cancel
                    </button>
                    <button
                      onClick={() => handleUpdateDay(day.id!)}
                      disabled={loading.updateDay}
                      aria-busy={loading.updateDay}
                      className={`px-3 py-1 bg-yellow-400 text-black rounded flex items-center ${loading.updateDay ? 'opacity-60 cursor-not-allowed' : 'hover:bg-yellow-300'}`}
                    >
                      {loading.updateDay ? <Loader2 size={14} className="mr-2 animate-spin" /> : <Save size={14} className="mr-1" />}
                      {loading.updateDay ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => toggleDayExpansion(day.id!)}
                      className="text-yellow-400 hover:text-yellow-300"
                    >
                      {expandedDays.has(day.id!) ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>
                    <div>
                      <h3 className="text-xl font-bold">{day.title}</h3>
                      <div className="flex items-center space-x-4 text-sm opacity-90">
                        <div className="flex items-center">
                          <Calendar size={14} className="mr-1" />
                          {day.date}
                        </div>
                        <div>{day.day}</div>
                        <div>{(day.events ?? []).length} Events</div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setIsAddingEvent(day.id!)}
                      className="bg-yellow-400 text-black px-3 py-1 rounded hover:bg-yellow-300 flex items-center"
                    >
                      <Plus size={14} className="mr-1" />
                      Add Event
                    </button>
                    <button
                      onClick={() => startEditingDay(day)}
                      className="bg-blue-600 text-white p-2 rounded hover:bg-blue-500"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteDay(day.id!)}
                      disabled={loading.deleteDayId === day.id}
                      aria-busy={loading.deleteDayId === day.id}
                      className={`bg-red-600 text-white p-2 rounded ${loading.deleteDayId === day.id ? 'opacity-60 cursor-not-allowed' : 'hover:bg-red-500'}`}
                    >
                      {loading.deleteDayId === day.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Day Content */}
            {expandedDays.has(day.id!) && (
              <div className="p-4">
                {/* Add Event Form */}
                {isAddingEvent === day.id && (
                  <div className="bg-yellow-50 rounded-lg p-4 mb-4 border border-yellow-200">
                    <h4 className="font-semibold mb-3">Add New Event</h4>
                    <div className="grid md:grid-cols-2 lg:grid-cols-7 gap-3 mb-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Time</label>
                        <input
                          type="time"
                          step={60}
                          value={eventForm.time}
                          onChange={(e) => setEventForm(prev => ({ ...prev, time: e.target.value }))}
                          placeholder="09:00"
                          className="w-full p-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Title</label>
                        <input
                          type="text"
                          value={eventForm.title}
                          onChange={(e) => setEventForm(prev => ({ ...prev, title: e.target.value }))}
                          placeholder="Event title"
                          className="w-full p-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Venue</label>
                        <input
                          type="text"
                          value={eventForm.venue}
                          onChange={(e) => setEventForm(prev => ({ ...prev, venue: e.target.value }))}
                          placeholder="Venue name"
                          className="w-full p-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400"
                        />
                      </div>
                      <div className="col-span-2 lg:col-span-1">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                        <select
                          value={eventForm.type}
                          onChange={(e) => setEventForm(prev => ({ ...prev, type: e.target.value }))}
                          className="w-full p-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400"
                        >
                          <option value="">Select type</option>
                          {eventCategories.map(category => (
                            <option key={category.id} value={category.name}>{category.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Duration</label>
                        <input
                          type="text"
                          value={eventForm.duration}
                          onChange={(e) => setEventForm(prev => ({ ...prev, duration: e.target.value }))}
                          placeholder="2 hours"
                          className="w-full p-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Link Event</label>
                        <select
                          value={eventForm.event_id || ''}
                          onChange={(e) => {
                            const v = e.target.value;
                            setEventForm(prev => ({ ...prev, event_id: v ? Number(v) : '', guest_artist_id: '' }));
                          }}
                          disabled={!!eventForm.guest_artist_id}
                          className={`w-full p-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-yellow-400 ${eventForm.guest_artist_id ? 'bg-gray-100 border-gray-300 text-gray-500' : 'border-gray-300'}`}
                        >
                          <option value="">None</option>
                          {(events || []).map(ev => (
                            <option key={ev.id} value={ev.id}>{ev.title}</option>
                          ))}
                        </select>
                        {(events || []).length === 0 && (
                          <p className="mt-1 text-xs text-gray-500">No events found. Create events in Events Management to link.</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Link Guest Artist</label>
                        <select
                          value={eventForm.guest_artist_id || ''}
                          onChange={(e) => {
                            const v = e.target.value;
                            setEventForm(prev => ({ ...prev, guest_artist_id: v ? Number(v) : '', event_id: '' }));
                          }}
                          disabled={!!eventForm.event_id}
                          className={`w-full p-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-yellow-400 ${eventForm.event_id ? 'bg-gray-100 border-gray-300 text-gray-500' : 'border-gray-300'}`}
                        >
                          <option value="">None</option>
                          {(guestArtists || []).map(ga => (
                            <option key={ga.id} value={ga.id}>{(ga as any).name || (ga as any).title || `Guest ${ga.id}`}</option>
                          ))}
                        </select>
                        {(guestArtists || []).length === 0 && (
                          <p className="mt-1 text-xs text-gray-500">No guest artists found. Add them in Guest Artists Management to link.</p>
                        )}
                        <p className="mt-1 text-xs text-gray-600">Link either an Event or a Guest Artist. Selecting one disables the other.</p>
                      </div>
                      {/* Venue */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Venue *</label>
                        <input
                          type="text"
                          value={eventForm.venue}
                          onChange={(e) => setEventForm((prev: any) => ({ ...prev, venue: e.target.value }))}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => {
                          setIsAddingEvent(null);
                          resetEventForm();
                        }}
                        className="px-3 py-1 text-gray-600 hover:text-gray-800 flex items-center"
                      >
                        <X size={14} className="mr-1" />
                        Cancel
                      </button>
                      <button
                        onClick={() => handleAddEvent(day.id!)}
                        disabled={loading.addEvent}
                        aria-busy={loading.addEvent}
                        className={`px-3 py-1 bg-yellow-400 text-black rounded flex items-center ${loading.addEvent ? 'opacity-60 cursor-not-allowed' : 'hover:bg-yellow-300'}`}
                      >
                        {loading.addEvent ? <Loader2 size={14} className="mr-2 animate-spin" /> : <Save size={14} className="mr-1" />}
                        {loading.addEvent ? 'Adding…' : 'Add Event'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Events List */}
                <div className="space-y-3">
                  {(day.events || []).map((event) => (
                    <div key={event.id} className="border border-gray-200 rounded-lg p-3 hover:border-yellow-300 transition-colors">
                      {editingEvent === event.id ? (
                        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-3">
                          <input
                            type="time"
                            step={60}
                            value={eventForm.time}
                            onChange={(e) => setEventForm(prev => ({ ...prev, time: e.target.value }))}
                            className="p-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400"
                          />
                          <input
                            type="text"
                            value={eventForm.title}
                            onChange={(e) => setEventForm(prev => ({ ...prev, title: e.target.value }))}
                            className="p-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400"
                          />
                          <input
                            type="text"
                            value={eventForm.venue}
                            onChange={(e) => setEventForm(prev => ({ ...prev, venue: e.target.value }))}
                            className="p-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400"
                          />
                          <select
                            value={eventForm.type}
                            onChange={(e) => setEventForm(prev => ({ ...prev, type: e.target.value }))}
                            className="p-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400"
                          >
                            {eventCategories.map(category => (
                              <option key={category.id} value={category.name}>{category.name}</option>
                            ))}
                          </select>
                          <input
                            type="text"
                            value={eventForm.duration}
                            onChange={(e) => setEventForm(prev => ({ ...prev, duration: e.target.value }))}
                            className="p-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400"
                          />
                          <div className="lg:col-span-5 flex justify-end space-x-2 mt-2">
                            <button
                              onClick={() => {
                                setEditingEvent(null);
                                resetEventForm();
                              }}
                              className="px-3 py-1 text-gray-600 hover:text-gray-800 flex items-center"
                            >
                              <X size={14} className="mr-1" />
                              Cancel
                            </button>
                            <button
                              onClick={() => handleUpdateEvent(event.id!)}
                              disabled={loading.updateEvent}
                              aria-busy={loading.updateEvent}
                              className={`px-3 py-1 bg-yellow-400 text-black rounded flex items-center ${loading.updateEvent ? 'opacity-60 cursor-not-allowed' : 'hover:bg-yellow-300'}`}
                            >
                              {loading.updateEvent ? <Loader2 size={14} className="mr-2 animate-spin" /> : <Save size={14} className="mr-1" />}
                              {loading.updateEvent ? 'Saving…' : 'Save'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="bg-gray-900 text-white px-3 py-2 rounded text-center min-w-[80px]">
                              <div className="text-sm font-bold">{event.time}</div>
                              <div className="text-xs opacity-75">{event.duration}</div>
                            </div>
                            <div className="flex-grow">
                              <h4 className="font-semibold text-gray-900">{event.title}</h4>
                              <div className="flex items-center space-x-4 text-sm text-gray-600 flex-wrap">
                                <div className="flex items-center">
                                  <MapPin size={14} className="mr-1" />
                                  {event.venue}
                                </div>
                                <div className="flex items-center">
                                  <span 
                                    className="w-3 h-3 rounded-full mr-1"
                                    style={{ backgroundColor: getTypeColor(event.type) }}
                                  ></span>
                                  {event.type}
                                </div>
                                {((event as any).event_id || (event as any).guest_artist_id) && (
                                  <div className="flex items-center text-xs px-2 py-0.5 bg-gray-100 rounded border border-gray-300">
                                    <LinkIcon size={12} className="mr-1 text-gray-500" />
                                    {(event as any).event_id ? `Linked Event #${(event as any).event_id}` : `Linked Guest #${(event as any).guest_artist_id}`}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => startEditingEvent(event)}
                              className="bg-blue-600 text-white p-1 rounded hover:bg-blue-500"
                            >
                              <Edit size={14} />
                            </button>
                            {(((event as any).event_id) || ((event as any).guest_artist_id)) && (
                              <button
                                onClick={() => updateScheduleEvent(event.id!, { event_id: null, guest_artist_id: null } as any)}
                                className="bg-gray-600 text-white p-1 rounded hover:bg-gray-500"
                                title="Unlink"
                              >
                                <Unlink size={14} />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteEvent(event.id!)}
                              disabled={loading.deleteEventId === event.id}
                              aria-busy={loading.deleteEventId === event.id}
                              className={`bg-red-600 text-white p-1 rounded ${loading.deleteEventId === event.id ? 'opacity-60 cursor-not-allowed' : 'hover:bg-red-500'}`}
                            >
                              {loading.deleteEventId === event.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {(day.events || []).length === 0 && isAddingEvent !== day.id && (
                    <div className="text-center py-8 text-gray-500">
                      <Clock size={32} className="mx-auto mb-2 opacity-50" />
                      <p>No events scheduled for this day</p>
                      <button
                        onClick={() => setIsAddingEvent(day.id!)}
                        className="mt-2 text-yellow-600 hover:text-yellow-700 font-medium"
                      >
                        Add the first event
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* No Days Message */}
      {schedule.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow-md">
          <Calendar size={64} className="mx-auto mb-4 text-gray-400" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">No Schedule Days</h3>
          <p className="text-gray-500 mb-4">Start by adding your first festival day</p>
          <button
            onClick={() => setIsAddingDay(true)}
            className="bg-yellow-400 text-black px-6 py-2 rounded-lg hover:bg-yellow-300 transition-colors"
          >
            Add First Day
          </button>
        </div>
      )}
    </div>
  );
};