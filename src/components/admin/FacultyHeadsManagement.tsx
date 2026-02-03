import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X, Users, Crown, Eye, EyeOff } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { ImageUpload } from '../ImageUpload';
import type { FacultyHead } from '../../context/DataContext';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useSavingProgress } from '../../context/SavingProgressContext';
import { useApprovals } from '../../hooks/useApprovals';

export const FacultyHeadsManagement: React.FC = () => {
  const savingProgress = useSavingProgress();
  const { submitForApproval, checkRequiresApproval } = useApprovals();
  const [requiresApproval, setRequiresApproval] = useState(false);

  useEffect(() => {
    checkRequiresApproval().then(setRequiresApproval);
  }, []);

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
      if (requiresApproval) {
        await submitForApproval(
          'faculty_head',
          'create',
          {
            name: form.name,
            title: form.title,
            image: form.image,
            description: form.description,
            email: form.email,
            phone: form.phone,
            order_position: form.order_position,
            enabled: form.enabled,
            social_links: Object.keys(social_links).length > 0 ? social_links : undefined,
            achievements: form.achievements
          }
        );
        alert('Request submitted for approval. An owner will review your changes.');
        setIsAdding(false);
        resetForm();
        try { localStorage.removeItem('admin_faculty_head_form_draft'); } catch {}
      } else {
        steps.next('Saving to database');
        await addFacultyHead(payload);
        setIsAdding(false);
        resetForm();
        try { localStorage.removeItem('admin_faculty_head_form_draft'); } catch {}
      }
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
      if (requiresApproval) {
        await submitForApproval(
          'faculty_head',
          'update',
          {
            name: form.name,
            title: form.title,
            image: form.image,
            description: form.description,
            email: form.email,
            phone: form.phone,
            order_position: form.order_position,
            enabled: form.enabled,
            social_links: Object.keys(merged).length > 0 ? merged : undefined,
            achievements: form.achievements
          },
          id
        );
        alert('Request submitted for approval. An owner will review your changes.');
        setEditing(null);
        resetForm();
        try { localStorage.removeItem('admin_faculty_head_form_draft'); } catch {}
      } else {
        steps.next('Saving to database');
        await updateFacultyHead(id, payload);
        setEditing(null);
        resetForm();
        try { localStorage.removeItem('admin_faculty_head_form_draft'); } catch {}
      }
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
        if (requiresApproval) {
          await submitForApproval(
            'faculty_head',
            'delete',
            {},
            id
          );
          alert('Request submitted for approval. An owner will review your changes.');
        } else {
          await deleteFacultyHead(id);
        }
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
      if (requiresApproval) {
        await submitForApproval(
          'faculty_head',
          'update',
          { enabled: !facultyHeads.find(h => h.id === id)?.enabled },
          id
        );
        alert('Request submitted for approval. An owner will review your changes.');
      } else {
        await toggleFacultyHeadEnabled(id);
      }
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
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            <div className="w-1.5 h-8 bg-gradient-to-b from-amber-400 to-yellow-600 rounded-full" />
            Faculty Heads Management
          </h2>
          <p className="text-gray-400 mt-1">Manage faculty leadership profiles and information</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setIsAdding(true);
            resetForm();
          }}
          className="bg-gradient-to-r from-amber-500 to-yellow-500 text-black px-5 py-2.5 rounded-xl hover:from-amber-400 hover:to-yellow-400 transition-all shadow-lg shadow-yellow-500/20 flex items-center font-bold hover:-translate-y-0.5"
        >
          <Plus size={16} className="mr-2" />
          Add Faculty Head
        </button>
      </div>

      {/* Add Faculty Head Form */}
      {isAdding && (
        <div className="bg-[#181824]/60 backdrop-blur-md border border-white/5 rounded-2xl p-6 border-l-4 border-l-amber-500">
          <h3 className="text-lg font-bold text-white mb-6">Add New Faculty Head</h3>
          <div className="grid lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2 uppercase tracking-wide">Full Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Dr. John Smith"
                  className="w-full p-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-white placeholder-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2 uppercase tracking-wide">Title/Position</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Festival Director & Department Head"
                  className="w-full p-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-white placeholder-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2 uppercase tracking-wide">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description about the faculty head..."
                  rows={4}
                  className="w-full p-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-white placeholder-gray-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-300 mb-2 uppercase tracking-wide">Email (optional)</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="name@example.com"
                    className="w-full p-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-white placeholder-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-300 mb-2 uppercase tracking-wide">Phone (optional)</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+91 98765 43210"
                    className="w-full p-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-white placeholder-gray-500"
                  />
                </div>
              </div>
              {/* Social Links */}
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2 uppercase tracking-wide">Social Links (optional)</label>
                <div className="grid grid-cols-3 gap-4">
                  <input
                    type="url"
                    value={form.instagram}
                    onChange={(e) => setForm(prev => ({ ...prev, instagram: e.target.value }))}
                    placeholder="Instagram URL"
                    className="w-full p-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-white placeholder-gray-500"
                  />
                  <input
                    type="url"
                    value={form.youtube}
                    onChange={(e) => setForm(prev => ({ ...prev, youtube: e.target.value }))}
                    placeholder="YouTube URL"
                    className="w-full p-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-white placeholder-gray-500"
                  />
                  <input
                    type="url"
                    value={(form as any).facebook}
                    onChange={(e) => setForm(prev => ({ ...prev, facebook: e.target.value }))}
                    placeholder="Facebook URL"
                    className="w-full p-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white placeholder-gray-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-300 mb-2 uppercase tracking-wide">Display Order</label>
                  <input
                    type="number"
                    value={form.order_position}
                    onChange={(e) => setForm(prev => ({ ...prev, order_position: parseInt(e.target.value) || 1 }))}
                    min="1"
                    className="w-full p-3 bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-white"
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={form.enabled}
                      onChange={(e) => setForm(prev => ({ ...prev, enabled: e.target.checked }))}
                      className="w-4 h-4 rounded border-gray-600 bg-black/20 text-purple-600 focus:ring-purple-500/50"
                    />
                    <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">Visible on website</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2 uppercase tracking-wide">Achievements</label>
                <div className="space-y-2">
                  {form.achievements.map((achievement, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={achievement}
                        onChange={(e) => updateAchievement(index, e.target.value)}
                        placeholder="Achievement or accomplishment"
                        className="flex-1 p-2 bg-black/20 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-white placeholder-gray-500"
                      />
                      <button
                        type="button"
                        onClick={() => removeAchievement(index)}
                        className="text-red-400 hover:text-red-300 p-1"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addAchievement}
                    className="text-amber-400 hover:text-amber-300 text-sm flex items-center font-medium"
                  >
                    <Plus size={16} className="mr-1" />
                    Add Achievement
                  </button>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2 uppercase tracking-wide">Profile Photo</label>
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
          <div className="flex flex-col sm:flex-row justify-end gap-3 mt-8 pt-6 border-t border-white/5">
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                resetForm();
              }}
              className="w-full sm:w-auto px-6 py-2 text-gray-400 hover:text-white flex items-center justify-center gap-2 font-medium"
            >
              <X size={16} />
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAdd}
              className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 text-black rounded-xl hover:from-amber-400 hover:to-yellow-400 flex items-center justify-center gap-2 shadow-lg shadow-yellow-500/20 font-bold hover:-translate-y-0.5 transition-all"
            >
              <Save size={16} />
              Add Faculty Head
            </button>
          </div>
        </div>
      )}

      {/* Faculty Heads List */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedFacultyHeads.map((facultyHead) => (
          <div key={facultyHead.id} className="group relative bg-[#181824]/40 backdrop-blur-md border border-white/5 rounded-2xl overflow-hidden hover:border-amber-500/30 transition-all duration-300 hover:-translate-y-1 shadow-xl">
            {editing === facultyHead.id ? (
              <div className="p-6 space-y-4 bg-black/40">
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Full name"
                  className="w-full p-2.5 bg-black/40 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-white placeholder-gray-500"
                />
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Title/Position"
                  className="w-full p-2.5 bg-black/40 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-white placeholder-gray-500"
                />
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Email"
                    className="w-full p-2.5 bg-black/40 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-white placeholder-gray-500"
                  />
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Phone"
                    className="w-full p-2.5 bg-black/40 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-white placeholder-gray-500"
                  />
                </div>
                {/* Social links for edit */}
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="url"
                    value={form.instagram}
                    onChange={(e) => setForm(prev => ({ ...prev, instagram: e.target.value }))}
                    placeholder="Insta"
                    className="w-full p-2 bg-black/40 border border-white/10 rounded-lg text-white text-[10px]"
                  />
                  <input
                    type="url"
                    value={form.youtube}
                    onChange={(e) => setForm(prev => ({ ...prev, youtube: e.target.value }))}
                    placeholder="YT"
                    className="w-full p-2 bg-black/40 border border-white/10 rounded-lg text-white text-[10px]"
                  />
                  <input
                    type="url"
                    value={(form as any).facebook}
                    onChange={(e) => setForm(prev => ({ ...prev, facebook: e.target.value }))}
                    placeholder="FB"
                    className="w-full p-2 bg-black/40 border border-white/10 rounded-lg text-white text-[10px]"
                  />
                </div>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  placeholder="Description"
                  className="w-full p-2.5 bg-black/40 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-white placeholder-gray-500 text-sm"
                />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Order</span>
                    <input
                      type="number"
                      value={form.order_position}
                      onChange={(e) => setForm(prev => ({ ...prev, order_position: parseInt(e.target.value) || 1 }))}
                      min="1"
                      className="w-full p-2 bg-black/40 border border-white/10 rounded-lg text-white font-mono"
                    />
                  </div>
                  <div className="flex items-end pb-1">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={form.enabled}
                        onChange={(e) => setForm(prev => ({ ...prev, enabled: e.target.checked }))}
                        className="w-4 h-4 rounded border-white/10 bg-black/20 text-amber-500 focus:ring-amber-500/50"
                      />
                      <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest group-hover:text-white transition-colors">Enabled</span>
                    </label>
                  </div>
                </div>
                
                <ImageUpload
                  onImageSelect={(url) => setForm(prev => ({ ...prev, image: url }))}
                  currentImage={form.image}
                  bucket="faculty-images"
                  folder="faculty"
                  className="h-32 rounded-xl"
                  cropAspect={1}
                />
                <div className="flex flex-row gap-2 pt-4 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(null);
                      resetForm();
                    }}
                    className="flex-1 px-4 py-2 bg-white/5 text-gray-400 hover:text-white rounded-lg text-xs font-bold uppercase tracking-widest transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdate(facultyHead.id)}
                    className="flex-1 px-4 py-2 bg-amber-500 text-black rounded-lg hover:bg-amber-400 font-bold text-xs uppercase tracking-widest transition-all shadow-lg shadow-amber-500/10"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="relative h-64 overflow-hidden group-hover:scale-105 transition-transform duration-700">
                  <img
                    src={facultyHead.image}
                    alt={facultyHead.name}
                    className="w-full h-full object-cover grayscale-[20%] group-hover:grayscale-0 transition-all duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-transparent opacity-60" />
                  
                  <div className="absolute top-4 left-4 flex gap-2">
                    <div className="p-1.5 bg-black/40 backdrop-blur-md border border-white/10 rounded-lg shadow-xl">
                      <Crown className="w-4 h-4 text-amber-400" />
                    </div>
                    {!facultyHead.enabled && (
                      <span className="bg-red-500/80 backdrop-blur-md text-white px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border border-red-500/20">
                        Hidden
                      </span>
                    )}
                  </div>
                  <div className="absolute top-4 right-4">
                    <span className="bg-amber-500/90 backdrop-blur-md text-black px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest">
                      Rank #{facultyHead.order_position}
                    </span>
                  </div>
                </div>
                
                <div className="p-6 relative">
                  <div className="mb-4">
                    <h3 className="font-black text-xl text-white group-hover:text-amber-400 transition-colors tracking-tight leading-tight mb-1">{facultyHead.name}</h3>
                    <div className="text-amber-500/80 font-bold text-[10px] uppercase tracking-[0.2em]">{facultyHead.title}</div>
                  </div>
                  
                  <p className="text-gray-400 text-sm mb-6 line-clamp-2 leading-relaxed h-10 italic">"{facultyHead.description}"</p>
                  
                  {facultyHead.achievements.length > 0 && (
                    <div className="mb-6 space-y-2">
                      <div className="text-[9px] font-black text-gray-600 uppercase tracking-widest flex items-center gap-2">
                        <div className="w-4 h-[1px] bg-gray-600" /> Key Achievements
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {facultyHead.achievements.slice(0, 2).map((achievement, index) => (
                          <div key={index} className="px-3 py-1 bg-white/5 border border-white/5 rounded-full text-[10px] text-gray-400 font-medium truncate max-w-[140px]">
                            {achievement}
                          </div>
                        ))}
                        {facultyHead.achievements.length > 2 && (
                          <div className="px-3 py-1 bg-white/5 text-gray-500 rounded-full text-[10px] font-bold">
                            +{facultyHead.achievements.length - 2} more
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center pt-4 border-t border-white/5">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleEnabled(facultyHead.id)}
                        className={`p-2 rounded-xl transition-all border ${
                          facultyHead.enabled 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20' 
                            : 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'
                        }`}
                        title={facultyHead.enabled ? 'Hide from public' : 'Show to public'}
                      >
                        {facultyHead.enabled ? <Eye size={16} /> : <EyeOff size={16} />}
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => startEditing(facultyHead)}
                        className="p-2 bg-white/5 border border-white/5 text-gray-400 hover:text-white hover:border-white/20 rounded-xl transition-all"
                        title="Edit faculty head"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(facultyHead.id)}
                        className="p-2 bg-white/5 border border-white/5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 rounded-xl transition-all"
                        title="Delete faculty head"
                      >
                        <Trash2 size={16} />
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