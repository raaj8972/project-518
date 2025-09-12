import React, { useState, useEffect } from 'react';
import { Image as ImageIcon, Save, X } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { ImageUpload } from '../ImageUpload';

type PageKey = 'home' | 'events' | 'schedule' | 'gallery' | 'homebound' | 'ricofamily' | 'sponsors';

const PAGE_LABELS: Record<PageKey, string> = {
  home: 'Home',
  events: 'Events',
  schedule: 'Schedule',
  gallery: 'Gallery',
  homebound: 'Home Bound',
  ricofamily: 'Rico Family',
  sponsors: 'Sponsors',
};

export const HeroMediaManagement: React.FC = () => {
  const { heroMedia, fetchHeroMedia, updateHeroMedia } = useData();
  const [selectedPage, setSelectedPage] = useState<PageKey>('home');
  const current = heroMedia?.[selectedPage] || null;

  const [form, setForm] = useState({
    background_type: 'image' as 'image' | 'video' | 'auto',
    image_url: '',
    video_url: '',
    poster_url: '',
    overlay_color: '#000000',
    overlay_opacity: 0.35,
    enabled: true,
  });

  useEffect(() => {
    // Load for selected page when switching
    fetchHeroMedia(selectedPage).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPage]);

  useEffect(() => {
    if (current) {
      setForm({
        background_type: (current.background_type || 'image') as any,
        image_url: current.image_url || '',
        video_url: current.video_url || '',
        poster_url: current.poster_url || '',
        overlay_color: current.overlay_color || '#000000',
        overlay_opacity: typeof current.overlay_opacity === 'number' ? current.overlay_opacity : 0.35,
        enabled: current.enabled !== false,
      });
    }
  }, [current]);

  const handleSave = async () => {
    await updateHeroMedia(selectedPage, form as any);
    alert('Hero media saved');
  };

  const clearField = (key: 'image_url' | 'video_url' | 'poster_url') => {
    setForm((p) => ({ ...p, [key]: '' }));
  };

  // Allow saving even if media is cleared (blank image/video)
  const disabledSave = false;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Hero Media</h2>
          <p className="text-gray-600">Control hero background image/video for each page</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="grid sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Page</label>
            <select
              value={selectedPage}
              onChange={(e) => setSelectedPage(e.target.value as PageKey)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
            >
              {Object.entries(PAGE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Background Type</label>
            <select
              value={form.background_type}
              onChange={(e) => setForm((p) => ({ ...p, background_type: e.target.value as any }))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
            >
              <option value="image">Image</option>
              <option value="video">Video</option>
              <option value="auto">Auto</option>
            </select>
          </div>

          <div className="flex items-center">
            <input
              id="enabled"
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setForm((p) => ({ ...p, enabled: e.target.checked }))}
              className="mr-2"
            />
            <label htmlFor="enabled" className="text-sm font-medium text-gray-700">Enabled</label>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 mt-6">
          {/* Media pickers */}
          <div className="space-y-6">
            {form.background_type !== 'video' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Hero Image</label>
                <ImageUpload
                  onImageSelect={(url) => setForm((p) => ({ ...p, image_url: url }))}
                  currentImage={form.image_url}
                  bucket="hero-media"
                  folder={`hero/${selectedPage}`}
                  acceptedTypes="image/*"
                  fileTypeLabel="PNG, JPG, WEBP, GIF up to 5MB"
                />
                {form.image_url && (
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => clearField('image_url')}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      Clear image URL
                    </button>
                  </div>
                )}
              </div>
            )}

            {form.background_type !== 'image' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Hero Video</label>
                <ImageUpload
                  onImageSelect={(url) => setForm((p) => ({ ...p, video_url: url }))}
                  currentImage={form.video_url}
                  bucket="hero-media"
                  folder={`hero/${selectedPage}`}
                  acceptedTypes="video/*"
                  fileTypeLabel="MP4, MOV, WEBM up to 50MB"
                />
                {form.video_url && (
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => clearField('video_url')}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      Clear video URL
                    </button>
                  </div>
                )}
              </div>
            )}

            {form.background_type !== 'image' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Video Poster (optional)</label>
                <ImageUpload
                  onImageSelect={(url) => setForm((p) => ({ ...p, poster_url: url }))}
                  currentImage={form.poster_url}
                  bucket="hero-media"
                  folder={`hero/${selectedPage}`}
                  acceptedTypes="image/*"
                  fileTypeLabel="PNG, JPG, WEBP up to 5MB"
                />
                {form.poster_url && (
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => clearField('poster_url')}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      Clear poster URL
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Overlay + preview */}
          <div className="space-y-6">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Overlay Color</label>
                <input
                  type="color"
                  value={form.overlay_color}
                  onChange={(e) => setForm((p) => ({ ...p, overlay_color: e.target.value }))}
                  className="w-full h-10 p-1 border border-gray-300 rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Overlay Opacity ({form.overlay_opacity.toFixed(2)})</label>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={form.overlay_opacity}
                  onChange={(e) => setForm((p) => ({ ...p, overlay_opacity: parseFloat(e.target.value) }))}
                  className="w-full"
                />
              </div>
            </div>

            <div className="bg-gray-900 rounded-lg overflow-hidden border border-gray-800">
              <div className="relative h-48">
                {form.background_type === 'video' && form.video_url ? (
                  <video
                    src={form.video_url}
                    muted
                    playsInline
                    autoPlay
                    loop
                    className="w-full h-full object-cover"
                  />
                ) : form.image_url ? (
                  <img src={form.image_url} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500">
                    <ImageIcon className="w-8 h-8" />
                  </div>
                )}
                <div
                  className="absolute inset-0"
                  style={{ backgroundColor: form.overlay_color, opacity: form.overlay_opacity }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white text-sm bg-black/40 px-2 py-1 rounded">{PAGE_LABELS[selectedPage]} Preview</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={() => fetchHeroMedia(selectedPage)}
            className="px-6 py-2 text-gray-600 hover:text-gray-800 flex items-center"
          >
            <X size={16} className="mr-2" />
            Reset
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={disabledSave}
            className="px-6 py-2 bg-yellow-400 text-black rounded-lg hover:bg-yellow-300 flex items-center disabled:opacity-50"
          >
            <Save size={16} className="mr-2" />
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default HeroMediaManagement;
