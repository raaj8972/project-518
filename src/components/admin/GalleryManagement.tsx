import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Save, X, Image as ImageIcon, Star, Calendar } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { ImageUpload } from '../ImageUpload';
import type { GalleryImage } from '../../context/DataContext';

export const GalleryManagement: React.FC = () => {
  const { 
    galleryImages, 
    eventCategories,
    addGalleryImage, 
    updateGalleryImage, 
    deleteGalleryImage,
    toggleGalleryImageFeatured,
    gallerySettings,
    updateGallerySettings
  } = useData();

  const [isAdding, setIsAdding] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('All');

  const [form, setForm] = useState({
    src: '',
    category: '',
    title: '',
    year: new Date().getFullYear().toString(),
    featured: false
  });

  const categories = ['All', ...eventCategories.map(cat => cat.name)];
  const filteredImages = selectedCategory === 'All' 
    ? galleryImages 
    : galleryImages.filter(img => img.category === selectedCategory);

  // ---- Gallery animation settings form (controlled) ----
  const [settingsForm, setSettingsForm] = useState({
    scroll_per_item: gallerySettings?.scroll_per_item ?? 650,
    distance: gallerySettings?.distance ?? 1400,
    background_blur_px: gallerySettings?.background_blur_px ?? 100,
    card_blur_max: gallerySettings?.card_blur_max ?? 8,
    reveal_enabled: gallerySettings?.reveal_enabled ?? true,
    reveal_duration_ms: gallerySettings?.reveal_duration_ms ?? 800,
    reveal_orientation: gallerySettings?.reveal_orientation ?? 'horizontal',
  });
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    setSettingsForm({
      scroll_per_item: gallerySettings?.scroll_per_item ?? 650,
      distance: gallerySettings?.distance ?? 1400,
      background_blur_px: gallerySettings?.background_blur_px ?? 100,
      card_blur_max: gallerySettings?.card_blur_max ?? 8,
      reveal_enabled: gallerySettings?.reveal_enabled ?? true,
      reveal_duration_ms: gallerySettings?.reveal_duration_ms ?? 800,
      reveal_orientation: gallerySettings?.reveal_orientation ?? 'horizontal',
    });
    setDirty(false);
  }, [gallerySettings]);

  const onNum = (v: string, fallback: number) => {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : fallback;
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      await updateGallerySettings({ ...settingsForm });
      setDirty(false);
      setSavedAt(Date.now());
    } finally {
      setSaving(false);
      // Clear success note after a short delay
      setTimeout(() => setSavedAt(null), 2000);
    }
  };

  const resetForm = () => {
    setForm({
      src: '',
      category: eventCategories[0]?.name || '',
      title: '',
      year: new Date().getFullYear().toString(),
      featured: false
    });
  };

  const handleAdd = async () => {
    if (!form.src || !form.category || !form.title || !form.year) {
      alert('Please fill in all required fields');
      return;
    }
    
    try {
      await addGalleryImage(form);
      setIsAdding(false);
      resetForm();
    } catch (error) {
      console.error('Error adding gallery image:', error);
      alert('Failed to add image. Please try again.');
    }
  };

  const handleUpdate = async (id: number) => {
    if (!form.src || !form.category || !form.title || !form.year) {
      alert('Please fill in all required fields');
      return;
    }
    
    try {
      await updateGalleryImage(id, form);
      setEditing(null);
      resetForm();
    } catch (error) {
      console.error('Error updating gallery image:', error);
      alert('Failed to update image. Please try again.');
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this image? This action cannot be undone.')) {
      try {
        await deleteGalleryImage(id);
      } catch (error) {
        console.error('Error deleting gallery image:', error);
        alert('Failed to delete image. Please try again.');
      }
    }
  };

  const handleToggleFeatured = async (id: number) => {
    try {
      await toggleGalleryImageFeatured(id);
    } catch (error) {
      console.error('Error toggling featured status:', error);
      alert('Failed to update featured status. Please try again.');
    }
  };

  const startEditing = (image: GalleryImage) => {
    setForm({
      src: image.src,
      category: image.category,
      title: image.title,
      year: image.year,
      featured: image.featured || false
    });
    setEditing(image.id);
  };

  const getCategoryColor = (categoryName: string) => {
    const category = eventCategories.find(cat => cat.name === categoryName);
    return category ? category.color : '#6B7280';
  };

  return (
    <div className="space-y-6">
      {/* Gallery Settings */}
      <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-400">
        <h3 className="text-lg font-semibold mb-4">Gallery Animation Settings</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Scroll per item (px)</label>
            <input
              type="number"
              value={settingsForm.scroll_per_item}
              min={100}
              step={10}
              onChange={(e) => { setSettingsForm(s => ({ ...s, scroll_per_item: onNum(e.target.value, s.scroll_per_item) })); setDirty(true); }}
              className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Depth distance (px)</label>
            <input
              type="number"
              value={settingsForm.distance}
              min={200}
              step={50}
              onChange={(e) => { setSettingsForm(s => ({ ...s, distance: onNum(e.target.value, s.distance) })); setDirty(true); }}
              className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Background blur (px)</label>
            <input
              type="number"
              value={settingsForm.background_blur_px}
              min={0}
              step={5}
              onChange={(e) => { setSettingsForm(s => ({ ...s, background_blur_px: onNum(e.target.value, s.background_blur_px) })); setDirty(true); }}
              className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Card max blur (px)</label>
            <input
              type="number"
              value={settingsForm.card_blur_max}
              min={0}
              step={1}
              onChange={(e) => { setSettingsForm(s => ({ ...s, card_blur_max: onNum(e.target.value, s.card_blur_max) })); setDirty(true); }}
              className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>
        </div>
        {/* Reveal controls */}
        <div className="mt-4 border-t pt-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">Enable pre-open reveal</label>
            <input
              type="checkbox"
              checked={!!settingsForm.reveal_enabled}
              onChange={(e) => { setSettingsForm(s => ({ ...s, reveal_enabled: e.target.checked })); setDirty(true); }}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reveal duration (ms)</label>
              <input
                type="number"
                min={200}
                step={50}
                value={settingsForm.reveal_duration_ms}
                onChange={(e) => { setSettingsForm(s => ({ ...s, reveal_duration_ms: onNum(e.target.value, s.reveal_duration_ms || 800) })); setDirty(true); }}
                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reveal orientation</label>
              <select
                value={settingsForm.reveal_orientation}
                onChange={(e) => { setSettingsForm(s => ({ ...s, reveal_orientation: (e.target.value as 'horizontal'|'vertical') })); setDirty(true); }}
                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400"
              >
                <option value="horizontal">Horizontal</option>
                <option value="vertical">Vertical</option>
              </select>
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mt-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSaveSettings}
              disabled={!dirty || saving}
              className={`px-4 py-2 rounded-lg font-medium ${(!dirty || saving) ? 'bg-yellow-200 text-yellow-800 cursor-not-allowed' : 'bg-yellow-400 text-black hover:bg-yellow-300'}`}
            >
              {saving ? 'Saving…' : 'Save settings'}
            </button>
            <button
              type="button"
              onClick={() => { setSettingsForm({
                scroll_per_item: gallerySettings?.scroll_per_item ?? 650,
                distance: gallerySettings?.distance ?? 1400,
                background_blur_px: gallerySettings?.background_blur_px ?? 100,
                card_blur_max: gallerySettings?.card_blur_max ?? 8,
                reveal_enabled: gallerySettings?.reveal_enabled ?? true,
                reveal_duration_ms: gallerySettings?.reveal_duration_ms ?? 800,
                reveal_orientation: gallerySettings?.reveal_orientation ?? 'horizontal',
              }); setDirty(false); }}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Reset
            </button>
          </div>
          <p className="text-xs text-gray-500">Tip: More images will automatically slow the forward movement slightly for better pacing.</p>
          {savedAt && (
            <span className="text-xs text-green-600">Saved</span>
          )}
        </div>
      </div>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gallery Management</h2>
          <p className="text-gray-600">Manage festival photos and memories</p>
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
          Add Image
        </button>
      </div>

      {/* Category Filter */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => {
            const categoryData = eventCategories.find(cat => cat.name === category);
            const categoryColor = categoryData ? categoryData.color : '#6B7280';
            
            return (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-md font-medium transition-all duration-200 flex items-center space-x-2 ${
                  selectedCategory === category
                    ? 'bg-yellow-400 text-black'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {category !== 'All' && (
                  <span 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: categoryColor }}
                  ></span>
                )}
                <span>{category}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Add Image Form */}
      {isAdding && (
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-400">
          <h3 className="text-lg font-semibold mb-6">Add New Image</h3>
          <div className="grid lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Image title"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                >
                  <option value="">Select category</option>
                  {eventCategories.map(category => (
                    <option key={category.id} value={category.name}>{category.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Year *</label>
                <input
                  type="text"
                  value={form.year}
                  onChange={(e) => setForm(prev => ({ ...prev, year: e.target.value }))}
                  placeholder="2025"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="featured"
                  checked={form.featured}
                  onChange={(e) => setForm(prev => ({ ...prev, featured: e.target.checked }))}
                  className="mr-2"
                />
                <label htmlFor="featured" className="text-sm font-medium text-gray-700">
                  Featured Image
                </label>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Image *</label>
                <ImageUpload
                  onImageSelect={(url) => setForm(prev => ({ ...prev, src: url }))}
                  currentImage={form.src}
                  bucket="gallery-images"
                  folder="gallery"
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
              Add Image
            </button>
          </div>
        </div>
      )}

      {/* Images Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredImages.map((image) => (
          <div
            key={image.id}
            className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all duration-300"
          >
            {editing === image.id ? (
              <div className="p-4 space-y-4">
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Image title"
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
                <select
                  value={form.category}
                  onChange={(e) => setForm(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400"
                >
                  <option value="">Select category</option>
                  {eventCategories.map(category => (
                    <option key={category.id} value={category.name}>{category.name}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={form.year}
                  onChange={(e) => setForm(prev => ({ ...prev, year: e.target.value }))}
                  placeholder="Year"
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={form.featured}
                    onChange={(e) => setForm(prev => ({ ...prev, featured: e.target.checked }))}
                    className="mr-2"
                  />
                  <label className="text-sm">Featured</label>
                </div>
                <ImageUpload
                  onImageSelect={(url) => setForm(prev => ({ ...prev, src: url }))}
                  currentImage={form.src}
                  bucket="gallery-images"
                  folder="gallery"
                  className="h-32"
                />
                <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4 border-t border-gray-200">
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
                    onClick={() => handleUpdate(image.id)}
                    className="w-full sm:w-auto px-4 py-2 bg-yellow-400 text-black rounded hover:bg-yellow-300 flex items-center justify-center"
                  >
                    <Save size={14} className="mr-1" />
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={image.src}
                    alt={image.title}
                    className="w-full h-full object-cover"
                  />
                  {image.featured && (
                    <div className="absolute top-2 right-2 bg-yellow-400 text-black p-1 rounded-full">
                      <Star className="w-4 h-4 fill-current" />
                    </div>
                  )}
                </div>
                
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-900 text-sm line-clamp-2">{image.title}</h3>
                    <div className="flex items-center space-x-1">
                      <span 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: getCategoryColor(image.category) }}
                      ></span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs text-gray-500 flex items-center">
                      <Calendar size={12} className="mr-1" />
                      {image.year}
                    </span>
                    <span className="text-xs font-medium text-gray-600">
                      {image.category}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <button
                      type="button"
                      onClick={() => handleToggleFeatured(image.id)}
                      className={`p-1 rounded transition-colors ${
                        image.featured 
                          ? 'bg-yellow-100 text-yellow-600' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                      title={image.featured ? 'Remove from featured' : 'Add to featured'}
                    >
                      <Star size={14} className={image.featured ? 'fill-current' : ''} />
                    </button>
                    
                    <div className="flex items-center space-x-1">
                      <button
                        type="button"
                        onClick={() => startEditing(image)}
                        className="bg-blue-600 text-white p-1 rounded hover:bg-blue-500 transition-colors"
                        title="Edit image"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(image.id)}
                        className="bg-red-600 text-white p-1 rounded hover:bg-red-500 transition-colors"
                        title="Delete image"
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

      {/* No Images Message */}
      {filteredImages.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow-md">
          <ImageIcon size={64} className="mx-auto mb-4 text-gray-400" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">
            {selectedCategory === 'All' ? 'No Images Yet' : `No ${selectedCategory} Images`}
          </h3>
          <p className="text-gray-500 mb-4">
            {selectedCategory === 'All' 
              ? 'Start by adding your first gallery image' 
              : `No images found in the ${selectedCategory} category`
            }
          </p>
          <button
            type="button"
            onClick={() => {
              setIsAdding(true);
              resetForm();
            }}
            className="bg-yellow-400 text-black px-6 py-2 rounded-lg hover:bg-yellow-300 transition-colors"
          >
            Add First Image
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="grid md:grid-cols-4 gap-6 text-center">
          <div>
            <div className="text-2xl font-bold text-yellow-500 mb-1">{galleryImages.length}</div>
            <div className="text-gray-600 text-sm">Total Images</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-yellow-500 mb-1">
              {galleryImages.filter(img => img.featured).length}
            </div>
            <div className="text-gray-600 text-sm">Featured Images</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-yellow-500 mb-1">{eventCategories.length}</div>
            <div className="text-gray-600 text-sm">Categories</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-yellow-500 mb-1">
              {new Set(galleryImages.map(img => img.year)).size}
            </div>
            <div className="text-gray-600 text-sm">Years</div>
          </div>
        </div>
      </div>
    </div>
  );
};