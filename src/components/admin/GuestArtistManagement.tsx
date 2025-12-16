import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Star, 
  Eye, 
  EyeOff, 
  Music, 
  Play, 
  Instagram, 
  Youtube, 
  AlignJustify as Spotify, 
  X
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useSavingProgress } from '../../context/SavingProgressContext';
import { useApprovals } from '../../hooks/useApprovals';
import { GuestArtistForm } from './GuestArtistForm';

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
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCloseModal = () => {
    if (isSubmitting) return;
    setIsAdding(false);
    setEditingId(null);
  };

  const handleSave = async (data: any) => {
    try {
      setIsSubmitting(true);
      const steps = savingProgress.withSteps(2, 'Preparing…');
      steps.next('Saving to database');
      
      const isEdit = editingId !== null;
      const action = isEdit ? 'update' : 'create';
      
      if (requiresApproval) {
        await submitForApproval(
          'guest_artist',
          action as any,
          data,
          isEdit ? editingId : undefined
        );
        alert('Request submitted for approval. An owner will review your changes.');
      } else {
        if (isEdit && editingId) {
          await updateGuestArtist(editingId, data);
        } else {
          await addGuestArtist(data);
        }
      }
      
      handleCloseModal();
    } catch (error) {
      console.error('Error saving guest artist:', error);
      const msg = (error as any)?.message || String(error);
      alert(`Failed to save guest artist. ${msg}`);
    } finally {
      savingProgress.done();
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this guest artist? This action cannot be undone.')) {
      try {
        const steps = savingProgress.withSteps(2, 'Preparing…');
        steps.next('Deleting');
        if (requiresApproval) {
          await submitForApproval('guest_artist', 'delete', {}, id);
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
      alert('Failed to update status.');
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
      alert('Failed to update featured status.');
    } finally {
      savingProgress.done();
    }
  };

  // Sort guest artists by order position
  const sortedGuestArtists = [...guestArtists].sort((a, b) => a.order_position - b.order_position);
  const editingArtist = editingId ? guestArtists.find(a => a.id === editingId) : null;

  return (
    <div className="space-y-6 relative">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Guest Artist Management</h2>
          <p className="text-gray-600">Manage featured guest artists for the homepage</p>
        </div>
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="bg-yellow-400 text-black px-4 py-2 rounded-lg hover:bg-yellow-300 transition-colors flex items-center shadow-sm"
        >
          <Plus size={16} className="mr-2" />
          Add Guest Artist
        </button>
      </div>

      {/* Guest Artists List */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedGuestArtists.map((artist) => (
          <div key={artist.id} className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col h-full hover:shadow-lg transition-shadow">
            <div className="relative h-48 md:h-56 group">
              <img
                src={artist.image}
                alt={artist.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute top-0 left-0 w-full h-full bg-black/0 group-hover:bg-black/10 transition-colors" />
              
              <div className="absolute top-2 left-2 flex space-x-1">
                {artist.is_featured && (
                  <span className="bg-yellow-400 text-black p-1 rounded-full shadow-sm" title="Featured on Homepage">
                    <Star size={14} fill="black" />
                  </span>
                )}
                {!artist.enabled && (
                  <span className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-medium shadow-sm">
                    Hidden
                  </span>
                )}
              </div>
              <div className="absolute top-2 right-2">
                <span className="bg-black/70 text-white px-2 py-1 rounded text-xs backdrop-blur-sm">
                  #{artist.order_position}
                </span>
              </div>
              {(artist.video || (artist as any).video_url) && (
                <div className="absolute bottom-2 right-2">
                   <div className="bg-black/60 text-white p-1.5 rounded-full backdrop-blur-sm">
                      <Play size={16} fill="white" />
                   </div>
                </div>
              )}
            </div>
            
            <div className="p-5 flex-1 flex flex-col">
              <div className="flex justify-between items-start mb-1">
                 <h3 className="font-bold text-lg text-gray-900 line-clamp-1" title={artist.name}>{artist.name}</h3>
              </div>
              <p className="text-purple-600 font-medium text-sm mb-2">{artist.title}</p>
              
              <div className="mb-3">
                <span className="inline-block bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-medium">
                  {artist.specialty}
                </span>
              </div>
              
              <p className="text-gray-500 text-sm mb-4 line-clamp-2 flex-1">{artist.description}</p>
              
              {/* Social Links Icons */}
              {(artist.social_links as any) && (
                <div className="flex space-x-3 mb-4 pt-4 border-t border-gray-100">
                  {(artist.social_links as any).instagram && (
                    <a href={(artist.social_links as any).instagram} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-pink-600 transition-colors p-1">
                      <Instagram size={18} />
                    </a>
                  )}
                  {(artist.social_links as any).youtube && (
                    <a href={(artist.social_links as any).youtube} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-red-600 transition-colors p-1">
                      <Youtube size={18} />
                    </a>
                  )}
                  {(artist.social_links as any).spotify && (
                    <a href={(artist.social_links as any).spotify} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-green-600 transition-colors p-1">
                      <Spotify size={18} />
                    </a>
                  )}
                  {!Object.values(artist.social_links || {}).some(Boolean) && (
                     <span className="text-xs text-gray-300 italic">No social links</span>
                  )}
                </div>
              )}
              
              <div className="flex justify-between items-center gap-2 mt-auto">
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => handleToggleEnabled(artist.id)}
                    className={`p-3 rounded-md transition-colors ${
                      artist.enabled 
                        ? 'text-green-600 hover:bg-green-50' 
                        : 'text-gray-400 hover:bg-gray-100'
                    }`}
                    title={artist.enabled ? 'Hide from public' : 'Show to public'}
                  >
                    {artist.enabled ? <Eye size={20} /> : <EyeOff size={20} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleFeatured(artist.id)}
                    className={`p-3 rounded-md transition-colors ${
                      artist.is_featured 
                        ? 'text-yellow-500 hover:bg-yellow-50' 
                        : 'text-gray-400 hover:bg-gray-100'
                    }`}
                    title={artist.is_featured ? 'Remove from featured' : 'Mark as featured'}
                  >
                    <Star size={20} fill={artist.is_featured ? "currentColor" : "none"} />
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingId(artist.id)}
                    className="flex items-center px-4 py-2 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors text-sm font-medium"
                  >
                    <Edit size={16} className="mr-1.5" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(artist.id)}
                    className="p-3 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                    title="Delete guest artist"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {guestArtists.length === 0 && (
        <div className="text-center py-16 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
          <Music size={48} className="mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No Guest Artists Yet</h3>
          <p className="text-gray-500 mb-6">Start by adding your first guest artist to the lineup.</p>
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="bg-yellow-400 text-black px-6 py-2.5 rounded-lg hover:bg-yellow-300 transition-colors font-medium inline-flex items-center"
          >
            <Plus size={18} className="mr-2" />
            Add Guest Artist
          </button>
        </div>
      )}

      {/* Modal Overlay */}
      {(isAdding || editingId) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-xl font-bold text-gray-800">
                {isAdding ? 'Add New Guest Artist' : 'Edit Guest Artist'}
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-200"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-auto min-h-0 bg-gray-50/50">
               <div className="h-full p-4 overflow-hidden flex flex-col">
                  {/* Reuse the GuestArtistForm inside the modal content area */}
                  <GuestArtistForm
                    initialData={editingArtist}
                    onSubmit={handleSave}
                    onCancel={handleCloseModal}
                    isSubmitting={isSubmitting}
                  />
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};