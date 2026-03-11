import React, { useState } from 'react';
import { Gavel, Users, Search, Edit, Trash2, Save, X, Plus, Check } from 'lucide-react';
import { useSportsData } from '../../context/SportsContext';
import { useSavingProgress } from '../../context/SavingProgressContext';
import { ImageUpload } from '../ImageUpload';

const inputCls = 'w-full bg-white/[0.04] border border-white/10 rounded-xl py-2 px-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 transition-all';
const labelCls = 'block text-[10px] font-black text-white/30 uppercase tracking-[0.15em] mb-2';
const selectCls = `${inputCls} appearance-none cursor-pointer [&>option]:bg-[#0a0a12] [&>option]:text-white`;

export const SportsAuctionAdmin: React.FC = () => {
  const savingProgress = useSavingProgress();
  const { 
    sportsSeasons,
    sportsTeams,
    sportsPlayers,
    addSportsPlayer,
    updateSportsPlayer,
    deleteSportsPlayer,
  } = useSportsData() as any;

  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('all'); // all, available, sold, unsold, retained
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isAdding, setIsAdding] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  
  const [form, setForm] = useState({
    sport_id: '',
    team_id: '', // optional, required if sold/retained
    name: '',
    image: '',
    role: 'player', // player, captain, vice_captain
    position: '',
    category: 'emerging', // gold, silver, bronze, emerging
    base_price: 10,
    sold_price: 0,
    sold_day: 1, // which day of the auction
    status: 'available', // available, sold, unsold, retained
    is_motm_count: 0
  });

  // Effect to default select season
  React.useEffect(() => {
    if (!selectedSeasonId && sportsSeasons?.length > 0) {
      setSelectedSeasonId(sportsSeasons[0].id.toString());
    }
  }, [sportsSeasons, selectedSeasonId]);

  if (!sportsSeasons || sportsSeasons.length === 0) {
     return <div className="text-white">Please create a sport season first.</div>;
  }

  const currentTeams = (sportsTeams || []).filter((t: any) => String(t.sport_id) === String(selectedSeasonId));
  const currentAuctionPool = (sportsPlayers || []).filter((p: any) => String(p.sport_id) === String(selectedSeasonId));
  const currentSeason = sportsSeasons.find((s: any) => String(s.id) === String(selectedSeasonId));
  const maxAuctionDays = currentSeason?.auction_days || 1;
  
  const filteredPlayers = currentAuctionPool.filter((p: any) => {
    if (filterStatus !== 'all' && p.status !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.position.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
    }
    return true;
  }).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const resetForm = () => {
    setForm({
      sport_id: selectedSeasonId || '',
      team_id: '',
      name: '',
      image: '',
      role: 'player',
      position: '',
      category: 'emerging',
      base_price: 10,
      sold_price: 0,
      sold_day: 1,
      status: 'available',
      is_motm_count: 0
    });
  };

  const handleAdd = async () => {
    if (!form.name || !form.sport_id) return alert('Name and Sport required');
    try {
      const steps = savingProgress.withSteps(2, 'Saving Player');
      steps.next('To database');
      await addSportsPlayer(form);
      setIsAdding(false); resetForm();
    } catch { alert('Failed to add player'); }
    finally { savingProgress.done(); }
  };

  const handleUpdate = async (id: number) => {
    try {
      const steps = savingProgress.withSteps(2, 'Updating Player');
      steps.next('To database');
      const payload = { ...form };
      // if marked as available/unsold, scrub team, sold_price, and sold_day
      if (payload.status === 'available' || payload.status === 'unsold') {
         payload.team_id = null as any;
         payload.sold_price = 0;
         payload.sold_day = null as any;
      }
      // However if it's sold/retained, ensure team is selected
      if ((payload.status === 'sold' || payload.status === 'retained') && !payload.team_id) {
         alert('Please select a team if the player is sold or retained.');
         savingProgress.done();
         return;
      }

      await updateSportsPlayer(id, payload);
      setEditing(null); resetForm();
    } catch { alert('Failed to update player'); }
    finally { savingProgress.done(); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete player from auction pool?')) return;
    try {
      await deleteSportsPlayer(id);
    } catch { alert('Failed to delete'); }
  };

  const startEditing = (p: any) => {
    setForm({
      sport_id: p.sport_id?.toString() || '',
      team_id: p.team_id?.toString() || '',
      name: p.name,
      image: p.image || '',
      role: p.role || 'player',
      position: p.position || '',
      category: p.category || 'emerging',
      base_price: p.base_price || 0,
      sold_price: p.sold_price || 0,
      sold_day: p.sold_day || 1,
      status: p.status || 'available',
      is_motm_count: p.is_motm_count || 0
    });
    setEditing(p.id);
  };

  // Quick action function to instantly mark player sold
  const quickMarkSold = async (playerId: number, t_id: string, s_price: number, s_day: number) => {
     if (!t_id || s_price <= 0) return alert('Select team and enter valid price bigger than 0');
     try {
       await updateSportsPlayer(playerId, { status: 'sold', team_id: t_id, sold_price: s_price, sold_day: s_day });
     } catch { alert('Failed to mark sold'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-white/10 pb-6">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Auction Controller</h2>
          <p className="text-white/50 text-sm">Manage auction pool, edit player details, and conduct the live auction.</p>
        </div>
        
        <div className="flex flex-wrap gap-3 items-center w-full md:w-auto">
          <select value={selectedSeasonId} onChange={e => setSelectedSeasonId(e.target.value)} className={`${selectCls} py-2 min-w-[200px]`}>
            {sportsSeasons.map((s: any) => <option key={s.id} value={s.id}>{s.name} ({s.season})</option>)}
          </select>
          {!isAdding && !editing && (
            <button onClick={() => { setIsAdding(true); resetForm(); }} className="px-4 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-xl text-sm font-semibold transition-colors flex items-center shrink-0">
              <Plus className="w-4 h-4 mr-2" /> Add Player
            </button>
          )}
        </div>
      </div>

      {(isAdding || editing !== null) && (
        <div className="bg-[#0a0a12] rounded-2xl p-6 md:p-8 border border-white/5 shadow-2xl relative overflow-hidden group mb-6">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-white flex items-center">
              {isAdding ? 'Add Player to Pool' : 'Edit Player Details'}
            </h3>
            <button onClick={() => { setIsAdding(false); setEditing(null); }} className="p-2 text-white/50 hover:text-white hover:bg-white/5 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="col-span-1 md:col-span-2">
              <label className={labelCls}>Player Name *</label>
              <input type="text" value={form.name} onChange={r => setForm({...form, name: r.target.value})} className={inputCls} />
            </div>
            
            <div className="col-span-1">
              <label className={labelCls}>Position / Role Info</label>
              <input type="text" value={form.position} onChange={r => setForm({...form, position: r.target.value})} placeholder="e.g. Batsman, ST, GK" className={inputCls} />
            </div>

            <div className="col-span-1 md:col-span-2">
              <label className={labelCls}>Player Image</label>
              <ImageUpload
                currentImage={form.image}
                onImageSelect={(url) => setForm({ ...form, image: url })}
                bucket="sports-images"
                folder="players"
                cropAspect={1}
              />
            </div>
            
            <div className="col-span-1 md:col-span-2 space-y-6">
               <div>
                  <label className={labelCls}>Role / Designation</label>
                  <select value={form.role} onChange={e => setForm({...form, role: e.target.value})} className={selectCls}>
                    <option value="player">Player</option>
                    <option value="captain">Captain</option>
                    <option value="vice_captain">Vice Captain</option>
                  </select>
               </div>
               <div>
                  <label className={labelCls}>Tier / Category</label>
                  <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className={selectCls}>
                    <option value="gold">Gold</option>
                    <option value="silver">Silver</option>
                    <option value="bronze">Bronze</option>
                    <option value="emerging">Emerging</option>
                  </select>
               </div>
            </div>

            <div className="col-span-1 md:col-span-4 border-t border-white/10 pt-6 my-2"></div>

            <div className="col-span-1">
              <label className={labelCls}>Auction Status</label>
              <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className={selectCls}>
                <option value="available">Available (In Pool)</option>
                <option value="sold">Sold</option>
                <option value="unsold">Unsold</option>
                <option value="retained">Retained</option>
              </select>
            </div>
            
            <div className="col-span-1">
              <label className={labelCls}>Base Price (RICO Coins)</label>
              <input type="number" value={form.base_price} onChange={r => setForm({...form, base_price: parseInt(r.target.value)||0})} className={inputCls} />
            </div>
            
            {(form.status === 'sold' || form.status === 'retained') && (
               <>
                 <div className="col-span-1">
                   <label className={labelCls}>Sold To Team</label>
                   <select value={form.team_id} onChange={e => setForm({...form, team_id: e.target.value})} className={selectCls}>
                     <option value="">-- Select Team --</option>
                     {currentTeams.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                   </select>
                 </div>
                 <div className="col-span-1">
                   <label className={labelCls}>Sold Price / Retained Value</label>
                   <input type="number" value={form.sold_price} onChange={r => setForm({...form, sold_price: parseInt(r.target.value)||0})} className={inputCls} />
                 </div>
               </>
            )}
          </div>

          <div className="mt-8 flex justify-end gap-4">
            <button onClick={() => { setIsAdding(false); setEditing(null); }} className="px-6 py-2.5 text-sm font-semibold text-white/50 hover:text-white transition-colors">Cancel</button>
            <button onClick={isAdding ? handleAdd : () => handleUpdate(editing!)} className="px-6 py-2.5 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-400 transition-all shadow-lg shadow-red-500/20 active:scale-95 flex items-center">
              <Save className="w-4 h-4 mr-2" /> {isAdding ? 'Save Player' : 'Update Player'}
            </button>
          </div>
        </div>
      )}

      {/* Main Board */}
      {!isAdding && editing === null && (
         <>
            <div className="flex flex-col md:flex-row gap-4 bg-[#0a0a12] p-4 rounded-xl border border-white/5 mb-6">
               <div className="flex-1 relative">
                  <Search className="w-4 h-4 text-white/30 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input type="text" placeholder="Search by name, position, tier..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className={`${inputCls} pl-9`} />
               </div>
               <div className="w-full md:w-48 relative">
                  <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={selectCls}>
                    <option value="all">All Status</option>
                    <option value="available">Available</option>
                    <option value="sold">Sold</option>
                    <option value="unsold">Unsold</option>
                    <option value="retained">Retained</option>
                  </select>
               </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
               {filteredPlayers.map((player: any) => (
                  <div key={player.id} className={`bg-[#0a0a12] border rounded-2xl p-4 transition-all ${
                     player.status === 'available' ? 'border-blue-500/30' : 
                     player.status === 'sold' ? 'border-emerald-500/30' : 
                     player.status === 'retained' ? 'border-purple-500/30' : 'border-white/10 opacity-60'
                  }`}>
                     <div className="flex gap-4 mb-4">
                        <div className="w-16 h-16 rounded-xl bg-white/5 overflow-hidden shrink-0">
                           {player.image ? <img src={player.image} alt={player.name} className="w-full h-full object-cover" /> : <Users className="w-6 h-6 m-5 text-white/20" />}
                        </div>
                        <div className="flex-1 min-w-0">
                           <div className="flex justify-between items-start">
                              <h4 className="font-bold text-white truncate text-base" title={player.name}>{player.name}</h4>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                 player.category === 'gold' ? 'bg-yellow-500/20 text-yellow-400' : 
                                 player.category === 'silver' ? 'bg-gray-400/20 text-gray-300' :
                                 player.category === 'bronze' ? 'bg-orange-700/20 text-orange-400' :
                                 'bg-blue-500/20 text-blue-400'
                              }`}>{player.category}</span>
                           </div>
                           <div className="text-xs text-white/50">{player.position}</div>
                           <div className="text-xs text-white/40 uppercase tracking-widest mt-1 bg-white/5 inline-block px-1.5 py-0.5 rounded">{player.status}</div>
                        </div>
                     </div>

                     <div className="border-t border-white/5 pt-3 pb-3 grid grid-cols-2 gap-2 text-sm">
                        <div>
                           <div className="text-[10px] text-white/30 uppercase tracking-wider mb-0.5">Base Price</div>
                           <div className="font-mono text-white/80">R$ {player.base_price}</div>
                        </div>
                        {(player.status === 'sold' || player.status === 'retained') && (
                           <div>
                              <div className="text-[10px] text-white/30 uppercase tracking-wider mb-0.5">Sold/Retained</div>
                              <div className="font-mono text-emerald-400 font-bold">R$ {player.sold_price}</div>
                           </div>
                        )}
                        {(player.status === 'sold' || player.status === 'retained') && player.team_id && (
                           <div className="col-span-2 mt-1">
                              <div className="text-[10px] text-white/30 uppercase tracking-wider mb-0.5">Team</div>
                              <div className="text-xs text-white flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-md">
                                 {currentTeams.find((t:any) => t.id === player.team_id)?.name || 'Unknown Team'}
                              </div>
                           </div>
                        )}
                     </div>

                   <div className="border-t border-white/5 pt-3 flex items-center justify-between mt-auto">
                        <div className="flex gap-1.5">
                           <button onClick={() => startEditing(player)} className="p-1.5 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white rounded-lg transition-colors" title="Edit Full Details"><Edit className="w-4 h-4" /></button>
                           <button onClick={() => handleDelete(player.id)} className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500/50 hover:text-red-400 rounded-lg transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>
                        </div>
                        
                        {/* Quick Action: Mark Sold */}
                        {player.status === 'available' && (
                           <AuctionQuickAction onSold={(tid, price, sDay) => quickMarkSold(player.id, tid, price, sDay)} teams={currentTeams} maxAuctionDays={maxAuctionDays} />
                        )}
                     </div>
                  </div>
               ))}
               
               {filteredPlayers.length === 0 && (
                  <div className="col-span-full py-12 text-center text-white/50 border border-white/5 border-dashed rounded-2xl">
                     <Gavel className="w-8 h-8 mx-auto mb-3 text-white/20" />
                     <p>No players found in this view.</p>
                  </div>
               )}
            </div>
         </>
      )}
    </div>
  );
};

// Inline component for quick auction actions on the card
const AuctionQuickAction: React.FC<{ onSold: (tid: string, price: number, sDay: number) => void, teams: any[], maxAuctionDays: number }> = ({ onSold, teams, maxAuctionDays }) => {
   const [open, setOpen] = useState(false);
   const [tid, setTid] = useState('');
   const [price, setPrice] = useState('');
   const [sDay, setSDay] = useState('1');
   
   if (!open) return (
      <button onClick={() => setOpen(true)} className="px-3 py-1.5 bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center">
         <Gavel className="w-3.5 h-3.5 mr-1" /> Mark Sold
      </button>
   );

   return (
      <div className="flex gap-1 items-center bg-[#151520] p-1 rounded-lg border border-red-500/30 flex-wrap">
         <select value={sDay} onChange={e => setSDay(e.target.value)} className="bg-transparent text-white text-[10px] w-16 outline-none p-1">
            {Array.from({ length: maxAuctionDays }, (_, i) => i + 1).map(d => (
               <option key={d} value={d}>Day {d}</option>
            ))}
         </select>
         <select value={tid} onChange={e => setTid(e.target.value)} className="bg-transparent text-white text-[10px] w-20 outline-none p-1 border-l border-white/10 pl-1">
            <option value="">Team...</option>
            {teams.map(t => <option key={t.id} value={t.id}>{t.short_name || t.name.substring(0,6)}</option>)}
         </select>
         <input type="number" placeholder="Price" value={price} onChange={e => setPrice(e.target.value)} className="w-14 bg-transparent text-white text-[10px] border-l border-white/10 outline-none p-1" />
         <button onClick={() => onSold(tid, parseInt(price)||0, parseInt(sDay)||1)} className="text-emerald-400 hover:text-white p-1 ml-1 bg-emerald-500/20 rounded"><Check className="w-3.5 h-3.5" /></button>
         <button onClick={() => setOpen(false)} className="text-white/50 hover:text-white p-1"><X className="w-3.5 h-3.5" /></button>
      </div>
   );
};
