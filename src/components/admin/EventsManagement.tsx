import React, { useState } from 'react';
import { Plus, Edit, Trash2, Save, X, Calendar, Clock, MapPin, Users, Eye, EyeOff, Star, UserPlus, UserMinus, FileText } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { ImageUpload } from '../ImageUpload';
import type { Event } from '../../context/DataContext';

export const EventsManagement: React.FC = () => {
  const { 
    events, 
    eventCategories,
    addEvent, 
    updateEvent, 
    deleteEvent,
    toggleEventFeatured,
    toggleEventVisibility,
    toggleEventRegistration
  } = useData();

  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [editingEvent, setEditingEvent] = useState<number | null>(null);

  const [eventForm, setEventForm] = useState({
    title: '',
    category: '',
    description: '',
    image: '',
    date: '',
    time: '',
    venue: '',
    participants: '',
    highlights: [] as string[],
    rules: [] as string[],
    registration_open: true,
    max_participants: undefined as number | undefined,
    featured: false,
    visible: true,
    artist_id: undefined as number | undefined
  });

  const resetEventForm = () => {
    setEventForm({
      title: '',
      category: eventCategories.length > 0 ? eventCategories[0].name : '',
      description: '',
      image: '',
      date: '',
      time: '',
      venue: '',
      participants: '',
      highlights: [],
      rules: [],
      registration_open: true,
      max_participants: undefined,
      featured: false,
      visible: true,
      artist_id: undefined
    });
  };

  const handleAddEvent = async () => {
    if (!eventForm.title || !eventForm.description || !eventForm.image) {
      alert('Please fill in all required fields (title, description, and image)');
      return;
    }
    
    try {
      await addEvent({
        ...eventForm,
        category: eventForm.category || (eventCategories.length > 0 ? eventCategories[0].name : 'General'),
        current_registrations: 0
      });
      setIsAddingEvent(false);
      resetEventForm();
    } catch (error: any) {
      console.error('Error adding event:', error);
      alert(error?.message || 'Failed to add event. Please try again.');
    }
  };

  const handleUpdateEvent = async (id: number) => {
    if (!eventForm.title || !eventForm.description || !eventForm.image) {
      alert('Please fill in all required fields (title, description, and image)');
      return;
    }
    
    try {
      await updateEvent(id, eventForm);
      setEditingEvent(null);
      resetEventForm();
    } catch (error: any) {
      console.error('Error updating event:', error);
      alert(error?.message || 'Failed to update event. Please try again.');
    }
  };

  const handleDeleteEvent = async (id: number) => {
    if (confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      try {
        await deleteEvent(id);
      } catch (error) {
        console.error('Error deleting event:', error);
        alert('Failed to delete event. Please try again.');
      }
    }
  };

  const handleToggleFeatured = async (id: number) => {
    try {
      await toggleEventFeatured(id);
    } catch (error) {
      console.error('Error toggling featured status:', error);
      alert('Failed to update featured status. Please try again.');
    }
  };

  const handleToggleVisibility = async (id: number) => {
    try {
      await toggleEventVisibility(id);
    } catch (error) {
      console.error('Error toggling visibility:', error);
      alert('Failed to update visibility. Please try again.');
    }
  };

  const handleToggleRegistration = async (id: number) => {
    try {
      await toggleEventRegistration(id);
    } catch (error) {
      console.error('Error toggling registration:', error);
      alert('Failed to update registration status. Please try again.');
    }
  };

  const startEditingEvent = (event: Event) => {
    setEventForm({
      title: event.title,
      category: event.category,
      description: event.description,
      image: event.image,
      date: event.date,
      time: event.time,
      venue: event.venue,
      participants: event.participants,
      highlights: event.highlights,
      rules: event.rules || [],
      registration_open: event.registration_open,
  max_participants: event.max_participants ?? undefined,
      featured: event.featured || false,
      visible: event.visible !== false,
  artist_id: event.artist_id ?? undefined
    });
    setEditingEvent(event.id);
  };

  const addHighlight = () => {
    setEventForm(prev => ({
      ...prev,
      highlights: [...prev.highlights, '']
    }));
  };

  const updateHighlight = (index: number, value: string) => {
    setEventForm(prev => ({
      ...prev,
      highlights: prev.highlights.map((h, i) => i === index ? value : h)
    }));
  };

  const removeHighlight = (index: number) => {
    setEventForm(prev => ({
      ...prev,
      highlights: prev.highlights.filter((_, i) => i !== index)
    }));
  };

  const addRule = () => {
    setEventForm(prev => ({
      ...prev,
      rules: [...prev.rules, '']
    }));
  };

  const updateRule = (index: number, value: string) => {
    setEventForm(prev => ({
      ...prev,
      rules: prev.rules.map((r, i) => i === index ? value : r)
    }));
  };

  const removeRule = (index: number) => {
    setEventForm(prev => ({
      ...prev,
      rules: prev.rules.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Events Management</h2>
          <p className="text-gray-600">Manage festival events and registrations</p>
        </div>
        <button
          onClick={() => {
            setIsAddingEvent(true);
            resetEventForm();
          }}
          className="bg-yellow-400 text-black px-4 py-2 rounded-lg hover:bg-yellow-300 transition-colors flex items-center"
        >
          <Plus size={16} className="mr-2" />
          Add Event
        </button>
      </div>

      {/* Add Event Form */}
      {isAddingEvent && (
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-400">
          <h3 className="text-lg font-semibold mb-6">Add New Event</h3>
          <div className="grid lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Event Title *</label>
                <input
                  type="text"
                  value={eventForm.title}
                  onChange={(e) => setEventForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Event title"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={eventForm.category}
                  onChange={(e) => setEventForm(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                >
                  <option value="">Select Category</option>
                  {eventCategories.map(category => (
                    <option key={category.id} value={category.name}>{category.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                <textarea
                  value={eventForm.description}
                  onChange={(e) => setEventForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Event description"
                  rows={4}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                  <input
                    type="date"
                    value={eventForm.date}
                    onChange={(e) => setEventForm(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
                  <input
                    type="text"
                    value={eventForm.time}
                    onChange={(e) => setEventForm(prev => ({ ...prev, time: e.target.value }))}
                    placeholder="e.g., 10:00 AM - 2:00 PM"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Venue</label>
                  <input
                    type="text"
                    value={eventForm.venue}
                    onChange={(e) => setEventForm(prev => ({ ...prev, venue: e.target.value }))}
                    placeholder="Event venue"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Participants</label>
                  <input
                    type="text"
                    value={eventForm.participants}
                    onChange={(e) => setEventForm(prev => ({ ...prev, participants: e.target.value }))}
                    placeholder="e.g., 100+ students"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Max Participants (Optional)</label>
                <input
                  type="number"
                  value={eventForm.max_participants || ''}
                  onChange={(e) => setEventForm(prev => ({ 
                    ...prev, 
                    max_participants: e.target.value ? parseInt(e.target.value) : undefined 
                  }))}
                  placeholder="Maximum number of participants"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Event Highlights</label>
                <div className="space-y-2">
                  {eventForm.highlights.map((highlight, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={highlight}
                        onChange={(e) => updateHighlight(index, e.target.value)}
                        placeholder="Event highlight"
                        className="flex-1 p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      />
                      <button
                        type="button"
                        onClick={() => removeHighlight(index)}
                        className="text-red-600 hover:text-red-800 p-1"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addHighlight}
                    className="text-yellow-600 hover:text-yellow-700 text-sm flex items-center"
                  >
                    <Plus size={16} className="mr-1" />
                    Add Highlight
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Event Rules</label>
                <div className="space-y-2">
                  {eventForm.rules.map((rule, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={rule}
                        onChange={(e) => updateRule(index, e.target.value)}
                        placeholder="Event rule"
                        className="flex-1 p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      />
                      <button
                        type="button"
                        onClick={() => removeRule(index)}
                        className="text-red-600 hover:text-red-800 p-1"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addRule}
                    className="text-blue-600 hover:text-blue-700 text-sm flex items-center"
                  >
                    <Plus size={16} className="mr-1" />
                    Add Rule
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={eventForm.registration_open}
                    onChange={(e) => setEventForm(prev => ({ ...prev, registration_open: e.target.checked }))}
                    className="mr-2"
                  />
                  Registration Open
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={eventForm.featured}
                    onChange={(e) => setEventForm(prev => ({ ...prev, featured: e.target.checked }))}
                    className="mr-2"
                  />
                  Featured Event
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={eventForm.visible}
                    onChange={(e) => setEventForm(prev => ({ ...prev, visible: e.target.checked }))}
                    className="mr-2"
                  />
                  Visible to Public
                </label>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Event Image *</label>
                <ImageUpload
                  onImageSelect={(url) => setEventForm(prev => ({ ...prev, image: url }))}
                  currentImage={eventForm.image}
                  bucket="event-images"
                  folder="events"
                />
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => {
                setIsAddingEvent(false);
                resetEventForm();
              }}
              className="w-full sm:w-auto px-6 py-2 text-gray-600 hover:text-gray-800 flex items-center justify-center"
            >
              <X size={16} className="mr-1" />
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAddEvent}
              className="w-full sm:w-auto px-6 py-2 bg-yellow-400 text-black rounded-lg hover:bg-yellow-300 flex items-center justify-center"
            >
              <Save size={16} className="mr-1" />
              Add Event
            </button>
          </div>
        </div>
      )}

      {/* Events List */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map((event) => (
          <div key={event.id} className="bg-white rounded-lg shadow-md overflow-hidden">
            {editingEvent === event.id ? (
              <div className="p-4 space-y-4">
                <input
                  type="text"
                  value={eventForm.title}
                  onChange={(e) => setEventForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Event title"
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
                <select
                  value={eventForm.category}
                  onChange={(e) => setEventForm(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400"
                >
                  <option value="">Select Category</option>
                  {eventCategories.map(category => (
                    <option key={category.id} value={category.name}>{category.name}</option>
                  ))}
                </select>
                <textarea
                  value={eventForm.description}
                  onChange={(e) => setEventForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  placeholder="Event description"
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={eventForm.date}
                    onChange={(e) => setEventForm(prev => ({ ...prev, date: e.target.value }))}
                    className="p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                  <input
                    type="text"
                    value={eventForm.time}
                    onChange={(e) => setEventForm(prev => ({ ...prev, time: e.target.value }))}
                    placeholder="Time"
                    className="p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>
                <input
                  type="text"
                  value={eventForm.venue}
                  onChange={(e) => setEventForm(prev => ({ ...prev, venue: e.target.value }))}
                  placeholder="Venue"
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
                
                {/* Rules editing */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Event Rules</label>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {eventForm.rules.map((rule, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={rule}
                          onChange={(e) => updateRule(index, e.target.value)}
                          placeholder="Event rule"
                          className="flex-1 p-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-yellow-400"
                        />
                        <button
                          type="button"
                          onClick={() => removeRule(index)}
                          className="text-red-600 hover:text-red-800 p-1"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addRule}
                      className="text-blue-600 hover:text-blue-700 text-xs flex items-center"
                    >
                      <Plus size={12} className="mr-1" />
                      Add Rule
                    </button>
                  </div>
                </div>

                <ImageUpload
                  onImageSelect={(url) => setEventForm(prev => ({ ...prev, image: url }))}
                  currentImage={eventForm.image}
                  bucket="event-images"
                  folder="events"
                  className="h-32"
                />
                <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingEvent(null);
                      resetEventForm();
                    }}
                    className="w-full sm:w-auto px-4 py-2 text-gray-600 hover:text-gray-800 flex items-center justify-center"
                  >
                    <X size={14} className="mr-1" />
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateEvent(event.id)}
                    className="w-full sm:w-auto px-4 py-2 bg-yellow-400 text-black rounded hover:bg-yellow-300 flex items-center justify-center"
                  >
                    <Save size={14} className="mr-1" />
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="relative h-48">
                  <img
                    src={event.image}
                    alt={event.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2 flex space-x-1">
                    {event.featured && (
                      <span className="bg-yellow-400 text-black px-2 py-1 rounded-full text-xs font-medium">
                        <Star size={12} className="inline mr-1" />
                        Featured
                      </span>
                    )}
                    {!event.visible && (
                      <span className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                        Hidden
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg">{event.title}</h3>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                      {event.category}
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">{event.description}</p>
                  <div className="space-y-1 text-xs text-gray-500 mb-3">
                    <div className="flex items-center">
                      <Calendar size={12} className="mr-1" />
                      {event.date}
                    </div>
                    <div className="flex items-center">
                      <Clock size={12} className="mr-1" />
                      {event.time}
                    </div>
                    <div className="flex items-center">
                      <MapPin size={12} className="mr-1" />
                      {event.venue}
                    </div>
                    <div className="flex items-center">
                      <Users size={12} className="mr-1" />
                      {event.current_registrations || 0}
                      {event.max_participants && ` / ${event.max_participants}`} participants
                    </div>
                    {event.rules && event.rules.length > 0 && (
                      <div className="flex items-center">
                        <FileText size={12} className="mr-1" />
                        {event.rules.length} rule{event.rules.length !== 1 ? 's' : ''} set
                      </div>
                    )}
                  </div>
                  
                  {/* Registration Progress */}
                  {event.max_participants && (
                    <div className="mt-3">
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>Registrations</span>
                        <span>{event.current_registrations || 0} / {event.max_participants}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${Math.min(100, ((event.current_registrations || 0) / event.max_participants) * 100)}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center mt-4">
                    <div className="flex space-x-1">
                      <button
                        type="button"
                        onClick={() => handleToggleFeatured(event.id)}
                        className={`p-1 rounded transition-colors ${
                          event.featured ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-100 text-gray-600'
                        } hover:bg-yellow-200`}
                        title={event.featured ? 'Remove from featured' : 'Mark as featured'}
                      >
                        <Star size={14} className={event.featured ? 'fill-current' : ''} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleVisibility(event.id)}
                        className={`p-1 rounded transition-colors ${
                          event.visible !== false ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                        } hover:bg-green-200`}
                        title={event.visible !== false ? 'Hide from public' : 'Show to public'}
                      >
                        {event.visible !== false ? <Eye size={14} /> : <EyeOff size={14} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleRegistration(event.id)}
                        className={`p-1 rounded transition-colors ${
                          event.registration_open ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                        } hover:bg-blue-200`}
                        title={event.registration_open ? 'Close registration' : 'Open registration'}
                      >
                        {event.registration_open ? <UserPlus size={14} /> : <UserMinus size={14} />}
                      </button>
                    </div>
                    <div className="flex space-x-1">
                      <button
                        type="button"
                        onClick={() => startEditingEvent(event)}
                        className="bg-blue-600 text-white p-1 rounded hover:bg-blue-500 transition-colors"
                        title="Edit event"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteEvent(event.id)}
                        className="bg-red-600 text-white p-1 rounded hover:bg-red-500 transition-colors"
                        title="Delete event"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* No Events Message */}
      {events.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow-md">
          <Calendar size={64} className="mx-auto mb-4 text-gray-400" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">No Events Yet</h3>
          <p className="text-gray-500 mb-4">Start by adding your first event</p>
          <button
            type="button"
            onClick={() => {
              setIsAddingEvent(true);
              resetEventForm();
            }}
            className="bg-yellow-400 text-black px-6 py-2 rounded-lg hover:bg-yellow-300 transition-colors"
          >
            Add First Event
          </button>
        </div>
      )}
    </div>
  );
};