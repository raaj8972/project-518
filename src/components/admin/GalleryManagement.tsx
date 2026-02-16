import React, { useEffect, useState, useMemo } from 'react';
import { Plus, Edit, Trash2, Star, Calendar, CheckSquare, Square, Tag, Image as ImageIcon, ScanFace, Loader2, LayoutGrid, List } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { ImageUpload } from '../ImageUpload';
import type { GalleryImage } from '../../context/DataContext';
import { useSavingProgress } from '../../context/SavingProgressContext';
import { useApprovals } from '../../hooks/useApprovals';
import { GoogleDriveImporter } from './GoogleDriveImporter';

export const GalleryManagement: React.FC = () => {
  const { 
    galleryImages, 
    eventCategories,
    addGalleryImage, 
    updateGalleryImage, 
    deleteGalleryImage,
    bulkDeleteGalleryImages,
    deleteAllGalleryImages,
    toggleGalleryImageFeatured,
    gallerySettings,
    updateGallerySettings,
    sanitizeUrl
  } = useData();
  const savingProgress = useSavingProgress();
  const { submitForApproval, checkRequiresApproval } = useApprovals();
  const [requiresApproval, setRequiresApproval] = useState(false);
  // Auto-Indexer State
  const [isIndexing, setIsIndexing] = useState(false);
  const [indexStats, setIndexStats] = useState<{ processed: number; faces: number } | null>(null);

  const handleAutoIndex = async () => {
    try {
      setIsIndexing(true);
      setIndexStats(null);
      const res = await fetch('/api/index-faces-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 10 }) // Process 10 at a time
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Indexing failed');
      
      setIndexStats({ processed: data.processed, faces: data.facesFound });
      alert(`Processed ${data.processed} images. Found ${data.facesFound} faces.`);
      
    } catch (err: any) {
      console.error('Auto-index error:', err);
      alert('Failed to run auto-indexer: ' + err.message);
    } finally {
      setIsIndexing(false);
    }
  };

  useEffect(() => {
    checkRequiresApproval().then(setRequiresApproval);
  }, []);

  const [isAdding, setIsAdding] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [visibleCount, setVisibleCount] = useState(20);
  const [viewMode, setViewMode] = useState<'cards' | 'grid'>('cards');
  const observerTarget = React.useRef<HTMLDivElement>(null);

  const [form, setForm] = useState({
    src: '',
    category: '',
    subcategory: '',
    title: '',
    year: new Date().getFullYear().toString(),
    featured: false
  });

  // Derive existing subcategories per category for suggestions
  const subcategoriesByCategory = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const img of galleryImages) {
      const cat = img.category;
      const sub = (img as any).subcategory || '';
      if (sub && cat) {
        if (!map[cat]) map[cat] = [];
        if (!map[cat].includes(sub)) map[cat].push(sub);
      }
    }
    return map;
  }, [galleryImages]);

  const currentSubcategories = subcategoriesByCategory[form.category] || [];

  const categories = ['All', ...eventCategories.map(cat => cat.name)];
  const filteredImages = selectedCategory === 'All' 
    ? galleryImages 
    : galleryImages.filter(img => img.category === selectedCategory);

  // Reset pagination when category changes
  useEffect(() => {
    setVisibleCount(20);
  }, [selectedCategory]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < filteredImages.length) {
          const increment = viewMode === 'grid' ? 50 : 20;
          setVisibleCount(prev => Math.min(prev + increment, filteredImages.length));
        }
      },
      { threshold: 0.1, rootMargin: '200px' }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [filteredImages.length, visibleCount]);

  const displayedImages = filteredImages.slice(0, visibleCount);

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
  const [, setSavedAt] = useState<number | null>(null);

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
      
      if (requiresApproval) {
        const settingsId = (gallerySettings as any)?.id || 1; 
        const result = await submitForApproval('gallery_settings', 'update', settingsForm, settingsId);
        if (result.success) {
          alert('Request submitted for approval. An owner will review your changes.');
          setDirty(false);
          setSavedAt(Date.now());
        } else {
          alert(`Failed to submit for approval: ${result.error}`);
        }
      } else {
        const steps = savingProgress.withSteps(3, 'Preparing…');
        steps.next('Validating');
        await updateGallerySettings({ ...settingsForm });
        steps.next('Finalizing');
        setDirty(false);
        setSavedAt(Date.now());
        savingProgress.done();
      }
    } catch (error) {
      console.error('Error saving gallery settings:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
      setTimeout(() => setSavedAt(null), 2000);
    }
  };

  const resetForm = () => {
    setForm({
      src: '',
      category: eventCategories[0]?.name || '',
      subcategory: '',
      title: '',
      year: new Date().getFullYear().toString(),
      featured: false
    });
  };

  const handleAdd = async () => {
    if (!form.src) {
      alert('Please select an image');
      return;
    }
    
    try {
      if (requiresApproval) {
        const result = await submitForApproval('gallery_image', 'create', form);
        if (result.success) {
          alert('Request submitted for approval. An owner will review your changes.');
          setIsAdding(false);
          resetForm();
        } else {
          alert(`Failed to submit for approval: ${result.error}`);
        }
      } else {
        await addGalleryImage(form);
        setIsAdding(false);
        resetForm();
      }
    } catch (error) {
      console.error('Error adding gallery image:', error);
      alert('Failed to add image. Please try again.');
    }
  };

  const handleUpdate = async (id: number) => {
    if (!form.src) {
      alert('Please select an image');
      return;
    }
    
    try {
      if (requiresApproval) {
        const result = await submitForApproval('gallery_image', 'update', form, id);
        if (result.success) {
          alert('Request submitted for approval. An owner will review your changes.');
          setEditing(null);
          resetForm();
        } else {
          alert(`Failed to submit for approval: ${result.error}`);
        }
      } else {
        const steps = savingProgress.withSteps(3, 'Preparing…');
        steps.next('Uploading/validating');
        await updateGalleryImage(id, form);
        steps.next('Finalizing');
        setEditing(null);
        resetForm();
        savingProgress.done();
      }
    } catch (error) {
      console.error('Error updating gallery image:', error);
      alert('Failed to update image. Please try again.');
      savingProgress.done();
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this image? This action cannot be undone.')) {
      try {
        if (requiresApproval) {
          const result = await submitForApproval('gallery_image', 'delete', {}, id);
          if (result.success) {
            alert('Request submitted for approval. An owner will review your changes.');
          } else {
            alert(`Failed to submit for approval: ${result.error}`);
          }
        } else {
          await deleteGalleryImage(id);
        }
      } catch (error) {
        console.error('Error deleting gallery image:', error);
        alert('Failed to delete image. Please try again.');
      }
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredImages.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredImages.map(i => i.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} image(s)? This cannot be undone.`)) return;
    try {
      setBulkDeleting(true);
      const ids = Array.from(selectedIds);
      
      if (bulkDeleteGalleryImages) {
        await bulkDeleteGalleryImages(ids);
      } else {
        // Fallback if context not updated yet
        for (let i = 0; i < ids.length; i += 20) {
          const chunk = ids.slice(i, i + 20);
          await Promise.allSettled(chunk.map(id => deleteGalleryImage(id)));
        }
      }

      setSelectedIds(new Set());
      alert(`Successfully deleted ${ids.length} image(s).`);
    } catch (error) {
      console.error('Bulk delete error:', error);
      alert('Some images could not be deleted. Please try again.');
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleDeleteAll = async () => {
    const confirmText = prompt('DANGER: This will delete ALL gallery images permanently. Type "DELETE ALL" to confirm:');
    if (confirmText !== 'DELETE ALL') return;
    
    try {
      if (requiresApproval) {
        alert('Bulk delete all is not supported with approvals enabled yet.');
        return;
      }
      const steps = savingProgress.withSteps(2, 'Deleting all images...');
      steps.next('Clearing database...');
      await deleteAllGalleryImages();
      steps.next('Done');
      setSelectedIds(new Set());
      savingProgress.done();
      alert('All gallery images have been deleted.');
    } catch (error) {
      console.error('Error deleting all images:', error);
      alert('Failed to delete all images. Please try again.');
      savingProgress.done();
    }
  };

  const handleToggleFeatured = async (id: number) => {
    try {
      if (requiresApproval) {
        const image = galleryImages.find(i => i.id === id);
        if (!image) return;
        
        const result = await submitForApproval('gallery_image', 'update', { featured: !image.featured }, id);
        if (result.success) {
          alert('Request submitted for approval. An owner will review your changes.');
        } else {
          alert(`Failed to submit for approval: ${result.error}`);
        }
      } else {
        await toggleGalleryImageFeatured(id);
      }
    } catch (error) {
      console.error('Error toggling featured status:', error);
      alert('Failed to update featured status. Please try again.');
    }
  };
  // Expose handleToggleFeatured for future use
  void handleToggleFeatured;

  const startEditing = (image: GalleryImage) => {
    setForm({
      src: image.src,
      category: image.category,
      subcategory: (image as any).subcategory || '',
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
  void getCategoryColor;

  return (
    <div className="space-y-6">
      {/* Gallery Settings */}
      <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-400 text-gray-900">
        <h3 className="text-lg font-semibold mb-4 text-gray-900">Gallery Animation Settings</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Scroll per item (px)</label>
            <input
              type="number"
              value={settingsForm.scroll_per_item}
              onChange={(e) => { setSettingsForm(s => ({ ...s, scroll_per_item: onNum(e.target.value, s.scroll_per_item) })); setDirty(true); }}
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-yellow-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Depth distance (px)</label>
            <input
              type="number"
              value={settingsForm.distance}
              onChange={(e) => { setSettingsForm(s => ({ ...s, distance: onNum(e.target.value, s.distance) })); setDirty(true); }}
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-yellow-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Background blur (px)</label>
            <input
              type="number"
              value={settingsForm.background_blur_px}
              onChange={(e) => { setSettingsForm(s => ({ ...s, background_blur_px: onNum(e.target.value, s.background_blur_px) })); setDirty(true); }}
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-yellow-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Card max blur (px)</label>
            <input
              type="number"
              value={settingsForm.card_blur_max}
              onChange={(e) => { setSettingsForm(s => ({ ...s, card_blur_max: onNum(e.target.value, s.card_blur_max) })); setDirty(true); }}
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-yellow-400"
            />
          </div>
        </div>
        
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
                value={settingsForm.reveal_duration_ms}
                onChange={(e) => { setSettingsForm(s => ({ ...s, reveal_duration_ms: onNum(e.target.value, s.reveal_duration_ms || 800) })); setDirty(true); }}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-yellow-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reveal orientation</label>
              <select
                value={settingsForm.reveal_orientation}
                onChange={(e) => { setSettingsForm(s => ({ ...s, reveal_orientation: (e.target.value as 'horizontal'|'vertical') })); setDirty(true); }}
                className="w-full p-2 border border-gray-300 rounded"
              >
                <option value="horizontal">Horizontal</option>
                <option value="vertical">Vertical</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={handleSaveSettings}
            disabled={!dirty || saving}
            className={`px-4 py-2 rounded-lg font-medium ${(!dirty || saving) ? 'bg-gray-100 text-gray-400' : 'bg-yellow-400 text-black hover:bg-yellow-300'}`}
          >
            {saving ? 'Saving…' : 'Save settings'}
          </button>
        </div>
      </div>

      {/* Google Drive Importer */}
      <GoogleDriveImporter />

      {/* Header */}
      <div className="flex justify-between items-center text-gray-900">
        <div>
          <h2 className="text-2xl font-bold">Gallery Management</h2>
          <p className="text-gray-600">Manage festival photos and memories</p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'cards' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              title="Card View"
            >
              <List size={18} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              title="Grid View"
            >
              <LayoutGrid size={18} />
            </button>
          </div>

          {/* Select All / Bulk Delete controls */}
          {filteredImages.length > 0 && (
            <>
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 border border-gray-200 transition-colors"
                title={selectedIds.size === filteredImages.length ? 'Deselect all' : 'Select all'}
              >
                {selectedIds.size === filteredImages.length ? <CheckSquare size={16} /> : <Square size={16} />}
                {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select All'}
              </button>
              {selectedIds.size > 0 && (
                <button
                  onClick={handleBulkDelete}
                  disabled={bulkDeleting}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  <Trash2 size={16} />
                  {bulkDeleting ? 'Deleting…' : `Delete ${selectedIds.size}`}
                </button>
              )}
            </>
          )}
          {galleryImages.length > 0 && selectedIds.size === 0 && (
            <button
              onClick={handleDeleteAll}
              className="px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 border border-red-200 transition-colors"
              title="Delete ALL images"
            >
              Delete All
            </button>
          )}
           <button
            onClick={handleAutoIndex}
            disabled={isIndexing}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
              isIndexing ? 'bg-gray-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700 text-white'
            }`}
          >
            {isIndexing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Indexing...
              </>
            ) : (
              <>
                <ScanFace className="w-4 h-4" />
                Auto-Index Faces
              </>
            )}
          </button>
          <button
            onClick={() => { setIsAdding(true); resetForm(); }}
            className="bg-yellow-400 text-black px-4 py-2 rounded-lg hover:bg-yellow-300 flex items-center"
          >
            <Plus size={16} className="mr-2" /> Add Image
          </button>
        </div>
      </div>

      {/* Category Filter */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex flex-wrap gap-2 text-gray-900">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-md font-medium transition-all ${selectedCategory === category ? 'bg-yellow-400 text-black' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Add Image Form */}
      {isAdding && (
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-400 text-gray-900">
          <h3 className="text-lg font-semibold mb-6">Add New Image</h3>
          <div className="grid lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg"
                >
                  <option value="">Select category</option>
                  {eventCategories.map(category => (
                    <option key={category.id} value={category.name}>{category.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subcategory</label>
                <div className="relative">
                  <input
                    type="text"
                    list="subcategory-suggestions"
                    value={form.subcategory}
                    onChange={(e) => setForm(prev => ({ ...prev, subcategory: e.target.value }))}
                    placeholder="e.g. Award Ceremony, Treasure Hunt"
                    className="w-full p-3 border border-gray-300 rounded-lg"
                  />
                  <datalist id="subcategory-suggestions">
                    {currentSubcategories.map(sub => (
                      <option key={sub} value={sub} />
                    ))}
                  </datalist>
                </div>
                {currentSubcategories.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {currentSubcategories.map(sub => (
                      <button
                        key={sub}
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, subcategory: sub }))}
                        className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                          form.subcategory === sub
                            ? 'bg-yellow-400 border-yellow-400 text-black'
                            : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {sub}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                <input
                  type="text"
                  value={form.year}
                  onChange={(e) => setForm(prev => ({ ...prev, year: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg"
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
                <label htmlFor="featured" className="text-sm font-medium text-gray-700">Featured Image</label>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Image(s)</label>
              <ImageUpload
                onImageSelect={(url) => setForm(prev => ({ ...prev, src: url }))}
                currentImage={form.src}
                bucket="gallery-images"
                folder="gallery"
                allowMultiple={true}
                onBatchComplete={async (results) => {
                  if (results.length === 1) {
                    setForm(prev => ({ ...prev, src: results[0].url }));
                  } else {
                    for (const res of results) {
                      await addGalleryImage({ ...form, src: res.url, title: res.file.name });
                    }
                    setIsAdding(false);
                    resetForm();
                  }
                }}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
            <button onClick={() => { setIsAdding(false); resetForm(); }} className="px-6 py-2 text-gray-600">Cancel</button>
            <button onClick={handleAdd} className="px-6 py-2 bg-yellow-400 text-black rounded-lg">Add Image</button>
          </div>
        </div>
      )}

      {/* Images Grid */}
      {/* Images Grid */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2">
          {displayedImages.map((image) => (
            <div 
              key={image.id} 
              className={`relative aspect-square group cursor-pointer overflow-hidden rounded-md bg-gray-100 ${selectedIds.has(image.id) ? 'ring-4 ring-inset ring-yellow-400' : ''}`}
              onClick={() => toggleSelect(image.id)}
            >
              <img 
                src={sanitizeUrl?.(image.src)} 
                alt={image.title} 
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" 
                loading="lazy" 
                decoding="async" 
              />
              
              {/* Overlay on hover or select */}
              <div className={`absolute inset-0 bg-black/40 transition-opacity flex flex-col justify-end p-2 ${selectedIds.has(image.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                <div className="absolute top-2 left-2">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedIds.has(image.id) ? 'bg-yellow-400 border-yellow-400 text-black' : 'border-white bg-black/20 text-white'}`}>
                    {selectedIds.has(image.id) && <span className="text-[10px] font-bold">✓</span>}
                  </div>
                </div>

                <div className="text-white text-xs truncate font-medium">
                  {image.title}
                </div>
                
                <div className="flex justify-end gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => { e.stopPropagation(); startEditing(image); }} 
                    className="p-1.5 bg-white/10 hover:bg-white/20 rounded backdrop-blur-sm text-white"
                  >
                    <Edit size={12} />
                  </button>
                </div>
              </div>

              {image.featured && (
                <div className="absolute top-2 right-2 text-yellow-400">
                  <Star size={14} className="fill-current drop-shadow-md" />
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 text-gray-900">
          {displayedImages.map((image) => (
            <div key={image.id} className={`bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all ${selectedIds.has(image.id) ? 'ring-2 ring-yellow-400' : ''}`}>
              {editing === image.id ? (
                <div className="p-4 space-y-4">
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded"
                  />
                  <select
                    value={form.category}
                    onChange={(e) => setForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded"
                  >
                    {eventCategories.map(category => (
                      <option key={category.id} value={category.name}>{category.name}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    list="subcategory-edit-suggestions"
                    value={form.subcategory}
                    onChange={(e) => setForm(prev => ({ ...prev, subcategory: e.target.value }))}
                    placeholder="Subcategory"
                    className="w-full p-2 border border-gray-300 rounded"
                  />
                  <datalist id="subcategory-edit-suggestions">
                    {currentSubcategories.map(sub => (
                      <option key={sub} value={sub} />
                    ))}
                  </datalist>
                  <input
                    type="text"
                    value={form.year}
                    onChange={(e) => setForm(prev => ({ ...prev, year: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded"
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
                  <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
                    <button onClick={() => setEditing(null)} className="px-4 py-2 text-gray-600">Cancel</button>
                    <button onClick={() => handleUpdate(image.id)} className="px-4 py-2 bg-yellow-400 text-black rounded">Save</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="relative h-48 overflow-hidden cursor-pointer" onClick={() => toggleSelect(image.id)}>
                    {(() => {
                      const sanitized = sanitizeUrl?.(image.src) || '';
                      if (!sanitized) return <div className="w-full h-full bg-gray-100 flex items-center justify-center"><ImageIcon className="text-gray-300" /></div>;
  
                      // On localhost, we skip optimization/width params to avoid issues and match Gallery.tsx
                      const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
                      
                      let thumbUrl = sanitized;
                      if (!isLocal) {
                        thumbUrl = sanitized.includes('?') ? `${sanitized}&width=400` : `${sanitized}?width=400`;
                      }
  
                      return <img src={thumbUrl} alt={image.title} className="w-full h-full object-cover" loading="lazy" decoding="async" />;
                    })()}
                    {/* Selection checkbox overlay */}
                    <div className="absolute top-2 left-2 z-10">
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${selectedIds.has(image.id) ? 'bg-yellow-400 border-yellow-400 text-black' : 'border-white/70 bg-black/30 text-white/60 hover:border-white'}`}>
                        {selectedIds.has(image.id) && <span className="text-xs font-bold">✓</span>}
                      </div>
                    </div>
                    {image.featured && (
                      <div className="absolute top-2 right-2 bg-yellow-400 text-black p-1 rounded-full"><Star size={14} className="fill-current" /></div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 mb-2">{image.title}</h3>
                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <span className="flex items-center"><Calendar size={12} className="mr-1" /> {image.year}</span>
                      <span>{image.category}</span>
                    </div>
                    {(image as any).subcategory && (
                      <div className="flex items-center text-xs text-gray-400 mt-1">
                        <Tag size={10} className="mr-1" />
                        {(image as any).subcategory}
                      </div>
                    )}
                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100">
                      <button onClick={() => startEditing(image)} className="p-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"><Edit size={14} /></button>
                      <button onClick={() => handleDelete(image.id)} className="p-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100"><Trash2 size={14} /></button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Infinite Scroll Sentinel */}
      {visibleCount < filteredImages.length && (
        <div ref={observerTarget} className="h-20 flex items-center justify-center border-t border-gray-100 mt-6 pt-6">
          <div className="flex items-center gap-2 text-gray-500 font-medium">
            <div className="w-4 h-4 rounded-full border-2 border-yellow-400 border-t-transparent animate-spin" />
            <span>Loading more memories...</span>
          </div>
        </div>
      )}
    </div>
  );
};