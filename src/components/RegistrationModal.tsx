import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, User, Users, Mail, Phone, BookOpen, ChevronRight, Check, Loader2, AlertCircle, Building2 } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import confetti from 'canvas-confetti';
import 'canvas-confetti'; // Ensure side-effects if needed, though mostly used as default import

interface RegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: number;
  eventTitle: string;
  previewOverrides?: any;
}

export const RegistrationModal: React.FC<RegistrationModalProps> = ({ isOpen, onClose, eventId, eventTitle, previewOverrides }) => {
  const { events, siteSettings, addRegistration, user: dbUser } = useData() as any;
  const { user } = useAuth();
  
  const [mode, setMode] = useState<'individual' | 'team'>('individual');
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string>('');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    institution: '',
    participant_type: '',
    team_name: '',
    team_members: [] as { name: string; email?: string }[]
  });

  // Get Event & Settings (or use overrides for preview)
  const event = previewOverrides?.events?.find((e: any) => e.id === eventId) || events.find((e: any) => e.id === eventId);
  const settings = previewOverrides?.siteSettings || siteSettings;

  // Derive Configuration
  const isTeamAllowed = event?.registration_default_mode === 'team' || !event?.registration_mode_locked;
  const minTeamSize = event?.team_min_members || 2;
  const maxTeamSize = event?.team_max_members || 5;
  const participantTypes = event?.registration_participant_types?.length > 0 
    ? event.registration_participant_types 
    : settings?.registration_participant_types || ['Student', 'Faculty', 'Guest'];
  
  const showInstitution = settings?.registration_institution_visible !== false;
  const isInstitutionOptional = settings?.registration_institution_optional === true;

  // Pre-fill user data if logged in
  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('form');
      setLoading(false);
      setError(null);
      // Only set mode if not already set or force default if needed
      if (event?.registration_default_mode) {
           setMode(event.registration_default_mode === 'team' ? 'team' : 'individual');
      }
    }
  }, [isOpen]); // Only runs when open state changes

  // Pre-fill user data if logged in
  useEffect(() => {
    if (isOpen && user) {
      setFormData(prev => ({
        ...prev,
        name: user.user_metadata?.full_name || prev.name,
        phone: (dbUser as any)?.phone || prev.phone,
        institution: (dbUser as any)?.institution || prev.institution, 
      }));
    }
  }, [isOpen, user, dbUser]); // Runs when user data loads

  // Auto-close on success
  useEffect(() => {
    if (step === 'success') {
      const timer = setTimeout(() => {
        onClose();
      }, 60000); // 1 minute
      return () => clearTimeout(timer);
    }
  }, [step, onClose]);

  // Team Member Management
  const addTeamMember = () => {
    if (formData.team_members.length < maxTeamSize - 1) { // -1 because captain counts as 1
      setFormData(prev => ({
        ...prev,
        team_members: [...prev.team_members, { name: '', email: '' }]
      }));
    }
  };

  const removeTeamMember = (index: number) => {
    setFormData(prev => ({
      ...prev,
      team_members: prev.team_members.filter((_, i) => i !== index)
    }));
  };

  const updateTeamMember = (index: number, field: 'name' | 'email', value: string) => {
    const newMembers = [...formData.team_members];
    newMembers[index] = { ...newMembers[index], [field]: value };
    setFormData(prev => ({ ...prev, team_members: newMembers }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.name.trim()) return setError('Name is required.');
    if (!formData.email.trim()) return setError('Email is required.');
    if (!formData.phone.trim() || formData.phone.length < 10) return setError('Valid phone number is required.');
    if (showInstitution && !isInstitutionOptional && !formData.institution.trim()) return setError('Institution/College is required.');
    if (!formData.participant_type) return setError('Please select your participant type (e.g. Year).');

    if (mode === 'team') {
      if (!formData.team_name.trim()) return setError('Team Name is required.');
      const currentSize = 1 + formData.team_members.filter(m => m.name.trim()).length;
      if (currentSize < minTeamSize) return setError(`Team must have at least ${minTeamSize} members.`);
      
      // Check for empty member names
      if (formData.team_members.some(m => !m.name.trim())) return setError('All team member names are required.');
    }

      setLoading(true);
      
      // Generate sequential ID
      let newId = 'RICO1';
      try {
        const { data: lastReg } = await supabase
          .from('registrations')
          .select('id')
          .like('id', 'RICO%')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (lastReg && lastReg.id) {
           const match = lastReg.id.match(/^RICO(\d+)$/);
           if (match) {
             const num = parseInt(match[1], 10);
             if (!isNaN(num)) {
               newId = `RICO${num + 1}`;
             }
           }
        }
      } catch (err) {
        console.warn('Failed to generate sequential ID, falling back to random', err);
        newId = `RICO${Math.floor(100000 + Math.random() * 900000)}`;
      }

      try {
      // Prepare payload
      const payload = {
        event_id: eventId,
        event_title: eventTitle,
        is_team_registration: mode === 'team',
        team_name: mode === 'team' ? formData.team_name : undefined,
        full_name: formData.name,
        email: formData.email,
        phone: formData.phone,
        college: formData.institution,
        participant_type: formData.participant_type,
        team_members: mode === 'team' ? formData.team_members : undefined,
        total_members: mode === 'team' ? (formData.team_members.length + 1) : 1,
        registration_date: new Date().toISOString(),
        id: newId,
      };

      if (previewOverrides?.addRegistration) {
        await previewOverrides.addRegistration(payload);
      } else {
        await addRegistration(payload);
      }
      
      // Success!
      setStep('success');
      // Store ID in state for display if needed, but for now we can rely on it being the last action? 
      // Better to pass it to success view. We'll use a temp state or just component state.
      // Let's use a ref or state for the success ID.
      setSuccessId(newId);

      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#a855f7', '#6366f1', '#ec4899', '#ffffff'] // Purple, Indigo, Pink, White
      });

    } catch (err: any) {
      console.error(err);
      const msg = err?.message || '';
      if (msg.includes('duplicate key value') || msg.includes('unique constraint')) {
        // Try to find existing ID from database
        let existingId = null;
        try {
          const { data: existingReg } = await supabase
            .from('registrations')
            .select('id')
            .eq('email', formData.email)
            .eq('event_id', eventId)
            .maybeSingle();
          if (existingReg) existingId = existingReg.id;
        } catch (e) { /* ignore */ }

        if (existingId) {
           setError(`You have already registered for this event! (ID: ${existingId}) Check your email for details.`);
        } else {
           setError(`You have already registered for this event! Check your email for details.`);
        }
      } else {
        setError(msg || 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-[#0f0f1a]/80 backdrop-blur-xl animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-2xl bg-[#13131f] border border-white/10 rounded-3xl shadow-2xl shadow-purple-900/20 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        
        {/* Glow Effects */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-indigo-500 to-pink-500" />
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-all z-10"
        >
          <X size={20} />
        </button>

        {/* Content */}
        {step === 'form' ? (
           <div className="flex flex-col h-full overflow-hidden">
              <div className="p-6 pb-2 shrink-0">
                 <h2 className="text-2xl font-bold text-white tracking-tight pr-8">{eventTitle}</h2>
                 <p className="text-gray-400 text-sm mt-1">Complete your registration below.</p>
              </div>

              <div className="flex-1 overflow-y-auto p-6 pt-2 custom-scrollbar space-y-6">
                 
                 {/* Mode Switcher */}
                 {isTeamAllowed && (
                   <div className="flex p-1 bg-black/20 rounded-xl border border-white/5 relative">
                      <div 
                        className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white/10 rounded-lg border border-white/10 shadow-sm transition-all duration-300 ease-out"
                        style={{ left: mode === 'team' ? 'calc(50% + 2px)' : '2px' }}
                      />
                      <button 
                        type="button"
                        onClick={() => setMode('individual')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold uppercase tracking-wider relative z-10 transition-colors ${mode === 'individual' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                      >
                         <User size={16} /> Individual
                      </button>
                      <button 
                        type="button"
                        onClick={() => setMode('team')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold uppercase tracking-wider relative z-10 transition-colors ${mode === 'team' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                      >
                         <Users size={16} /> Team
                      </button>
                   </div>
                 )}

                 {/* Main Form Fields */}
                 <div className="space-y-4">
                    <div className="group">
                       <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Full Name</label>
                       <div className="relative">
                          <User className="absolute left-3.5 top-3.5 text-gray-500 group-focus-within:text-purple-400 transition-colors" size={18} />
                          <input 
                            type="text" 
                            value={formData.name}
                            onChange={e => setFormData(p => ({...p, name: e.target.value}))}
                            placeholder="John Doe"
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-600 focus:outline-none focus:bg-white/10 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all"
                          />
                       </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       <div className="group">
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Email</label>
                          <div className="relative">
                              <Mail className="absolute left-3.5 top-3.5 text-gray-500 group-focus-within:text-purple-400 transition-colors" size={18} />
                              <input 
                                type="email" 
                                value={formData.email}
                                onChange={e => setFormData(p => ({...p, email: e.target.value}))}
                                placeholder="john@example.com"
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-600 focus:outline-none focus:bg-white/10 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all"
                              />
                          </div>
                       </div>
                       <div className="group">
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Phone</label>
                          <div className="relative">
                              <Phone className="absolute left-3.5 top-3.5 text-gray-500 group-focus-within:text-purple-400 transition-colors" size={18} />
                              <input 
                                type="tel" 
                                value={formData.phone}
                                onChange={e => {
                                  const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                                  setFormData(p => ({...p, phone: val}));
                                }}
                                placeholder="9876543210"
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-600 focus:outline-none focus:bg-white/10 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all"
                              />
                          </div>
                       </div>
                    </div>

                    {showInstitution && (
                      <div className="group">
                         <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">
                           Institution / College
                           {isInstitutionOptional && <span className="ml-2 text-gray-600 font-normal normal-case">(Optional)</span>}
                         </label>
                         <div className="relative">
                            <Building2 className="absolute left-3.5 top-3.5 text-gray-500 group-focus-within:text-purple-400 transition-colors" size={18} />
                            <input 
                              type="text" 
                              value={formData.institution}
                              onChange={e => setFormData(p => ({...p, institution: e.target.value}))}
                              placeholder="Your University / College Name"
                              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-600 focus:outline-none focus:bg-white/10 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all"
                            />
                         </div>
                      </div>
                    )}

                    <div className="group">
                       <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Participant Type</label>
                       <div className="relative">
                          <BookOpen className="absolute left-3.5 top-3.5 text-gray-500 group-focus-within:text-purple-400 transition-colors" size={18} />
                          <select 
                            value={formData.participant_type}
                            onChange={e => setFormData(p => ({...p, participant_type: e.target.value}))}
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-10 text-white placeholder-gray-600 focus:outline-none focus:bg-white/10 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all appearance-none [&>option]:bg-[#13131f]"
                          >
                             <option value="">Select Option...</option>
                             {participantTypes.map((t: string) => (
                               <option key={t} value={t}>{t}</option>
                             ))}
                          </select>
                          <ChevronRight className="absolute right-3.5 top-3.5 text-gray-600 rotate-90 pointer-events-none" size={16} />
                       </div>
                    </div>
                 </div>

                 {/* Team Section */}
                 {mode === 'team' && (
                    <div className="space-y-4 pt-4 border-t border-white/5 animate-in slide-in-from-top-4">
                       <h3 className="text-sm font-bold text-white flex items-center gap-2">
                          <Users className="text-purple-400" size={16} />
                          Team Details
                       </h3>
                       
                       <div className="group">
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Team Name</label>
                          <input 
                            type="text" 
                            value={formData.team_name}
                            onChange={e => setFormData(p => ({...p, team_name: e.target.value}))}
                            placeholder="Radical Racers"
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder-gray-600 focus:outline-none focus:bg-white/10 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all"
                          />
                       </div>

                       <div className="space-y-3">
                          <div className="flex justify-between items-center">
                             <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest">Team Members</label>
                             <span className="text-[10px] text-gray-400 uppercase tracking-wider">{formData.team_members.length + 1} / {maxTeamSize} Members</span>
                          </div>
                          
                          {formData.team_members.map((member, idx) => (
                             <div key={idx} className="flex gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
                                <div className="flex-1 space-y-2">
                                   <input 
                                      type="text"
                                      value={member.name}
                                      onChange={e => updateTeamMember(idx, 'name', e.target.value)}
                                      placeholder={`Member ${idx + 2} Name`}
                                      className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-purple-500/50"
                                   />
                                </div>
                                <button 
                                  type="button"
                                  onClick={() => removeTeamMember(idx)}
                                  className="px-3 rounded-lg border border-white/5 hover:bg-white/5 text-gray-500 hover:text-red-400 transition-colors"
                                >
                                  <X size={16} />
                                </button>
                             </div>
                          ))}

                          {formData.team_members.length < maxTeamSize - 1 && (
                             <button 
                               type="button"
                               onClick={addTeamMember}
                               className="w-full py-2 border border-dashed border-white/10 rounded-lg text-xs font-bold text-gray-500 uppercase tracking-widest hover:text-white hover:border-white/20 transition-all"
                             >
                               + Add Member
                             </button>
                          )}
                       </div>
                    </div>
                 )}

                 {/* Error Message */}
                 {error && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3 animate-in shake">
                       <AlertCircle className="text-red-400 shrink-0 mt-0.5" size={18} />
                       <div className="text-sm text-red-200">{error}</div>
                    </div>
                 )}
              </div>
              
              {/* Footer */}
              <div className="p-6 border-t border-white/5 bg-[#0f0f1a]/50 backdrop-blur-md shrink-0">
                 <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-bold text-sm uppercase tracking-widest shadow-lg shadow-purple-900/20 hover:shadow-purple-900/40 transform active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
                 >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : <div className="flex items-center gap-2">Confirm Registration <ChevronRight size={18} /></div>}
                 </button>
              </div>
           </div>
        ) : (
           /* Success Step */
           <div className="flex flex-col items-center justify-center h-full p-8 text-center animate-in zoom-in-50 duration-500">
              <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center shadow-2xl shadow-emerald-500/30 mb-6">
                 <Check size={48} className="text-white" strokeWidth={4} />
              </div>
              <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">You're In!</h2>
              <p className="text-gray-400 max-w-sm mb-8 leading-relaxed">
                 Your registration for <span className="text-purple-400 font-bold">{eventTitle}</span> was successful!
                 <br/><br/>
                 <span className="text-white bg-white/10 px-3 py-1 rounded-lg border border-white/10">ID: <span className="font-mono font-bold text-purple-300">{successId}</span></span>
                 <br/><br/>
                 We have sent the ticket and further details to your email.
              </p>
              
              <div className="space-y-3 w-full max-w-xs">
                 <button
                    onClick={onClose}
                    className="w-full py-3 bg-white/10 hover:bg-white/20 border border-white/10 text-white rounded-xl font-bold text-sm uppercase tracking-widest transition-all"
                 >
                    Close Now
                 </button>
                 <p className="text-[10px] text-gray-500 animate-pulse">Closing automatically in 1 minute...</p>
              </div>
           </div>
        )}
      </div>
    </div>,
    document.body
  );
};
