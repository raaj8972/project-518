import React, { useState } from 'react';
import { Plus, Edit, Trash2, Save, X, Calendar, Clock, MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import { useData } from '../../context/DataContext';
import type { ScheduleDay, ScheduleEvent } from '../../context/DataContext';
import { useLocalStorage } from '../../hooks/useLocalStorage';

export const ScheduleManagement: React.FC = () => {
  const { 
    schedule, 
    eventCategories,
    addScheduleDay, 
    updateScheduleDay, 
    deleteScheduleDay,
    addScheduleEvent, 
    updateScheduleEvent, 
    deleteScheduleEvent 
  } = useData();

  const [isAddingDay, setIsAddingDay] = useState(false);
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [isAddingEvent, setIsAddingEvent] = useState<number | null>(null);
  const [editingEvent, setEditingEvent] = useState<number | null>(null);
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set());

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
    duration: ''
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
      duration: ''
    });
  };

  const handleAddDay = async () => {
    if (!dayForm.date || !dayForm.day || !dayForm.title) {
      alert('Please fill in all required fields');
      return;
    }
    
    try {
      await addScheduleDay(dayForm);
      setIsAddingDay(false);
      resetDayForm();
      try { localStorage.removeItem('admin_schedule_day_form_draft'); } catch {}
    } catch (error) {
      console.error('Error adding schedule day:', error);
      alert('Failed to add schedule day. Please try again.');
    }
  };

  const handleUpdateDay = async (id: number) => {
    if (!dayForm.date || !dayForm.day || !dayForm.title) {
      alert('Please fill in all required fields');
      return;
    }
    
    try {
      await updateScheduleDay(id, dayForm);
      setEditingDay(null);
      resetDayForm();
      try { localStorage.removeItem('admin_schedule_day_form_draft'); } catch {}
    } catch (error) {
      console.error('Error updating schedule day:', error);
      alert('Failed to update schedule day. Please try again.');
    }
  };

  const handleDeleteDay = async (id: number) => {
    if (confirm('Are you sure you want to delete this day and all its events?')) {
      try {
        await deleteScheduleDay(id);
      } catch (error) {
        console.error('Error deleting schedule day:', error);
        alert('Failed to delete schedule day. Please try again.');
      }
    }
  };

  const handleAddEvent = async (dayId: number) => {
    if (!eventForm.time || !eventForm.title || !eventForm.venue || !eventForm.type || !eventForm.duration) {
      alert('Please fill in all required fields');
      return;
    }
    
    try {
      await addScheduleEvent(dayId, eventForm);
      setIsAddingEvent(null);
      resetEventForm();
      try { localStorage.removeItem('admin_schedule_event_form_draft'); } catch {}
    } catch (error) {
      console.error('Error adding schedule event:', error);
      alert('Failed to add schedule event. Please try again.');
    }
  };

  const handleUpdateEvent = async (eventId: number) => {
    if (!eventForm.time || !eventForm.title || !eventForm.venue || !eventForm.type || !eventForm.duration) {
      alert('Please fill in all required fields');
      return;
    }
    
    try {
      await updateScheduleEvent(eventId, eventForm);
      setEditingEvent(null);
      resetEventForm();
      try { localStorage.removeItem('admin_schedule_event_form_draft'); } catch {}
    } catch (error) {
      console.error('Error updating schedule event:', error);
      alert('Failed to update schedule event. Please try again.');
    }
  };

  const handleDeleteEvent = async (eventId: number) => {
    if (confirm('Are you sure you want to delete this event?')) {
      try {
        await deleteScheduleEvent(eventId);
      } catch (error) {
        console.error('Error deleting schedule event:', error);
        alert('Failed to delete schedule event. Please try again.');
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
      time: event.time,
      title: event.title,
      venue: event.venue,
      type: event.type,
      duration: event.duration
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
              className="px-4 py-2 bg-yellow-400 text-black rounded-lg hover:bg-yellow-300 flex items-center"
            >
              <Save size={16} className="mr-1" />
              Add Day
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
                      className="px-3 py-1 bg-yellow-400 text-black rounded hover:bg-yellow-300 flex items-center"
                    >
                      <Save size={14} className="mr-1" />
                      Save
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
                      className="bg-red-600 text-white p-2 rounded hover:bg-red-500"
                    >
                      <Trash2 size={14} />
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
                    <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-3 mb-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Time</label>
                        <input
                          type="text"
                          value={eventForm.time}
                          onChange={(e) => setEventForm(prev => ({ ...prev, time: e.target.value }))}
                          placeholder="9:00 AM"
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
                      <div>
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
                        className="px-3 py-1 bg-yellow-400 text-black rounded hover:bg-yellow-300 flex items-center"
                      >
                        <Save size={14} className="mr-1" />
                        Add Event
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
                            type="text"
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
                              className="px-3 py-1 bg-yellow-400 text-black rounded hover:bg-yellow-300 flex items-center"
                            >
                              <Save size={14} className="mr-1" />
                              Save
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
                              <div className="flex items-center space-x-4 text-sm text-gray-600">
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
                            <button
                              onClick={() => handleDeleteEvent(event.id!)}
                              className="bg-red-600 text-white p-1 rounded hover:bg-red-500"
                            >
                              <Trash2 size={14} />
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