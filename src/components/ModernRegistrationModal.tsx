import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  User, 
  Shield, 
  Briefcase, 
  Upload, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Camera,
  Star,
  Users
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useAnnualSports } from '../context/AnnualSportsContext';
import { useSportsData } from '../context/SportsContext';
import { useData } from '../context/DataContext';
import { AnnualSportsEvent, AnnualSportsRegistration, SportsRegistration, SportsSeason } from '../types/data';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';
import gsap from 'gsap';

// --- Utility Functions ---

const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (loaderEv) => {
      const img = new Image();
      img.src = loaderEv.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 600;
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/webp', 0.7));
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
};

// --- Interfaces ---

interface DynamicField {
  name: string;
  label: string;
  type?: 'text' | 'tel' | 'email' | 'select' | 'number' | 'textarea';
  required?: boolean;
  options?: string[];
  placeholder?: string;
}

interface ModernRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'annual' | 'legacy';
  targetId: string;
  targetTitle: string;
  targetData?: AnnualSportsEvent | SportsSeason | null;
  config?: { customFields: DynamicField[] };
}

// --- Component ---

export const ModernRegistrationModal: React.FC<ModernRegistrationModalProps> = ({
  isOpen,
  onClose,
  type,
  targetId,
  targetTitle,
  targetData,
  config
}) => {
  const { user } = useAuth();
  const { addAnnualRegistration } = useAnnualSports();
  const { addSportsRegistration } = useSportsData();
  const { siteSettings } = useData() as any;
  
  // Registration Flow State
  const [activeStep, setActiveStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const totalSteps = 4;
  
  // Form State
  const [formData, setFormData] = useState({
    fullName: user?.user_metadata?.full_name || '',
    email: user?.email || '',
    phone: '',
    whatsapp: '',
    college: '',
    department: '',
    year: '',
    rollNo: '',
    participantType: 'Student',
    role: 'Player',
    photoUrl: user?.user_metadata?.avatar_url || '',
    customFields: {} as Record<string, string>,
    isTeam: false,
    teamName: '',
    teamMembers: [] as string[]
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const modalRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Animation Effects
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      gsap.fromTo(modalRef.current, 
        { opacity: 0, scale: 0.95, backdropFilter: 'blur(0px)' },
        { opacity: 1, scale: 1, backdropFilter: 'blur(24px)', duration: 0.4, ease: 'power2.out' }
      );
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      gsap.fromTo(contentRef.current,
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.3, delay: 0.1, ease: 'power1.out' }
      );
    }
  }, [activeStep, isOpen]);

  // Image Upload Logic
  const handleImageUpload = async (file: File) => {
    try {
      setIsSubmitting(true);
      const compressed = await compressImage(file);
      
      // Convert data URL to Blob for reliable upload
      const response = await fetch(compressed);
      const blob = await response.blob();
      
      const fileName = `${Date.now()}-${user?.id || 'anon-' + Math.random().toString(36).substring(2, 9)}.webp`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('registration-photos')
        .upload(fileName, blob, { contentType: 'image/webp', upsert: false });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('registration-photos')
        .getPublicUrl(uploadData.path);

      setFormData(prev => ({ ...prev, photoUrl: publicUrl }));
      toast.success('Photo uploaded successfully');
    } catch (err) {
      console.error('Upload error:', err);
      const error = err as Error;
      toast.error('Upload failed: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Validation Logic
  const validateStep = (step: number) => {
    const newErrors: Record<string, string> = {};
    if (step === 1) {
      if (!formData.fullName.trim()) newErrors.fullName = 'Full Name is required';
      if (!formData.email.trim()) newErrors.email = 'Email is required';
      if (!formData.phone.trim()) newErrors.phone = 'Phone Number is required';
      if (!formData.college.trim()) newErrors.college = 'College is required';
      
      const isPhotoRequired = siteSettings?.annual_registration_config?.photo_required !== false;
      if (isPhotoRequired && !formData.photoUrl) {
        newErrors.photoUrl = 'Profile picture is required';
      }
    } else if (step === 3) {
      fieldsToRender.forEach(field => {
        if (field.required && !formData.customFields[field.name]?.trim()) {
          newErrors[field.name] = `${field.label} is required`;
        }
      });
      if (formData.isTeam && !formData.teamName.trim()) {
        newErrors.teamName = 'Team Name is required';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextStep = () => {
    if (validateStep(activeStep)) {
      setActiveStep(prev => prev + 1);
    } else {
      toast.error('Please fill all required fields correctly');
    }
  };

  // Submission Logic
  const handleSubmit = async () => {
    if (!validateStep(3)) {
      toast.error('Please fix the errors in Step 3');
      setActiveStep(3);
      return;
    }
    
    // Check global criteria
    if (type === 'annual' && targetData) {
      if (formData.isTeam) {
        // More team validation could go here if team members were implemented
      }
    }

    setIsSubmitting(true);
    try {
      if (type === 'annual') {
        const registrationData: Partial<AnnualSportsRegistration> = {
          event_id: targetId,
          full_name: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          college: formData.college,
          department: formData.department,
          year: formData.year,
          roll_no: formData.rollNo,
          participant_type: formData.participantType,
          photo_url: formData.photoUrl,
          metadata: {
            ...formData.customFields,
            whatsapp: formData.whatsapp,
            is_team: formData.isTeam,
            team_name: formData.teamName,
            team_members: formData.teamMembers
          },
          status: 'pending' as const
        };
        await addAnnualRegistration(registrationData as AnnualSportsRegistration);
      } else {
        const legacyData: Partial<SportsRegistration> = {
          sport_id: parseInt(targetId),
          name: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          position_preference: formData.role, 
          photo_url: formData.photoUrl,
          institution: formData.college,
          year_or_class: formData.year,
          metadata: {
            ...formData.customFields,
            whatsapp: formData.whatsapp,
            department: formData.department,
            roll_no: formData.rollNo
          },
          status: 'pending' as const
        };
        await addSportsRegistration(legacyData); 
      }

      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FFD700', '#FFFFFF', '#4169E1']
      });

      onClose();
    } catch (err) {
      const error = err as Error;
      toast.error('Submission failed: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const currentActivityData = targetData as AnnualSportsEvent;
  const participantTypes = currentActivityData?.registration_participant_types?.length 
    ? currentActivityData.registration_participant_types 
    : (siteSettings?.annual_registration_config?.participant_types || ['Student', 'Faculty']);

  const fieldsToRender: DynamicField[] = (type === 'annual' 
    ? (currentActivityData?.custom_fields?.length 
        ? currentActivityData.custom_fields 
        : (siteSettings?.annual_registration_config?.form_fields?.filter((f: any) => !['fullName', 'email', 'phone', 'college', 'department', 'year', 'rollNo'].includes(f.name)) || [])
      )
    : (config?.customFields || [])) as DynamicField[];

  return (
    <div 
      ref={modalRef}
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4 md:p-6 bg-black/60 backdrop-blur-xl"
    >
      <div className="relative w-full max-w-2xl bg-[#0c0c14]/90 border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-blue-500/10">
        
        {/* Background Accents */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-gold-600/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />

        {/* Header */}
        <div className="relative p-6 md:p-8 flex items-center justify-between border-b border-white/5 bg-white/[0.02]">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-white via-white/80 to-white/40 bg-clip-text text-transparent">
              {targetTitle}
            </h2>
            <p className="text-white/50 text-sm mt-1">Complete your registration profile</p>
          </div>
          <button 
            onClick={onClose}
            className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all hover:rotate-90 text-white/70"
          >
            <X size={20} />
          </button>
        </div>

        {/* Stepper */}
        <div className="px-8 py-6 relative">
          <div className="flex items-center justify-between mb-8">
            {[1, 2, 3, 4].map((stepNumber) => (
              <div key={stepNumber} className="flex flex-col items-center relative z-10">
                <div 
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 ${
                    activeStep >= stepNumber 
                      ? 'bg-gradient-to-br from-gold-400 to-gold-600 text-black shadow-lg shadow-gold-500/40 scale-110' 
                      : 'bg-white/10 text-white/70 border border-white/20'
                  }`}
                >
                  {activeStep > stepNumber ? <CheckCircle2 size={18} /> : stepNumber}
                </div>
                <span className={`text-[10px] mt-2 font-black uppercase tracking-widest ${
                  activeStep === stepNumber ? 'text-gold-400' : 'text-white/60'
                }`}>
                  {stepNumber === 1 ? 'Bio' : stepNumber === 2 ? 'Role' : stepNumber === 3 ? 'Fields' : 'Review'}
                </span>
              </div>
            ))}
            {/* Progress Lines */}
            <div className="absolute top-11 left-12 right-12 h-[2px] bg-white/5 -z-10" />
            <div 
              className="absolute top-11 left-12 h-[2px] bg-gradient-to-r from-gold-400 to-gold-600 transition-all duration-500 -z-10 shadow-[0_0_8px_rgba(255,215,0,0.4)]" 
              style={{ width: `${((activeStep - 1) / (totalSteps - 1)) * 80}%` }}
            />
          </div>

          {/* Form Content */}
          <div ref={contentRef} className="min-h-[400px]">
            {activeStep === 1 && (
              <div className="space-y-6">
                <div className="flex flex-col items-center mb-6">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden group-hover:border-gold-500/50 transition-all">
                      {formData.photoUrl ? (
                        <img src={formData.photoUrl} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <Camera className="text-white/20" size={32} />
                      )}
                    </div>
                    <label className="absolute -right-2 -bottom-2 p-2 bg-gold-500 rounded-xl cursor-pointer hover:scale-110 transition-transform shadow-lg">
                      <Upload size={14} className="text-black" />
                      <input type="file" className="hidden" accept="image/*" onChange={(ev) => ev.target.files?.[0] && handleImageUpload(ev.target.files[0])} />
                    </label>
                  </div>
                  <span className="text-[10px] text-white/30 mt-3 uppercase tracking-tighter">
                    Upload Profile Picture 
                    {siteSettings?.annual_registration_config?.photo_required !== false && <span className="text-rose-500 ml-1">*</span>}
                  </span>
                  {errors.photoUrl && <span className="text-[10px] text-rose-500 mt-1 uppercase font-bold">{errors.photoUrl}</span>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[300px] overflow-y-auto px-1 pt-1 custom-scrollbar">
                  <div className="space-y-2">
                    <label className="text-xs text-white/50 ml-1">Full Name</label>
                    <input 
                      type="text" 
                      value={formData.fullName}
                      onChange={(ev) => setFormData(prev => ({ ...prev, fullName: ev.target.value }))}
                      className={`w-full bg-white/5 border rounded-2xl py-3 px-4 text-white focus:outline-none focus:border-gold-500/50 transition-all ${errors.fullName ? 'border-rose-500/50' : 'border-white/10'}`}
                      placeholder="Enter your name"
                    />
                    {errors.fullName && <p className="text-[10px] text-rose-500/80 ml-1 font-medium">{errors.fullName}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-white/50 ml-1">Email</label>
                    <input 
                      type="email" 
                      value={formData.email}
                      onChange={(ev) => setFormData(prev => ({ ...prev, email: ev.target.value }))}
                      className={`w-full bg-white/5 border rounded-2xl py-3 px-4 text-white focus:outline-none focus:border-gold-500/50 transition-all ${errors.email ? 'border-rose-500/50' : 'border-white/10'}`}
                      placeholder="Email address"
                    />
                    {errors.email && <p className="text-[10px] text-rose-500/80 ml-1 font-medium">{errors.email}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-white/50 ml-1">Phone Number</label>
                    <input 
                      type="tel" 
                      value={formData.phone}
                      onChange={(ev) => setFormData(prev => ({ ...prev, phone: ev.target.value }))}
                      className={`w-full bg-white/5 border rounded-2xl py-3 px-4 text-white focus:outline-none focus:border-gold-500/50 transition-all ${errors.phone ? 'border-rose-500/50' : 'border-white/10'}`}
                      placeholder="+91..."
                    />
                    {errors.phone && <p className="text-[10px] text-rose-500/80 ml-1 font-medium">{errors.phone}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-white/50 ml-1">College/Institution</label>
                    <input 
                      type="text" 
                      value={formData.college}
                      onChange={(ev) => setFormData(prev => ({ ...prev, college: ev.target.value }))}
                      className={`w-full bg-white/5 border rounded-2xl py-3 px-4 text-white focus:outline-none focus:border-gold-500/50 transition-all ${errors.college ? 'border-rose-500/50' : 'border-white/10'}`}
                      placeholder="College name"
                    />
                    {errors.college && <p className="text-[10px] text-rose-500/80 ml-1 font-medium">{errors.college}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-white/50 ml-1">Department</label>
                    <input 
                      type="text" 
                      value={formData.department}
                      onChange={(ev) => setFormData(prev => ({ ...prev, department: ev.target.value }))}
                      className={`w-full bg-white/5 border rounded-2xl py-3 px-4 text-white focus:outline-none focus:border-gold-500/50 transition-all ${errors.department ? 'border-rose-500/50' : 'border-white/10'}`}
                      placeholder="e.g. CSE, ME"
                    />
                    {errors.department && <p className="text-[10px] text-rose-500/80 ml-1 font-medium">{errors.department}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-white/50 ml-1">Year / Batch</label>
                    <input 
                      type="text" 
                      value={formData.year}
                      onChange={(ev) => setFormData(prev => ({ ...prev, year: ev.target.value }))}
                      className={`w-full bg-white/5 border rounded-2xl py-3 px-4 text-white focus:outline-none focus:border-gold-500/50 transition-all ${errors.year ? 'border-rose-500/50' : 'border-white/10'}`}
                      placeholder="e.g. 2nd Year, 2024"
                    />
                    {errors.year && <p className="text-[10px] text-rose-500/80 ml-1 font-medium">{errors.year}</p>}
                  </div>
                  <div className="col-span-1 md:col-span-2 space-y-2">
                    <label className="text-xs text-white/50 ml-1">Roll No / SID</label>
                    <input 
                      type="text" 
                      value={formData.rollNo}
                      onChange={(ev) => setFormData(prev => ({ ...prev, rollNo: ev.target.value }))}
                      className={`w-full bg-white/5 border rounded-2xl py-3 px-4 text-white focus:outline-none focus:border-gold-500/50 transition-all ${errors.rollNo ? 'border-rose-500/50' : 'border-white/10'}`}
                      placeholder="Unique Identification Number"
                    />
                    {errors.rollNo && <p className="text-[10px] text-rose-500/80 ml-1 font-medium">{errors.rollNo}</p>}
                  </div>
                </div>
              </div>
            )}

            {activeStep === 2 && (
              <div className="space-y-8 py-4">
                <div className="text-center">
                  <h3 className="text-lg font-medium text-white mb-2">Select Your Role</h3>
                  <p className="text-sm text-white/40">Choose how you wish to participate in this activity.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {type === 'annual' ? (
                    participantTypes.map((ptype: string) => (
                      <button
                        key={ptype}
                        onClick={() => setFormData(prev => ({ ...prev, participantType: ptype }))}
                        className={`group p-6 rounded-3xl border transition-all text-left relative overflow-hidden ${
                          formData.participantType === ptype 
                            ? 'bg-gold-500/10 border-gold-500/50 shadow-lg shadow-gold-500/5' 
                            : 'bg-white/5 border-white/10 hover:border-gold-500/30'
                        }`}
                      >
                        <div className={`w-12 h-12 rounded-2xl mb-4 flex items-center justify-center transition-all ${
                          formData.participantType === ptype ? 'bg-gold-500 text-black' : 'bg-white/5 text-white/40 group-hover:text-gold-400'
                        }`}>
                          {ptype === 'Student' ? <User size={24} /> : ptype === 'Faculty' ? <Shield size={24} /> : <Briefcase size={24} />}
                        </div>
                        <h4 className="text-lg font-bold text-white mb-1">{ptype}</h4>
                        <p className="text-xs text-white/40">Register as a qualified {ptype.toLowerCase()} participant.</p>
                        {formData.participantType === ptype && (
                          <div className="absolute top-4 right-4 text-gold-500">
                            <CheckCircle2 size={24} />
                          </div>
                        )}
                      </button>
                    ))
                  ) : (
                    ['Player', 'Owner'].map((legacyRole) => (
                      <button
                        key={legacyRole}
                        onClick={() => setFormData(prev => ({ ...prev, role: legacyRole }))}
                        className={`group p-6 rounded-3xl border transition-all text-left relative overflow-hidden ${
                          formData.role === legacyRole 
                            ? 'bg-gold-500/10 border-gold-500/50 shadow-lg shadow-gold-500/5' 
                            : 'bg-white/5 border-white/10 hover:border-gold-500/30'
                        }`}
                      >
                        <div className={`w-12 h-12 rounded-2xl mb-4 flex items-center justify-center transition-all ${
                          formData.role === legacyRole ? 'bg-gold-500 text-black' : 'bg-white/5 text-white/40 group-hover:text-gold-400'
                        }`}>
                          {legacyRole === 'Player' ? <User size={24} /> : <Shield size={24} />}
                        </div>
                        <h4 className="text-lg font-bold text-white mb-1">{legacyRole}</h4>
                        <p className="text-xs text-white/40">Participate as a {legacyRole.toLowerCase()}.</p>
                        {formData.role === legacyRole && (
                          <div className="absolute top-4 right-4 text-gold-500">
                            <CheckCircle2 size={24} />
                          </div>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeStep === 3 && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h3 className="text-lg font-medium text-white mb-2">Activity Specific Details</h3>
                  <p className="text-sm text-white/40">We need a few more pieces of information.</p>
                </div>

                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {fieldsToRender.map((field) => (
                    <div key={field.name} className="space-y-2">
                      <label className="text-xs text-white/50 ml-1">
                        {field.label} {field.required && <span className="text-rose-500">*</span>}
                      </label>
                      {field.type === 'select' ? (
                        <select
                          value={formData.customFields[field.name] || ''}
                          onChange={(ev) => setFormData(prev => ({
                            ...prev,
                            customFields: { ...prev.customFields, [field.name]: ev.target.value }
                          }))}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-white focus:outline-none focus:border-gold-500/50 transition-all appearance-none"
                        >
                          <option value="" className="bg-[#0c0c14]">Select an option</option>
                          {field.options?.map((opt: string) => (
                            <option key={opt} value={opt} className="bg-[#0c0c14]">{opt}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={field.type === 'textarea' ? 'text' : (field.type || 'text')}
                          value={formData.customFields[field.name] || ''}
                          onChange={(ev) => setFormData(prev => ({
                            ...prev,
                            customFields: { ...prev.customFields, [field.name]: ev.target.value }
                          }))}
                          className={`w-full bg-white/5 border rounded-2xl py-3 px-4 text-white focus:outline-none focus:border-gold-500/50 transition-all ${errors[field.name] ? 'border-rose-500/50' : 'border-white/10'}`}
                          placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                        />
                      )}
                      {errors[field.name] && <p className="text-[10px] text-rose-500/80 ml-1 font-medium">{errors[field.name]}</p>}
                    </div>
                  ))}

                  {/* WhatsApp is standard */}
                  <div className="space-y-2">
                    <label className="text-xs text-white/50 ml-1">WhatsApp Number (Optional)</label>
                    <input 
                      type="tel" 
                      value={formData.whatsapp}
                      onChange={(ev) => setFormData(prev => ({ ...prev, whatsapp: ev.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-white focus:outline-none focus:border-gold-500/50 transition-all"
                      placeholder="+91..."
                    />
                  </div>

                  {/* Team Toggle for Annual if allowed */}
                  {type === 'annual' && currentActivityData?.registration_default_mode === 'team' && (
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Users size={20} className="text-gold-500" />
                          <div>
                            <h5 className="text-sm font-medium text-white">Team Registration</h5>
                            <p className="text-[10px] text-white/40">Register as a group</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => setFormData(prev => ({ ...prev, isTeam: !prev.isTeam }))}
                          className={`w-12 h-6 rounded-full transition-all flex items-center p-1 ${formData.isTeam ? 'bg-gold-500' : 'bg-white/10'}`}
                        >
                          <div className={`w-4 h-4 rounded-full bg-white transition-all ${formData.isTeam ? 'translate-x-6' : 'translate-x-0'}`} />
                        </button>
                      </div>
                      
                      {formData.isTeam && (
                        <div className="space-y-3 pt-2">
                          <input 
                            type="text" 
                            placeholder="Team Name"
                            value={formData.teamName}
                            onChange={(ev) => setFormData(prev => ({ ...prev, teamName: ev.target.value }))}
                            className={`w-full bg-white/5 border rounded-xl py-2 px-4 text-white text-sm focus:outline-none focus:border-gold-500/50 ${errors.teamName ? 'border-rose-500/50' : 'border-white/10'}`}
                          />
                          {errors.teamName && <p className="text-[10px] text-rose-500/80 ml-1 font-medium">{errors.teamName}</p>}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeStep === 4 && (
              <div className="space-y-6">
                <div className="p-6 bg-gradient-to-br from-white/[0.03] to-transparent rounded-[2rem] border border-white/10">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden border border-gold-500/30">
                      <img src={formData.photoUrl || 'https://via.placeholder.com/150'} alt="Profile" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-white">{formData.fullName}</h4>
                      <div className="flex items-center gap-2 text-gold-400 text-xs mt-1">
                        <Star size={12} fill="currentColor" />
                        <span className="uppercase tracking-widest">{type === 'annual' ? formData.participantType : formData.role}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-sm">
                    <div>
                      <span className="text-white/30 text-[10px] uppercase block mb-1">Activity</span>
                      <span className="text-white">{targetTitle}</span>
                    </div>
                    <div>
                      <span className="text-white/30 text-[10px] uppercase block mb-1">Roll No</span>
                      <span className="text-white">{formData.rollNo || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-white/30 text-[10px] uppercase block mb-1">Dept / Year</span>
                      <span className="text-white">{formData.department} ({formData.year})</span>
                    </div>
                    <div>
                      <span className="text-white/30 text-[10px] uppercase block mb-1">Phone</span>
                      <span className="text-white">{formData.phone || 'N/A'}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-white/30 text-[10px] uppercase block mb-1">College</span>
                      <span className="text-white truncate block">{formData.college || 'N/A'}</span>
                    </div>
                    {formData.isTeam && (
                      <div className="col-span-2">
                        <span className="text-white/30 text-[10px] uppercase block mb-1">Team Details</span>
                        <span className="text-gold-400 font-medium">Team: {formData.teamName}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl">
                  <AlertCircle size={18} className="text-blue-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-blue-300 leading-relaxed">
                    By submitting this form, you certify that all information provided is accurate. 
                    Your registration will be reviewed by the coordinators for verification.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-8 border-t border-white/5 bg-white/[0.02] flex items-center justify-between">
          <button
            onClick={() => activeStep > 1 && setActiveStep(activeStep - 1)}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-medium transition-all ${
              activeStep === 1 ? 'opacity-0 cursor-default' : 'text-white/50 hover:text-white hover:bg-white/5'
            }`}
             disabled={isSubmitting}
          >
            <ChevronLeft size={18} />
            Back
          </button>

          {activeStep < totalSteps ? (
            <button
              onClick={handleNextStep}
              className="flex items-center gap-2 px-8 py-3 bg-white text-black rounded-2xl text-sm font-bold hover:bg-gold-400 transition-all hover:scale-105 active:scale-95 shadow-xl shadow-gold-500/10"
              disabled={isSubmitting}
            >
              Continue
              <ChevronRight size={18} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-3 px-10 py-3 bg-gradient-to-r from-gold-400 to-gold-600 text-black rounded-2xl text-sm font-bold hover:shadow-[0_0_20px_rgba(255,215,0,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Submitting
                </>
              ) : (
                <>
                  <CheckCircle2 size={18} />
                  Complete Registration
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
