import React from 'react';
import { useData } from '../../context/DataContext';
import { Calendar, Save } from 'lucide-react';
import { ComingSoon } from '../../pages/ComingSoon';

export const SiteSettingsPanel: React.FC = () => {
  const { siteSettings, updateSiteSettings } = useData();
  const [local, setLocal] = React.useState({
    site_closed: false,
    coming_soon_enabled: false,
    coming_soon_until: '',
    coming_soon_title: '',
    coming_soon_message: '',
    coming_soon_ended_text: '',
    events_poster_fit: 'contain' as 'contain' | 'cover',
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
      events_poster_fit: ((siteSettings as any).events_poster_fit === 'cover' ? 'cover' : 'contain'),
    });
  }, [siteSettings]);

  const onSave = async () => {
    setSaving(true);
    try {
      await updateSiteSettings({
        site_closed: local.site_closed,
        coming_soon_enabled: local.coming_soon_enabled,
        coming_soon_until: local.coming_soon_until ? new Date(local.coming_soon_until).toISOString() : null,
        coming_soon_title: local.coming_soon_title || null,
        coming_soon_message: local.coming_soon_message || null,
        coming_soon_ended_text: local.coming_soon_ended_text || null,
        events_poster_fit: local.events_poster_fit,
      } as any);
      setSavedAt(Date.now());
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Site Settings</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <label className="flex items-center gap-3">
              <input type="checkbox" className="rounded" checked={local.site_closed} onChange={(e) => setLocal((s) => ({ ...s, site_closed: e.target.checked }))} />
              <span className="text-gray-800">Close entire site (hard maintenance)</span>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" className="rounded" checked={local.coming_soon_enabled} onChange={(e) => setLocal((s) => ({ ...s, coming_soon_enabled: e.target.checked }))} />
              <span className="text-gray-800">Enable Coming Soon (show until configured time)</span>
            </label>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Coming Soon until</label>
              <div className="relative">
                <input
                  type="datetime-local"
                  value={local.coming_soon_until}
                  onChange={(e) => setLocal((s) => ({ ...s, coming_soon_until: e.target.value }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
                <Calendar className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
              </div>
              <p className="text-xs text-gray-500 mt-1">Leave blank to show until you disable it manually</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                value={local.coming_soon_title}
                onChange={(e) => setLocal((s) => ({ ...s, coming_soon_title: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                placeholder="Coming Soon"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
              <textarea
                value={local.coming_soon_message}
                onChange={(e) => setLocal((s) => ({ ...s, coming_soon_message: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400 min-h-[96px]"
                placeholder="We are preparing something amazing. Please check back soon."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Events poster fit</label>
              <select
                value={local.events_poster_fit}
                onChange={(e) => setLocal((s) => ({ ...s, events_poster_fit: (e.target.value === 'cover' ? 'cover' : 'contain') }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              >
                <option value="contain">Contain (no cropping)</option>
                <option value="cover">Cover (fill card, may crop)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">Contain shows full image with letterboxing; Cover fills the card but may crop on some screens.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ended Text (after timer)</label>
              <input
                value={local.coming_soon_ended_text}
                onChange={(e) => setLocal((s) => ({ ...s, coming_soon_ended_text: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                placeholder={"We'll be back soon"}
              />
              <p className="text-xs text-gray-500 mt-1">Shown once the countdown ends while the site is still closed.</p>
            </div>
            <button
              onClick={onSave}
              className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-white ${saving ? 'bg-gray-500' : 'bg-yellow-600 hover:bg-yellow-700'} disabled:opacity-70`}
              disabled={saving}
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            {savedAt && (
              <div className="text-xs text-green-700">Saved {new Date(savedAt).toLocaleTimeString()}</div>
            )}
          </div>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-2 bg-gray-50 border-b text-sm text-gray-700">Public Preview</div>
            <div className="aspect-video bg-black">
              <ComingSoon />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SiteSettingsPanel;
