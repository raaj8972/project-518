import React, { useState } from 'react';
import { Plus, Edit, Trash2, Save, X, Users, Crown, Eye, EyeOff } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { ImageUpload } from '../ImageUpload';
import type { FacultyHead } from '../../context/DataContext';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useSavingProgress } from '../../context/SavingProgressContext';

export const FacultyHeadsManagement: React.FC = () => {
  const savingProgress = useSavingProgress();
  const { 
    facultyHeads, 
    addFacultyHead, 
    updateFacultyHead, 
    deleteFacultyHead,
    toggleFacultyHeadEnabled
  } = useData();

  const [isAdding, setIsAdding] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);

  const [form, setForm] = useLocalStorage('admin_faculty_head_form_draft', {
    name: '',
    title: '',
    image: '',
    description: '',
    email: '',
    phone: '',
    instagram: '',
    youtube: '',
    facebook: '',
    achievements: [] as string[],
    order_position: 1,
    enabled: true
  });

  const resetForm = () => {
    setForm({
      name: '',
      title: '',
      image: '',
      description: '',
      email: '',
      phone: '',
        instagram: '',
      youtube: '',
        facebook: '',
      achievements: [],
      order_position: facultyHeads.length + 1,
      enabled: true
    });
  };

  const handleAdd = async () => {
    if (!form.name.trim()) {
      alert('Name is required');
      return;
    }
    try {
      const steps = savingProgress.withSteps(3, 'Preparing…');
      steps.next('Validating');
      // Build optional social_links only when present
      const social_links: Record<string, string> = {};
      if (form.instagram?.trim()) social_links.instagram = form.instagram.trim();
      if (form.youtube?.trim()) social_links.youtube = form.youtube.trim();
  if ((form as any).facebook?.trim()) social_links.facebook = (form as any).facebook.trim();
      const payload: any = { ...form };
      delete payload.instagram;
      delete payload.youtube;
  delete payload.facebook;
      if (Object.keys(social_links).length > 0) payload.social_links = social_links;
      steps.next('Saving to database');
      await addFacultyHead(payload);
      setIsAdding(false);
      resetForm();
      try { localStorage.removeItem('admin_faculty_head_form_draft'); } catch {}
    } catch (error) {
      console.error('Error adding faculty head:', error);
      const msg = (error as any)?.message || String(error);
      alert(`Failed to add faculty head. ${msg}`);
    } finally {
      savingProgress.done();
    }
  };

  const handleUpdate = async (id: number) => {
    if (!form.name.trim()) {
      alert('Name is required');
      return;
    }
    try {
      const steps = savingProgress.withSteps(3, 'Preparing…');
      steps.next('Validating');
      const payload: any = { ...form };
      delete payload.instagram;
      delete payload.youtube;
      delete payload.facebook;
      // Merge with existing social_links, but allow clearing by empty field
      const existing = facultyHeads.find(f => f.id === id) as any;
      const merged: Record<string, string> = { ...(existing?.social_links || {}) };
      if (form.instagram !== undefined) {
        if (form.instagram.trim()) merged.instagram = form.instagram.trim();
        else delete merged.instagram;
      }
      if (form.youtube !== undefined) {
        if (form.youtube.trim()) merged.youtube = form.youtube.trim();
        else delete merged.youtube;
      }
      if ((form as any).facebook !== undefined) {
        if ((form as any).facebook.trim()) merged.facebook = (form as any).facebook.trim();
        else delete merged.facebook;
      }
      if (Object.keys(merged).length > 0) {
        payload.social_links = merged;
      } else {
        // Omit the property entirely to avoid unknown-column updates when DB lacks social_links
        delete payload.social_links;
      }
      steps.next('Saving to database');
      await updateFacultyHead(id, payload);
      setEditing(null);
      resetForm();
      try { localStorage.removeItem('admin_faculty_head_form_draft'); } catch {}
    } catch (error) {
      console.error('Error updating faculty head:', error);
      const msg = (error as any)?.message || String(error);
      alert(`Failed to update faculty head. ${msg}`);
    } finally {
      savingProgress.done();
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this faculty head? This action cannot be undone.')) {
      try {
        const steps = savingProgress.withSteps(2, 'Preparing…');
        steps.next('Deleting');
        await deleteFacultyHead(id);
      } catch (error) {
        console.error('Error deleting faculty head:', error);
        alert('Failed to delete faculty head. Please try again.');
      } finally {
        savingProgress.done();
      }
    }
  };

  const handleToggleEnabled = async (id: number) => {
    try {
      const steps = savingProgress.withSteps(2, 'Preparing…');
      steps.next('Updating');
      await toggleFacultyHeadEnabled(id);
    } catch (error) {
      console.error('Error toggling faculty head status:', error);
      alert('Failed to update faculty head status. Please try again.');
    } finally {
      savingProgress.done();
    }
  };

  const startEditing = (facultyHead: FacultyHead) => {
    setForm({
      name: facultyHead.name,
      title: facultyHead.title,
      image: facultyHead.image,
      description: facultyHead.description,
      email: (facultyHead as any).email || '',
      phone: (facultyHead as any).phone || '',
      instagram: ((facultyHead as any).social_links?.instagram) || '',
      youtube: ((facultyHead as any).social_links?.youtube) || '',
      facebook: ((facultyHead as any).social_links?.facebook) || '',
      achievements: facultyHead.achievements,
      order_position: facultyHead.order_position,
      enabled: facultyHead.enabled
    });
    setEditing(facultyHead.id);
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

  // Sort faculty heads by order position
  const sortedFacultyHeads = [...facultyHeads].sort((a, b) => a.order_position - b.order_position);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Faculty Heads Management</h2>
          <p className="text-gray-600">Manage faculty leadership profiles and information</p>
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
          Add Faculty Head
        </button>
      </div>

      {/* Add Faculty Head Form */}
      {isAdding && (
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-400">
          <h3 className="text-lg font-semibold mb-6">Add New Faculty Head</h3>
          <div className="grid lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Dr. John Smith"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title/Position</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Festival Director & Department Head"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description about the faculty head..."
                  rows={4}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email (optional)</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="name@example.com (optional)"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone (optional)</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+91 98765 43210 (optional)"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900"
                  />
                </div>
              </div>
              {/* Social Links */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Social Links (optional)</label>
                <div className="grid grid-cols-3 gap-4">
                  <input
                    type="url"
                    value={form.instagram}
                    onChange={(e) => setForm(prev => ({ ...prev, instagram: e.target.value }))}
                    placeholder="Instagram URL (e.g., https://instagram.com/yourhandle)"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-400 text-gray-900"
                  />
                  <input
                    type="url"
                    value={form.youtube}
                    onChange={(e) => setForm(prev => ({ ...prev, youtube: e.target.value }))}
                    placeholder="YouTube URL (e.g., https://youtube.com/@yourchannel)"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 text-gray-900"
                  />
                  <input
                    type="url"
                    value={(form as any).facebook}
                    onChange={(e) => setForm(prev => ({ ...prev, facebook: e.target.value }))}
                    placeholder="Facebook URL (e.g., https://facebook.com/yourpage)"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-900"
                  />
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
                <div className="flex items-end">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={form.enabled}
                      onChange={(e) => setForm(prev => ({ ...prev, enabled: e.target.checked }))}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-gray-700">Visible on website</span>
                  </label>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Profile Photo</label>
                <ImageUpload
                  onImageSelect={(url) => setForm(prev => ({ ...prev, image: url }))}
                  currentImage={form.image}
                  bucket="faculty-images"
                  folder="faculty"
                  cropAspect={1}
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
              Add Faculty Head
            </button>
          </div>
        </div>
      )}

      {/* Faculty Heads List */}
      <div className="grid md:grid-cols-2 gap-6">
        {sortedFacultyHeads.map((facultyHead) => (
          <div key={facultyHead.id} className="bg-white rounded-lg shadow-md overflow-hidden">
            {editing === facultyHead.id ? (
              <div className="p-6 space-y-4">
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Full name"
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900"
                />
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Title/Position"
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900"
                />
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Email (optional)"
                    className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900"
                  />
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Phone (optional)"
                    className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900"
                  />
                </div>
                {/* Social links for edit */}
                <div className="grid grid-cols-3 gap-4">
                  <input
                    type="url"
                    value={form.instagram}
                    onChange={(e) => setForm(prev => ({ ...prev, instagram: e.target.value }))}
                    placeholder="Instagram URL (optional)"
                    className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-pink-400 text-gray-900"
                  />
                  <input
                    type="url"
                    value={form.youtube}
                    onChange={(e) => setForm(prev => ({ ...prev, youtube: e.target.value }))}
                    placeholder="YouTube URL (optional)"
                    className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-400 text-gray-900"
                  />
                  <input
                    type="url"
                    value={(form as any).facebook}
                    onChange={(e) => setForm(prev => ({ ...prev, facebook: e.target.value }))}
                    placeholder="Facebook URL (optional)"
                    className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-900"
                  />
                </div>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  placeholder="Description"
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900"
                />
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="number"
                    value={form.order_position}
                    onChange={(e) => setForm(prev => ({ ...prev, order_position: parseInt(e.target.value) || 1 }))}
                    min="1"
                    placeholder="Display order"
                    className="p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900"
                  />
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={form.enabled}
                      onChange={(e) => setForm(prev => ({ ...prev, enabled: e.target.checked }))}
                      className="mr-2"
                    />
                    <span className="text-sm">Enabled</span>
                  </label>
                </div>
                
                {/* Achievements editing */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Achievements</label>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {form.achievements.map((achievement, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={achievement}
                          onChange={(e) => updateAchievement(index, e.target.value)}
                          placeholder="Achievement"
                          className="flex-1 p-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-yellow-400 text-gray-900"
                        />
                        <button
                          type="button"
                          onClick={() => removeAchievement(index)}
                          className="text-red-600 hover:text-red-800 p-1"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addAchievement}
                      className="text-yellow-600 hover:text-yellow-700 text-xs flex items-center"
                    >
                      <Plus size={12} className="mr-1" />
                      Add Achievement
                    </button>
                  </div>
                </div>

                <ImageUpload
                  onImageSelect={(url) => setForm(prev => ({ ...prev, image: url }))}
                  currentImage={form.image}
                  bucket="faculty-images"
                  folder="faculty"
                  className="h-32"
                  cropAspect={1}
                />
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
                    onClick={() => handleUpdate(facultyHead.id)}
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
                    src={facultyHead.image}
                    alt={facultyHead.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2 flex space-x-1">
                    <Crown className="w-6 h-6 text-yellow-400" />
                    {!facultyHead.enabled && (
                      <span className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                        Hidden
                      </span>
                    )}
                  </div>
                  <div className="absolute top-2 right-2">
                    <span className="bg-black/70 text-white px-2 py-1 rounded text-xs">
                      Order: {facultyHead.order_position}
                    </span>
                  </div>
                </div>
                
                <div className="p-4">
                  <h3 className="font-bold text-lg text-gray-900 mb-1">{facultyHead.name}</h3>
                  <p className="text-yellow-600 font-semibold text-sm mb-3">{facultyHead.title}</p>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">{facultyHead.description}</p>
                  
                  {facultyHead.achievements.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-medium text-gray-700 mb-2">
                        {facultyHead.achievements.length} Achievement{facultyHead.achievements.length !== 1 ? 's' : ''}
                      </p>
                      <div className="text-xs text-gray-500">
                        {facultyHead.achievements.slice(0, 2).map((achievement, index) => (
                          <div key={index} className="truncate">• {achievement}</div>
                        ))}
                        {facultyHead.achievements.length > 2 && (
                          <div>... and {facultyHead.achievements.length - 2} more</div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center">
                    <div className="flex space-x-1">
                      <button
                        type="button"
                        onClick={() => handleToggleEnabled(facultyHead.id)}
                        className={`p-1 rounded transition-colors ${
                          facultyHead.enabled 
                            ? 'bg-green-100 text-green-600' 
                            : 'bg-red-100 text-red-600'
                        } hover:bg-green-200`}
                        title={facultyHead.enabled ? 'Hide from public' : 'Show to public'}
                      >
                        {facultyHead.enabled ? <Eye size={14} /> : <EyeOff size={14} />}
                      </button>
                    </div>
                    <div className="flex space-x-1">
                      <button
                        type="button"
                        onClick={() => startEditing(facultyHead)}
                        className="bg-blue-600 text-white p-1 rounded hover:bg-blue-500 transition-colors"
                        title="Edit faculty head"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(facultyHead.id)}
                        className="bg-red-600 text-white p-1 rounded hover:bg-red-500 transition-colors"
                        title="Delete faculty head"
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

      {/* No Faculty Heads Message */}
      {facultyHeads.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow-md">
          <Users size={64} className="mx-auto mb-4 text-gray-400" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">No Faculty Heads Yet</h3>
          <p className="text-gray-500 mb-4">Start by adding your first faculty head</p>
          <button
            type="button"
            onClick={() => {
              setIsAdding(true);
              resetForm();
            }}
            className="bg-yellow-400 text-black px-6 py-2 rounded-lg hover:bg-yellow-300 transition-colors"
          >
            Add First Faculty Head
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="grid md:grid-cols-3 gap-6 text-center">
          <div>
            <div className="text-2xl font-bold text-yellow-500 mb-1">{facultyHeads.length}</div>
            <div className="text-gray-600 text-sm">Total Faculty Heads</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-500 mb-1">
              {facultyHeads.filter(f => f.enabled).length}
            </div>
            <div className="text-gray-600 text-sm">Visible on Website</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-500 mb-1">
              {facultyHeads.reduce((total, f) => total + f.achievements.length, 0)}
            </div>
            <div className="text-gray-600 text-sm">Total Achievements</div>
          </div>
        </div>
      </div>
    </div>
  );
};