import React, { useState } from 'react';
import { Plus, Edit, Trash2, Save, X, Eye, EyeOff, Users, Flag, Droplet } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useSportsData } from '../../context/SportsContext';
import { ImageUpload } from '../ImageUpload';
import { useSavingProgress } from '../../context/SavingProgressContext';

const inputCls = 'w-full bg-white/[0.04] border border-white/10 rounded-xl py-2.5 px-3.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 focus:bg-white/[0.06] transition-all';
const labelCls = 'block text-[10px] font-black text-white/30 uppercase tracking-[0.15em] mb-2';
const selectCls = `${inputCls} appearance-none cursor-pointer [&>option]:bg-[#0a0a12] [&>option]:text-white`;

export const SportsTeamsAdmin: React.FC = () => {
  const savingProgress = useSavingProgress();
  const { sanitizeUrl } = useData() as any;
  const { 
    sportsSeasons,
    sportsTeams,
    addSportsTeam,
    updateSportsTeam,
    deleteSportsTeam
  } = useSportsData() as any;

  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('');
  
  const [isAdding, setIsAdding] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [showValidationErrors, setShowValidationErrors] = useState(false);

  const [form, setForm] = useState({
    sport_id: '',
    name: '',
    short_name: '',
    color: '#10b981',
    logo: '',
    owner_name: '',
    owner_image: '',
    points: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    nrr: 0, // Net Run Rate
  });

  const resetForm = () => {
    setForm({
      sport_id: selectedSeasonId || (sportsSeasons?.[0]?.id?.toString() || ''),
      name: '',
      short_name: '',
      color: '#10b981',
      logo: '',
      owner_name: '',
      owner_image: '',
      points: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      nrr: 0,
    });
    setShowValidationErrors(false);
  };

  const validateForm = () => {
    const missing = [];
    if (!form.sport_id) missing.push('sport_id');
    if (!form.name?.trim()) missing.push('name');
    if (!form.short_name?.trim()) missing.push('short_name');
    return missing;
  };

  const handleAdd = async () => {
    const missingFields = validateForm();
    if (missingFields.length > 0) { setShowValidationErrors(true); alert(`Please fill in required fields: ${missingFields.join(', ')}`); return; }
    try {
      const steps = savingProgress.withSteps(2, 'Preparing…');
      steps.next('Saving to database');
      await addSportsTeam(form);
      setIsAdding(false); resetForm();
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to add team. ${msg}`);
    } finally { savingProgress.done(); }
  };

  const handleUpdate = async (id: number) => {
    const missingFields = validateForm();
    if (missingFields.length > 0) { setShowValidationErrors(true); alert(`Please fill in required fields: ${missingFields.join(', ')}`); return; }
    try {
      const steps = savingProgress.withSteps(2, 'Preparing…');
      steps.next('Saving to database');
      await updateSportsTeam(id, form);
      setEditing(null); resetForm();
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to update team. ${msg}`);
    } finally { savingProgress.done(); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this team?')) return;
    try {
      const steps = savingProgress.withSteps(2, 'Preparing…');
      steps.next('Deleting');
      await deleteSportsTeam(id);
    } catch { alert('Failed to delete team.'); }
    finally { savingProgress.done(); }
  };

  const startEditing = (team: any) => {
    setForm({
      sport_id: team.sport_id?.toString() || '',
      name: team.name,
      short_name: team.short_name,
      color: team.color || '#10b981',
      logo: team.logo || '',
      owner_name: team.owner_name || '',
      owner_image: team.owner_image || '',
      points: team.points || 0,
      wins: team.wins || 0,
      losses: team.losses || 0,
      draws: team.draws || 0,
      nrr: team.nrr || 0,
    });
    setEditing(team.id); setShowValidationErrors(false);
  };

  if (!sportsSeasons || sportsSeasons.length === 0) {
     return <div className="text-white">Please create a sport season first.</div>;
  }

  // Effect to default select season
  React.useEffect(() => {
    if (!selectedSeasonId && sportsSeasons?.length > 0) {
      setSelectedSeasonId(sportsSeasons[0].id.toString());
    }
  }, [sportsSeasons, selectedSeasonId]);

  const filteredTeams = (sportsTeams || []).filter((t: any) => String(t.sport_id) === String(selectedSeasonId));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-6">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Sports Teams</h2>
          <p className="text-white/50 text-sm">Manage franchises and teams under a specific sport.</p>
        </div>
        
        <div className="flex gap-4 items-center">
            <select value={selectedSeasonId} onChange={e => setSelectedSeasonId(e.target.value)} className={`${selectCls} py-2 min-w-[200px]`}>
              {sportsSeasons.map((s: any) => <option key={s.id} value={s.id}>{s.name} ({s.season})</option>)}
            </select>
          {!isAdding && !editing && (
            <button onClick={() => { setIsAdding(true); resetForm(); }} className="px-4 py-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-xl text-sm font-semibold transition-colors flex items-center shadow-lg shadow-emerald-500/5 whitespace-nowrap">
              <Plus className="w-4 h-4 mr-2" /> Add Team
            </button>
          )}
        </div>
      </div>

      {(isAdding || editing !== null) && (
        <div className="bg-[#0a0a12] rounded-2xl p-6 md:p-8 border border-white/5 shadow-2xl relative overflow-hidden group">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-white flex items-center">
              {isAdding ? 'Add New Team' : 'Edit Team'}
            </h3>
            <button onClick={() => { setIsAdding(false); setEditing(null); }} className="p-2 text-white/50 hover:text-white hover:bg-white/5 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-6">
             <div className="col-span-1 md:col-span-2">
               <label className={labelCls}>Team Name *</label>
               <input type="text" value={form.name} onChange={r => setForm({...form, name: r.target.value})} className={inputCls} placeholder="e.g. Royal Challengers" />
             </div>
             <div className="col-span-1">
               <label className={labelCls}>Short Name *</label>
               <input type="text" value={form.short_name} onChange={r => setForm({...form, short_name: r.target.value})} className={inputCls} placeholder="e.g. RCB" />
             </div>
             <div className="col-span-1">
               <label className={labelCls}>Theme Color</label>
               <div className="flex gap-2">
                 <input type="color" value={form.color} onChange={r => setForm({...form, color: r.target.value})} className="h-10 w-12 rounded bg-white/5 border border-white/10 cursor-pointer" />
                 <input type="text" value={form.color} onChange={r => setForm({...form, color: r.target.value})} className={inputCls} />
               </div>
             </div>

             <div className="col-span-1 md:col-span-2">
               <label className={labelCls}>Team Logo (Optional)</label>
               <ImageUpload
                  currentImage={form.logo}
                  onImageSelect={(url) => setForm({ ...form, logo: url })}
                  bucket="sports-images"
                  folder="teams/logos"
                  cropAspect={1}
               />
             </div>
             
             <div className="col-span-1 md:col-span-2">
               <label className={labelCls}>Owner Image (Optional)</label>
               <ImageUpload
                  currentImage={form.owner_image}
                  onImageSelect={(url) => setForm({ ...form, owner_image: url })}
                  bucket="sports-images"
                  folder="teams/owners"
                  cropAspect={1}
               />
             </div>

             <div className="col-span-1 md:col-span-4 border-t border-white/10 pt-6"></div>

             <div className="col-span-1 md:col-span-2">
               <label className={labelCls}>Owner Name / Alias</label>
               <input type="text" value={form.owner_name} onChange={r => setForm({...form, owner_name: r.target.value})} className={inputCls} />
             </div>

             <div className="col-span-1 md:col-span-4 mt-4 text-white/50 text-sm font-mono tracking-widest uppercase">
                Standings & Points (Override manually if needed)
             </div>

             <div className="col-span-1">
               <label className={labelCls}>Points</label>
               <input type="number" value={form.points} onChange={r => setForm({...form, points: parseFloat(r.target.value)||0})} className={inputCls} />
             </div>
             <div className="col-span-1">
               <label className={labelCls}>Wins / Losses / Draws</label>
               <div className="grid grid-cols-3 gap-2">
                  <input type="number" placeholder="W" value={form.wins} onChange={r => setForm({...form, wins: parseInt(r.target.value)||0})} className={inputCls} />
                  <input type="number" placeholder="L" value={form.losses} onChange={r => setForm({...form, losses: parseInt(r.target.value)||0})} className={inputCls} />
                  <input type="number" placeholder="D" value={form.draws} onChange={r => setForm({...form, draws: parseInt(r.target.value)||0})} className={inputCls} />
               </div>
             </div>
             <div className="col-span-1">
               <label className={labelCls}>Nett Run Rate (NRR)</label>
               <input type="number" step="0.001" value={form.nrr} onChange={r => setForm({...form, nrr: parseFloat(r.target.value)||0})} className={inputCls} />
             </div>
          </div>

          <div className="mt-8 flex justify-end gap-4">
            <button onClick={() => { setIsAdding(false); setEditing(null); }} className="px-6 py-2.5 text-sm font-semibold text-white/50 hover:text-white transition-colors">Cancel</button>
            <button onClick={isAdding ? handleAdd : () => handleUpdate(editing!)} className="px-6 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-bold hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 active:scale-95 flex items-center">
              <Save className="w-4 h-4 mr-2" /> {isAdding ? 'Save Team' : 'Update Team'}
            </button>
          </div>
        </div>
      )}

      {/* Grid of existing teams */}
      {!isAdding && editing === null && (
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredTeams.map((team: any) => (
               <div key={team.id} className="bg-[#0a0a12] border border-white/5 rounded-2xl overflow-hidden hover:border-white/10 transition-all" style={{ borderTopWidth: '4px', borderTopColor: team.color }}>
                 <div className="p-4 flex gap-4 items-center">
                    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                       {team.logo ? <img src={sanitizeUrl(team.logo)} className="w-full h-full object-cover rounded-xl" alt="logo" /> : <Flag className="w-5 h-5 text-white/30" />}
                    </div>
                    <div className="flex-1 min-w-0">
                       <h4 className="font-bold text-white truncate text-base">{team.name}</h4>
                       <span className="text-xs text-white/50 font-mono">{team.short_name}</span>
                    </div>
                 </div>
                 
                 <div className="px-4 pb-4 border-t border-white/5 pt-3 mt-2 flex justify-between items-center bg-white/[0.01]">
                    <div className="text-xs text-white/50 flex gap-3">
                       <span><strong className="text-white">{team.points}</strong> Pts</span>
                       <span><strong className="text-white">{team.wins}</strong> W</span>
                    </div>
                    
                    <div className="flex gap-1">
                      <button onClick={() => startEditing(team)} className="p-1.5 hover:bg-white/10 text-white/50 hover:text-white rounded-md transition-colors"><Edit className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDelete(team.id)} className="p-1.5 hover:bg-red-500/20 text-white/50 hover:text-red-400 rounded-md transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                 </div>
               </div>
            ))}
            {filteredTeams.length === 0 && (
               <div className="col-span-full text-center py-10 bg-white/5 rounded-2xl border border-dashed border-white/10 text-white/50">
                  No teams found for this season. Start by adding one.
               </div>
            )}
         </div>
      )}
    </div>
  );
};
