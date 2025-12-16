import React, { useState, useEffect } from 'react';
import { 
  User, 
  Music, 
  Calendar, 
  Share2, 
  Save, 
  Instagram, 
  Youtube, 
  Disc as Spotify,
  Plus,
  Trash2,
  MapPin,
  Timer
} from 'lucide-react';
import { ImageUpload } from '../ImageUpload';
import { VideoUploader } from '../VideoUploader';
import type { GuestArtist } from '../../context/DataContext';

interface GuestArtistFormProps {
  initialData?: GuestArtist | null;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

type CardMediaMode = 'image' | 'video';

export const GuestArtistForm: React.FC<GuestArtistFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting
}) => {
  const [activeTab, setActiveTab] = useState<'basic' | 'media' | 'schedule' | 'social'>('basic');
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    specialty: '',
    description: '',
    achievements: [] as string[],
    
    // Media
    image: '',
    video_url: '', // Uploaded video URL
    youtube_url: '',
    watch_live_url: '',
    detail_music_url: '',
    
    // Card Media
    card_media_url: '',
    card_media_mode: 'image' as CardMediaMode, // derived from card_media_is_video boolean
    
    // Schedule
    performance_date: '',
    performance_time: '',
    venue: '',
    countdown_enabled: false,
    live_now_enabled: true,
    
    // Settings
    order_position: 1,
    enabled: true,
    is_featured: false,
    
    // Social
    social_links: {
      instagram: '',
      youtube: '',
      spotify: ''
    }
  });

  // Initialize form data
  useEffect(() => {
    if (initialData) {
      // Parse performance_at to date/time
      let performance_date = '';
      let performance_time = '';
      if (initialData.performance_at) {
        try {
          const d = new Date(initialData.performance_at);
          if (!isNaN(d.getTime())) {
            const pad = (n: number) => String(n).padStart(2, '0');
            performance_date = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
            performance_time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
          }
        } catch (e) { console.error(e); }
      }

      setFormData({
        name: initialData.name || '',
        title: initialData.title || '',
        specialty: initialData.specialty || '',
        description: initialData.description || '',
        achievements: Array.isArray(initialData.achievements) ? initialData.achievements : [],
        
    image: initialData.image || '',
        video_url: (initialData as any).video_url || '',
        youtube_url: (initialData as any).youtube_url || '',
        watch_live_url: (initialData as any).watch_live_url || '',
        detail_music_url: (initialData as any).detail_music_url || '',
        
        card_media_url: (initialData as any).card_media_url || '',
        card_media_mode: ((initialData as any).card_media_is_video ? 'video' : 'image') as CardMediaMode,
        
        performance_date,
        performance_time,
        venue: (initialData as any).venue || '',
        countdown_enabled: !!(initialData as any).countdown_enabled,
        live_now_enabled: (initialData as any).live_now_enabled ?? true, // Default to true if undefined
        
        order_position: initialData.order_position || 1,
        enabled: initialData.enabled ?? true,
        is_featured: initialData.is_featured ?? false,
        
        social_links: (initialData.social_links as any) || { instagram: '', youtube: '', spotify: '' }
      });
    } else {
      // Defaults for new entry
      setFormData(prev => ({
        ...prev,
        enabled: true,
        live_now_enabled: true,
        order_position: 1, // Parent might want to set this based on list length, but we'll leave as 1 or derived
      }));
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.name || !formData.title || !formData.image || !formData.description || !formData.specialty) {
      alert('Please fill in all required fields (Basic Info tab).');
      return;
    }

    // Reconstruct performance_at
    let performance_at: string | null = null;
    if (formData.performance_date && formData.performance_time) {
      const local = new Date(`${formData.performance_date}T${formData.performance_time}`);
      performance_at = isNaN(local.getTime()) ? null : local.toISOString();
    }

    // Exclude internal UI state fields from submission
    const { 
      performance_date: _d, 
      performance_time: _t, 
      ...restFormData 
    } = formData;

    const submissionData = {
      ...restFormData,
      // Ensure specific fields are correctly computed/typed if needed, but 'restFormData' includes most columns
      card_media_is_video: !!(formData.card_media_url && formData.card_media_mode === 'video'),
      performance_at,
    };
    
    await onSubmit(submissionData);
  };

  const addAchievement = () => {
    setFormData(prev => ({ ...prev, achievements: [...prev.achievements, ''] }));
  };

  const updateAchievement = (index: number, val: string) => {
    setFormData(prev => {
      const newAchievements = [...prev.achievements];
      newAchievements[index] = val;
      return { ...prev, achievements: newAchievements };
    });
  };

  const removeAchievement = (index: number) => {
    setFormData(prev => ({
      ...prev, 
      achievements: prev.achievements.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="bg-white rounded-lg flex flex-col h-full max-h-[85vh]">
      {/* Tabs Header */}
      <div className="flex border-b border-gray-200">
        <button
          type="button"
          onClick={() => setActiveTab('basic')}
          className={`flex-1 py-4 text-sm font-medium text-center border-b-2 transition-colors ${
            activeTab === 'basic' ? 'border-yellow-400 text-yellow-600 bg-yellow-50' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <User className="w-4 h-4 mx-auto mb-1" />
          Basic Info
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('media')}
          className={`flex-1 py-4 text-sm font-medium text-center border-b-2 transition-colors ${
            activeTab === 'media' ? 'border-yellow-400 text-yellow-600 bg-yellow-50' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Music className="w-4 h-4 mx-auto mb-1" />
          Media
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('schedule')}
          className={`flex-1 py-4 text-sm font-medium text-center border-b-2 transition-colors ${
            activeTab === 'schedule' ? 'border-yellow-400 text-yellow-600 bg-yellow-50' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Calendar className="w-4 h-4 mx-auto mb-1" />
          Schedule
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('social')}
          className={`flex-1 py-4 text-sm font-medium text-center border-b-2 transition-colors ${
            activeTab === 'social' ? 'border-yellow-400 text-yellow-600 bg-yellow-50' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Share2 className="w-4 h-4 mx-auto mb-1" />
          Social
        </button>
      </div>

      {/* Content Area - Scrollable */}
      <div className="flex-1 overflow-y-auto p-6">
        <form id="guest-artist-form" onSubmit={handleSubmit} className="space-y-6">
          
          {/* BASIC INFO TAB */}
          {activeTab === 'basic' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Artist Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-yellow-400 focus:outline-none text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title/Role *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Singer, Performer"
                    value={formData.title}
                    onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-yellow-400 focus:outline-none text-gray-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Specialty *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pop Music, Classical"
                  value={formData.specialty}
                  onChange={e => setFormData(p => ({ ...p, specialty: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-yellow-400 focus:outline-none text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                <textarea
                  required
                  rows={4}
                  value={formData.description}
                  onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-yellow-400 focus:outline-none text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Achievements / Tags</label>
                <div className="space-y-2">
                  {formData.achievements.map((acc, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        type="text"
                        value={acc}
                        onChange={e => updateAchievement(idx, e.target.value)}
                        className="flex-1 p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-yellow-400 focus:outline-none text-gray-900"
                        placeholder="Achievement"
                      />
                      <button 
                        type="button" 
                        onClick={() => removeAchievement(idx)}
                        className="text-red-500 hover:text-red-700 px-2"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addAchievement}
                    className="text-sm text-yellow-600 hover:text-yellow-700 font-medium flex items-center"
                  >
                    <Plus size={16} className="mr-1" /> Add Achievement
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Order Position</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.order_position}
                    onChange={e => setFormData(p => ({ ...p, order_position: parseInt(e.target.value) || 1 }))}
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-yellow-400 focus:outline-none text-gray-900"
                  />
                </div>
                <div className="flex flex-col justify-end space-y-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.enabled}
                      onChange={e => setFormData(p => ({ ...p, enabled: e.target.checked }))}
                      className="form-checkbox text-yellow-500 rounded focus:ring-yellow-400"
                    />
                    <span className="text-sm font-medium text-gray-700">Visible to Public</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_featured}
                      onChange={e => setFormData(p => ({ ...p, is_featured: e.target.checked }))}
                      className="form-checkbox text-yellow-500 rounded focus:ring-yellow-400"
                    />
                    <span className="text-sm font-medium text-gray-700">Featured on Homepage</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* MEDIA TAB */}
          {activeTab === 'media' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Profile Image */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Profile Image *</label>
                <div className="bg-gray-50 p-4 rounded border border-gray-200">
                  <ImageUpload
                    onImageSelect={url => setFormData(p => ({ ...p, image: url }))}
                    currentImage={formData.image}
                    bucket="guest-artist-images"
                    folder="artists"
                    cropAspect={4/5}
                  />
                  <p className="text-xs text-gray-500 mt-2">Recommended aspect ratio: 4:5</p>
                </div>
              </div>

              {/* Performance Video */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Performance Video (Optional)</label>
                <div className="bg-gray-50 p-4 rounded border border-gray-200">
                  <VideoUploader
                    onVideoSelect={url => setFormData(p => ({ ...p, video_url: url }))}
                    currentVideo={formData.video_url}
                    bucket="guest-artist-videos"
                    folder="artists"
                    maxSizeMB={80}
                    fileTypeLabel="MP4/WEBM/MOV up to 80MB"
                  />
                  {formData.video_url && (
                    <div className="mt-2 p-2 bg-green-50 text-green-700 text-xs rounded border border-green-200 break-all">
                      Video Uploaded: {formData.video_url}
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-2">Upload a performance clip to be shown in the artist detail modal.</p>
                </div>
              </div>

              {/* YouTube Link */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">YouTube Video URL</label>
                <input
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={formData.youtube_url}
                  onChange={e => setFormData(p => ({ ...p, youtube_url: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-yellow-400 focus:outline-none text-gray-900"
                />
              </div>

              {/* Live Stream Link */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Live Stream URL</label>
                <input
                  type="url"
                  placeholder="https://youtube.com/live/..."
                  value={formData.watch_live_url}
                  onChange={e => setFormData(p => ({ ...p, watch_live_url: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-yellow-400 focus:outline-none text-gray-900"
                />
              </div>

              {/* Card Media (Motion Poster) */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">Homepage Card Media</label>
                  {formData.card_media_url && (
                    <button
                      type="button"
                      onClick={() => setFormData(p => ({ ...p, card_media_url: '' }))}
                      className="text-xs text-red-500 hover:text-red-700 hover:underline"
                    >
                      Remove Media
                    </button>
                  )}
                </div>
                <div className="bg-gray-50 p-4 rounded border border-gray-200">
                  <div className="flex gap-4 mb-4">
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        checked={formData.card_media_mode === 'image'}
                        onChange={() => setFormData(p => ({ 
                          ...p, 
                          card_media_mode: 'image',
                          card_media_url: p.card_media_mode === 'image' ? p.card_media_url : '' // Clear if switching types? logical decision: clear to avoid type mismatch
                        }))}
                        className="mr-2 text-yellow-500 focus:ring-yellow-400"
                      />
                      <span className="text-sm">Static Image</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        checked={formData.card_media_mode === 'video'}
                        onChange={() => setFormData(p => ({ 
                          ...p, 
                          card_media_mode: 'video',
                          card_media_url: p.card_media_mode === 'video' ? p.card_media_url : ''
                        }))}
                        className="mr-2 text-yellow-500 focus:ring-yellow-400"
                      />
                      <span className="text-sm">Motion Poster (Video)</span>
                    </label>
                  </div>
                  
                  {formData.card_media_mode === 'video' ? (
                    <VideoUploader
                      onVideoSelect={url => setFormData(p => ({ ...p, card_media_url: url }))}
                      currentVideo={formData.card_media_url}
                      bucket="guest-artist-videos"
                      folder="artists/card-media"
                      fileTypeLabel="Short loop, MP4/MOV, < 60MB"
                      maxSizeMB={60}
                    />
                  ) : (
                    <ImageUpload
                      onImageSelect={url => setFormData(p => ({ ...p, card_media_url: url }))}
                      currentImage={formData.card_media_url}
                      bucket="guest-artist-images"
                      folder="artists/card-media"
                      enableCropper={true}
                      cropAspect={16/9}
                      fileTypeLabel="Landscape Image (16:9)"
                    />
                  )}
                </div>
              </div>
              
              {/* Background Audio */}
              <div>
                 <label className="block text-sm font-medium text-gray-700 mb-2">Detail Modal Music (MP3)</label>
                 <div className="bg-gray-50 p-4 rounded border border-gray-200">
                   <ImageUpload
                      onImageSelect={(url) => setFormData(prev => ({ ...prev, detail_music_url: url }))}
                      currentImage={formData.detail_music_url}
                      bucket="guest-artist-audio"
                      folder="artists"
                      acceptedTypes="audio/mpeg,audio/mp3,audio/ogg,audio/*"
                      fileTypeLabel="MP3/OGG up to 25MB"
                      enableCropper={false}
                    />
                    {formData.detail_music_url && (
                      <div className="mt-3">
                        <audio controls src={formData.detail_music_url} className="w-full h-8" preload="none" />
                      </div>
                    )}
                    <input
                      type="url"
                      value={formData.detail_music_url}
                      onChange={(e) => setFormData(prev => ({ ...prev, detail_music_url: e.target.value }))}
                      placeholder="Or paste direct audio URL"
                      className="mt-2 w-full p-2 text-sm border border-gray-300 rounded text-gray-900"
                    />
                 </div>
              </div>
            </div>
          )}

          {/* SCHEDULE TAB */}
          {activeTab === 'schedule' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Performance Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                      type="date"
                      value={formData.performance_date}
                      onChange={e => setFormData(p => ({ ...p, performance_date: e.target.value }))}
                      className="w-full pl-9 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-yellow-400 focus:outline-none text-gray-900"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Performance Time</label>
                  <div className="relative">
                    <Timer className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                      type="time"
                      value={formData.performance_time}
                      onChange={e => setFormData(p => ({ ...p, performance_time: e.target.value }))}
                      className="w-full pl-9 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-yellow-400 focus:outline-none text-gray-900"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Venue</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Where is the performance?"
                    value={formData.venue}
                    onChange={e => setFormData(p => ({ ...p, venue: e.target.value }))}
                    className="w-full pl-9 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-yellow-400 focus:outline-none text-gray-900"
                  />
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg space-y-3 border border-blue-100">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.countdown_enabled}
                    onChange={e => setFormData(p => ({ ...p, countdown_enabled: e.target.checked }))}
                    className="form-checkbox text-blue-500 rounded focus:ring-blue-400"
                  />
                  <div>
                    <span className="font-medium text-gray-900 block">Show Countdown</span>
                    <span className="text-xs text-gray-500">Display a countdown timer on the public site until the performance starts.</span>
                  </div>
                </label>
                
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.live_now_enabled}
                    onChange={e => setFormData(p => ({ ...p, live_now_enabled: e.target.checked }))}
                    className="form-checkbox text-blue-500 rounded focus:ring-blue-400"
                  />
                  <div>
                    <span className="font-medium text-gray-900 block">Auto "LIVE NOW" Badge</span>
                    <span className="text-xs text-gray-500">Automatically show a "LIVE NOW" badge when the event start time is reached.</span>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* SOCIAL TAB */}
          {activeTab === 'social' && (
            <div className="space-y-6 animate-fadeIn">
              <p className="text-sm text-gray-500 mb-4">Add links to the artist's social media profiles.</p>
              
              <div className="flex items-center gap-3">
                <div className="w-10 flex justify-center"><Instagram className="text-pink-600" /></div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Instagram URL</label>
                  <input
                    type="url"
                    placeholder="https://instagram.com/ username"
                    value={formData.social_links.instagram}
                    onChange={e => setFormData(p => ({ 
                      ...p, 
                      social_links: { ...p.social_links, instagram: e.target.value } 
                    }))}
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-yellow-400 focus:outline-none text-gray-900"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 flex justify-center"><Youtube className="text-red-600" /></div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-500 mb-1">YouTube Channel URL</label>
                  <input
                    type="url"
                    placeholder="https://youtube.com/..."
                    value={formData.social_links.youtube}
                    onChange={e => setFormData(p => ({ 
                      ...p, 
                      social_links: { ...p.social_links, youtube: e.target.value } 
                    }))}
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-yellow-400 focus:outline-none text-gray-900"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 flex justify-center"><Spotify className="text-green-600" /></div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Spotify Artist URL</label>
                  <input
                    type="url"
                    placeholder="https://open.spotify.com/artist/..."
                    value={formData.social_links.spotify}
                    onChange={e => setFormData(p => ({ 
                      ...p, 
                      social_links: { ...p.social_links, spotify: e.target.value } 
                    }))}
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-yellow-400 focus:outline-none text-gray-900"
                  />
                </div>
              </div>
            </div>
          )}

        </form>
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-gray-200 flex justify-end gap-3 bg-gray-50 rounded-b-lg">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          form="guest-artist-form"
          className="px-6 py-2 bg-yellow-400 text-black font-semibold rounded-lg hover:bg-yellow-300 transition-colors flex items-center shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <span className="flex items-center">Saving...</span>
          ) : (
            <>
              <Save size={18} className="mr-2" />
              {initialData ? 'Update Artist' : 'Save Artist'}
            </>
          )}
        </button>
      </div>
    </div>
  );
};
