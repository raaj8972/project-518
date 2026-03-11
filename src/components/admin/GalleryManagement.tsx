import React, { useEffect, useState, useMemo } from 'react';
import { Plus, Edit, Trash2, Star, Calendar, CheckSquare, Square, Tag, Image as ImageIcon, ScanFace, Loader2, LayoutGrid, List, Settings, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
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
  const [settingsOpen, setSettingsOpen] = useState(false);
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

  // ─── Input styling helpers ─────────────────────────────
  const inputCls = 'w-full bg-white/[0.04] border border-white/10 rounded-xl py-2.5 px-3.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 focus:bg-white/[0.06] transition-all';
  const labelCls = 'block text-[11px] font-black text-white/40 uppercase tracking-widest mb-2';
  const selectCls = `${inputCls} appearance-none cursor-pointer`;

  return (
    <div className="space-y-6">

      {/* ═══ Hero Header ═══ */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600/20 via-purple-600/10 to-transparent border border-white/10 p-8">
        {/* Background sparkle */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/10 blur-[80px] rounded-full pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ImageIcon size={14} className="text-indigo-400" />
              <span className="text-[10px] font-black text-indigo-400/80 uppercase tracking-[0.2em]">Gallery System</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              Gallery Management
            </h2>
            <p className="text-sm text-gray-400 mt-1 font-medium">
              {galleryImages.length} images • {galleryImages.filter(i => i.featured).length} featured
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* View Toggle */}
            <div className="flex bg-white/[0.04] p-1 rounded-xl border border-white/10">
              <button
                onClick={() => setViewMode('cards')}
                className={`p-2 rounded-lg transition-all duration-300 ${viewMode === 'cards' ? 'bg-indigo-500/20 text-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.3)]' : 'text-gray-500 hover:text-white'}`}
                title="Card View"
              >
                <List size={16} />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-all duration-300 ${viewMode === 'grid' ? 'bg-indigo-500/20 text-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.3)]' : 'text-gray-500 hover:text-white'}`}
                title="Grid View"
              >
                <LayoutGrid size={16} />
              </button>
            </div>

            {/* Auto-Index Faces */}
            <button
              onClick={handleAutoIndex}
              disabled={isIndexing}
              className={`px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm font-bold transition-all duration-300 border ${
                isIndexing 
                  ? 'bg-white/[0.03] border-white/10 text-gray-500 cursor-not-allowed' 
                  : 'bg-purple-500/10 border-purple-500/30 text-purple-400 hover:bg-purple-500/20 hover:shadow-[0_0_20px_rgba(168,85,247,0.2)]'
              }`}
            >
              {isIndexing ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Indexing...</>
              ) : (
                <><ScanFace className="w-4 h-4" /> Index Faces</>
              )}
            </button>

            {/* Add Image */}
            <button
              onClick={() => { setIsAdding(true); resetForm(); }}
              className="bg-gradient-to-r from-indigo-600 to-indigo-500 text-white px-5 py-2.5 rounded-xl hover:from-indigo-500 hover:to-indigo-400 flex items-center gap-2 text-sm font-bold shadow-lg shadow-indigo-500/25 transition-all duration-300 hover:shadow-indigo-500/40 hover:scale-[1.02]"
            >
              <Plus size={16} /> Add Image
            </button>
          </div>
        </div>
      </div>

      {/* ═══ Bulk Actions Bar — appears when images selected ═══ */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between bg-indigo-500/10 border border-indigo-500/20 rounded-2xl px-6 py-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-2 text-sm font-bold text-indigo-300 hover:text-white transition-colors"
            >
              {selectedIds.size === filteredImages.length ? <CheckSquare size={16} /> : <Square size={16} />}
              {selectedIds.size} selected
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30 disabled:opacity-50 transition-all"
            >
              <Trash2 size={14} />
              {bulkDeleting ? 'Deleting…' : `Delete ${selectedIds.size}`}
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-sm text-gray-400 hover:text-white transition-colors font-bold"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* ═══ Category Filter + Select All ═══ */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1 flex flex-wrap items-center gap-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 border ${
                selectedCategory === category 
                  ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30 shadow-[0_0_12px_rgba(99,102,241,0.2)]' 
                  : 'bg-white/[0.02] text-gray-500 border-white/5 hover:bg-white/[0.06] hover:text-white hover:border-white/10'
              }`}
            >
              {category}
              {category !== 'All' && (
                <span className="ml-1.5 text-[10px] opacity-60">
                  {galleryImages.filter(i => i.category === category).length}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {filteredImages.length > 0 && selectedIds.size === 0 && (
            <>
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-gray-500 hover:text-white bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all"
              >
                <Square size={14} /> Select All
              </button>
              {galleryImages.length > 0 && (
                <button
                  onClick={handleDeleteAll}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-rose-400/60 hover:text-rose-400 bg-white/[0.02] border border-white/5 hover:border-rose-500/20 hover:bg-rose-500/5 transition-all"
                >
                  Delete All
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* ═══ Google Drive Importer ═══ */}
      <GoogleDriveImporter />

      {/* ═══ Add Image Form ═══ */}
      {isAdding && (
        <div className="rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="px-6 py-4 border-b border-white/5 bg-gradient-to-r from-indigo-500/10 to-transparent flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
              <Plus size={16} className="text-indigo-400" />
            </div>
            <h3 className="text-base font-black text-white tracking-tight">Add New Image</h3>
          </div>
          <div className="p-6">
            <div className="grid lg:grid-cols-2 gap-8">
              <div className="space-y-5">
                <div>
                  <label className={labelCls}>Title</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Image title..."
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm(prev => ({ ...prev, category: e.target.value }))}
                    className={selectCls}
                  >
                    <option value="">Select category</option>
                    {eventCategories.map(category => (
                      <option key={category.id} value={category.name}>{category.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Subcategory</label>
                  <input
                    type="text"
                    list="subcategory-suggestions"
                    value={form.subcategory}
                    onChange={(e) => setForm(prev => ({ ...prev, subcategory: e.target.value }))}
                    placeholder="e.g. Award Ceremony, Treasure Hunt"
                    className={inputCls}
                  />
                  <datalist id="subcategory-suggestions">
                    {currentSubcategories.map(sub => (
                      <option key={sub} value={sub} />
                    ))}
                  </datalist>
                  {currentSubcategories.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {currentSubcategories.map(sub => (
                        <button
                          key={sub}
                          type="button"
                          onClick={() => setForm(prev => ({ ...prev, subcategory: sub }))}
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all duration-200 ${
                            form.subcategory === sub
                              ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-300'
                              : 'bg-white/[0.03] border-white/5 text-gray-500 hover:text-white hover:border-white/15'
                          }`}
                        >
                          {sub}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className={labelCls}>Year</label>
                  <input
                    type="text"
                    value={form.year}
                    onChange={(e) => setForm(prev => ({ ...prev, year: e.target.value }))}
                    className={inputCls}
                  />
                </div>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={form.featured}
                      onChange={(e) => setForm(prev => ({ ...prev, featured: e.target.checked }))}
                      className="peer sr-only"
                    />
                    <div className="w-9 h-5 bg-white/10 rounded-full peer-checked:bg-amber-500/40 transition-colors" />
                    <div className="absolute top-1 left-1 w-3 h-3 bg-gray-500 rounded-full transition-all peer-checked:translate-x-4 peer-checked:bg-amber-400" />
                  </div>
                  <span className="text-sm font-bold text-gray-400 group-hover:text-white transition-colors flex items-center gap-1.5">
                    <Star size={14} className="text-amber-400/60" /> Featured Image
                  </span>
                </label>
              </div>
              <div>
                <label className={labelCls}>Image(s)</label>
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
            <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-white/5">
              <button onClick={() => { setIsAdding(false); resetForm(); }} className="px-5 py-2.5 text-sm font-bold text-gray-500 hover:text-white transition-colors rounded-xl hover:bg-white/[0.04]">Cancel</button>
              <button onClick={handleAdd} className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02] transition-all">Add Image</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Images Grid ═══ */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2">
          {displayedImages.map((image) => (
            <div 
              key={image.id} 
              className={`relative aspect-square group cursor-pointer overflow-hidden rounded-xl bg-white/[0.03] border transition-all duration-300 ${
                selectedIds.has(image.id) 
                  ? 'border-indigo-500/50 shadow-[0_0_20px_rgba(99,102,241,0.2)] ring-1 ring-indigo-500/30' 
                  : 'border-white/5 hover:border-white/20'
              }`}
              onClick={() => toggleSelect(image.id)}
            >
              <img 
                src={sanitizeUrl?.(image.src)} 
                alt={image.title} 
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                loading="lazy" 
                decoding="async" 
              />
              
              {/* Overlay on hover or select */}
              <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent transition-opacity flex flex-col justify-end p-2 ${selectedIds.has(image.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                <div className="absolute top-2 left-2">
                  <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${
                    selectedIds.has(image.id) 
                      ? 'bg-indigo-500 border-indigo-400 text-white shadow-[0_0_8px_rgba(99,102,241,0.5)]' 
                      : 'border-white/40 bg-black/30'
                  }`}>
                    {selectedIds.has(image.id) && <span className="text-[10px] font-black">✓</span>}
                  </div>
                </div>

                <div className="text-white text-[11px] truncate font-bold">
                  {image.title}
                </div>
                
                <div className="flex justify-end gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => { e.stopPropagation(); startEditing(image); }} 
                    className="p-1.5 bg-white/10 hover:bg-indigo-500/30 rounded-lg backdrop-blur-sm text-white transition-all"
                  >
                    <Edit size={11} />
                  </button>
                </div>
              </div>

              {image.featured && (
                <div className="absolute top-2 right-2">
                  <Star size={14} className="fill-amber-400 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]" />
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {displayedImages.map((image) => (
            <div key={image.id} className={`rounded-2xl overflow-hidden transition-all duration-300 border group ${
              editing === image.id 
                ? 'bg-white/[0.04] border-indigo-500/30' 
                : selectedIds.has(image.id) 
                  ? 'bg-white/[0.03] border-indigo-500/30 shadow-[0_0_20px_rgba(99,102,241,0.15)]' 
                  : 'bg-white/[0.02] border-white/5 hover:border-white/15 hover:bg-white/[0.04]'
            }`}>
              {editing === image.id ? (
                <div className="p-5 space-y-4">
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Title"
                    className={inputCls}
                  />
                  <select
                    value={form.category}
                    onChange={(e) => setForm(prev => ({ ...prev, category: e.target.value }))}
                    className={selectCls}
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
                    className={inputCls}
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
                    placeholder="Year"
                    className={inputCls}
                  />
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div className="relative">
                      <input type="checkbox" checked={form.featured} onChange={(e) => setForm(prev => ({ ...prev, featured: e.target.checked }))} className="peer sr-only" />
                      <div className="w-8 h-4 bg-white/10 rounded-full peer-checked:bg-amber-500/40 transition-colors" />
                      <div className="absolute top-0.5 left-0.5 w-3 h-3 bg-gray-500 rounded-full transition-all peer-checked:translate-x-4 peer-checked:bg-amber-400" />
                    </div>
                    <span className="text-xs font-bold text-gray-400">Featured</span>
                  </label>
                  <div className="flex justify-end gap-2 pt-4 border-t border-white/5">
                    <button onClick={() => setEditing(null)} className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-white transition-colors rounded-lg">Cancel</button>
                    <button onClick={() => handleUpdate(image.id)} className="px-4 py-2 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-xl text-sm font-bold hover:bg-indigo-500/30 transition-all">Save</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="relative h-48 overflow-hidden cursor-pointer" onClick={() => toggleSelect(image.id)}>
                    {(() => {
                      const sanitized = sanitizeUrl?.(image.src) || '';
                      if (!sanitized) return <div className="w-full h-full bg-white/[0.02] flex items-center justify-center"><ImageIcon className="text-gray-700" size={32} /></div>;
  
                      // On localhost, we skip optimization/width params to avoid issues
                      const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
                      
                      let thumbUrl = sanitized;
                      if (!isLocal) {
                        thumbUrl = sanitized.includes('?') ? `${sanitized}&width=400` : `${sanitized}?width=400`;
                      }
  
                      return <img src={thumbUrl} alt={image.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" decoding="async" />;
                    })()}
                    {/* Selection checkbox overlay */}
                    <div className="absolute top-3 left-3 z-10">
                      <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${
                        selectedIds.has(image.id) 
                          ? 'bg-indigo-500 border-indigo-400 text-white shadow-[0_0_8px_rgba(99,102,241,0.5)]' 
                          : 'border-white/30 bg-black/40 hover:border-white/60'
                      }`}>
                        {selectedIds.has(image.id) && <span className="text-[10px] font-black">✓</span>}
                      </div>
                    </div>
                    {image.featured && (
                      <div className="absolute top-3 right-3 w-7 h-7 bg-amber-500/20 backdrop-blur-sm rounded-lg flex items-center justify-center border border-amber-500/30">
                        <Star size={14} className="fill-amber-400 text-amber-400" />
                      </div>
                    )}
                    {/* Gradient overlay at bottom */}
                    <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-white text-sm line-clamp-2 mb-2 tracking-tight">{image.title}</h3>
                    <div className="flex justify-between items-center text-[11px] text-gray-500">
                      <span className="flex items-center gap-1"><Calendar size={11} /> {image.year}</span>
                      <span className="px-2 py-0.5 rounded-lg bg-white/[0.04] border border-white/5 font-bold">{image.category}</span>
                    </div>
                    {(image as any).subcategory && (
                      <div className="flex items-center text-[10px] text-gray-600 mt-1.5 gap-1">
                        <Tag size={10} />
                        <span className="font-bold">{(image as any).subcategory}</span>
                      </div>
                    )}
                    <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-white/5">
                      <button 
                        onClick={() => startEditing(image)} 
                        className="p-2 bg-white/[0.04] text-gray-400 rounded-xl hover:bg-indigo-500/15 hover:text-indigo-400 border border-white/5 hover:border-indigo-500/20 transition-all"
                      >
                        <Edit size={14} />
                      </button>
                      <button 
                        onClick={() => handleDelete(image.id)} 
                        className="p-2 bg-white/[0.04] text-gray-400 rounded-xl hover:bg-rose-500/15 hover:text-rose-400 border border-white/5 hover:border-rose-500/20 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
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
        <div ref={observerTarget} className="h-20 flex items-center justify-center mt-6">
          <div className="flex items-center gap-3 text-gray-600 font-bold text-sm">
            <div className="w-5 h-5 rounded-full border-2 border-indigo-500/60 border-t-transparent animate-spin" />
            <span>Loading more memories...</span>
          </div>
        </div>
      )}

      {/* ═══ Gallery Settings — Collapsible ═══ */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/5 overflow-hidden">
        <button
          onClick={() => setSettingsOpen(!settingsOpen)}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-white/[0.02] transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center group-hover:bg-indigo-500/10 group-hover:border-indigo-500/20 transition-all">
              <Settings size={16} className="text-gray-500 group-hover:text-indigo-400 transition-colors" />
            </div>
            <div className="text-left">
              <h3 className="text-sm font-black text-white tracking-tight">Animation Settings</h3>
              <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Gallery scroll & reveal config</p>
            </div>
          </div>
          {settingsOpen ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
        </button>
        
        {settingsOpen && (
          <div className="px-6 pb-6 pt-2 border-t border-white/5 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className={labelCls}>Scroll per item (px)</label>
                <input
                  type="number"
                  value={settingsForm.scroll_per_item}
                  onChange={(e) => { setSettingsForm(s => ({ ...s, scroll_per_item: onNum(e.target.value, s.scroll_per_item) })); setDirty(true); }}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Depth distance (px)</label>
                <input
                  type="number"
                  value={settingsForm.distance}
                  onChange={(e) => { setSettingsForm(s => ({ ...s, distance: onNum(e.target.value, s.distance) })); setDirty(true); }}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Background blur (px)</label>
                <input
                  type="number"
                  value={settingsForm.background_blur_px}
                  onChange={(e) => { setSettingsForm(s => ({ ...s, background_blur_px: onNum(e.target.value, s.background_blur_px) })); setDirty(true); }}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Card max blur (px)</label>
                <input
                  type="number"
                  value={settingsForm.card_blur_max}
                  onChange={(e) => { setSettingsForm(s => ({ ...s, card_blur_max: onNum(e.target.value, s.card_blur_max) })); setDirty(true); }}
                  className={inputCls}
                />
              </div>
            </div>
            
            <div className="mt-5 pt-5 border-t border-white/5">
              <div className="flex items-center justify-between mb-4">
                <span className={labelCls + ' mb-0'}>Pre-open reveal</span>
                <label className="relative cursor-pointer">
                  <input type="checkbox" checked={!!settingsForm.reveal_enabled} onChange={(e) => { setSettingsForm(s => ({ ...s, reveal_enabled: e.target.checked })); setDirty(true); }} className="peer sr-only" />
                  <div className="w-9 h-5 bg-white/10 rounded-full peer-checked:bg-indigo-500/40 transition-colors" />
                  <div className="absolute top-1 left-1 w-3 h-3 bg-gray-500 rounded-full transition-all peer-checked:translate-x-4 peer-checked:bg-indigo-400" />
                </label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Reveal duration (ms)</label>
                  <input
                    type="number"
                    value={settingsForm.reveal_duration_ms}
                    onChange={(e) => { setSettingsForm(s => ({ ...s, reveal_duration_ms: onNum(e.target.value, s.reveal_duration_ms || 800) })); setDirty(true); }}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Reveal orientation</label>
                  <select
                    value={settingsForm.reveal_orientation}
                    onChange={(e) => { setSettingsForm(s => ({ ...s, reveal_orientation: (e.target.value as 'horizontal'|'vertical') })); setDirty(true); }}
                    className={selectCls}
                  >
                    <option value="horizontal">Horizontal</option>
                    <option value="vertical">Vertical</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-5 pt-5 border-t border-white/5">
              <button
                onClick={handleSaveSettings}
                disabled={!dirty || saving}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
                  (!dirty || saving) 
                    ? 'bg-white/[0.03] text-gray-600 border border-white/5 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02]'
                }`}
              >
                {saving ? 'Saving…' : 'Save Settings'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};