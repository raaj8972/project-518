import React, { useState } from 'react';
import { Plus, Edit, Trash2, Save, X, Palette, AlertCircle } from 'lucide-react';
import { useData } from '../../context/DataContext';
import type { EventCategory } from '../../context/DataContext';

export const EventCategoriesManagement: React.FC = () => {
  const { 
    eventCategories, 
    addEventCategory, 
    updateEventCategory, 
    deleteEventCategory 
    , reorderEventCategories
  } = useData();

  const [isAdding, setIsAdding] = useState(false);
  const [editingCategory, setEditingCategory] = useState<number | null>(null);
  const [error, setError] = useState<string>('');

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    color: '#6B7280',
    description: ''
  });

  const resetForm = () => {
    setCategoryForm({
      name: '',
      color: '#6B7280',
      description: ''
    });
    setError('');
  };

  const handleAddCategory = async () => {
    // Basic validation + trimming
    const name = (categoryForm.name || '').trim();
    const description = (categoryForm.description || '').trim();
    const color = (categoryForm.color || '').trim() || '#6B7280';
    if (!name || !description) {
      setError('Name and description are required');
      return;
    }
    
    try {
      await addEventCategory({ name, description, color });
      setIsAdding(false);
      resetForm();
    } catch (error: any) {
      // Log full structure for diagnostics and show meaningful message
      console.error('Error adding category:', error?.message || error, error);
      const msg =
        (typeof error?.message === 'string' && error.message) ||
        (typeof error?.toString === 'function' && error.toString()) ||
        'Failed to add category. Please try again.';
      setError(msg);
    }
  };

  const handleUpdateCategory = async (id: number) => {
    const name = (categoryForm.name || '').trim();
    const description = (categoryForm.description || '').trim();
    const color = (categoryForm.color || '').trim() || '#6B7280';
    if (!name || !description) {
      setError('Name and description are required');
      return;
    }
    
    try {
      await updateEventCategory(id, { name, description, color });
      setEditingCategory(null);
      resetForm();
    } catch (error: any) {
      console.error('Error updating category:', error?.message || error, error);
      const msg =
        (typeof error?.message === 'string' && error.message) ||
        (typeof error?.toString === 'function' && error.toString()) ||
        'Failed to update category. Please try again.';
      setError(msg);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (confirm('Are you sure you want to delete this category? This action cannot be undone and may affect existing events.')) {
      try {
        await deleteEventCategory(id);
      } catch (error: any) {
        console.error('Error deleting category:', error?.message || error, error);
        setError(
          (typeof error?.message === 'string' && error.message) ||
          'Failed to delete category. Please try again.'
        );
      }
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
    '#6B7280', '#EF4444', '#F97316', '#EAB308', '#22C55E', 
    '#06B6D4', '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B'
  ];

  // Reorder UI state
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
    const ok = await reorderEventCategories(orderList);
    if (ok) {
      setReorderMode(false);
      setOrderList([]);
    } else {
      setError('Failed to persist category order. Please try again.');
    }
  };

  const moveRow = (from: number, to: number) => {
    const copy = [...orderList];
    const [item] = copy.splice(from, 1);
    copy.splice(to, 0, item);
    setOrderList(copy);
  };

  const onDragStartRow = (e: React.DragEvent, index: number) => {
    setDragIndex(index);
    try { e.dataTransfer.setData('text/plain', String(index)); } catch {}
  };

  const onDragOverRow = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    moveRow(dragIndex, index);
    setDragIndex(index);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Event Categories</h2>
          <p className="text-gray-600">Manage event categories and their visual styling</p>
        </div>
        <div className="flex items-center space-x-3">
          {!reorderMode ? (
            <>
              <button
                type="button"
                onClick={startReorder}
                className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center"
              >
                Reorder
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAdding(true);
                  resetForm();
                }}
                className="bg-yellow-400 text-black px-4 py-2 rounded-lg hover:bg-yellow-300 transition-colors flex items-center"
              >
                <Plus size={16} className="mr-2" />
                Add Category
              </button>
            </>
          ) : (
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={persistReorder}
                className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-500 transition-colors"
              >
                Save Order
              </button>
              <button
                type="button"
                onClick={cancelReorder}
                className="bg-gray-200 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
          <AlertCircle className="w-5 h-5 text-red-500 mr-3" />
          <span className="text-red-700">{error}</span>
          <button
            type="button"
            onClick={() => setError('')}
            className="ml-auto text-red-500 hover:text-red-700"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Add Category Form */}
      {isAdding && (
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-400">
          <h3 className="text-lg font-semibold mb-4">Add New Category</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category Name *</label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Cultural, Technical, Sports"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                <textarea
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of this category"
                  rows={3}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category Color</label>
              <div className="space-y-3">
                <input
                  type="color"
                  value={categoryForm.color}
                  onChange={(e) => setCategoryForm(prev => ({ ...prev, color: e.target.value }))}
                  className="w-full h-12 border border-gray-300 rounded-lg cursor-pointer"
                />
                <div className="grid grid-cols-5 gap-2">
                  {predefinedColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setCategoryForm(prev => ({ ...prev, color }))}
                      className={`w-8 h-8 rounded-lg border-2 transition-all ${
                        categoryForm.color === color ? 'border-gray-900 scale-110' : 'border-gray-300 hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div
                    className="w-6 h-6 rounded-full"
                    style={{ backgroundColor: categoryForm.color }}
                  />
                  <span className="text-sm text-gray-700">Preview: {categoryForm.name || 'Category Name'}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end space-x-2 mt-6">
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                resetForm();
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 flex items-center"
            >
              <X size={16} className="mr-1" />
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAddCategory}
              className="px-4 py-2 bg-yellow-400 text-black rounded-lg hover:bg-yellow-300 flex items-center"
            >
              <Save size={16} className="mr-1" />
              Add Category
            </button>
          </div>
        </div>
      )}

      {/* Categories List */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(reorderMode ? orderList.map(id => eventCategories.find(c => c.id === id)!).filter(Boolean) as any[] : eventCategories).map((category) => (
          <div
            key={category.id}
            className={`bg-white rounded-lg shadow-md overflow-hidden ${reorderMode ? 'ring-2 ring-dashed ring-yellow-300 cursor-grab' : 'hover:shadow-lg'} transition-shadow`}
            draggable={reorderMode}
            onDragStart={(e) => reorderMode ? onDragStartRow(e, (orderList.findIndex(i => i === category.id))) : undefined}
            onDragOver={(e) => reorderMode ? onDragOverRow(e, (orderList.findIndex(i => i === category.id))) : undefined}
          >
            {editingCategory === category.id ? (
              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Category Name</label>
                    <input
                      type="text"
                      value={categoryForm.name}
                      onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea
                      value={categoryForm.description}
                      onChange={(e) => setCategoryForm(prev => ({ ...prev, description: e.target.value }))}
                      rows={2}
                      className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={categoryForm.color}
                        onChange={(e) => setCategoryForm(prev => ({ ...prev, color: e.target.value }))}
                        className="w-10 h-10 border border-gray-300 rounded cursor-pointer"
                      />
                      <div className="grid grid-cols-5 gap-1 flex-1">
                        {predefinedColors.slice(0, 5).map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setCategoryForm(prev => ({ ...prev, color }))}
                            className={`w-6 h-6 rounded border transition-all ${
                              categoryForm.color === color ? 'border-gray-900 scale-110' : 'border-gray-300 hover:scale-105'
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end space-x-2 mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCategory(null);
                      resetForm();
                    }}
                    className="px-3 py-1 text-gray-600 hover:text-gray-800 flex items-center"
                  >
                    <X size={14} className="mr-1" />
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateCategory(category.id)}
                    className="px-3 py-1 bg-yellow-400 text-black rounded hover:bg-yellow-300 flex items-center"
                  >
                    <Save size={14} className="mr-1" />
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div 
                  className="h-3"
                  style={{ backgroundColor: category.color }}
                />
                <div className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-900">{category.name}</h3>
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm mb-4">{category.description}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">
                      Color: {category.color}
                    </span>
                    <div className="flex items-center space-x-2">
                      {reorderMode ? (
                        <div className="flex items-center space-x-1">
                          <button
                            type="button"
                            aria-label={`Move ${category.name} up`}
                            onClick={() => {
                              const idx = orderList.findIndex(i => i === category.id);
                              if (idx > 0) moveRow(idx, idx - 1);
                            }}
                            className="bg-gray-100 text-gray-700 p-2 rounded hover:bg-gray-200"
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            aria-label={`Move ${category.name} down`}
                            onClick={() => {
                              const idx = orderList.findIndex(i => i === category.id);
                              if (idx >= 0 && idx < orderList.length - 1) moveRow(idx, idx + 1);
                            }}
                            className="bg-gray-100 text-gray-700 p-2 rounded hover:bg-gray-200"
                          >
                            ▼
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => startEditingCategory(category)}
                            className="bg-blue-600 text-white p-2 rounded hover:bg-blue-500 transition-colors"
                            title="Edit category"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCategory(category.id)}
                            className="bg-red-600 text-white p-2 rounded hover:bg-red-500 transition-colors"
                            title="Delete category"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* No Categories Message */}
      {eventCategories.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow-md">
          <Palette size={64} className="mx-auto mb-4 text-gray-400" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">No Categories Yet</h3>
          <p className="text-gray-500 mb-4">Start by adding your first event category</p>
          <button
            type="button"
            onClick={() => {
              setIsAdding(true);
              resetForm();
            }}
            className="bg-yellow-400 text-black px-6 py-2 rounded-lg hover:bg-yellow-300 transition-colors"
          >
            Add First Category
          </button>
        </div>
      )}
    </div>
  );
};