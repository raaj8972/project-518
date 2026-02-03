import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X, Palette, AlertCircle, GripVertical, Check, ArrowUp, ArrowDown } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useApprovals } from '../../hooks/useApprovals';
import type { EventCategory } from '../../context/DataContext';

export const EventCategoriesManagement: React.FC = () => {
  const { 
    eventCategories, 
    addEventCategory, 
    updateEventCategory, 
    deleteEventCategory,
    reorderEventCategories
  } = useData();

  const { submitForApproval, checkRequiresApproval } = useApprovals();
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    checkRequiresApproval().then(setRequiresApproval);
  }, []);

  const [isAdding, setIsAdding] = useState(false);
  const [editingCategory, setEditingCategory] = useState<number | null>(null);
  const [error, setError] = useState<string>('');

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    color: '#6366f1',
    description: ''
  });

  const resetForm = () => {
    setCategoryForm({
      name: '',
      color: '#6366f1',
      description: ''
    });
    setError('');
  };

  const handleAddCategory = async () => {
    const name = (categoryForm.name || '').trim();
    const description = (categoryForm.description || '').trim();
    const color = (categoryForm.color || '').trim() || '#6366f1';
    
    if (!name || !description) {
      setError('Name and description are required');
      return;
    }
    
    setBusy(true);
    try {
      if (requiresApproval) {
        await submitForApproval('event_category', 'create', { name, description, color });
        alert('Request submitted for approval.');
      } else {
        await addEventCategory({ name, description, color });
      }
      setIsAdding(false);
      resetForm();
    } catch (error: any) {
      setError(error?.message || 'Failed to add category');
    } finally {
      setBusy(false);
    }
  };

  const handleUpdateCategory = async (id: number) => {
    const name = (categoryForm.name || '').trim();
    const description = (categoryForm.description || '').trim();
    const color = (categoryForm.color || '').trim() || '#6366f1';
    
    if (!name || !description) {
      setError('Name and description are required');
      return;
    }
    
    setBusy(true);
    try {
      if (requiresApproval) {
        await submitForApproval('event_category', 'update', { name, description, color }, id);
        alert('Request submitted for approval.');
      } else {
        await updateEventCategory(id, { name, description, color });
      }
      setEditingCategory(null);
      resetForm();
    } catch (error: any) {
      setError(error?.message || 'Failed to update category');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm('Are you sure? This may affect existing events.')) return;
    
    setBusy(true);
    try {
      if (requiresApproval) {
        await submitForApproval('event_category', 'delete', {}, id);
        alert('Request submitted for approval.');
      } else {
        await deleteEventCategory(id);
      }
    } catch (error: any) {
      setError(error?.message || 'Failed to delete category');
    } finally {
      setBusy(false);
    }
  };

  const startEditingCategory = (category: EventCategory) => {
    setCategoryForm({
      name: category.name,
      color: category.color,
      description: category.description
    });
    setEditingCategory(category.id);
    setError('');
  };

  const predefinedColors = [
    '#6366f1', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', 
    '#8b5cf6', '#ec4899', '#f43f5e', '#06b6d4', '#14b8a6'
  ];

  const [reorderMode, setReorderMode] = useState(false);
  const [orderList, setOrderList] = useState<number[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const startReorder = () => {
    setOrderList(eventCategories.map(c => c.id));
    setReorderMode(true);
  };

  const cancelReorder = () => {
    setReorderMode(false);
    setOrderList([]);
    setDragIndex(null);
  };

  const persistReorder = async () => {
    if (!reorderEventCategories) return;
    setBusy(true);
    try {
      if (requiresApproval) {
        alert('Bulk reordering requires owner access.');
      } else {
        await reorderEventCategories(orderList);
        setReorderMode(false);
      }
    } catch (error) {
      setError('Failed to save order');
    } finally {
      setBusy(false);
    }
  };

  const moveRow = (from: number, to: number) => {
    const copy = [...orderList];
    const [item] = copy.splice(from, 1);
    copy.splice(to, 0, item);
    setOrderList(copy);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Palette className="w-5 h-5 text-indigo-400" />
            <h2 className="text-2xl font-black text-white tracking-tight uppercase">Event Categories</h2>
          </div>
          <p className="text-gray-400 text-sm">Manage categories and their visual appearance</p>
        </div>
        <div className="flex items-center gap-3">
          {!reorderMode ? (
            <>
              <button
                onClick={startReorder}
                className="inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 text-gray-300 px-4 py-2.5 rounded-xl border border-white/10 transition-all text-sm font-bold uppercase tracking-widest active:scale-95"
              >
                <GripVertical size={16} /> Reorder
              </button>
              <button
                onClick={() => { setIsAdding(true); resetForm(); }}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-600/20 transition-all text-sm font-bold uppercase tracking-widest active:scale-95"
              >
                <Plus size={18} /> Add Category
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={persistReorder}
                disabled={busy}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl transition-all text-xs font-bold uppercase tracking-widest shadow-lg shadow-emerald-600/20 active:scale-95"
              >
                Save Order
              </button>
              <button
                onClick={cancelReorder}
                className="bg-white/5 hover:bg-white/10 text-gray-400 px-4 py-2 rounded-xl transition-all text-xs font-bold uppercase tracking-widest border border-white/10 active:scale-95"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center justify-between animate-in zoom-in duration-300">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <span className="text-red-200 text-sm font-medium">{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-300 p-1">
            <X size={18} />
          </button>
        </div>
      )}

      {/* Add/Edit Form */}
      {(isAdding || editingCategory !== null) && (
        <div className="bg-[#1c1c2b]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl animate-in fade-in zoom-in duration-500 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-indigo-500/20 transition-colors" />
          
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            {isAdding ? <Plus className="text-indigo-400" /> : <Edit className="text-indigo-400" />}
            {isAdding ? 'Create New Category' : 'Edit Category'}
          </h3>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Category Name</label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Cultural, Technical"
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 transition-all text-sm font-medium"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Description</label>
                <textarea
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the category..."
                  rows={4}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 transition-all text-sm font-medium resize-none"
                />
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Identity Color</label>
                <div className="flex flex-col gap-4 p-5 bg-black/40 border border-white/5 rounded-2xl">
                  <div className="flex items-center gap-4">
                    <input
                      type="color"
                      value={categoryForm.color}
                      onChange={(e) => setCategoryForm(prev => ({ ...prev, color: e.target.value }))}
                      className="w-14 h-14 bg-transparent border-none cursor-pointer rounded-xl overflow-hidden shadow-inner"
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-mono text-gray-500 uppercase">{categoryForm.color}</span>
                      <span className="text-[9px] text-gray-600 font-bold uppercase tracking-wider">HEX Code</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {predefinedColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setCategoryForm(prev => ({ ...prev, color }))}
                        className={`w-full aspect-square rounded-lg border-2 transition-all transform hover:scale-110 active:scale-90 ${
                          categoryForm.color === color ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-80'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl shadow-lg flex items-center justify-center" style={{ backgroundColor: categoryForm.color }}>
                  <Check className="text-white" size={20} strokeWidth={3} />
                </div>
                <div>
                  <div className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">Preview</div>
                  <div className="text-sm font-bold text-white truncate max-w-[150px]">{categoryForm.name || 'Category'}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end items-center gap-4 mt-8 pt-6 border-t border-white/5">
            <button
              onClick={() => { setIsAdding(false); setEditingCategory(null); resetForm(); }}
              className="px-6 py-3 text-gray-400 hover:text-white transition-colors text-xs font-bold uppercase tracking-[0.15em] flex items-center gap-2"
            >
              <X size={16} /> Cancel
            </button>
            <button
              onClick={() => editingCategory !== null ? handleUpdateCategory(editingCategory) : handleAddCategory()}
              disabled={busy}
              className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl shadow-xl shadow-indigo-600/20 transition-all text-xs font-bold uppercase tracking-[0.2em] flex items-center gap-2 active:scale-95 disabled:opacity-50"
            >
              <Save size={16} /> {editingCategory !== null ? 'Save Changes' : 'Create Category'}
            </button>
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(reorderMode ? orderList.map(id => eventCategories.find(c => c.id === id)!).filter(Boolean) as any[] : eventCategories).map((category, idx) => (
          <div
            key={category.id}
            className={`group bg-[#181824]/60 backdrop-blur-md border border-white/5 rounded-3xl overflow-hidden transition-all duration-300 ${
              reorderMode 
                ? 'ring-2 ring-indigo-500/30 cursor-grab active:cursor-grabbing hover:border-indigo-500/50' 
                : 'hover:border-white/20 hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1'
            }`}
            draggable={reorderMode}
            onDragStart={(e) => {
              setDragIndex(idx);
              e.dataTransfer.effectAllowed = 'move';
            }}
            onDragOver={(e) => {
              e.preventDefault();
              if (dragIndex === null || dragIndex === idx) return;
              moveRow(dragIndex, idx);
              setDragIndex(idx);
            }}
            onDragEnd={() => setDragIndex(null)}
          >
            <div className="h-2 w-full" style={{ backgroundColor: category.color }} />
            
            <div className="p-6 relative">
              {/* Actions Overlay */}
              {!reorderMode && (
                <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-y-1 group-hover:translate-y-0">
                  <button
                    onClick={() => startEditingCategory(category)}
                    className="p-2.5 bg-white/5 hover:bg-blue-500/20 text-gray-400 hover:text-blue-400 rounded-xl border border-white/5 transition-all active:scale-95"
                    title="Edit"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(category.id)}
                    className="p-2.5 bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded-xl border border-white/5 transition-all active:scale-95"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}

              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2.5 h-2.5 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.5)]" style={{ backgroundColor: category.color }} />
                  <h3 className="text-lg font-bold text-white tracking-tight leading-tight">{category.name}</h3>
                </div>
                <p className="text-gray-400 text-sm line-clamp-2 leading-relaxed h-10">{category.description}</p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-white/5">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Hex Identity</span>
                  <span className="text-xs font-mono text-gray-400 uppercase">{category.color}</span>
                </div>
                
                {reorderMode && (
                  <div className="flex items-center gap-1.5 p-1 bg-black/20 rounded-xl border border-white/5">
                    <button
                      onClick={() => moveRow(idx, Math.max(0, idx - 1))}
                      className="p-2 hover:bg-white/5 rounded-lg text-gray-500 hover:text-indigo-400 transition-all"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <div className="w-px h-3 bg-white/10" />
                    <button
                      onClick={() => moveRow(idx, Math.min(orderList.length - 1, idx + 1))}
                      className="p-2 hover:bg-white/5 rounded-lg text-gray-500 hover:text-indigo-400 transition-all"
                    >
                      <ArrowDown size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {eventCategories.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-[#181824]/40 backdrop-blur-md border border-white/5 rounded-[3rem] border-dashed">
          <div className="w-20 h-20 bg-indigo-500/10 rounded-[2rem] flex items-center justify-center mb-6 border border-indigo-500/20">
            <Palette className="w-10 h-10 text-indigo-400" />
          </div>
          <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-tighter">No Categories Found</h3>
          <p className="text-gray-400 max-w-xs mb-8 text-sm">Create categories to organize your events with unique visual identities.</p>
          <button
            onClick={() => { setIsAdding(true); resetForm(); }}
            className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl shadow-xl shadow-indigo-600/20 transition-all font-bold uppercase tracking-widest text-xs active:scale-95"
          >
            Create Your First Category
          </button>
        </div>
      )}
    </div>
  );
};