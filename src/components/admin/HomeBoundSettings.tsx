import React, { useState } from 'react';
import { Instagram, Save, X, ExternalLink, Eye, EyeOff } from 'lucide-react';
import { useData } from '../../context/DataContext';

export const HomeBoundSettings: React.FC = () => {
  const { homeboundSettings, updateHomeboundSettings } = useData();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    instagram_url: homeboundSettings?.instagram_url || '',
    instagram_enabled: homeboundSettings?.instagram_enabled !== false,
  });

  // Normalize and validate instagram URLs
  const ensureHttps = (url: string) => {
    if (!url) return '';
    const trimmed = url.trim();
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  };

  const validateInstagram = (url: string) => {
    if (!url) return true;
    try {
      const candidate = ensureHttps(url);
      const u = new URL(candidate);
      // Accept instagram.com with or without www, any path
      return u.hostname === 'instagram.com' || u.hostname === 'www.instagram.com';
    } catch {
      return false;
    }
  };

  const handleSave = async () => {
    if (form.instagram_url && !validateInstagram(form.instagram_url)) return;
    setSaving(true);
    try {
      const normalizedUrl = form.instagram_url ? ensureHttps(form.instagram_url) : null;
      await updateHomeboundSettings({
        instagram_url: normalizedUrl,
        instagram_enabled: form.instagram_enabled,
      } as any);
      setIsEditing(false);
      alert('HomeBound settings updated');
    } catch (e: any) {
      console.error('Failed to update HomeBound settings:', e);
      alert(`Failed to update HomeBound settings: ${e?.message || e}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setForm({
      instagram_url: homeboundSettings?.instagram_url || '',
      instagram_enabled: homeboundSettings?.instagram_enabled !== false,
    });
    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Home Bound – Instagram</h2>
          <p className="text-gray-600">Control the Instagram link shown on the Home Bound page only</p>
        </div>
        <button
          type="button"
          onClick={() => {
            // When entering edit mode, sync the form from latest settings
            setIsEditing((prev) => {
              const next = !prev;
              if (next) {
                setForm({
                  instagram_url: homeboundSettings?.instagram_url || '',
                  instagram_enabled: homeboundSettings?.instagram_enabled !== false,
                });
              }
              return next;
            });
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-500 flex items-center transition-colors"
        >
          {isEditing ? (<><X size={16} className="mr-2" />Cancel</>) : (<><Save size={16} className="mr-2" />Edit</>)}
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        {isEditing ? (
          <div className="space-y-6">
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center mb-4">
                <Instagram className="w-6 h-6 text-pink-600 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900">Instagram (Home Bound)</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="hb-ig-enabled"
                    checked={form.instagram_enabled}
                    onChange={(e) => setForm(prev => ({ ...prev, instagram_enabled: e.target.checked }))}
                    className="mr-3"
                  />
                  <label htmlFor="hb-ig-enabled" className="text-sm font-medium text-gray-700">
                    Show Instagram link on Home Bound page
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Instagram Profile URL</label>
                  <input
                    type="url"
                    value={form.instagram_url}
                    onChange={(e) => setForm(prev => ({ ...prev, instagram_url: e.target.value }))}
                    placeholder="https://www.instagram.com/your_profile"
                    className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                      form.instagram_url && !validateInstagram(form.instagram_url)
                        ? 'border-red-300 bg-red-50'
                        : 'border-gray-300'
                    }`}
                  />
                  {form.instagram_url && !validateInstagram(form.instagram_url) && (
                    <p className="text-red-600 text-sm mt-1">Enter a valid Instagram URL</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button type="button" onClick={handleCancel} className="px-6 py-2 text-gray-600 hover:text-gray-800 flex items-center">
                <X size={16} className="mr-2" />Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || (form.instagram_url !== '' && !validateInstagram(form.instagram_url))}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 flex items-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Save size={16} className="mr-2" />{saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <Instagram className="w-6 h-6 text-pink-600 mr-3" />
                  <h3 className="text-lg font-semibold text-gray-900">Instagram</h3>
                </div>
                {homeboundSettings?.instagram_enabled ? (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 border border-green-200">
                    <Eye size={14} className="mr-1.5" />Visible
                  </span>
                ) : (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 border border-red-200">
                    <EyeOff size={14} className="mr-1.5" />Hidden
                  </span>
                )}
              </div>
              <div className="space-y-2">
                <div>
                  <span className="text-sm font-medium text-gray-700">Profile URL:</span>
                  {homeboundSettings?.instagram_url ? (
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-sm text-gray-600 break-all">{homeboundSettings.instagram_url}</span>
                      <a href={homeboundSettings.instagram_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                        <ExternalLink size={14} />
                      </a>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 mt-1">Not set</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
