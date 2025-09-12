import React, { useState } from 'react';
import { Save, X, ToggleLeft, ToggleRight, MessageSquare, Music, Users, AlertCircle } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { SUPABASE_HOST } from '../../lib/supabase';
import { useLocalStorage } from '../../hooks/useLocalStorage';

export const FormSettingsManagement: React.FC = () => {
  const { formSettings, updateFormSettings } = useData();
  const [isEditing, setIsEditing] = useState(false);
  // const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const [form, setForm] = useLocalStorage('admin_form_settings_draft', {
    audition_form_enabled: formSettings?.audition_form_enabled ?? true,
    membership_form_enabled: formSettings?.membership_form_enabled ?? true,
    audition_form_message: formSettings?.audition_form_message || 'Auditions are currently closed. Please check back later.',
    membership_form_message: formSettings?.membership_form_message || 'Membership applications are currently closed. Please check back later.'
  });

  // When opening editor, sync form from latest context values
  const openEditor = () => {
    setForm({
      audition_form_enabled: formSettings?.audition_form_enabled ?? true,
      membership_form_enabled: formSettings?.membership_form_enabled ?? true,
      audition_form_message: formSettings?.audition_form_message || 'Auditions are currently closed. Please check back later.',
      membership_form_message: formSettings?.membership_form_message || 'Membership applications are currently closed. Please check back later.'
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      // setSaving(true);
      await updateFormSettings(form);
      setIsEditing(false);
      setMessage({ type: 'success', text: 'Form settings updated successfully!' });
      try { localStorage.removeItem('admin_form_settings_draft'); } catch {}
      setTimeout(() => setMessage(null), 5000);
    } catch (error) {
      console.error('Error updating form settings:', error);
      const errText = (error as any)?.message || String(error);
      setMessage({ type: 'error', text: `Failed to update form settings: ${errText}` });
      setTimeout(() => setMessage(null), 5000);
    } finally {
      // setSaving(false);
    }
  };

  const handleCancel = () => {
    setForm({
      audition_form_enabled: formSettings?.audition_form_enabled ?? true,
      membership_form_enabled: formSettings?.membership_form_enabled ?? true,
      audition_form_message: formSettings?.audition_form_message || 'Auditions are currently closed. Please check back later.',
      membership_form_message: formSettings?.membership_form_message || 'Membership applications are currently closed. Please check back later.'
    });
    setIsEditing(false);
    setMessage(null);
    try { localStorage.removeItem('admin_form_settings_draft'); } catch {}
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Form Settings</h2>
          <p className="text-gray-600">Control the availability of audition and membership forms</p>
        </div>
        <button
          type="button"
          onClick={() => (isEditing ? setIsEditing(false) : openEditor())}
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

      {/* Message */}
      {message && (
        <div className={`rounded-lg p-4 flex items-center ${
          message.type === 'success' 
            ? 'bg-green-50 border border-green-200' 
            : 'bg-red-50 border border-red-200'
        }`}>
          {message.type === 'success' ? (
            <Save className="w-5 h-5 text-green-500 mr-3" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-500 mr-3" />
          )}
          <span className={message.type === 'success' ? 'text-green-700' : 'text-red-700'}>
            {message.text}
          </span>
        </div>
      )}

      {/* Current Settings Display */}
      {!isEditing && (
        <div className="space-y-6">
          {/* Diagnostics */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
            <div className="font-semibold mb-1">Diagnostics</div>
            <div>Supabase project: <span className="font-mono">{SUPABASE_HOST}</span></div>
            <div className="mt-1">Audition enabled: <span className="font-mono">{String(!!formSettings?.audition_form_enabled)}</span></div>
            <div>Membership enabled: <span className="font-mono">{String(!!formSettings?.membership_form_enabled)}</span></div>
          </div>
          {/* Audition Form Settings */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Music className="w-6 h-6 text-purple-600 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900">Audition Form</h3>
              </div>
              <div className="flex items-center space-x-2">
                {formSettings?.audition_form_enabled ? (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 border border-green-200">
                    <ToggleRight size={16} className="mr-1.5" />
                    Enabled
                  </span>
                ) : (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 border border-red-200">
                    <ToggleLeft size={16} className="mr-1.5" />
                    Disabled
                  </span>
                )}
              </div>
            </div>
            
            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium text-gray-700">Status:</span>
                <p className="text-sm text-gray-600 mt-1">
                  {formSettings?.audition_form_enabled 
                    ? 'Users can submit audition applications for the Home Bound band'
                    : 'Audition form is disabled - users cannot submit applications'
                  }
                </p>
              </div>
              {!formSettings?.audition_form_enabled && (
                <div>
                  <span className="text-sm font-medium text-gray-700">Disabled Message:</span>
                  <p className="text-sm text-gray-600 mt-1 italic">
                    "{formSettings?.audition_form_message}"
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Membership Form Settings */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Users className="w-6 h-6 text-blue-600 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900">Membership Form</h3>
              </div>
              <div className="flex items-center space-x-2">
                {formSettings?.membership_form_enabled ? (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 border border-green-200">
                    <ToggleRight size={16} className="mr-1.5" />
                    Enabled
                  </span>
                ) : (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 border border-red-200">
                    <ToggleLeft size={16} className="mr-1.5" />
                    Disabled
                  </span>
                )}
              </div>
            </div>
            
            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium text-gray-700">Status:</span>
                <p className="text-sm text-gray-600 mt-1">
                  {formSettings?.membership_form_enabled 
                    ? 'Users can submit membership applications for the Rico Family'
                    : 'Membership form is disabled - users cannot submit applications'
                  }
                </p>
              </div>
              {!formSettings?.membership_form_enabled && (
                <div>
                  <span className="text-sm font-medium text-gray-700">Disabled Message:</span>
                  <p className="text-sm text-gray-600 mt-1 italic">
                    "{formSettings?.membership_form_message}"
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Form */}
      {isEditing && (
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-400">
          <h3 className="text-lg font-semibold mb-6">Edit Form Settings</h3>
          
          <div className="space-y-8">
            {/* Audition Form Settings */}
            <div className="border border-gray-200 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <Music className="w-6 h-6 text-purple-600 mr-3" />
                <h4 className="text-lg font-semibold text-gray-900">Audition Form Settings</h4>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Enable Audition Form</label>
                    <p className="text-sm text-gray-500">Allow users to submit band audition applications</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, audition_form_enabled: !prev.audition_form_enabled }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      form.audition_form_enabled ? 'bg-green-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        form.audition_form_enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message When Disabled
                  </label>
                  <div className="relative">
                    <MessageSquare className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <textarea
                      value={form.audition_form_message}
                      onChange={(e) => setForm(prev => ({ ...prev, audition_form_message: e.target.value }))}
                      placeholder="Message to show when auditions are closed"
                      rows={3}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    This message will be displayed when the audition form is disabled
                  </p>
                </div>
              </div>
            </div>

            {/* Membership Form Settings */}
            <div className="border border-gray-200 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <Users className="w-6 h-6 text-blue-600 mr-3" />
                <h4 className="text-lg font-semibold text-gray-900">Membership Form Settings</h4>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Enable Membership Form</label>
                    <p className="text-sm text-gray-500">Allow users to submit Rico Family membership applications</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, membership_form_enabled: !prev.membership_form_enabled }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      form.membership_form_enabled ? 'bg-green-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        form.membership_form_enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message When Disabled
                  </label>
                  <div className="relative">
                    <MessageSquare className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <textarea
                      value={form.membership_form_message}
                      onChange={(e) => setForm(prev => ({ ...prev, membership_form_message: e.target.value }))}
                      placeholder="Message to show when membership applications are closed"
                      rows={3}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    This message will be displayed when the membership form is disabled
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Save/Cancel Buttons */}
          <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
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
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 flex items-center transition-colors"
            >
              <Save size={16} className="mr-2" />
              Save Settings
            </button>
          </div>
        </div>
      )}

      {/* Usage Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">Usage Instructions</h3>
        <div className="space-y-3 text-sm text-blue-800">
          <div className="flex items-start">
            <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
            <span><strong>Audition Form:</strong> Controls whether users can submit applications to join the Home Bound band</span>
          </div>
          <div className="flex items-start">
            <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
            <span><strong>Membership Form:</strong> Controls whether users can submit applications to join the Rico Family</span>
          </div>
          <div className="flex items-start">
            <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
            <span><strong>Disabled Messages:</strong> Custom messages shown to users when forms are disabled</span>
          </div>
          <div className="flex items-start">
            <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></div>
            <span><strong>Real-time Updates:</strong> Changes take effect immediately on the website</span>
          </div>
        </div>
      </div>

      {/* Current Status Summary */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Status</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <Music className="w-8 h-8 text-purple-600 mx-auto mb-2" />
            <div className="text-lg font-bold text-purple-600 mb-1">
              {formSettings?.audition_form_enabled ? 'Open' : 'Closed'}
            </div>
            <div className="text-gray-600 text-sm">Audition Applications</div>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <div className="text-lg font-bold text-blue-600 mb-1">
              {formSettings?.membership_form_enabled ? 'Open' : 'Closed'}
            </div>
            <div className="text-gray-600 text-sm">Membership Applications</div>
          </div>
        </div>
      </div>
    </div>
  );
};