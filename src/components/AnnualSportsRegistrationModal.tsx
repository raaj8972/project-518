import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, User, Users, Mail, Phone, ChevronRight, Check, Loader2, AlertCircle, Sparkles, ListFilter, Shield } from 'lucide-react';
import { useAnnualSports } from '../context/AnnualSportsContext';
import { useAuth } from '../context/AuthContext';
import { ImageUpload } from './ImageUpload';
import { getSportTheme } from '../utils/sportBranding';
import confetti from 'canvas-confetti';

interface AnnualSportsRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  registrationTargetId: string;
  registrationTargetTitle: string;
}

const inputCls = 'w-full bg-white/[0.04] border border-white/[0.08] rounded-2xl py-3.5 pl-11 pr-4 text-[15px] text-white placeholder-white/20 focus:outline-none focus:bg-white/[0.07] focus:border-gold-500/40 focus:ring-1 focus:ring-gold-500/30 focus:shadow-[0_0_20px_rgba(212,175,55,0.08)] transition-all duration-300';
const labelCls = 'block text-[10px] font-black text-white/30 uppercase tracking-[0.15em] mb-2 ml-1';
const iconCls = 'absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-gold-400 transition-colors duration-300';

export const AnnualSportsRegistrationModal: React.FC<AnnualSportsRegistrationModalProps> = ({ isOpen, onClose, registrationTargetId, registrationTargetTitle }) => {
  const { annualEvents, annualRegistrations, addAnnualRegistration } = useAnnualSports();
  const { user } = useAuth();

  const targetDetails = annualEvents.find(e => e.id === registrationTargetId);
  
  const currentRegCount = annualRegistrations.filter(r => r.event_id === registrationTargetId && r.status !== 'rejected').length;
  const isLimitReached = targetDetails?.registration_limit ? currentRegCount >= targetDetails.registration_limit : false;
  const minRegTeamSize = targetDetails?.team_min_members || 1; 
  const maxRegTeamSize = targetDetails?.team_max_members || 1;
  const rawParticipantTypes = targetDetails?.registration_participant_types?.length ? targetDetails.registration_participant_types : ['Student', 'Faculty', 'Alumni', 'External'];
  
  const [mode, setMode] = useState<'individual' | 'team'>('individual');
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedReg, setSubmittedReg] = useState<any | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    participant_type: '',
    roll_no: '',
    photo_url: '',
    team_name: '',
    team_members: [] as { name: string; email?: string; photo_url?: string; metadata?: Record<string, any> }[],
    metadata: {} as Record<string, any>
  });

  useEffect(() => {
    if (!isOpen || !targetDetails) return;

    setStep('form');
    setSubmittedReg(null);
    setLoading(false);
    setError(null);
    
    if (targetDetails.registration_default_mode) {
      setMode(targetDetails.registration_default_mode === 'team' ? 'team' : 'individual');
    }
    
    const initialMetadata: Record<string, any> = {};
    (targetDetails.custom_fields || []).forEach((field: any) => {
      initialMetadata[field.name] = '';
    });

    const baseFormData = {
      name: '',
      email: '',
      phone: '',
      college: '',
      participant_type: '',
      roll_no: '',
      photo_url: '',
      team_name: '',
      team_members: [] as any[],
      metadata: initialMetadata
    };

    setFormData(baseFormData);
  }, [isOpen, targetDetails?.id, user?.id]); // Only reset when modal opens or primary IDs change

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const addTeamMember = () => {
    if (formData.team_members.length < maxRegTeamSize - 1) { 
      setFormData(prev => ({
        ...prev,
        team_members: [...prev.team_members, { name: '', email: '', photo_url: '', metadata: {} }]
      }));
    }
  };

  const removeTeamMember = (index: number) => {
    setFormData(prev => ({
      ...prev,
      team_members: prev.team_members.filter((_, i) => i !== index)
    }));
  };

  const updateTeamMember = (index: number, field: string, value: any) => {
    const newMembers = [...formData.team_members];
    newMembers[index] = { ...newMembers[index], [field]: value };
    setFormData(prev => ({ ...prev, team_members: newMembers }));
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) return setError('Name is required.');
    if (!formData.email.trim()) return setError('Email is required.');
    if (!formData.phone.trim() || formData.phone.length < 10) return setError('Valid phone number is required.');
    if (!formData.participant_type) return setError('Participant type is required.');

    if (mode === 'team') {
      if (!formData.team_name.trim()) return setError('Team Name is required.');
      const currentSize = 1 + formData.team_members.filter(m => m.name.trim()).length;
      if (currentSize < minRegTeamSize) return setError(`Team must have at least ${minRegTeamSize} members.`);
      if (formData.team_members.some(m => !m.name.trim())) return setError('All team member names are required.');
      
      if (targetDetails?.require_team_individual_photos) {
        if (formData.team_members.some(m => !m.photo_url)) {
          return setError('All team members must have a photo.');
        }
      }
    }

    const customFields = targetDetails?.custom_fields || [];
    for (const field of customFields) {
      if (field.required && !formData.metadata[field.name]) {
        return setError(`${field.label} is required.`);
      }
    }

    if (isLimitReached) {
      return setError('Total registration limit reached for this session.');
    }

    try {
      setLoading(true);
      
      const result = await addAnnualRegistration({
        event_id: registrationTargetId,
        full_name: formData.name,
        email: formData.email,
        phone: formData.phone,
        participant_type: formData.participant_type,
        roll_no: formData.roll_no,
        photo_url: formData.photo_url || null,
        is_team_registration: mode === 'team',
        team_name: mode === 'team' ? formData.team_name : null,
        team_members: mode === 'team' ? formData.team_members : null,
        total_members: mode === 'team' ? (formData.team_members.length + 1) : 1,
        metadata: formData.metadata,
        status: 'pending'
      });
      
      setSubmittedReg(result);
      setStep('success');
      console.log('Registration Success:', result);
      
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#D4AF37', '#F59E0B', '#B45309', '#ffffff'] 
      });

    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true">
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300"
        onClick={onClose}
      />

      <div className="relative z-50 w-full max-w-xl bg-[#0a0a12]/95 backdrop-blur-3xl border border-gold-500/10 rounded-t-[28px] sm:rounded-[28px] shadow-[0_32px_100px_-20px_rgba(212,175,55,0.15)] overflow-hidden flex flex-col h-[90vh] sm:h-[85vh] animate-in zoom-in-95 slide-in-from-bottom-6 duration-500">
        
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold-500/60 to-transparent" />
        
        <button 
          onClick={onClose}
          className="absolute top-5 right-5 p-2.5 text-white/20 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.05] hover:border-gold-500/20 rounded-xl transition-all duration-300 z-10"
        >
          <X size={16} />
        </button>

        {step === 'form' ? (
           <div className="flex flex-col flex-1 min-h-0">
              <div className="p-7 pb-4 shrink-0">
                 <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-gold-500 to-amber-600 flex items-center justify-center shadow-lg shadow-gold-500/25">
                       <Sparkles size={12} className="text-black" />
                    </div>
                    <span className="text-[10px] font-black text-gold-500 uppercase tracking-[0.2em]">Annual Sports Registration</span>
                 </div>
                 <h2 className="text-2xl font-black text-white tracking-tight leading-tight">{registrationTargetTitle}</h2>
              </div>

              <div className="flex-1 overflow-y-auto px-7 pb-4 custom-scrollbar space-y-5">
                 {!targetDetails?.registration_mode_locked && (
                   <div className="flex p-1.5 bg-white/[0.02] rounded-2xl border border-white/[0.05] relative mb-2">
                      <div 
                        className="absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-gradient-to-r from-gold-500/15 to-amber-500/15 rounded-xl border border-gold-500/20 shadow-[0_0_20px_rgba(212,175,55,0.1)] transition-all duration-500 ease-out"
                        style={{ left: mode === 'team' ? 'calc(50% + 3px)' : '6px' }}
                      />
                      <button type="button" onClick={() => setMode('individual')} className={`flex-1 flex items-center justify-center gap-2.5 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider relative z-10 transition-all duration-300 ${mode === 'individual' ? 'text-gold-400' : 'text-white/20'}`}><User size={13} /> Individual</button>
                      <button type="button" onClick={() => setMode('team')} className={`flex-1 flex items-center justify-center gap-2.5 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider relative z-10 transition-all duration-300 ${mode === 'team' ? 'text-gold-400' : 'text-white/20'}`}><Users size={13} /> Team</button>
                   </div>
                 )}

                 {/* Primary Identity Section */}
                 <div className="space-y-5">
                    {mode === 'team' ? (
                       <div className="bg-white/[0.03] border border-white/10 rounded-[2rem] p-6 space-y-5">
                          <div className="group">
                             <label className={labelCls}>Team Name <span className="text-gold-500">*</span></label>
                             <div className="relative">
                                <Users className={iconCls} size={16} />
                                <input type="text" value={formData.team_name} onChange={e => setFormData(p => ({...p, team_name: e.target.value}))} placeholder="Enter team name" className={inputCls} />
                             </div>
                          </div>

                          <div className="group">
                             <label className={labelCls}>Captain Name <span className="text-gold-500">*</span></label>
                             <div className="relative">
                                <User className={iconCls} size={16} />
                                <input type="text" value={formData.name} onChange={e => setFormData(p => ({...p, name: e.target.value}))} placeholder="Captain's full name" className={inputCls} />
                             </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                             {targetDetails?.require_leader_photo && (
                                <div className="group">
                                   <label className={labelCls}>Captain Photo <span className="text-gold-500">*</span></label>
                                   <ImageUpload onImageSelect={(url) => setFormData(p => ({ ...p, photo_url: url }))} currentImage={formData.photo_url || ''} bucket="team-branding" />
                                </div>
                             )}
                             {targetDetails?.require_team_photo && (
                                <div className="group">
                                   <label className={labelCls}>Team Logo <span className="text-gold-500">*</span></label>
                                   <ImageUpload onImageSelect={(url) => setFormData(p => ({ ...p, metadata: { ...p.metadata, team_logo_url: url } }))} currentImage={formData.metadata?.team_logo_url || ''} bucket="team-branding" />
                                </div>
                             )}
                          </div>
                       </div>
                    ) : (
                       <div className="group">
                          <label className={labelCls}>Full Name <span className="text-gold-500">*</span></label>
                          <div className="relative">
                             <User className={iconCls} size={16} />
                             <input type="text" value={formData.name} onChange={e => setFormData(p => ({...p, name: e.target.value}))} placeholder="Enter your full name" className={inputCls} />
                          </div>
                       </div>
                    )}
                 </div>

                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="group">
                       <label className={labelCls}>Email <span className="text-gold-500">*</span></label>
                       <div className="relative"><Mail className={iconCls} size={16} /><input type="email" value={formData.email} onChange={e => setFormData(p => ({...p, email: e.target.value}))} placeholder="you@example.com" className={inputCls} /></div>
                    </div>
                    <div className="group">
                       <label className={labelCls}>Phone <span className="text-gold-500">*</span></label>
                       <div className="relative"><Phone className={iconCls} size={16} /><input type="tel" value={formData.phone} onChange={e => setFormData(p => ({...p, phone: e.target.value.replace(/\D/g, '').slice(0, 10)}))} placeholder="9876543210" className={inputCls} /></div>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 gap-4">
                    <div className="group">
                       <label className={labelCls}>Type <span className="text-gold-500">*</span></label>
                       <div className="relative"><ListFilter className={iconCls} size={16} /><select value={formData.participant_type} onChange={e => setFormData(p => ({...p, participant_type: e.target.value}))} className={`${inputCls} appearance-none [&>option]:bg-black`}><option value="">Select Type</option>{rawParticipantTypes.map(t => <option key={t} value={t}>{t}</option>)}</select><ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-white/15 rotate-90 pointer-events-none" size={14} /></div>
                    </div>
                 </div>

                 {mode === 'individual' && targetDetails?.require_player_photo && (
                    <div className="group pt-2"><label className={labelCls}>Player Photo <span className="text-gold-500">*</span></label><ImageUpload onImageSelect={(url) => setFormData(p => ({ ...p, photo_url: url }))} currentImage={formData.photo_url || ''} bucket="team-branding" /></div>
                 )}

                 {mode === 'team' && (
                    <div className="space-y-5 pt-5 border-t border-white/[0.04]">
                        <div className="space-y-4">
                           <label className={labelCls}>Team Roster</label>
                           {formData.team_members.map((member, idx) => (
                              <div key={idx} className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-4">
                                 <div className="flex items-center gap-3">
                                   <div className="flex-grow relative">
                                     <div className={iconCls}><User size={14} /></div>
                                     <input type="text" value={member.name} onChange={e => updateTeamMember(idx, 'name', e.target.value)} placeholder={`Member ${idx + 2} Name`} className={inputCls + ' !py-2.5 !text-xs'} />
                                   </div>
                                   <button type="button" onClick={() => removeTeamMember(idx)} className="p-2.5 rounded-xl border border-white/5 hover:bg-red-500/10 text-white/20 hover:text-red-400 transition-all"><X size={14} /></button>
                                 </div>
                                 
                                 <div className="flex flex-col md:flex-row gap-4">
                                   <div className="w-full sm:w-32 shrink-0">
                                     <label className={labelCls + ' !text-[8px]'}>Member Photo</label>
                                     <ImageUpload 
                                       onImageSelect={(url) => updateTeamMember(idx, 'photo_url', url)} 
                                       currentImage={member.photo_url || ''} 
                                       bucket="team-branding" 
                                       className="!min-h-[100px]"
                                     />
                                   </div>
                                   <div className="flex-grow grid grid-cols-2 gap-3 bg-white/[0.03] p-3 rounded-xl border border-white/5 items-center">
                                      {(() => {
                                        const theme = getSportTheme(registrationTargetTitle);
                                        return theme.attributes.map(attr => (
                                          <div key={attr.key}>
                                            <label className={labelCls + ' !text-[8px] mb-1'}>{attr.label}</label>
                                            {attr.type === 'select' ? (
                                              <select value={member.metadata?.[attr.key] || ''} onChange={e => updateTeamMember(idx, 'metadata', { ...(member.metadata || {}), [attr.key]: e.target.value })} className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg py-1.5 px-2 text-[10px] text-white appearance-none cursor-pointer [&>option]:bg-black">
                                                <option value="">Select</option>
                                                {attr.options?.map(o => <option key={o} value={o}>{o}</option>)}
                                              </select>
                                            ) : (
                                              <input type={attr.type} value={member.metadata?.[attr.key] || ''} onChange={e => updateTeamMember(idx, 'metadata', { ...(member.metadata || {}), [attr.key]: e.target.value })} placeholder={attr.label} className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg py-1.5 px-2 text-[10px] text-white focus:outline-none focus:border-gold-500/40" />
                                            )}
                                          </div>
                                        ));
                                      })()}
                                   </div>
                                 </div>
                              </div>
                           ))}
                           <button type="button" onClick={addTeamMember} className="w-full py-3 border border-dashed border-white/[0.06] rounded-2xl text-[9px] font-black text-white/20 uppercase hover:text-gold-400 transition-all">+ Add Team Member</button>
                        </div>
                    </div>
                 )}

                 {error && (
                    <div className="bg-red-500/10 border border-red-500/15 rounded-2xl p-4 flex items-start gap-3"><AlertCircle className="text-red-400 shrink-0 mt-0.5" size={16} /><div className="text-xs text-red-200/80 font-medium">{error}</div></div>
                 )}
              </div>
              
              <div className="p-7 pt-5 border-t border-white/[0.04] bg-black/20 shrink-0">
                 <button onClick={handleSubmit} disabled={loading || isLimitReached} className="w-full py-4 bg-gradient-to-r from-gold-600 to-amber-600 hover:from-gold-500 hover:to-amber-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-gold-500/20 transition-all flex items-center justify-center gap-2.5 disabled:opacity-40">
                    {loading ? <Loader2 className="animate-spin" size={18} /> : isLimitReached ? 'Limit Reached' : <>Confirm Registration <ChevronRight size={16} /></>}
                 </button>
              </div>
           </div>
        ) : (
            <div className="flex flex-col items-center justify-center flex-1 p-7 sm:p-10 text-center animate-in zoom-in-50 duration-700">
               <div className="w-20 h-20 bg-gradient-to-br from-gold-400 to-amber-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-gold-500/20 mb-6 rotate-12 transition-transform duration-500">
                  <Check size={40} className="text-black" />
               </div>
               
               <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-tighter">Thank You!</h2>
               <div className="flex items-center gap-2 mb-6">
                   <div className="h-px w-8 bg-gold-500/30" />
                   <span className="text-[10px] font-black text-gold-500 uppercase tracking-[0.2em]">Registration Received</span>
                   <div className="h-px w-8 bg-gold-500/30" />
               </div>

               <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 w-full mb-8 backdrop-blur-xl relative overflow-hidden group">
                   <div className="absolute top-0 right-0 p-4 opacity-5">
                       <Shield size={64} className="text-gold-500" />
                   </div>
                   
                   <div className="relative z-10">
                       <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mb-1.5">Your Registration ID</p>
                       <h3 className="text-2xl font-black text-gold-400 font-mono tracking-wider mb-4">
                          {submittedReg?.reg_id || 'Generating...'}
                       </h3>
                       
                       <div className="flex items-center justify-center gap-3 py-2 px-4 bg-white/[0.05] rounded-xl border border-white/5 w-fit mx-auto">
                           <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                           <span className="text-[10px] font-black text-white/80 uppercase tracking-widest">
                              Status: <span className="text-white capitalize">{submittedReg?.status || 'Pending'}</span>
                           </span>
                       </div>
                   </div>
               </div>

               <div className="flex items-center gap-2 text-emerald-400/60 mb-8">
                   <Shield size={14} />
                   <span className="text-[10px] font-bold uppercase tracking-widest">Registration Protected & Secured</span>
               </div>
               
               <button onClick={onClose} className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] transition-all hover:border-gold-500/30">Finish registration</button>
            </div>
          )}
       </div>
    </div>,
    document.body
  );
};
