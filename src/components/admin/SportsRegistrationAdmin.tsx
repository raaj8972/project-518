import React, { useState, useMemo, useEffect } from 'react';
import { Download, Check, X, Filter, Search, Shield, Info, Eye, Trash2, FileText, Pencil, Loader2, BookOpen } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useSportsData } from '../../context/SportsContext';
import { useSavingProgress } from '../../context/SavingProgressContext';
import { useData } from '../../context/DataContext';
import { useRegistrationMutations } from '../../hooks/useRegistrationMutations';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';

const inputCls = 'w-full bg-white/[0.04] border border-white/10 rounded-xl py-2 px-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all';
const selectCls = `${inputCls} appearance-none cursor-pointer [&>option]:bg-[#0a0a12] [&>option]:text-white`;

const EditableBatch = ({ 
  registration, 
  options, 
  onSave 
}: { 
  registration: any; 
  options: string[]; 
  onSave: (email: string, newBatch: string) => Promise<void> 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(registration.participant_type || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (tempValue.trim() === (registration.participant_type || '').trim()) {
      setIsEditing(false);
      return;
    }
    if (!registration.email) {
      toast.error('Email not found for registration');
      return;
    }
    setSaving(true);
    try {
      await onSave(registration.email, tempValue);
      registration.participant_type = tempValue; // Optimistic update
      setIsEditing(false);
    } catch (e) {
      console.error('Save failed', e);
    } finally {
      setSaving(false);
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1 mt-1" onClick={e => e.stopPropagation()}>
        <select
          value={tempValue}
          onChange={e => setTempValue(e.target.value)}
          className="bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-[10px] text-white outline-none focus:border-emerald-500/50"
        >
          {options.map(opt => <option key={opt} value={opt} className="bg-gray-900">{opt}</option>)}
        </select>
        <button onClick={handleSave} disabled={saving} className="text-emerald-400 hover:text-emerald-300 p-0.5" title="Save">
          {saving ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />}
        </button>
        <button onClick={() => { setIsEditing(false); setTempValue(registration.participant_type || ''); }} className="text-rose-400 hover:text-rose-300 p-0.5" title="Cancel">
          <X size={10} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 mt-1 group/batch cursor-pointer" onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}>
      <span className="text-[10px] font-bold text-emerald-300 tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">{registration.participant_type || 'No Batch'}</span>
      <button className="opacity-0 group-hover/batch:opacity-100 text-gray-500 hover:text-emerald-400 transition-opacity p-0.5 bg-white/5 rounded">
        <Pencil size={10} />
      </button>
    </div>
  );
};

export const SportsRegistrationAdmin: React.FC = () => {
  const savingProgress = useSavingProgress();
  const { 
    sportsSeasons,
    sportsRegistrations,
    updateSportsRegistration,
    addSportsPlayer,
  } = useSportsData() as any;

  const { siteSettings } = useData();
  const { updateBatchGlobally } = useRegistrationMutations();

  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('all'); // all, pending, approved, rejected
  const [batchFilter, setBatchFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'player' | 'owner'>('player');
  const [viewPhotoModal, setViewPhotoModal] = useState<{ url: string, name: string } | null>(null);

  const batchOptions = React.useMemo(() => {
    const fromSettings = (siteSettings as any)?.registration_participant_types || [];
    const fromRegs = Array.from(new Set(sportsRegistrations.map((r: any) => r.participant_type).filter(Boolean)));
    return Array.from(new Set([...fromSettings, ...fromRegs])).sort() as string[];
  }, [siteSettings, sportsRegistrations]);

  // Effect to default select season
  React.useEffect(() => {
    if (!selectedSeasonId && sportsSeasons?.length > 0) {
      setSelectedSeasonId(sportsSeasons[0].id.toString());
    }
  }, [sportsSeasons, selectedSeasonId]);

  if (!sportsSeasons || sportsSeasons.length === 0) {
     return <div className="text-white">Please create a sport season first.</div>;
  }

  const currentSeasonRegistrations = (sportsRegistrations || []).filter((r: any) => String(r.sport_id) === String(selectedSeasonId));
  
  const filteredRegistrations = currentSeasonRegistrations.filter((r: any) => {
    // Determine if it's owner or player
    const isOwner = r.metadata?.participant_type === 'owner';
    const isPlayer = r.metadata?.participant_type === 'player' || !r.metadata?.participant_type;
    
    if (viewMode === 'owner' && !isOwner) return false;
    if (viewMode === 'player' && !isPlayer) return false;

    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (batchFilter !== 'all' && r.participant_type !== batchFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return r.name.toLowerCase().includes(q) || (r.email && r.email.toLowerCase().includes(q)) || (r.phone && r.phone.includes(q));
    }
    return true;
  }).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const handleUpdateStatus = async (id: number, status: 'approved' | 'rejected') => {
    try {
      const steps = savingProgress.withSteps(2, 'Updating Status');
      steps.next('Saving to database');
      await updateSportsRegistration(id, { status });

      // If approved, auto-add them to sports_players for auction pool
      if (status === 'approved') {
         const reg = sportsRegistrations.find((r: any) => r.id === id);
         
         // Only auto-add players, not owners
         if (reg && (!reg.metadata?.participant_type || reg.metadata?.participant_type === 'player')) {
            const currentSeason = sportsSeasons.find((s: any) => String(s.id) === String(reg.sport_id));
            const defaultBasePrice = currentSeason?.player_fee || 0; // Use season fee as default base price if reasonable, or just 0
            
            await addSportsPlayer({
               sport_id: reg.sport_id,
               name: reg.name,
               image: reg.photo_url || reg.metadata?.photo_url || '',
               position: reg.position_preference || 'Player',
               role: 'player', // default role
               category: 'emerging', // default category
               base_price: defaultBasePrice, // Admin can set a custom base price later
               status: 'available',
               is_motm_count: 0,
               enabled: true
            });
         }
      }
    } catch (err) {
      alert('Failed to update status');
    } finally {
      savingProgress.done();
    }
  };
  
  const handleDeletePhoto = async (reg: any) => {
    const photoUrl = reg.photo_url || reg.metadata?.photo_url;
    if (!photoUrl) return;
    if (!confirm('Are you sure you want to delete this photo from the backend?')) return;
    
    try {
      const steps = savingProgress.withSteps(2, 'Deleting Photo');
      steps.next('Removing from storage');
      
      // Extract filename from URL
      const url = new URL(photoUrl);
      const pathParts = url.pathname.split('/');
      const fileName = pathParts[pathParts.length - 1];
      
      const { error: storageError } = await supabase.storage
        .from('registration-photos')
        .remove([fileName]);
        
      if (storageError) throw storageError;
      
      steps.next('Updating registration');
      await updateSportsRegistration(reg.id, { 
        photo_url: null,
        metadata: { ...(reg.metadata || {}), photo_url: null }
      });
      
      alert('Photo deleted successfully');
    } catch (err) {
      console.error('Delete photo failed:', err);
      alert('Failed to delete photo from backend.');
    } finally {
      savingProgress.done();
    }
  };

  const exportPDF = async () => {
    try {
      const steps = savingProgress.withSteps(2, 'Generating PDF');
      steps.next('Loading photos...');

      const doc = new jsPDF();
      const season = sportsSeasons.find((s: any) => String(s.id) === String(selectedSeasonId));
      
      doc.setFontSize(18);
      doc.text(`${season?.name || 'Sports'} - ${viewMode === 'owner' ? 'Owner' : 'Player'} Registrations`, 14, 20);
      
      doc.setFontSize(11);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 28);

      // Pre-load images as base64 JPEG
      const loadedImages: Record<string, string> = {};
      await Promise.all(
        filteredRegistrations.map(async (r: any) => {
          const photoUrl = r.photo_url || r.metadata?.photo_url;
          if (photoUrl && !photoUrl.toLowerCase().endsWith('.pdf')) {
             try {
               const img = new Image();
               img.crossOrigin = 'Anonymous';
               await new Promise((resolve) => {
                 img.onload = () => {
                   try {
                     const canvas = document.createElement('canvas');
                     canvas.width = img.width;
                     canvas.height = img.height;
                     const ctx = canvas.getContext('2d');
                     if (ctx) {
                       ctx.drawImage(img, 0, 0);
                       loadedImages[r.id] = canvas.toDataURL('image/jpeg', 0.8);
                     }
                   } catch (e) {
                     console.error('Canvas conversion failed for PDF:', e);
                   }
                   resolve(null);
                 };
                 img.onerror = () => resolve(null); // resolve to not break promise all
                 img.src = photoUrl;
               });
             } catch (e) {
               console.error('Failed to load image for PDF:', photoUrl);
             }
          }
        })
      );

      steps.next('Creating document...');

      const tableData = filteredRegistrations.map((r: any) => {
        const photoUrl = r.photo_url || r.metadata?.photo_url;
        const hasImg = !!loadedImages[r.id];
        const isPdf = photoUrl?.toLowerCase().endsWith('.pdf');
        
        return [
          r.name,
          r.year_or_class,
          r.position_preference,
          r.experience,
          r.phone,
          r.status.toUpperCase(),
          hasImg ? '' : (isPdf ? 'PDF' : (photoUrl ? 'Link' : 'N/A'))
        ];
      });

      autoTable(doc, {
        startY: 35,
        head: [['Name', 'Year/Class', 'Position', 'Experience', 'Phone', 'Status', 'Photo']],
        body: tableData,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2, valign: 'middle' },
        headStyles: { fillColor: [16, 185, 129] }, // emerald-500
        columnStyles: {
          6: { minCellWidth: 15, halign: 'center' }
        },
        didParseCell: (data: any) => {
          if (data.column.index === 6 && data.section === 'body') {
            const rowIndex = data.row.index;
            const reg = filteredRegistrations[rowIndex];
            if (reg?.id && loadedImages[reg.id]) {
              data.cell.styles.minCellHeight = 18; // correctly enforce row height
            }
          }
        },
        didDrawCell: (data: any) => {
          if (data.column.index === 6 && data.section === 'body') {
            const rowIndex = data.row.index;
            const reg = filteredRegistrations[rowIndex];
            if (!reg?.id) return;
            const imgData = loadedImages[reg.id];
            if (imgData) {
              const dim = 14; // 14x14 mm image
              const x = data.cell.x + (data.cell.width - dim) / 2;
              const y = data.cell.y + (data.cell.height - dim) / 2;
              doc.addImage(imgData, 'JPEG', x, y, dim, dim);
            }
          }
        }
      });

      doc.save(`${season?.name || 'sports'}_${viewMode}_registrations.pdf`);
    } catch (err: any) {
      console.error('PDF export failed', err);
      alert(`Failed to generate PDF: ${err.message || err.toString()}`);
    } finally {
      savingProgress.done();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-white/10 pb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Shield className="text-emerald-500" size={20} />
            Sports Registrations
          </h2>
          
          {/* View Mode Switching */}
          <div className="flex bg-white/5 rounded-lg p-1 border border-white/10">
            <button
              onClick={() => setViewMode('player')}
              className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'player' ? 'bg-emerald-500 text-black' : 'text-white/50 hover:text-white'}`}
            >
              PLAYERS
            </button>
            <button
              onClick={() => setViewMode('owner')}
              className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'owner' ? 'bg-emerald-500 text-black' : 'text-white/50 hover:text-white'}`}
            >
              OWNERS
            </button>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-3 items-center w-full md:w-auto">
          <button onClick={exportPDF} disabled={filteredRegistrations.length === 0} className="px-4 py-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-sm font-semibold transition-colors flex items-center shrink-0">
            <Download className="w-4 h-4 mr-2" /> Export PDF
          </button>
        </div>
      </div>
      
      <div className="flex flex-col md:flex-row gap-4 bg-[#0a0a12] p-4 rounded-xl border border-white/5 mb-6">
         <div className="flex-1 relative">
            <Search className="w-4 h-4 text-white/30 absolute left-3 top-1/2 -translate-y-1/2" />
            <input type="text" placeholder="Search by name, email, phone..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className={`${inputCls} pl-9`} />
         </div>
         <div className="w-full md:w-48">
            <select value={selectedSeasonId} onChange={e => setSelectedSeasonId(e.target.value)} className={selectCls}>
              {sportsSeasons.map((s: any) => <option key={s.id} value={s.id}>{s.name} ({s.season})</option>)}
            </select>
         </div>
         <div className="w-full md:w-40 relative">
            <Filter className="w-4 h-4 text-white/30 absolute left-3 top-1/2 -translate-y-1/2 z-10" />
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={`${selectCls} pl-9`}>
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
         </div>
         <div className="w-full md:w-32 relative">
            <BookOpen className="w-4 h-4 text-white/30 absolute left-3 top-1/2 -translate-y-1/2 z-10" />
            <select value={batchFilter} onChange={e => setBatchFilter(e.target.value)} className={`${selectCls} pl-9`}>
              <option value="all">All Batches</option>
              {batchOptions.map(opt => <option key={opt} value={opt} className="bg-gray-900">{opt}</option>)}
            </select>
         </div>
      </div>

      {/* Group Quota Overview */}
      {(() => {
        const season = sportsSeasons.find((s: any) => String(s.id) === String(selectedSeasonId));
        if (!season?.group_limits) return null;
        
        const { field_name, limits } = season.group_limits;
        return (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
            {Object.entries(limits).map(([val, limit]) => {
              const numLimit = limit as number;
              const count = currentSeasonRegistrations.filter((r: any) => 
                r.status !== 'rejected' && 
                (r[field_name] === val || r.metadata?.[field_name] === val || (field_name === 'year' && r.year_or_class === val))
              ).length;
              const isFull = count >= numLimit;
              
              return (
                <div key={val} className={`p-3 rounded-xl border ${isFull ? 'bg-red-500/10 border-red-500/20' : 'bg-emerald-500/5 border-emerald-500/10'} backdrop-blur-sm`}>
                  <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1">{val}</div>
                  <div className="flex items-end justify-between">
                    <div className="text-xl font-black text-white">{count}<span className="text-sm text-white/30 font-normal ml-1">/ {numLimit}</span></div>
                    {isFull && <div className="text-[8px] font-black text-red-500 uppercase tracking-tighter mb-1">FULL</div>}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}

      <div className="bg-[#0a0a12] rounded-2xl border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02]">
                <th className="p-4 text-xs font-semibold text-white/50 uppercase tracking-wider">Player</th>
                <th className="p-4 text-xs font-semibold text-white/50 uppercase tracking-wider">Contact</th>
                <th className="p-4 text-xs font-semibold text-white/50 uppercase tracking-wider">Details</th>
                <th className="p-4 text-xs font-semibold text-white/50 uppercase tracking-wider">Status</th>
                <th className="p-4 text-xs font-semibold text-white/50 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredRegistrations.map((reg: any) => (
                <tr key={reg.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="p-4">
                    <div className="font-bold text-white text-sm">{reg.name}</div>
                    <div className="text-xs text-white/50">{reg.year_or_class}</div>
                    <EditableBatch registration={reg} options={batchOptions} onSave={updateBatchGlobally} />
                  </td>
                  <td className="p-4">
                    <div className="text-sm text-white/80">{reg.email}</div>
                    <div className="text-xs text-white/50">{reg.phone}</div>
                  </td>
                   <td className="p-4">
                     <div className="flex items-center gap-2 mb-1">
                        <div className="text-xs text-emerald-400 font-mono">{reg.position_preference}</div>
                        {(reg.photo_url || reg.metadata?.photo_url) && (
                          <div className="flex items-center gap-1.5 ml-auto">
                            {(reg.photo_url || reg.metadata?.photo_url).toLowerCase().endsWith('.pdf') ? (
                              <a 
                                href={reg.photo_url || reg.metadata?.photo_url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                title="View/Download PDF"
                                className="p-1 hover:bg-emerald-500/20 text-emerald-400/50 hover:text-emerald-400 rounded transition-colors"
                              >
                                <FileText size={14} />
                              </a>
                            ) : (
                              <button 
                                onClick={(e) => {
                                  e.preventDefault();
                                  setViewPhotoModal({ 
                                    url: reg.photo_url || reg.metadata?.photo_url, 
                                    name: reg.name 
                                  });
                                }}
                                title="View Photo"
                                className="p-1 hover:bg-emerald-500/20 text-emerald-400/50 hover:text-emerald-400 rounded transition-colors"
                              >
                                <Eye size={14} />
                              </button>
                            )}
                            <button 
                              onClick={() => handleDeletePhoto(reg)}
                              title="Delete Photo from Backend"
                              className="p-1 hover:bg-rose-500/20 text-rose-400/50 hover:text-rose-400 rounded transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                     </div>
                     <div className="text-xs text-white/60 line-clamp-1 max-w-[200px]" title={reg.experience}>{reg.experience}</div>
                   </td>
                  <td className="p-4">
                    <span className={`inline-flex px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                      reg.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' :
                      reg.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                      'bg-orange-500/20 text-orange-400'
                    }`}>
                      {reg.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex justify-end gap-2">
                      {reg.status !== 'approved' && (
                        <button onClick={() => handleUpdateStatus(reg.id, 'approved')} title="Approve & Add to Auction Pool" className="p-1.5 hover:bg-emerald-500/20 text-emerald-400/50 hover:text-emerald-400 rounded-lg transition-colors">
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      {reg.status !== 'rejected' && (
                        <button onClick={() => handleUpdateStatus(reg.id, 'rejected')} title="Reject" className="p-1.5 hover:bg-red-500/20 text-red-400/50 hover:text-red-400 rounded-lg transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredRegistrations.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-white/50">
                    <Shield className="w-12 h-12 mx-auto mb-4 text-white/10" />
                    <p>No registrations found matching your filters.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="bg-emerald-900/10 border border-emerald-500/10 rounded-xl p-4 flex gap-4 text-emerald-400/80 text-sm">
         <Info className="w-5 h-5 shrink-0" />
         <p>Approving a player automatically adds them to the selected Sport's Auction Pool as "available". You can then set their base price and stats in the Auction Admin panel.</p>
      </div>

      {/* Photo View Modal */}
      {viewPhotoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setViewPhotoModal(null)}>
          <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center justify-center p-4" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setViewPhotoModal(null)}
              className="absolute top-0 right-0 p-2 text-white/50 hover:text-white bg-black/50 hover:bg-black/80 rounded-full transition-all"
            >
              <X size={24} />
            </button>
            <img 
              src={viewPhotoModal.url} 
              alt={`Photo of ${viewPhotoModal.name}`} 
              className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl border border-white/10"
            />
            <div className="mt-4 text-xl font-bold text-white tracking-wide">
              {viewPhotoModal.name}
            </div>
            <a 
              href={viewPhotoModal.url} 
              download 
              target="_blank" 
              rel="noopener noreferrer"
              className="mt-3 flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors text-sm font-medium"
            >
              <Download size={16} /> Download Source
            </a>
          </div>
        </div>
      )}
    </div>
  );
};
