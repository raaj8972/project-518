import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X, Star, Eye, EyeOff, Music, Play, Instagram, Youtube, AlignJustify as Spotify, Calendar, MapPin, Timer } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { ImageUpload } from '../ImageUpload';
import type { GuestArtist } from '../../context/DataContext';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useSavingProgress } from '../../context/SavingProgressContext';
import { useApprovals } from '../../hooks/useApprovals';

type CardMediaMode = 'image' | 'video';

export const GuestArtistManagement: React.FC = () => {
  const savingProgress = useSavingProgress();
  const { submitForApproval, checkRequiresApproval } = useApprovals();
  const [requiresApproval, setRequiresApproval] = useState(false);

  useEffect(() => {
    checkRequiresApproval().then(setRequiresApproval);
  }, []);

  const { 
    guestArtists,
    addGuestArtist,
    updateGuestArtist,
    deleteGuestArtist,
    toggleGuestArtistEnabled,
    toggleGuestArtistFeatured
  } = useData();

  const [isAdding, setIsAdding] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);

  const [form, setForm, clearForm] = useLocalStorage('admin_guest_artist_form_draft', {
    name: '',
    title: '',
    image: '',
    video: '',
    video_url: '',
    youtube_url: '',
    watch_live_url: '', // NEW field for external live stream link
  detail_music_url: '',
    description: '',
    specialty: '',
    achievements: [] as string[],
    order_position: 1,
    enabled: true,
    is_featured: false,
  card_media_url: '',
  card_media_mode: 'image' as CardMediaMode,
    // scheduling
    performance_date: '', // YYYY-MM-DD
    performance_time: '', // HH:mm
    venue: '',
    countdown_enabled: false,
    live_now_enabled: true,
    social_links: {
      instagram: '',
      youtube: '',
      spotify: ''
    }
  });

  const resetForm = () => {
    setForm({
      name: '',
      title: '',
      image: '',
  video: '',
  video_url: '',
  youtube_url: '',
      watch_live_url: '',
  detail_music_url: '',
      description: '',
      specialty: '',
      achievements: [],
      order_position: guestArtists.length + 1,
      enabled: true,
      is_featured: false,
  card_media_url: '',
  card_media_mode: 'image' as CardMediaMode,
      performance_date: '',
      performance_time: '',
      venue: '',
      countdown_enabled: false,
      live_now_enabled: true,
      social_links: {
        instagram: '',
        youtube: '',
        spotify: ''
      }
    });
  };

  const handleAdd = async () => {
    if (!form.name || !form.title || !form.image || !form.description || !form.specialty) {
      alert('Please fill in all required fields (name, title, image, description, and specialty)');
      return;
    }
    
    try {
      const steps = savingProgress.withSteps(4, 'Preparing…');
      steps.next('Validating');
      let performance_at: string | null = null;
      if (form.performance_date && form.performance_time) {
        const local = new Date(`${form.performance_date}T${form.performance_time}`);
        performance_at = isNaN(local.getTime()) ? null : local.toISOString();
      }
      steps.next('Saving to database');
      if (requiresApproval) {
        await submitForApproval(
          'guest_artist',
          'create',
          {
            name: form.name,
            title: form.title,
            image: form.image,
            video: form.video && String(form.video).trim() ? String(form.video).trim() : null,
            video_url: form.video_url && String(form.video_url).trim() ? String(form.video_url).trim() : null,
            youtube_url: form.youtube_url && String(form.youtube_url).trim() ? String(form.youtube_url).trim() : null,
            watch_live_url: form.watch_live_url && String(form.watch_live_url).trim() ? String(form.watch_live_url).trim() : null,
            detail_music_url: form.detail_music_url && String(form.detail_music_url).trim() ? String(form.detail_music_url).trim() : null,
            card_media_url: form.card_media_url && String(form.card_media_url).trim() ? String(form.card_media_url).trim() : null,
            card_media_is_video: !!(form.card_media_url && form.card_media_mode === 'video'),
            description: form.description,
            specialty: form.specialty,
            achievements: form.achievements,
            order_position: form.order_position,
            enabled: form.enabled,
            is_featured: form.is_featured,
            performance_at,
            venue: form.venue || null,
            countdown_enabled: !!form.countdown_enabled,
            live_now_enabled: form.live_now_enabled !== false,
            social_links: form.social_links,
          }
        );
        alert('Request submitted for approval. An owner will review your changes.');
        setIsAdding(false);
        resetForm();
        try { localStorage.removeItem('admin_guest_artist_form_draft'); } catch {}
      } else {
        await addGuestArtist({
          name: form.name,
          title: form.title,
          image: form.image,
          video: form.video && String(form.video).trim() ? String(form.video).trim() : null,
          video_url: form.video_url && String(form.video_url).trim() ? String(form.video_url).trim() : null,
          youtube_url: form.youtube_url && String(form.youtube_url).trim() ? String(form.youtube_url).trim() : null,
          watch_live_url: form.watch_live_url && String(form.watch_live_url).trim() ? String(form.watch_live_url).trim() : null,
          detail_music_url: form.detail_music_url && String(form.detail_music_url).trim() ? String(form.detail_music_url).trim() : null,
          card_media_url: form.card_media_url && String(form.card_media_url).trim() ? String(form.card_media_url).trim() : null,
          card_media_is_video: !!(form.card_media_url && form.card_media_mode === 'video'),
          description: form.description,
          specialty: form.specialty,
          achievements: form.achievements,
          order_position: form.order_position,
          enabled: form.enabled,
          is_featured: form.is_featured,
          performance_at,
          venue: form.venue || null,
          countdown_enabled: !!form.countdown_enabled,
          live_now_enabled: form.live_now_enabled !== false,
          social_links: form.social_links,
        });
        setIsAdding(false);
        resetForm();
        try { localStorage.removeItem('admin_guest_artist_form_draft'); } catch {}
      }
    } catch (error) {
      console.error('Error adding guest artist:', error);
      alert('Failed to add guest artist. Please try again.');
    } finally {
      savingProgress.done();
    }
  };

  const handleUpdate = async (id: number) => {
    if (!form.name || !form.title || !form.image || !form.description || !form.specialty) {
      alert('Please fill in all required fields (name, title, image, description, and specialty)');
      return;
    }
    
    try {
      const steps = savingProgress.withSteps(4, 'Preparing…');
      steps.next('Validating');
      let performance_at: string | null = null;
      if (form.performance_date && form.performance_time) {
        const local = new Date(`${form.performance_date}T${form.performance_time}`);
        performance_at = isNaN(local.getTime()) ? null : local.toISOString();
      } else {
        performance_at = null;
      }
      steps.next('Saving to database');
      if (requiresApproval) {
        await submitForApproval(
          'guest_artist',
          'update',
          {
            name: form.name,
            title: form.title,
            image: form.image,
            video: form.video && String(form.video).trim() ? String(form.video).trim() : null,
            video_url: form.video_url && String(form.video_url).trim() ? String(form.video_url).trim() : null,
            youtube_url: form.youtube_url && String(form.youtube_url).trim() ? String(form.youtube_url).trim() : null,
            watch_live_url: form.watch_live_url && String(form.watch_live_url).trim() ? String(form.watch_live_url).trim() : null,
            detail_music_url: form.detail_music_url && String(form.detail_music_url).trim() ? String(form.detail_music_url).trim() : null,
            card_media_url: form.card_media_url && String(form.card_media_url).trim() ? String(form.card_media_url).trim() : null,
            card_media_is_video: !!(form.card_media_url && form.card_media_mode === 'video'),
            description: form.description,
            specialty: form.specialty,
            achievements: form.achievements,
            order_position: form.order_position,
            enabled: form.enabled,
            is_featured: form.is_featured,
            performance_at,
            venue: form.venue || null,
            countdown_enabled: !!form.countdown_enabled,
            live_now_enabled: form.live_now_enabled !== false,
            social_links: form.social_links,
          },
          id
        );
        alert('Request submitted for approval. An owner will review your changes.');
        setEditing(null);
        resetForm();
        try { localStorage.removeItem('admin_guest_artist_form_draft'); } catch {}
      } else {
        await updateGuestArtist(id, {
          name: form.name,
          title: form.title,
          image: form.image,
          video: form.video && String(form.video).trim() ? String(form.video).trim() : null,
          video_url: form.video_url && String(form.video_url).trim() ? String(form.video_url).trim() : null,
          youtube_url: form.youtube_url && String(form.youtube_url).trim() ? String(form.youtube_url).trim() : null,
          watch_live_url: form.watch_live_url && String(form.watch_live_url).trim() ? String(form.watch_live_url).trim() : null,
          detail_music_url: form.detail_music_url && String(form.detail_music_url).trim() ? String(form.detail_music_url).trim() : null,
          card_media_url: form.card_media_url && String(form.card_media_url).trim() ? String(form.card_media_url).trim() : null,
          card_media_is_video: !!(form.card_media_url && form.card_media_mode === 'video'),
          description: form.description,
          specialty: form.specialty,
          achievements: form.achievements,
          order_position: form.order_position,
          enabled: form.enabled,
          is_featured: form.is_featured,
          performance_at,
          venue: form.venue || null,
          countdown_enabled: !!form.countdown_enabled,
          live_now_enabled: form.live_now_enabled !== false,
          social_links: form.social_links,
        });
        setEditing(null);
        resetForm();
        try { localStorage.removeItem('admin_guest_artist_form_draft'); } catch {}
      }
    } catch (error) {
      console.error('Error updating guest artist:', error);
      const msg = (error as any)?.message || String(error);
      const hint = /watch_live_url|schema|column/i.test(msg)
        ? '\nHint: Database migration for watch_live_url may not be applied yet.'
        : '';
      alert(`Failed to update guest artist. ${msg}${hint}`);
    } finally {
      savingProgress.done();
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this guest artist? This action cannot be undone.')) {
      try {
        const steps = savingProgress.withSteps(2, 'Preparing…');
        steps.next('Deleting');
        if (requiresApproval) {
          await submitForApproval(
            'guest_artist',
            'delete',
            {},
            id
          );
          alert('Request submitted for approval. An owner will review your changes.');
        } else {
          await deleteGuestArtist(id);
        }
      } catch (error) {
        console.error('Error deleting guest artist:', error);
        alert('Failed to delete guest artist. Please try again.');
      } finally {
        savingProgress.done();
      }
    }
  };

  const handleToggleEnabled = async (id: number) => {
    try {
      const steps = savingProgress.withSteps(2, 'Preparing…');
      steps.next('Updating');
      if (requiresApproval) {
        await submitForApproval(
          'guest_artist',
          'update',
          { enabled: !guestArtists.find(a => a.id === id)?.enabled },
          id
        );
        alert('Request submitted for approval. An owner will review your changes.');
      } else {
        await toggleGuestArtistEnabled(id);
      }
    } catch (error) {
      console.error('Error toggling guest artist status:', error);
      const msg = (error as any)?.message || String(error);
      alert(`Failed to update guest artist status. ${msg}`);
    } finally {
      savingProgress.done();
    }
  };

  const handleToggleFeatured = async (id: number) => {
    try {
      const steps = savingProgress.withSteps(2, 'Preparing…');
      steps.next('Updating');
      if (requiresApproval) {
        await submitForApproval(
          'guest_artist',
          'update',
          { is_featured: !guestArtists.find(a => a.id === id)?.is_featured },
          id
        );
        alert('Request submitted for approval. An owner will review your changes.');
      } else {
        await toggleGuestArtistFeatured(id);
      }
    } catch (error) {
      console.error('Error toggling featured status:', error);
      const msg = (error as any)?.message || String(error);
      alert(`Failed to update featured status. ${msg}`);
    } finally {
      savingProgress.done();
    }
  };

  const startEditing = (artist: GuestArtist) => {
    try { clearForm(); } catch {}
    // derive date/time from ISO if present
    let performance_date = '';
    let performance_time = '';
    if ((artist as any).performance_at) {
      try {
        const d = new Date((artist as any).performance_at as any);
        if (!isNaN(d.getTime())) {
          const pad = (n: number) => String(n).padStart(2, '0');
          performance_date = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
          performance_time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
        }
      } catch {}
    }
    setForm({
      name: artist.name,
      title: artist.title,
      image: artist.image,
  video: artist.video || '',
  video_url: (artist as any).video_url || '',
  youtube_url: (artist as any).youtube_url || '',
      watch_live_url: (artist as any).watch_live_url || '',
    detail_music_url: (artist as any).detail_music_url || '',
      description: artist.description,
      specialty: artist.specialty,
      achievements: artist.achievements,
      order_position: artist.order_position,
      enabled: artist.enabled,
      is_featured: artist.is_featured,
      card_media_url: (artist as any).card_media_url || '',
  card_media_mode: ((artist as any).card_media_is_video ? 'video' : 'image') as CardMediaMode,
      performance_date,
      performance_time,
      venue: (artist as any).venue || '',
      countdown_enabled: !!(artist as any).countdown_enabled,
      live_now_enabled: (artist as any).live_now_enabled ?? true,
      social_links: artist.social_links || { instagram: '', youtube: '', spotify: '' }
    });
    setEditing(artist.id);
  };

  const addAchievement = () => {
    setForm(prev => ({
      ...prev,
      achievements: [...prev.achievements, '']
    }));
  };

  const updateAchievement = (index: number, value: string) => {
    setForm(prev => ({
      ...prev,
      achievements: prev.achievements.map((a, i) => i === index ? value : a)
    }));
  };

  const removeAchievement = (index: number) => {
    setForm(prev => ({
      ...prev,
      achievements: prev.achievements.filter((_, i) => i !== index)
    }));
  };

  // Sort guest artists by order position
  const sortedGuestArtists = [...guestArtists].sort((a, b) => a.order_position - b.order_position);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Guest Artist Management</h2>
          <p className="text-gray-600">Manage featured guest artists for the homepage</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setIsAdding(true);
            resetForm();
          }}
          className="bg-yellow-400 text-black px-4 py-2 rounded-lg hover:bg-yellow-300 transition-colors flex items-center"
        >
          <Plus size={16} className="mr-2" />
          Add Guest Artist
        </button>
      </div>

      {/* Add Guest Artist Form */}
      {isAdding && (
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-400">
          <h3 className="text-lg font-semibold mb-6">Add New Guest Artist</h3>
          <div className="grid lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Artist Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Artist Name"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title/Role *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Singer, Performer, etc."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Specialty *</label>
                <input
                  type="text"
                  value={form.specialty}
                  onChange={(e) => setForm(prev => ({ ...prev, specialty: e.target.value }))}
                  placeholder="e.g., Pop Music, Classical, Electronic"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description about the guest artist..."
                  rows={4}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">YouTube Video URL (Optional)</label>
                <input
                  type="url"
                  value={form.youtube_url}
                  onChange={(e) => setForm(prev => ({ ...prev, youtube_url: e.target.value }))}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Upload Performance Video (Optional)</label>
                <ImageUpload
                  onImageSelect={(url) => setForm(prev => ({ ...prev, video_url: url }))}
                  currentImage={form.video_url}
                  bucket="guest-artist-videos"
                  folder="artists"
                  acceptedTypes="video/*"
                  fileTypeLabel="MP4/WEBM/MOV up to 80MB"
                  enableCropper={false}
                />
                {form.video_url && (
                  <p className="text-xs text-gray-500 mt-1 break-all">Uploaded video URL: {form.video_url}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Live Stream URL (Optional)</label>
                <input
                  type="url"
                  value={form.watch_live_url}
                  onChange={(e) => setForm(prev => ({ ...prev, watch_live_url: e.target.value }))}
                  placeholder="https://www.youtube.com/live/... or other platform"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Detail Modal Music (Optional, MP3)</label>
                <div className="space-y-3">
                  <ImageUpload
                    onImageSelect={(url) => setForm(prev => ({ ...prev, detail_music_url: url }))}
                    currentImage={form.detail_music_url}
                    bucket="guest-artist-audio"
                    folder="artists"
                    acceptedTypes="audio/mpeg,audio/mp3,audio/ogg,audio/*"
                    fileTypeLabel="MP3/OGG up to 25MB"
                    enableCropper={false}
                  />
                  {form.detail_music_url && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-2">Preview current track</p>
                      <audio controls src={form.detail_music_url} className="w-full" preload="none" />
                    </div>
                  )}
                  <input
                    type="url"
                    value={form.detail_music_url}
                    onChange={(e) => setForm(prev => ({ ...prev, detail_music_url: e.target.value }))}
                    placeholder="https://cdn.example.com/audio/loop.mp3"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900"
                  />
                  <p className="text-xs text-gray-500">
                    Upload or paste a direct MP3/OGG link. The track will autoplay, loop, and stop when the modal closes.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Display Order</label>
                  <input
                    type="number"
                    value={form.order_position}
                    onChange={(e) => setForm(prev => ({ ...prev, order_position: parseInt(e.target.value) || 1 }))}
                    min="1"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900"
                  />
                </div>
                <div className="flex items-end space-x-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={form.enabled}
                      onChange={(e) => setForm(prev => ({ ...prev, enabled: e.target.checked }))}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-gray-700">Visible</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={form.is_featured}
                      onChange={(e) => setForm(prev => ({ ...prev, is_featured: e.target.checked }))}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-gray-700">Featured on Homepage</span>
                  </label>
                </div>
              </div>

              {/* Performance Schedule */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Performance Schedule (Optional)</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <div className="flex items-center text-xs text-gray-500 mb-1"><Calendar size={14} className="mr-1" /> Date</div>
                    <input
                      type="date"
                      value={form.performance_date}
                      onChange={(e) => setForm(prev => ({ ...prev, performance_date: e.target.value }))}
                      className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900"
                    />
                  </div>
                  <div>
                    <div className="flex items-center text-xs text-gray-500 mb-1"><Timer size={14} className="mr-1" /> Time</div>
                    <input
                      type="time"
                      value={form.performance_time}
                      onChange={(e) => setForm(prev => ({ ...prev, performance_time: e.target.value }))}
                      className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900"
                    />
                  </div>
                  <div>
                    <div className="flex items-center text-xs text-gray-500 mb-1"><MapPin size={14} className="mr-1" /> Venue</div>
                    <input
                      type="text"
                      value={form.venue}
                      onChange={(e) => setForm(prev => ({ ...prev, venue: e.target.value }))}
                      placeholder="Venue"
                      className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900"
                    />
                  </div>
                </div>
                <label className="flex items-center mt-3">
                  <input
                    type="checkbox"
                    checked={!!form.countdown_enabled}
                    onChange={(e) => setForm(prev => ({ ...prev, countdown_enabled: e.target.checked }))}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Show countdown on public site</span>
                </label>
                <label className="flex items-center mt-2">
                  <input
                    type="checkbox"
                    checked={form.live_now_enabled !== false}
                    onChange={(e) => setForm(prev => ({ ...prev, live_now_enabled: e.target.checked }))}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Show LIVE NOW when event starts</span>
                </label>
              </div>
              
              {/* Social Links */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Social Media Links (Optional)</label>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Instagram className="w-5 h-5 text-pink-500" />
                    <input
                      type="url"
                      value={form.social_links.instagram}
                      onChange={(e) => setForm(prev => ({ 
                        ...prev, 
                        social_links: { ...prev.social_links, instagram: e.target.value }
                      }))}
                      placeholder="Instagram profile URL"
                      className="flex-1 p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Youtube className="w-5 h-5 text-red-500" />
                    <input
                      type="url"
                      value={form.social_links.youtube}
                      onChange={(e) => setForm(prev => ({ 
                        ...prev, 
                        social_links: { ...prev.social_links, youtube: e.target.value }
                      }))}
                      placeholder="YouTube channel URL"
                      className="flex-1 p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Spotify className="w-5 h-5 text-green-500" />
                    <input
                      type="url"
                      value={form.social_links.spotify}
                      onChange={(e) => setForm(prev => ({ 
                        ...prev, 
                        social_links: { ...prev.social_links, spotify: e.target.value }
                      }))}
                      placeholder="Spotify artist URL"
                      className="flex-1 p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900"
                    />
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Achievements</label>
                <div className="space-y-2">
                  {form.achievements.map((achievement, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={achievement}
                        onChange={(e) => updateAchievement(index, e.target.value)}
                        placeholder="Achievement or accomplishment"
                        className="flex-1 p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900"
                      />
                      <button
                        type="button"
                        onClick={() => removeAchievement(index)}
                        className="text-red-600 hover:text-red-800 p-1"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addAchievement}
                    className="text-yellow-600 hover:text-yellow-700 text-sm flex items-center"
                  >
                    <Plus size={16} className="mr-1" />
                    Add Achievement
                  </button>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Profile Photo *</label>
                <ImageUpload
                  onImageSelect={(url) => setForm(prev => ({ ...prev, image: url }))}
                  currentImage={form.image}
                  bucket="guest-artist-images"
                  folder="artists"
                  cropAspect={4/5}
                />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Card Media (Homepage strip)</label>
                    <p className="text-xs text-gray-500">Show either a short motion poster (video) or a still image on the guest artist card—just like event cards.</p>
                  </div>
                  {form.card_media_url && (
                    <button
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, card_media_url: '' }))}
                      className="text-xs text-red-500 hover:text-red-600"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <label className="inline-flex items-center text-gray-900">
                    <input
                      type="radio"
                      className="mr-2"
                      checked={form.card_media_mode === 'image'}
                      onChange={() => setForm(prev => ({
                        ...prev,
                        card_media_mode: 'image' as CardMediaMode,
                        card_media_url: prev.card_media_mode === 'image' ? prev.card_media_url : ''
                      }))}
                    />
                    Image
                  </label>
                  <label className="inline-flex items-center text-gray-900">
                    <input
                      type="radio"
                      className="mr-2"
                      checked={form.card_media_mode === 'video'}
                      onChange={() => setForm(prev => ({
                        ...prev,
                        card_media_mode: 'video' as CardMediaMode,
                        card_media_url: prev.card_media_mode === 'video' ? prev.card_media_url : ''
                      }))}
                    />
                    Motion Poster (Video)
                  </label>
                </div>
                <ImageUpload
                  onImageSelect={(url) => setForm(prev => ({ ...prev, card_media_url: url }))}
                  currentImage={form.card_media_url || ''}
                  bucket={form.card_media_mode === 'video' ? 'guest-artist-videos' : 'guest-artist-images'}
                  folder="artists/card-media"
                  acceptedTypes={form.card_media_mode === 'video' ? 'video/*' : undefined}
                  enableCropper={form.card_media_mode !== 'video'}
                  cropAspect={form.card_media_mode !== 'video' ? 16/9 : undefined}
                  fileTypeLabel={form.card_media_mode === 'video'
                    ? 'MP4, MOV, WEBM up to 60MB. Aim for 3-10 seconds so it loops smoothly.'
                    : 'PNG/JPG/WEBP up to 10MB. Use 16:9 (landscape) to fill the strip.'}
                />
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                resetForm();
              }}
              className="w-full sm:w-auto px-6 py-2 text-gray-600 hover:text-gray-800 flex items-center justify-center"
            >
              <X size={16} className="mr-1" />
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAdd}
              className="w-full sm:w-auto px-6 py-2 bg-yellow-400 text-black rounded-lg hover:bg-yellow-300 flex items-center justify-center"
            >
              <Save size={16} className="mr-1" />
              Add Guest Artist
            </button>
          </div>
        </div>
      )}

      {/* Guest Artists List */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedGuestArtists.map((artist) => (
          <div key={artist.id} className="bg-white rounded-lg shadow-md overflow-hidden">
            {editing === artist.id ? (
              <div className="p-6 space-y-4">
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Artist name"
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900"
                />
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Title/Role"
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900"
                />
                <input
                  type="text"
                  value={form.specialty}
                  onChange={(e) => setForm(prev => ({ ...prev, specialty: e.target.value }))}
                  placeholder="Specialty"
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900"
                />
                <textarea
                  value={form.description}
                  onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  placeholder="Description"
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900"
                />
                <input
                  type="url"
                  value={form.video}
                  onChange={(e) => setForm(prev => ({ ...prev, video: e.target.value }))}
                  placeholder="Video URL"
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900"
                />
                <input
                  type="url"
                  value={form.watch_live_url}
                  onChange={(e) => setForm(prev => ({ ...prev, watch_live_url: e.target.value }))}
                  placeholder="Live Stream URL"
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900"
                />
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">Detail Modal Music (Optional, MP3)</label>
                  <div className="space-y-2">
                    <ImageUpload
                      onImageSelect={(url) => setForm(prev => ({ ...prev, detail_music_url: url }))}
                      currentImage={form.detail_music_url}
                      bucket="guest-artist-audio"
                      folder="artists"
                      acceptedTypes="audio/mpeg,audio/mp3,audio/ogg,audio/*"
                      fileTypeLabel="MP3/OGG up to 25MB"
                      enableCropper={false}
                    />
                    {form.detail_music_url && (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-2">
                        <p className="text-[11px] text-gray-500 mb-1">Preview current track</p>
                        <audio controls src={form.detail_music_url} className="w-full" preload="none" />
                      </div>
                    )}
                    <input
                      type="url"
                      value={form.detail_music_url}
                      onChange={(e) => setForm(prev => ({ ...prev, detail_music_url: e.target.value }))}
                      placeholder="https://cdn.example.com/audio/loop.mp3"
                      className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900"
                    />
                    <p className="text-[11px] text-gray-500">
                      Upload or paste a direct MP3/OGG link. The track will autoplay and loop until the modal closes.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="number"
                    value={form.order_position}
                    onChange={(e) => setForm(prev => ({ ...prev, order_position: parseInt(e.target.value) || 1 }))}
                    min="1"
                    placeholder="Display order"
                    className="p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900"
                  />
                  <div className="flex items-center space-x-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={form.enabled}
                        onChange={(e) => setForm(prev => ({ ...prev, enabled: e.target.checked }))}
                        className="mr-1"
                      />
                      <span className="text-xs">Enabled</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={form.is_featured}
                        onChange={(e) => setForm(prev => ({ ...prev, is_featured: e.target.checked }))}
                        className="mr-1"
                      />
                      <span className="text-xs">Featured</span>
                    </label>
                  </div>
                </div>

                {/* Performance Schedule editing */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <input
                      type="date"
                      value={form.performance_date}
                      onChange={(e) => setForm(prev => ({ ...prev, performance_date: e.target.value }))}
                      className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900"
                    />
                  </div>
                  <div>
                    <input
                      type="time"
                      value={form.performance_time}
                      onChange={(e) => setForm(prev => ({ ...prev, performance_time: e.target.value }))}
                      className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={form.venue}
                      onChange={(e) => setForm(prev => ({ ...prev, venue: e.target.value }))}
                      placeholder="Venue"
                      className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900"
                    />
                  </div>
                </div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={!!form.countdown_enabled}
                    onChange={(e) => setForm(prev => ({ ...prev, countdown_enabled: e.target.checked }))}
                    className="mr-2"
                  />
                  <span className="text-xs text-gray-900">Show countdown on public site</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={form.live_now_enabled !== false}
                    onChange={(e) => setForm(prev => ({ ...prev, live_now_enabled: e.target.checked }))}
                    className="mr-2"
                  />
                  <span className="text-xs text-gray-900">Show LIVE NOW when event starts</span>
                </label>
                
                {/* Social Links editing */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Instagram className="w-4 h-4 text-pink-500" />
                    <input
                      type="url"
                      value={form.social_links.instagram}
                      onChange={(e) => setForm(prev => ({ 
                        ...prev, 
                        social_links: { ...prev.social_links, instagram: e.target.value }
                      }))}
                      placeholder="Instagram URL"
                      className="flex-1 p-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-yellow-400 text-gray-900"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Youtube className="w-4 h-4 text-red-500" />
                    <input
                      type="url"
                      value={form.social_links.youtube}
                      onChange={(e) => setForm(prev => ({ 
                        ...prev, 
                        social_links: { ...prev.social_links, youtube: e.target.value }
                      }))}
                      placeholder="YouTube URL"
                      className="flex-1 p-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-yellow-400 text-gray-900"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Spotify className="w-4 h-4 text-green-500" />
                    <input
                      type="url"
                      value={form.social_links.spotify}
                      onChange={(e) => setForm(prev => ({ 
                        ...prev, 
                        social_links: { ...prev.social_links, spotify: e.target.value }
                      }))}
                      placeholder="Spotify URL"
                      className="flex-1 p-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-yellow-400 text-gray-900"
                    />
                  </div>
                </div>

                <ImageUpload
                  onImageSelect={(url) => setForm(prev => ({ ...prev, image: url }))}
                  currentImage={form.image}
                  bucket="guest-artist-images"
                  folder="artists"
                  className="h-32"
                  cropAspect={4/5}
                />
                <div className="space-y-3 pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Card Media (Homepage strip)</label>
                      <p className="text-xs text-gray-500">Upload a landscape image or short video shown on the card.</p>
                    </div>
                    {form.card_media_url && (
                      <button
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, card_media_url: '' }))}
                        className="text-xs text-red-500 hover:text-red-600"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <label className="inline-flex items-center text-gray-900">
                      <input
                        type="radio"
                        className="mr-2"
                        checked={form.card_media_mode === 'image'}
                        onChange={() => setForm(prev => ({
                          ...prev,
                          card_media_mode: 'image' as CardMediaMode,
                          card_media_url: prev.card_media_mode === 'image' ? prev.card_media_url : ''
                        }))}
                      />
                      Image
                    </label>
                    <label className="inline-flex items-center text-gray-900">
                      <input
                        type="radio"
                        className="mr-2"
                        checked={form.card_media_mode === 'video'}
                        onChange={() => setForm(prev => ({
                          ...prev,
                          card_media_mode: 'video' as CardMediaMode,
                          card_media_url: prev.card_media_mode === 'video' ? prev.card_media_url : ''
                        }))}
                      />
                      Motion Poster (Video)
                    </label>
                  </div>
                  <ImageUpload
                    onImageSelect={(url) => setForm(prev => ({ ...prev, card_media_url: url }))}
                    currentImage={form.card_media_url || ''}
                    bucket={form.card_media_mode === 'video' ? 'guest-artist-videos' : 'guest-artist-images'}
                    folder="artists/card-media"
                    acceptedTypes={form.card_media_mode === 'video' ? 'video/*' : undefined}
                    enableCropper={form.card_media_mode !== 'video'}
                    cropAspect={form.card_media_mode !== 'video' ? 16/9 : undefined}
                    fileTypeLabel={form.card_media_mode === 'video'
                      ? 'MP4, MOV, WEBM up to 60MB'
                      : 'PNG/JPG/WEBP up to 10MB (16:9 recommended)'}
                  />
                </div>
                <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4 border-t border-gray-200 mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(null);
                      resetForm();
                    }}
                    className="w-full sm:w-auto px-4 py-2 text-gray-600 hover:text-gray-800 flex items-center justify-center"
                  >
                    <X size={14} className="mr-1" />
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdate(artist.id)}
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
                    src={artist.image}
                    alt={artist.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2 flex space-x-1">
                    {artist.is_featured && (
                      <Star className="w-6 h-6 text-pink-400 fill-current" />
                    )}
                    {!artist.enabled && (
                      <span className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                        Hidden
                      </span>
                    )}
                  </div>
                  <div className="absolute top-2 right-2">
                    <span className="bg-black/70 text-white px-2 py-1 rounded text-xs">
                      Order: {artist.order_position}
                    </span>
                  </div>
                  {artist.video && (
                    <div className="absolute bottom-2 right-2">
                      <Play className="w-6 h-6 text-white bg-black/50 rounded-full p-1" />
                    </div>
                  )}
                </div>
                
                <div className="p-4">
                  <h3 className="font-bold text-lg text-gray-900 mb-1">{artist.name}</h3>
                  <p className="text-purple-600 font-semibold text-sm mb-2">{artist.title}</p>
                  <div className="mb-3">
                    <span className="inline-block bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium">
                      {artist.specialty}
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">{artist.description}</p>
                  
                  {/* Social Links Display */}
                  {artist.social_links && Object.values(artist.social_links).some(link => link) && (
                    <div className="flex space-x-2 mb-4">
                      {artist.social_links.instagram && (
                        <Instagram className="w-4 h-4 text-pink-500" />
                      )}
                      {artist.social_links.youtube && (
                        <Youtube className="w-4 h-4 text-red-500" />
                      )}
                      {artist.social_links.spotify && (
                        <Spotify className="w-4 h-4 text-green-500" />
                      )}
                    </div>
                  )}
                  
                  {artist.achievements.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-medium text-gray-700 mb-2">
                        {artist.achievements.length} Achievement{artist.achievements.length !== 1 ? 's' : ''}
                      </p>
                      <div className="text-xs text-gray-500">
                        {artist.achievements.slice(0, 2).map((achievement, index) => (
                          <div key={index} className="truncate">• {achievement}</div>
                        ))}
                        {artist.achievements.length > 2 && (
                          <div>... and {artist.achievements.length - 2} more</div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center">
                    <div className="flex space-x-1">
                      <button
                        type="button"
                        onClick={() => handleToggleEnabled(artist.id)}
                        className={`p-1 rounded transition-colors ${
                          artist.enabled 
                            ? 'bg-green-100 text-green-600' 
                            : 'bg-red-100 text-red-600'
                        } hover:bg-green-200`}
                        title={artist.enabled ? 'Hide from public' : 'Show to public'}
                      >
                        {artist.enabled ? <Eye size={14} /> : <EyeOff size={14} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleFeatured(artist.id)}
                        className={`p-1 rounded transition-colors ${
                          artist.is_featured 
                            ? 'bg-pink-100 text-pink-600' 
                            : 'bg-gray-100 text-gray-600'
                        } hover:bg-pink-200`}
                        title={artist.is_featured ? 'Remove from featured' : 'Mark as featured'}
                      >
                        <Star size={14} className={artist.is_featured ? 'fill-current' : ''} />
                      </button>
                    </div>
                    <div className="flex space-x-1">
                      <button
                        type="button"
                        onClick={() => startEditing(artist)}
                        className="bg-blue-600 text-white p-1 rounded hover:bg-blue-500 transition-colors"
                        title="Edit guest artist"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(artist.id)}
                        className="bg-red-600 text-white p-1 rounded hover:bg-red-500 transition-colors"
                        title="Delete guest artist"
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

      {/* No Guest Artists Message */}
      {guestArtists.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow-md">
          <Music size={64} className="mx-auto mb-4 text-gray-400" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">No Guest Artists Yet</h3>
          <p className="text-gray-500 mb-4">Start by adding your first guest artist</p>
          <button
            type="button"
            onClick={() => {
              setIsAdding(true);
              resetForm();
            }}
            className="bg-yellow-400 text-black px-6 py-2 rounded-lg hover:bg-yellow-300 transition-colors"
          >
            Add First Guest Artist
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="grid md:grid-cols-4 gap-6 text-center">
          <div>
            <div className="text-2xl font-bold text-purple-500 mb-1">{guestArtists.length}</div>
            <div className="text-gray-600 text-sm">Total Artists</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-pink-500 mb-1">
              {guestArtists.filter(a => a.is_featured).length}
            </div>
            <div className="text-gray-600 text-sm">Featured on Homepage</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-500 mb-1">
              {guestArtists.filter(a => a.enabled).length}
            </div>
            <div className="text-gray-600 text-sm">Visible Artists</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-500 mb-1">
              {guestArtists.filter(a => a.video).length}
            </div>
            <div className="text-gray-600 text-sm">With Videos</div>
          </div>
        </div>
      </div>
    </div>
  );
};