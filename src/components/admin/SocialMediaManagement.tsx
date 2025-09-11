import React, { useState } from 'react';
import { Save, X, Instagram, Youtube, Eye, EyeOff, ExternalLink } from 'lucide-react';
import { useData } from '../../context/DataContext';

export const SocialMediaManagement: React.FC = () => {
  const { socialMediaSettings, updateSocialMediaSettings } = useData();
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    instagram_url: socialMediaSettings?.instagram_url || '',
    instagram_enabled: socialMediaSettings?.instagram_enabled !== false,
    youtube_url: socialMediaSettings?.youtube_url || '',
    youtube_enabled: socialMediaSettings?.youtube_enabled !== false
  });

  const handleSave = async () => {
    try {
      await updateSocialMediaSettings(form);
      setIsEditing(false);
      alert('Social media settings updated successfully!');
    } catch (error) {
      console.error('Error updating social media settings:', error);
      alert('Failed to update social media settings. Please try again.');
    }
  };

  const handleCancel = () => {
    setForm({
      instagram_url: socialMediaSettings?.instagram_url || '',
      instagram_enabled: socialMediaSettings?.instagram_enabled !== false,
      youtube_url: socialMediaSettings?.youtube_url || '',
      youtube_enabled: socialMediaSettings?.youtube_enabled !== false
    });
    setIsEditing(false);
  };

  const validateUrl = (url: string, platform: string) => {
    if (!url) return true; // Empty URLs are allowed
    
    try {
      const urlObj = new URL(url);
      if (platform === 'instagram') {
        return urlObj.hostname === 'www.instagram.com' || urlObj.hostname === 'instagram.com';
      } else if (platform === 'youtube') {
        return urlObj.hostname === 'www.youtube.com' || urlObj.hostname === 'youtube.com';
      }
      return false;
    } catch {
      return false;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Social Media Settings</h2>
          <p className="text-gray-600">Manage Instagram and YouTube links for the website</p>
        </div>
        <button
          type="button"
          onClick={() => setIsEditing(!isEditing)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-500 flex items-center transition-colors"
        >
          {isEditing ? (
            <>
              <X size={16} className="mr-2" />
              Cancel
            </>
          ) : (
            <>
              <Save size={16} className="mr-2" />
              Edit Settings
            </>
          )}
        </button>
      </div>

      {/* Settings Form */}
      <div className="bg-white rounded-lg shadow-md p-6">
        {isEditing ? (
          <div className="space-y-6">
            {/* Instagram Settings */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center mb-4">
                <Instagram className="w-6 h-6 text-pink-600 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900">Instagram</h3>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="instagram-enabled"
                    checked={form.instagram_enabled}
                    onChange={(e) => setForm(prev => ({ ...prev, instagram_enabled: e.target.checked }))}
                    className="mr-3"
                  />
                  <label htmlFor="instagram-enabled" className="text-sm font-medium text-gray-700">
                    Show Instagram link on website
                  </label>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Instagram Profile URL
                  </label>
                  <input
                    type="url"
                    value={form.instagram_url}
                    onChange={(e) => setForm(prev => ({ ...prev, instagram_url: e.target.value }))}
                    placeholder="https://www.instagram.com/your_profile"
                    className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                      form.instagram_url && !validateUrl(form.instagram_url, 'instagram')
                        ? 'border-red-300 bg-red-50'
                        : 'border-gray-300'
                    }`}
                  />
                  {form.instagram_url && !validateUrl(form.instagram_url, 'instagram') && (
                    <p className="text-red-600 text-sm mt-1">
                      Please enter a valid Instagram URL (e.g., https://www.instagram.com/username)
                    </p>
                  )}
                  <p className="text-gray-500 text-sm mt-1">
                    Enter the full Instagram profile URL including https://
                  </p>
                </div>
              </div>
            </div>

            {/* YouTube Settings */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center mb-4">
                <Youtube className="w-6 h-6 text-red-600 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900">YouTube</h3>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="youtube-enabled"
                    checked={form.youtube_enabled}
                    onChange={(e) => setForm(prev => ({ ...prev, youtube_enabled: e.target.checked }))}
                    className="mr-3"
                  />
                  <label htmlFor="youtube-enabled" className="text-sm font-medium text-gray-700">
                    Show YouTube link on website
                  </label>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    YouTube Channel URL
                  </label>
                  <input
                    type="url"
                    value={form.youtube_url}
                    onChange={(e) => setForm(prev => ({ ...prev, youtube_url: e.target.value }))}
                    placeholder="https://www.youtube.com/channel/your_channel"
                    className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                      form.youtube_url && !validateUrl(form.youtube_url, 'youtube')
                        ? 'border-red-300 bg-red-50'
                        : 'border-gray-300'
                    }`}
                  />
                  {form.youtube_url && !validateUrl(form.youtube_url, 'youtube') && (
                    <p className="text-red-600 text-sm mt-1">
                      Please enter a valid YouTube URL (e.g., https://www.youtube.com/channel/...)
                    </p>
                  )}
                  <p className="text-gray-500 text-sm mt-1">
                    Enter the full YouTube channel URL including https://
                  </p>
                </div>
              </div>
            </div>

            {/* Save/Cancel Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={handleCancel}
                className="px-6 py-2 text-gray-600 hover:text-gray-800 flex items-center"
              >
                <X size={16} className="mr-2" />
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={
                  (form.instagram_url && !validateUrl(form.instagram_url, 'instagram')) ||
                  (form.youtube_url && !validateUrl(form.youtube_url, 'youtube'))
                }
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 flex items-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Save size={16} className="mr-2" />
                Save Settings
              </button>
            </div>
          </div>
        ) : (
          /* Display Mode */
          <div className="space-y-6">
            {/* Instagram Display */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <Instagram className="w-6 h-6 text-pink-600 mr-3" />
                  <h3 className="text-lg font-semibold text-gray-900">Instagram</h3>
                </div>
                <div className="flex items-center space-x-2">
                  {socialMediaSettings?.instagram_enabled ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 border border-green-200">
                      <Eye size={14} className="mr-1.5" />
                      Visible
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 border border-red-200">
                      <EyeOff size={14} className="mr-1.5" />
                      Hidden
                    </span>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <div>
                  <span className="text-sm font-medium text-gray-700">Profile URL:</span>
                  {socialMediaSettings?.instagram_url ? (
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-sm text-gray-600 break-all">
                        {socialMediaSettings.instagram_url}
                      </span>
                      <a
                        href={socialMediaSettings.instagram_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <ExternalLink size={14} />
                      </a>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 mt-1">Not set</p>
                  )}
                </div>
              </div>
            </div>

            {/* YouTube Display */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <Youtube className="w-6 h-6 text-red-600 mr-3" />
                  <h3 className="text-lg font-semibold text-gray-900">YouTube</h3>
                </div>
                <div className="flex items-center space-x-2">
                  {socialMediaSettings?.youtube_enabled ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 border border-green-200">
                      <Eye size={14} className="mr-1.5" />
                      Visible
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 border border-red-200">
                      <EyeOff size={14} className="mr-1.5" />
                      Hidden
                    </span>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <div>
                  <span className="text-sm font-medium text-gray-700">Channel URL:</span>
                  {socialMediaSettings?.youtube_url ? (
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-sm text-gray-600 break-all">
                        {socialMediaSettings.youtube_url}
                      </span>
                      <a
                        href={socialMediaSettings.youtube_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <ExternalLink size={14} />
                      </a>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 mt-1">Not set</p>
                  )}
                </div>
              </div>
            </div>

            {/* Preview Section */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3">Website Preview</h4>
              <p className="text-sm text-gray-600 mb-3">
                This is how the social media links will appear at the bottom of pages:
              </p>
              <div className="flex items-center justify-center space-x-6 p-4 bg-black rounded border text-white">
                {socialMediaSettings?.instagram_enabled && socialMediaSettings?.instagram_url && (
                  <a
                    href={socialMediaSettings.instagram_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2 text-pink-400 hover:text-pink-300 transition-colors group"
                  >
                    <Instagram size={24} className="group-hover:scale-110 transition-transform" />
                    <span className="font-medium">Instagram</span>
                  </a>
                )}
                {socialMediaSettings?.youtube_enabled && socialMediaSettings?.youtube_url && (
                  <a
                    href={socialMediaSettings.youtube_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2 text-red-400 hover:text-red-300 transition-colors group"
                  >
                    <Youtube size={24} className="group-hover:scale-110 transition-transform" />
                    <span className="font-medium">YouTube</span>
                  </a>
                )}
                {(!socialMediaSettings?.instagram_enabled || !socialMediaSettings?.instagram_url) &&
                 (!socialMediaSettings?.youtube_enabled || !socialMediaSettings?.youtube_url) && (
                  <span className="text-gray-400 text-sm">No social media links configured</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};