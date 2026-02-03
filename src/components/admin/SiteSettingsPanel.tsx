import React from 'react';
import { useData } from '../../context/DataContext';
import { Calendar, Save } from 'lucide-react';
import { ComingSoon } from '../../pages/ComingSoon';
import { useApprovals } from '../../hooks/useApprovals';

export const SiteSettingsPanel: React.FC = () => {
  const { siteSettings, updateSiteSettings } = useData();
  const { submitForApproval, checkRequiresApproval } = useApprovals();
  const [requiresApproval, setRequiresApproval] = React.useState(false);

  React.useEffect(() => {
    checkRequiresApproval().then(setRequiresApproval);
  }, []);

  const [local, setLocal] = React.useState({
    site_closed: false,
    coming_soon_enabled: false,
    coming_soon_until: '',
    coming_soon_title: '',
    coming_soon_message: '',
    coming_soon_ended_text: '',
    // Small convenience: allow editing the homepage hero title from Site Settings
    homepage_hero_title: '',
    registration_institution_visible: true,
    registration_institution_optional: false,
    registration_participant_types: ['1st Year','2nd Year','3rd Year','4th Year'],
  });
  const [saving, setSaving] = React.useState(false);
  const [savedAt, setSavedAt] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!siteSettings) return;
    setLocal({
      site_closed: !!siteSettings.site_closed,
      coming_soon_enabled: !!siteSettings.coming_soon_enabled,
      coming_soon_until: siteSettings.coming_soon_until ? new Date(siteSettings.coming_soon_until).toISOString().slice(0,16) : '',
      coming_soon_title: siteSettings.coming_soon_title || '',
      coming_soon_message: siteSettings.coming_soon_message || '',
      coming_soon_ended_text: (siteSettings as any).coming_soon_ended_text || '',
      homepage_hero_title: (siteSettings as any)?.homepage_hero_title || '',
      registration_institution_visible: (siteSettings as any)?.registration_institution_visible !== false,
      registration_institution_optional: (siteSettings as any)?.registration_institution_optional === true,
      registration_participant_types: Array.isArray((siteSettings as any)?.registration_participant_types) && (siteSettings as any).registration_participant_types.length
        ? (siteSettings as any).registration_participant_types
        : ['1st Year','2nd Year','3rd Year','4th Year'],
    });
  }, [siteSettings]);

  const onSave = async () => {
    setSaving(true);
    try {
      const newSettings = {
        site_closed: local.site_closed,
        coming_soon_enabled: local.coming_soon_enabled,
        coming_soon_until: local.coming_soon_until ? new Date(local.coming_soon_until).toISOString() : null,
        coming_soon_title: local.coming_soon_title || null,
        coming_soon_message: local.coming_soon_message || null,
        coming_soon_ended_text: local.coming_soon_ended_text || null,
        // optional homepage hero title (stored in site_settings)
        homepage_hero_title: local.homepage_hero_title || null,
        registration_institution_visible: !!local.registration_institution_visible,
        registration_institution_optional: !!local.registration_institution_optional,
        registration_participant_types: Array.isArray(local.registration_participant_types) ? local.registration_participant_types : null,
      };

      if (requiresApproval) {
        // Assuming siteSettings has an ID, or we use a fixed ID for singleton
        const settingsId = (siteSettings as any)?.id || 1;
        
        const result = await submitForApproval('site_settings', 'update', newSettings, settingsId);
        if (result.success) {
          alert('Request submitted for approval. An owner will review your changes.');
          setSavedAt(Date.now());
        } else {
          alert(`Failed to submit for approval: ${result.error}`);
        }
      } else {
        await updateSiteSettings(newSettings as any);
        setSavedAt(Date.now());
      }
    } catch (error) {
      console.error('Error saving site settings:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#181824]/60 backdrop-blur-md border border-white/5 rounded-2xl p-6 sm:p-8">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
           <div className="w-1 h-6 bg-yellow-500 rounded-full" />
           Site Settings
        </h2>
        
        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-6">
            
            {/* Toggles Group */}
            <div className="space-y-3 bg-black/20 p-4 rounded-xl border border-white/5">
              <label className="flex items-center gap-4 cursor-pointer group">
                <div className={`w-10 h-6 rounded-full p-1 transition-colors duration-300 ${local.site_closed ? 'bg-red-500' : 'bg-gray-700'}`}>
                   <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-300 ${local.site_closed ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
                <input type="checkbox" className="hidden" checked={local.site_closed} onChange={(e) => setLocal((s) => ({ ...s, site_closed: e.target.checked }))} />
                <span className="text-gray-300 group-hover:text-white transition-colors">Close entire site (hard maintenance)</span>
              </label>

              <label className="flex items-center gap-4 cursor-pointer group">
                <div className={`w-10 h-6 rounded-full p-1 transition-colors duration-300 ${local.coming_soon_enabled ? 'bg-yellow-500' : 'bg-gray-700'}`}>
                   <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-300 ${local.coming_soon_enabled ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
                <input type="checkbox" className="hidden" checked={local.coming_soon_enabled} onChange={(e) => setLocal((s) => ({ ...s, coming_soon_enabled: e.target.checked }))} />
                <span className="text-gray-300 group-hover:text-white transition-colors">Enable Coming Soon Mode</span>
              </label>
            </div>

            <div className="space-y-5">
               <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Coming Soon Valid Until</label>
                <div className="relative group">
                  <input
                    type="datetime-local"
                    value={local.coming_soon_until}
                    onChange={(e) => setLocal((s) => ({ ...s, coming_soon_until: e.target.value }))}
                    className="w-full bg-[#0f0f13] border border-white/10 rounded-xl px-4 py-3 pr-10 focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50 text-white transition-all"
                  />
                  <Calendar className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 group-focus-within:text-yellow-500 transition-colors" />
                </div>
                <p className="text-[10px] text-gray-500 mt-1.5 ml-1">Leave blank for indefinite maintenance mode</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Page Title</label>
                <input
                  value={local.coming_soon_title}
                  onChange={(e) => setLocal((s) => ({ ...s, coming_soon_title: e.target.value }))}
                  className="w-full bg-[#0f0f13] border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50 text-white transition-all placeholder-gray-600"
                  placeholder="Coming Soon"
                />
              </div>

              <div>
                 <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Homepage Hero Title</label>
                <input
                  value={local.homepage_hero_title}
                  onChange={(e) => setLocal((s) => ({ ...s, homepage_hero_title: e.target.value }))}
                  className="w-full bg-[#0f0f13] border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50 text-white transition-all placeholder-gray-600"
                  placeholder="RICORRENZA"
                />
                <p className="text-[10px] text-gray-500 mt-1.5 ml-1">The big text on the main landing page.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Message Body</label>
                <textarea
                  value={local.coming_soon_message}
                  onChange={(e) => setLocal((s) => ({ ...s, coming_soon_message: e.target.value }))}
                  className="w-full bg-[#0f0f13] border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50 min-h-[96px] text-white transition-all placeholder-gray-600"
                  placeholder="We are preparing something amazing..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Post-Timer Text</label>
                <input
                  value={local.coming_soon_ended_text}
                  onChange={(e) => setLocal((s) => ({ ...s, coming_soon_ended_text: e.target.value }))}
                  className="w-full bg-[#0f0f13] border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50 text-white transition-all placeholder-gray-600"
                  placeholder="We'll be back soon"
                />
              </div>
            </div>

            <button
              onClick={onSave}
              className={`
                w-full inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-bold shadow-lg transition-all
                ${saving 
                  ? 'bg-gray-800 text-gray-400 cursor-not-allowed' 
                  : 'bg-yellow-500 text-black hover:bg-yellow-400 hover:shadow-yellow-500/20 active:scale-[0.98]'
                }
              `}
              disabled={saving}
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving changes...' : 'Save Settings'}
            </button>
            
            {savedAt && (
              <div className="text-center text-xs font-bold text-green-400 animate-pulse">
                Settings saved successfully at {new Date(savedAt).toLocaleTimeString()}
              </div>
            )}
          </div>
          
          <div className="space-y-4">
             <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">Live Preview</div>
             <div className="border border-white/10 rounded-2xl overflow-hidden shadow-2xl shadow-black/50">
               <div className="aspect-[9/16] sm:aspect-video bg-black relative">
                 <div className="absolute inset-0 transform scale-[0.4] origin-top-left w-[250%] h-[250%] pointer-events-none select-none">
                   <ComingSoon previewSettings={local} />
                 </div>
               </div>
             </div>
             <p className="text-xs text-gray-500 text-center">
               This is an approximation of what users will see.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SiteSettingsPanel;
