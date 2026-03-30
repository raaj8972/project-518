import React, { useState } from 'react';
import { 
  Users, 
  Settings, 
  Shield, 
  UserCheck, 
  Plus, 
  X,
  School,
  ToggleLeft,
  ToggleRight,
  Mail
} from 'lucide-react';
import { StudentApprovals } from './StudentApprovals';
import { useData } from '../../context/DataContext';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

export const StudentManagement: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'verifications' | 'settings' | 'auth'>('verifications');
  const { siteSettings, updateSiteSettings } = useData();
  const [saving, setSaving] = useState(false);

  const showCollege = siteSettings?.registration_institution_visible ?? true;
  const googleAuthEnabled = siteSettings?.student_google_auth_enabled ?? false;

  const handleUpdateSettings = async (updates: any) => {
    setSaving(true);
    try {
      if (!updateSiteSettings) {
        throw new Error('updateSiteSettings function not found in context');
      }

      await updateSiteSettings(updates);
      toast.success('Settings updated successfully');
    } catch (err: any) {
      toast.error('Failed to update settings: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const subTabs = [
    { id: 'verifications', name: 'Verifications', icon: UserCheck },
    { id: 'settings', name: 'Profile Settings', icon: Settings },
    { id: 'auth', name: 'Authentication', icon: Shield },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-400" />
            Student System
          </h1>
          <p className="text-gray-500 text-xs font-black uppercase tracking-[0.2em] mt-1">
            Centralized control for student profiles and access
          </p>
        </div>

        <div className="flex bg-white/5 rounded-2xl p-1 border border-white/5">
          {subTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                activeSubTab === tab.id
                  ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                  : 'text-gray-500 hover:text-white hover:bg-white/5'
              }`}
            >
              <tab.icon size={14} />
              {tab.name}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeSubTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeSubTab === 'verifications' && (
            <StudentApprovals />
          )}

          {activeSubTab === 'settings' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Profile Field Toggles */}
              <div className="rico-glass-card p-6 rounded-[2rem] border border-white/5">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                    <School className="text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-black uppercase tracking-widest text-sm">Profile Visibility</h3>
                    <p className="text-[10px] text-gray-500 font-bold">Toggle fields in student forms</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                    <div>
                      <p className="text-sm font-bold text-white">College/Institution Field</p>
                      <p className="text-[10px] text-gray-500">Show or hide the college field for students</p>
                    </div>
                    <button
                      onClick={() => handleUpdateSettings({ registration_institution_visible: !showCollege })}
                      disabled={saving}
                      className={`relative w-12 h-6 rounded-full transition-colors ${showCollege ? 'bg-blue-500' : 'bg-gray-700'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${showCollege ? 'left-7' : 'left-1'}`} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSubTab === 'auth' && (
            <div className="rico-glass-card p-8 rounded-[2rem] border border-white/5 max-w-2xl">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
                  <Shield className="text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">Student Authentication</h3>
                  <p className="text-sm text-gray-500 font-bold">Configure how students login to the portal</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between p-6 bg-white/[0.03] rounded-3xl border border-white/5 hover:border-indigo-500/20 transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-indigo-500/10 transition-colors">
                      <Mail className="text-indigo-400" size={24} />
                    </div>
                    <div>
                      <p className="text-base font-black text-white">Google Authentication</p>
                      <p className="text-xs text-gray-500 mt-0.5">Allow students to sign in using their Gmail account</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleUpdateSettings({ student_google_auth_enabled: !googleAuthEnabled })}
                    disabled={saving}
                    className="flex items-center gap-2 group/toggle"
                  >
                    {googleAuthEnabled ? (
                      <ToggleRight className="text-indigo-500 group-active:scale-95 transition-all" size={40} />
                    ) : (
                      <ToggleLeft className="text-gray-600 group-hover:text-gray-500 transition-all" size={40} />
                    )}
                  </button>
                </div>

                <div className="mt-8 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex gap-3">
                  <Shield size={20} className="text-amber-500 shrink-0" />
                  <p className="text-[10px] text-amber-500/80 font-bold leading-relaxed uppercase tracking-wider">
                    Note: Email/Password authentication is always enabled for all students as a fallback method.
                  </p>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
