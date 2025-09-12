import React, { useState } from 'react';
import { Plus, Edit, Trash2, Save, X, Music, Star, Eye, EyeOff, Instagram, Youtube, AlignJustify as Spotify } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { ImageUpload } from '../ImageUpload';
import type { BandMember } from '../../context/DataContext';
import { useLocalStorage } from '../../hooks/useLocalStorage';

export const BandManagement: React.FC = () => {
  const { 
    bandMembers,
    addBandMember,
    updateBandMember,
    deleteBandMember,
    toggleBandMemberEnabled,
    toggleBandMemberFeatured
  } = useData();

  const [isAdding, setIsAdding] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);

  const [form, setForm] = useLocalStorage('admin_band_member_form_draft', {
    name: '',
    role: '',
    image: '',
    description: '',
    specialty: '',
    category: '',
    achievements: [] as string[],
    order_position: 1,
    enabled: true,
    is_featured: false,
    social_links: {
      instagram: '',
      youtube: '',
      spotify: ''
    }
  });

  const resetForm = () => {
    setForm({
      name: '',
      role: '',
      image: '',
      description: '',
      specialty: '',
      category: '',
      achievements: [],
      order_position: bandMembers.length + 1,
      enabled: true,
      is_featured: false,
      social_links: {
        instagram: '',
        youtube: '',
        spotify: ''
      }
    });
  };

  const handleAdd = async () => {
    if (!form.name || !form.role || !form.image || !form.description || !form.specialty || !form.category) {
      alert('Please fill in all required fields (name, role, image, description, specialty, and category)');
      return;
    }
    
    try {
      await addBandMember(form);
      setIsAdding(false);
      resetForm();
      try { localStorage.removeItem('admin_band_member_form_draft'); } catch {}
    } catch (error) {
      console.error('Error adding band member:', error);
      const msg = error instanceof Error ? error.message : (typeof error === 'string' ? error : 'Unknown error');
      alert(`Failed to add band member. ${msg}`);
    }
  };

  const handleUpdate = async (id: number) => {
    if (!form.name || !form.role || !form.image || !form.description || !form.specialty || !form.category) {
      alert('Please fill in all required fields (name, role, image, description, specialty, and category)');
      return;
    }
    
    try {
      await updateBandMember(id, form);
      setEditing(null);
      resetForm();
      try { localStorage.removeItem('admin_band_member_form_draft'); } catch {}
    } catch (error) {
      console.error('Error updating band member:', error);
      const msg = error instanceof Error ? error.message : (typeof error === 'string' ? error : 'Unknown error');
      alert(`Failed to update band member. ${msg}`);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this band member? This action cannot be undone.')) {
      try {
        await deleteBandMember(id);
      } catch (error) {
        console.error('Error deleting band member:', error);
        alert('Failed to delete band member. Please try again.');
      }
    }
  };

  const handleToggleEnabled = async (id: number) => {
    try {
      await toggleBandMemberEnabled(id);
    } catch (error) {
      console.error('Error toggling band member status:', error);
      alert('Failed to update band member status. Please try again.');
    }
  };

  const handleToggleFeatured = async (id: number) => {
    try {
      await toggleBandMemberFeatured(id);
    } catch (error) {
      console.error('Error toggling featured status:', error);
      alert('Failed to update featured status. Please try again.');
    }
  };

  const startEditing = (member: BandMember) => {
    setForm({
      name: member.name,
      role: member.role,
      image: member.image,
      description: member.description,
      specialty: member.specialty,
      category: member.category,
      achievements: member.achievements,
      order_position: member.order_position,
      enabled: member.enabled,
      is_featured: member.is_featured,
      social_links: member.social_links || { instagram: '', youtube: '', spotify: '' }
    });
    setEditing(member.id);
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

  // Sort band members by order position
  const sortedBandMembers = [...bandMembers].sort((a, b) => a.order_position - b.order_position);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Home Bound Band Management</h2>
          <p className="text-gray-600">Manage band members, singers, and musical talent</p>
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
          Add Band Member
        </button>
      </div>

      {/* Add Band Member Form */}
      {isAdding && (
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-400">
          <h3 className="text-lg font-semibold mb-6">Add New Band Member</h3>
          <div className="grid lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Artist Name"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role/Position</label>
                <input
                  type="text"
                  value={form.role}
                  onChange={(e) => setForm(prev => ({ ...prev, role: e.target.value }))}
                  placeholder="Lead Singer, Guitarist, Drummer, etc."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Specialty</label>
                <input
                  type="text"
                  value={form.specialty}
                  onChange={(e) => setForm(prev => ({ ...prev, specialty: e.target.value }))}
                  placeholder="e.g., Vocals, Guitar, Electronic Music"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                >
                  <option value="">Select a category</option>
                  <option value="Vocals">Vocals</option>
                  <option value="Guitar">Guitar</option>
                  <option value="Bass">Bass</option>
                  <option value="Drums">Drums</option>
                  <option value="Keyboard">Keyboard</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description about the band member..."
                  rows={4}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Display Order</label>
                  <input
                    type="number"
                    value={form.order_position}
                    onChange={(e) => setForm(prev => ({ ...prev, order_position: parseInt(e.target.value) || 1 }))}
                    min="1"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
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
                    <span className="text-sm font-medium text-gray-700">Featured</span>
                  </label>
                </div>
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
                      className="flex-1 p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400"
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
                      className="flex-1 p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400"
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
                      className="flex-1 p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400"
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
                        className="flex-1 p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400"
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
                  bucket="band-images"
                  folder="band"
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
              Add Band Member
            </button>
          </div>
        </div>
      )}

      {/* Band Members List */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedBandMembers.map((member) => (
          <div key={member.id} className="bg-white rounded-lg shadow-md overflow-hidden">
            {editing === member.id ? (
              <div className="p-6 space-y-4">
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Full name"
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
                <input
                  type="text"
                  value={form.role}
                  onChange={(e) => setForm(prev => ({ ...prev, role: e.target.value }))}
                  placeholder="Role/Position"
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
                <input
                  type="text"
                  value={form.specialty}
                  onChange={(e) => setForm(prev => ({ ...prev, specialty: e.target.value }))}
                  placeholder="Specialty"
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
                <select
                  value={form.category}
                  onChange={(e) => setForm(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400"
                >
                  <option value="">Select category</option>
                  <option value="Vocals">Vocals</option>
                  <option value="Guitar">Guitar</option>
                  <option value="Bass">Bass</option>
                  <option value="Drums">Drums</option>
                  <option value="Keyboard">Keyboard</option>
                  <option value="Other">Other</option>
                </select>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  placeholder="Description"
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="number"
                    value={form.order_position}
                    onChange={(e) => setForm(prev => ({ ...prev, order_position: parseInt(e.target.value) || 1 }))}
                    min="1"
                    placeholder="Display order"
                    className="p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400"
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
                      className="flex-1 p-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-yellow-400"
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
                      className="flex-1 p-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-yellow-400"
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
                      className="flex-1 p-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-yellow-400"
                    />
                  </div>
                </div>

                <ImageUpload
                  onImageSelect={(url) => setForm(prev => ({ ...prev, image: url }))}
                  currentImage={form.image}
                  bucket="band-images"
                  folder="band"
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
                    onClick={() => handleUpdate(member.id)}
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
                    src={member.image}
                    alt={member.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2 flex space-x-1">
                    {member.is_featured && (
                      <Star className="w-6 h-6 text-pink-400 fill-current" />
                    )}
                    {!member.enabled && (
                      <span className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                        Hidden
                      </span>
                    )}
                  </div>
                  <div className="absolute top-2 right-2">
                    <span className="bg-black/70 text-white px-2 py-1 rounded text-xs">
                      Order: {member.order_position}
                    </span>
                  </div>
                </div>
                
                <div className="p-4">
                  <h3 className="font-bold text-lg text-gray-900 mb-1">{member.name}</h3>
                  <p className="text-purple-600 font-semibold text-sm mb-2">{member.role}</p>
                  <div className="mb-3">
                    <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium mr-2">
                      {member.category}
                    </span>
                    <span className="inline-block bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium">
                      {member.specialty}
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">{member.description}</p>
                  
                  {/* Social Links Display */}
                  {member.social_links && Object.values(member.social_links).some(link => link) && (
                    <div className="flex space-x-2 mb-4">
                      {member.social_links.instagram && (
                        <Instagram className="w-4 h-4 text-pink-500" />
                      )}
                      {member.social_links.youtube && (
                        <Youtube className="w-4 h-4 text-red-500" />
                      )}
                      {member.social_links.spotify && (
                        <Spotify className="w-4 h-4 text-green-500" />
                      )}
                    </div>
                  )}
                  
                  {member.achievements.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-medium text-gray-700 mb-2">
                        {member.achievements.length} Achievement{member.achievements.length !== 1 ? 's' : ''}
                      </p>
                      <div className="text-xs text-gray-500">
                        {member.achievements.slice(0, 2).map((achievement, index) => (
                          <div key={index} className="truncate">• {achievement}</div>
                        ))}
                        {member.achievements.length > 2 && (
                          <div>... and {member.achievements.length - 2} more</div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center">
                    <div className="flex space-x-1">
                      <button
                        type="button"
                        onClick={() => handleToggleEnabled(member.id)}
                        className={`p-1 rounded transition-colors ${
                          member.enabled 
                            ? 'bg-green-100 text-green-600' 
                            : 'bg-red-100 text-red-600'
                        } hover:bg-green-200`}
                        title={member.enabled ? 'Hide from public' : 'Show to public'}
                      >
                        {member.enabled ? <Eye size={14} /> : <EyeOff size={14} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleFeatured(member.id)}
                        className={`p-1 rounded transition-colors ${
                          member.is_featured 
                            ? 'bg-pink-100 text-pink-600' 
                            : 'bg-gray-100 text-gray-600'
                        } hover:bg-pink-200`}
                        title={member.is_featured ? 'Remove from featured' : 'Mark as featured'}
                      >
                        <Star size={14} className={member.is_featured ? 'fill-current' : ''} />
                      </button>
                    </div>
                    <div className="flex space-x-1">
                      <button
                        type="button"
                        onClick={() => startEditing(member)}
                        className="bg-blue-600 text-white p-1 rounded hover:bg-blue-500 transition-colors"
                        title="Edit band member"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(member.id)}
                        className="bg-red-600 text-white p-1 rounded hover:bg-red-500 transition-colors"
                        title="Delete band member"
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

      {/* No Band Members Message */}
      {bandMembers.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow-md">
          <Music size={64} className="mx-auto mb-4 text-gray-400" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">No Band Members Yet</h3>
          <p className="text-gray-500 mb-4">Start by adding your first band member</p>
          <button
            type="button"
            onClick={() => {
              setIsAdding(true);
              resetForm();
            }}
            className="bg-yellow-400 text-black px-6 py-2 rounded-lg hover:bg-yellow-300 transition-colors"
          >
            Add First Band Member
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="grid md:grid-cols-4 gap-6 text-center">
          <div>
            <div className="text-2xl font-bold text-purple-500 mb-1">{bandMembers.length}</div>
            <div className="text-gray-600 text-sm">Total Members</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-pink-500 mb-1">
              {bandMembers.filter(m => m.is_featured).length}
            </div>
            <div className="text-gray-600 text-sm">Featured Artists</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-500 mb-1">
              {bandMembers.filter(m => m.enabled).length}
            </div>
            <div className="text-gray-600 text-sm">Visible Members</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-500 mb-1">
              {bandMembers.reduce((total, m) => total + m.achievements.length, 0)}
            </div>
            <div className="text-gray-600 text-sm">Total Achievements</div>
          </div>
        </div>
      </div>
    </div>
  );
};