import React, { useState } from 'react';
import { Plus, Edit, Trash2, Save, X, Eye, EyeOff, Calendar, Trophy } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useSportsData } from '../../context/SportsContext';
import { ImageUpload } from '../ImageUpload';
import { useSavingProgress } from '../../context/SavingProgressContext';

const inputCls = 'w-full bg-white/[0.04] border border-white/10 rounded-xl py-2.5 px-3.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 focus:bg-white/[0.06] transition-all';
const labelCls = 'block text-[10px] font-black text-white/30 uppercase tracking-[0.15em] mb-2';
const selectCls = `${inputCls} appearance-none cursor-pointer [&>option]:bg-[#0a0a12] [&>option]:text-white`;

export const SportsSeasonAdmin: React.FC = () => {
  const savingProgress = useSavingProgress();
  const { sanitizeUrl, siteSettings, updateSiteSettings } = useData() as any;
  
  const { 
    sportsSeasons,
    addSportsSeason,
    updateSportsSeason,
    deleteSportsSeason
  } = useSportsData() as any;

  const toggleSportsSeasonEnabled = async (id: number) => {
    const season = sportsSeasons?.find((s: any) => s.id === id);
    if (!season) return;
    try {
      const steps = savingProgress.withSteps(2, 'Preparing…');
      steps.next('Updating visibility');
      await updateSportsSeason(id, { enabled: !season.enabled });
    } catch { alert('Failed to update visibility'); }
    finally { savingProgress.done(); }
  };

  const [isAdding, setIsAdding] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);


  // default to next year for demo
  const [form, setForm] = useState({
    name: '',
    season: new Date().getFullYear().toString(),
    image: '',
    max_teams: 8,
    owner_registration_open: false,
    player_registration_open: false,
    max_owners: 0,
    max_players: 0,
    owner_fee: 0,
    player_fee: 0,
    auction_status: 'draft', // draft, live, completed
    auction_starts_at: '',
    auction_days: 1,
    enabled: true,
    group_limits: null as { field_name: string; limits: Record<string, number> } | null,
  });

  const resetForm = () => {
    setForm({
      name: '',
      season: new Date().getFullYear().toString(),
      image: '',
      max_teams: 8,
      owner_registration_open: false,
      player_registration_open: false,
      max_owners: 0,
      max_players: 0,
      owner_fee: 0,
      player_fee: 0,
      auction_status: 'draft',
      auction_starts_at: '',
      auction_days: 1,
      enabled: true,
      group_limits: null,
    });
  };

  const validateForm = () => {
    const missing = [];
    if (!form.name?.trim()) missing.push('name');
    if (!form.season?.trim()) missing.push('season');
    return missing;
  };

  const handleAdd = async () => {
    const missingFields = validateForm();
    if (missingFields.length > 0) { alert(`Please fill in required fields: ${missingFields.join(', ')}`); return; }
    try {
      const steps = savingProgress.withSteps(2, 'Preparing…');
      steps.next('Saving to database');
      await addSportsSeason({
        ...form,
        registration_open: form.player_registration_open // Sync legacy field
      });
      setIsAdding(false); resetForm();
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to add sport season. ${msg}`);
    } finally { savingProgress.done(); }
  };

  const handleUpdate = async (id: number) => {
    const missingFields = validateForm();
    if (missingFields.length > 0) { alert(`Please fill in required fields: ${missingFields.join(', ')}`); return; }
    try {
      const steps = savingProgress.withSteps(2, 'Preparing…');
      steps.next('Saving to database');
      await updateSportsSeason(id, {
        ...form,
        registration_open: form.player_registration_open // Sync legacy field
      });
      setEditing(null); resetForm();
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to update sport season. ${msg}`);
    } finally { savingProgress.done(); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this sport season? This deletes all associated teams, players, matches, and registrations.')) return;
    try {
      const steps = savingProgress.withSteps(2, 'Preparing…');
      steps.next('Deleting');
      await deleteSportsSeason(id);
    } catch { alert('Failed to delete season.'); }
    finally { savingProgress.done(); }
  };

  const startEditing = (season: any) => {
    setForm({
      name: season.name,
      season: season.season,
      image: season.image || '',
      max_teams: season.max_teams || 8,
      owner_registration_open: season.owner_registration_open || false,
      player_registration_open: season.player_registration_open || false,
      max_owners: season.max_owners || 0,
      max_players: season.max_players || 0,
      owner_fee: season.owner_fee || 0,
      player_fee: season.player_fee || 0,
      auction_status: season.auction_status || 'draft',
      auction_starts_at: season.auction_starts_at || '',
      auction_days: season.auction_days || 1,
      enabled: season.enabled,
      group_limits: season.group_limits || null,
    });
    setEditing(season.id);
  };

  // Safe read for sportsSeasons
  const sortedSeasons = [...(sportsSeasons || [])].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Sports Seasons</h2>
          <p className="text-white/50 text-sm">Manage annual sports events, like RICO Premier League.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-xl px-4 py-2 backdrop-blur-sm self-stretch sm:self-auto hidden sm:flex">
            <div className="flex flex-col items-end">
              <span className="text-sm font-bold text-white">Annual Sports Mode</span>
              <span className="text-xs text-white/50 text-right">Hides Franchise & Teams</span>
            </div>
            <button
              onClick={async () => {
                const newValue = !siteSettings?.annual_sports_mode_enabled;
                try {
                  const steps = savingProgress.withSteps(1, 'Updating logic...');
                  steps.next('Saving mode setting');
                  await updateSiteSettings({
                    id: 1,
                    annual_sports_mode_enabled: newValue
                  });
                  savingProgress.done();
                } catch (e: any) {
                  alert(`Error updating site settings: ${e.message}`);
                  console.error('Update Site Settings Error:', e);
                }
              }}
              className={`relative w-12 h-6 rounded-full p-1 transition-colors duration-300 ${
                siteSettings?.annual_sports_mode_enabled ? 'bg-emerald-500' : 'bg-gray-700'
              }`}
            >
              <div
                className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-300 ${
                  siteSettings?.annual_sports_mode_enabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
          {!isAdding && !editing && (
            <button onClick={() => { setIsAdding(true); resetForm(); }} className="px-4 py-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-xl text-sm font-semibold transition-colors flex items-center shadow-lg shadow-emerald-500/5 whitespace-nowrap">
              <Plus className="w-4 h-4 mr-2" /> Add Sport Season
            </button>
          )}
        </div>
      </div>
      
      {/* Mobile Toggle Display (below header) */}
      <div className="sm:hidden flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-4 py-3 backdrop-blur-sm mb-6">
        <div className="flex flex-col">
          <span className="text-sm font-bold text-white">Annual Sports Mode</span>
          <span className="text-[10px] text-white/50">Hides Franchise & Teams features</span>
        </div>
        <button
          onClick={async () => {
            const newValue = !siteSettings?.annual_sports_mode_enabled;
            try {
              const steps = savingProgress.withSteps(1, 'Updating logic...');
              steps.next('Saving mode setting');
              await updateSiteSettings({
                id: 1,
                annual_sports_mode_enabled: newValue
              });
              savingProgress.done();
            } catch (e: any) {
              alert(`Error updating site settings: ${e.message}`);
              console.error('Update Site Settings Error (Mobile):', e);
            }
          }}
          className={`relative w-12 h-6 rounded-full p-1 transition-colors duration-300 ${
            siteSettings?.annual_sports_mode_enabled ? 'bg-emerald-500' : 'bg-gray-700'
          }`}
        >
          <div
            className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-300 ${
              siteSettings?.annual_sports_mode_enabled ? 'translate-x-6' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {(isAdding || editing !== null) && (
        <div className="bg-[#0a0a12] rounded-2xl p-6 md:p-8 border border-white/5 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-400 opacity-50"></div>
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-white flex items-center">
              {isAdding ? 'Add New Sport Season' : 'Edit Sport Season'}
            </h3>
            <button onClick={() => { setIsAdding(false); setEditing(null); }} className="p-2 text-white/50 hover:text-white hover:bg-white/5 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <div className="md:col-span-2">
              <label className={labelCls}>Sport Name *</label>
              <input type="text" value={form.name} onChange={r => setForm({...form, name: r.target.value})} className={inputCls} placeholder="e.g. RICO Premier League (RPL)" />
            </div>

            <div>
              <label className={labelCls}>Season Year *</label>
              <input type="text" value={form.season} onChange={r => setForm({...form, season: r.target.value})} className={inputCls} placeholder="e.g. 2026" />
            </div>
            <div>
              <label className={labelCls}>Max Teams</label>
              <input type="number" value={form.max_teams} onChange={r => setForm({...form, max_teams: parseInt(r.target.value) || 0})} className={inputCls} min="2" max="32" />
            </div>

            <div className="md:col-span-2">
              <label className={labelCls}>Sport Cover Image</label>
              <ImageUpload
                currentImage={form.image}
                onImageSelect={(url) => setForm({ ...form, image: url })}
                bucket="sports-images"
                folder="seasons"
                enableCropper={true}
                cropAspect={16/9}
              />
              <p className="text-[10px] text-white/30 mt-2">16:9 ratio recommended</p>
            </div>

            <div>
              <label className={labelCls}>Owner Registration</label>
              <select value={form.owner_registration_open ? 'yes' : 'no'} onChange={e => setForm({...form, owner_registration_open: e.target.value === 'yes'})} className={selectCls}>
                <option value="yes">Open</option>
                <option value="no">Closed</option>
              </select>
            </div>

            <div>
              <label className={labelCls}>Owner Limit</label>
              <input type="number" value={form.max_owners} onChange={r => setForm({...form, max_owners: parseInt(r.target.value) || 0})} className={inputCls} min="0" placeholder="0 for unlimited" />
            </div>

            <div>
              <label className={labelCls}>Player Registration</label>
              <select value={form.player_registration_open ? 'yes' : 'no'} onChange={e => setForm({...form, player_registration_open: e.target.value === 'yes'})} className={selectCls}>
                <option value="yes">Open</option>
                <option value="no">Closed</option>
              </select>
            </div>

            <div>
              <label className={labelCls}>Player Limit</label>
              <input type="number" value={form.max_players} onChange={r => setForm({...form, max_players: parseInt(r.target.value) || 0})} className={inputCls} min="0" placeholder="0 for unlimited" />
            </div>
            
            <div>
              <label className={labelCls}>Auction Status</label>
              <select value={form.auction_status} onChange={e => setForm({...form, auction_status: e.target.value})} className={selectCls}>
                <option value="draft">Draft (Hidden)</option>
                <option value="live">Live (Happening Now)</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            
            <div>
              <label className={labelCls}>Auction Duration (Days)</label>
              <select value={form.auction_days} onChange={e => setForm({...form, auction_days: parseInt(e.target.value) || 1})} className={selectCls}>
                {[1,2,3,4,5].map(d => (
                  <option key={d} value={d}>{d} {d === 1 ? 'Day' : 'Days'}</option>
                ))}
              </select>
            </div>
            
            {form.auction_status !== 'completed' && (
              <div>
                <label className={labelCls}>Auction Starts At</label>
                <input type="datetime-local" value={form.auction_starts_at} onChange={r => setForm({...form, auction_starts_at: r.target.value})} className={inputCls} />
              </div>
            )}
            
            <div className="flex items-center mt-6">
              <label className="flex items-center cursor-pointer">
                <input type="checkbox" checked={form.enabled} onChange={e => setForm({...form, enabled: e.target.checked})} className="sr-only peer" />
                <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500 relative"></div>
                <span className="ml-3 text-sm font-medium text-white/70">Enable Season Display</span>
              </label>
            </div>

            <div className="md:col-span-2 space-y-4 pt-4 border-t border-white/5">
              <div className="flex items-center justify-between">
                <label className={labelCls}>Group-Specific Limits (Batch / Category)</label>
                {form.group_limits ? (
                  <button 
                    onClick={() => setForm({...form, group_limits: null})}
                    className="text-[10px] font-bold text-red-400 uppercase tracking-wider hover:underline"
                  >
                    Remove Group Limits
                  </button>
                ) : (
                  <button 
                    onClick={() => setForm({...form, group_limits: { field_name: 'year', limits: {} }})}
                    className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider hover:underline"
                  >
                    Enable Group Limits
                  </button>
                )}
              </div>
              
              {form.group_limits && (
                <div className="space-y-4 p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <label className="text-[10px] text-white/30 uppercase font-black mb-1.5 block">Group By Field</label>
                      <select 
                        value={form.group_limits.field_name}
                        onChange={e => setForm({...form, group_limits: { ...form.group_limits!, field_name: e.target.value }})}
                        className={inputCls}
                      >
                        <option value="year">Year / Batch</option>
                        <option value="department">Department</option>
                        <option value="category">Category</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {Object.entries(form.group_limits.limits).map(([key, val], idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <input 
                          type="text" 
                          value={key}
                          onChange={e => {
                            const newLimits = { ...form.group_limits!.limits };
                            const oldVal = newLimits[key];
                            delete newLimits[key];
                            newLimits[e.target.value] = oldVal;
                            setForm({...form, group_limits: { ...form.group_limits!, limits: newLimits }});
                          }}
                          placeholder="Category Value"
                          className={`${inputCls} flex-1`}
                        />
                        <input 
                          type="number" 
                          value={val}
                          onChange={e => {
                            const newLimits = { ...form.group_limits!.limits };
                            newLimits[key] = parseInt(e.target.value) || 0;
                            setForm({...form, group_limits: { ...form.group_limits!, limits: newLimits }});
                          }}
                          placeholder="Limit"
                          className={`${inputCls} w-24`}
                        />
                        <button 
                          onClick={() => {
                            const newLimits = { ...form.group_limits!.limits };
                            delete newLimits[key];
                            setForm({...form, group_limits: { ...form.group_limits!, limits: newLimits }});
                          }}
                          className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button 
                      onClick={() => {
                        const newLimits = { ...form.group_limits!.limits, "": 0 };
                        setForm({...form, group_limits: { ...form.group_limits!, limits: newLimits }});
                      }}
                      className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 py-1"
                    >
                      <Plus className="w-3 h-3" /> Add Specific Limit
                    </button>
                  </div>
                  <p className="text-[10px] text-white/20 italic">Example: Select 'Year' and set '2021' to 20 if only 20 seniors can join.</p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 flex justify-end gap-4">
            <button onClick={() => { setIsAdding(false); setEditing(null); }} className="px-6 py-2.5 text-sm font-semibold text-white/50 hover:text-white transition-colors">Cancel</button>
            <button onClick={isAdding ? handleAdd : () => handleUpdate(editing!)} className="px-6 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-bold hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20 active:scale-95 flex items-center">
              <Save className="w-4 h-4 mr-2" /> {isAdding ? 'Save Season' : 'Update Season'}
            </button>
          </div>
        </div>
      )}

      {/* Grid of existing seasons */}
      {!isAdding && editing === null && sortedSeasons.length > 0 && (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedSeasons.map((season: any) => (
               <div key={season.id} className={`bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden transition-all duration-300 ${!season.enabled ? 'opacity-50 grayscale' : 'hover:bg-white/[0.04]'}`}>
                 <div className="h-32 bg-black/40 relative">
                   {season.image ? (
                     <img src={sanitizeUrl(season.image)} className="w-full h-full object-cover" alt="season cover" />
                   ) : (
                     <div className="w-full h-full flex items-center justify-center"><Trophy className="w-8 h-8 text-white/10" /></div>
                   )}
                   <div className="absolute top-2 right-2">
                     <button onClick={() => toggleSportsSeasonEnabled(season.id)} className={`p-1.5 rounded-full backdrop-blur-md border ${season.enabled ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>
                        {season.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                     </button>
                   </div>
                   <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm border border-white/10 rounded-full px-2 py-0.5 flex items-center text-[10px] font-semibold text-white/80">
                      <Calendar className="w-3 h-3 mr-1 text-emerald-400" /> {season.season}
                   </div>
                 </div>
                  <div className="p-5">
                    <h4 className="font-bold text-lg text-white mb-2">{season.name}</h4>
                    <div className="flex flex-wrap gap-2 text-[10px] mb-4">
                       <span className="px-2 py-1 rounded bg-white/5 text-white/70">Teams: {season.max_teams}</span>
                       <button 
                         onClick={() => updateSportsSeason(season.id, { owner_registration_open: !(season.owner_registration_open || (season.owner_registration_open === undefined && season.registration_open)) })}
                         className={`px-2 py-1 rounded transition-colors ${ (season.owner_registration_open || (season.owner_registration_open === undefined && season.registration_open)) ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}>
                         Owner Reg: {(season.owner_registration_open || (season.owner_registration_open === undefined && season.registration_open)) ? 'Open' : 'Closed'} {season.max_owners > 0 && `(Max: ${season.max_owners})`}
                       </button>
                       <button 
                         onClick={() => updateSportsSeason(season.id, { 
                           player_registration_open: !(season.player_registration_open || (season.player_registration_open === undefined && season.registration_open)),
                           registration_open: !(season.player_registration_open || (season.player_registration_open === undefined && season.registration_open)) // Sync legacy
                         })}
                         className={`px-2 py-1 rounded transition-colors ${ (season.player_registration_open || (season.player_registration_open === undefined && season.registration_open)) ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}>
                         Player Reg: {(season.player_registration_open || (season.player_registration_open === undefined && season.registration_open)) ? 'Open' : 'Closed'} {season.max_players > 0 && `(Max: ${season.max_players})`}
                       </button>
                       <span className={`px-2 py-1 rounded ${season.auction_status === 'live' ? 'bg-red-500/20 text-red-300 animate-pulse' : 'bg-white/5 text-white/50'}`}>Auction: {season.auction_status}</span>
                    </div>

                    <div className="flex gap-2 border-t border-white/5 pt-4">
                      <button onClick={() => startEditing(season)} className="flex-1 px-3 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-xs font-semibold flex items-center justify-center transition-colors">
                        <Edit className="w-3.5 h-3.5 mr-1.5" /> Edit
                      </button>
                      <button onClick={() => handleDelete(season.id)} className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs font-semibold flex items-center justify-center transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                 </div>
               </div>
            ))}
         </div>
      )}
      
      {!isAdding && editing === null && sortedSeasons.length === 0 && (
         <div className="text-center py-20 bg-white/[0.02] border border-white/5 rounded-2xl">
            <Trophy className="w-12 h-12 text-white/10 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">No Sport Seasons Yet</h3>
            <p className="text-white/50 text-sm mb-6">Create your first tournament to get started.</p>
            <button onClick={() => { setIsAdding(true); resetForm(); }} className="px-4 py-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-xl text-sm font-semibold inline-flex items-center">
               <Plus className="w-4 h-4 mr-2" /> Create First Season
            </button>
         </div>
      )}
    </div>
  );
};
