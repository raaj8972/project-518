import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useOutletContext } from 'react-router-dom';
import { 
  User, 
  Phone, 
  GraduationCap, 
  ChevronDown,
  Camera,
  Upload,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { ImageCropper } from '../../components/ImageCropper';

interface DashboardContextType {
  user: any;
  profile: any;
  updateProfile: (data: any) => Promise<any>;
  batchOptions: string[];
  showCollege: boolean;
  handlePhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleCropComplete: (blob: Blob) => Promise<void>;
  imageToCrop: string | null;
  setImageToCrop: (url: string | null) => void;
  uploading: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
}

const Settings: React.FC = () => {
  const { 
    profile, 
    updateProfile, 
    batchOptions, 
    showCollege,
    handlePhotoUpload,
    handleCropComplete,
    imageToCrop,
    setImageToCrop,
    uploading,
    fileInputRef
  } = useOutletContext<DashboardContextType>();

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [college, setCollege] = useState(profile?.college || '');
  const [batch, setBatch] = useState(profile?.batch || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
      setCollege(profile.college || '');
      setBatch(profile.batch || '');
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await updateProfile({
        full_name: fullName,
        phone: phone,
        college: showCollege ? college : 'N/A',
        batch,
        participant_type: batch
      });
      if (error) throw error;
      toast.success('Profile updated successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      key="settings"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="max-w-2xl mx-auto"
    >
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Profile Settings</h1>
        <p className="text-gray-400">Manage your personal information and account details.</p>
      </div>

      <div className="rico-glass-card p-8 rounded-3xl border border-white/10 bg-white/5 space-y-10">
        {/* Photo Section */}
        <div className="flex flex-col items-center">
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="w-32 h-32 rounded-3xl bg-gradient-to-br from-red-500/20 to-orange-600/20 flex items-center justify-center relative group cursor-pointer overflow-hidden border-2 border-dashed border-white/20 hover:border-red-500/50 transition-all"
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center">
                <Camera className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Add Photo</span>
              </div>
            )}
            <div className={`absolute inset-0 bg-black/40 transition-opacity flex items-center justify-center ${uploading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
              {uploading ? (
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <Upload className="w-6 h-6 text-white" />
                </motion.div>
              ) : (
                <Camera className="w-6 h-6 text-white" />
              )}
            </div>
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*" 
            onChange={handlePhotoUpload} 
          />
          <p className="text-xs text-gray-500 mt-4 font-medium text-center">
            Tap to change photo.<br />Recommended for your event ID cards.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-10 py-3 text-white focus:border-red-500/50 outline-none transition-all"
                placeholder="Enter your full name"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-10 py-3 text-white focus:border-red-500/50 outline-none transition-all"
                  placeholder="Your phone"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Batch / Year</label>
              <div className="relative">
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <select
                  required
                  value={batch}
                  onChange={(e) => setBatch(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-red-500/50 outline-none transition-all appearance-none cursor-pointer"
                >
                  <option value="" disabled className="bg-[#1a1a1a]">Select batch</option>
                  {batchOptions.map((opt: string) => (
                    <option key={opt} value={opt} className="bg-[#1a1a1a]">{opt}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {showCollege && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">College / Institution</label>
              <div className="relative">
                <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  required
                  value={college}
                  onChange={(e) => setCollege(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-10 py-3 text-white focus:border-red-500/50 outline-none transition-all"
                  placeholder="Enter your college name"
                />
              </div>
            </div>
          )}

          <div className="pt-4">
            <button
              type="submit"
              disabled={saving}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                  />
                  Saving Changes...
                </>
              ) : (
                'Update Profile'
              )}
            </button>
          </div>
        </form>
      </div>

      {imageToCrop && (
        <ImageCropper
          image={imageToCrop}
          onCropComplete={handleCropComplete}
          onCancel={() => setImageToCrop(null)}
        />
      )}
    </motion.div>
  );
};

export default Settings;
