import React, { useEffect, useState } from 'react';
import { Save, X, Move } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { RegistrationModal } from '../RegistrationModal';

export const RegistrationModalSettings: React.FC = () => {
  const { siteSettings, updateSiteSettings, adminUsers, user, myPermissions, addRegistration } = useData() as any;
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [newType, setNewType] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  // Local draft state stored in localStorage while editing
  const [draft, setDraft] = useLocalStorage('admin_registration_modal_draft', {
    participantTypes: (siteSettings?.registration_participant_types as string[]) || ['1st Year', '2nd Year', '3rd Year', '4th Year'],
    registrationInstitutionVisible: (siteSettings as any)?.registration_institution_visible !== false,
    registrationInstitutionOptional: (siteSettings as any)?.registration_institution_optional === true,
    participantQuotas: (siteSettings as any)?.registration_participant_quotas || {},
  });

  useEffect(() => {
    if (!isEditing && siteSettings) {
      try {
        setDraft(prev => ({
          ...prev,
          participantTypes: (siteSettings?.registration_participant_types as string[]) || prev.participantTypes,
          registrationInstitutionVisible: (siteSettings as any)?.registration_institution_visible !== false,
          registrationInstitutionOptional: (siteSettings as any)?.registration_institution_optional === true,
          participantQuotas: (siteSettings as any)?.registration_participant_quotas || prev.participantQuotas || {},
        }));
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteSettings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSiteSettings({
        registration_participant_types: draft.participantTypes,
        registration_institution_visible: (draft as any).registrationInstitutionVisible,
        registration_institution_optional: (draft as any).registrationInstitutionOptional,
        registration_participant_quotas: (draft as any).participantQuotas,
      });
      setIsEditing(false);
      setMessage({ type: 'success', text: 'Registration modal settings saved.' });
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      console.error('Failed to save registration modal settings', err);
      const msg = String(err?.message || err || '');
      const looksLikeSchemaCache = /registration_participant_quotas/i.test(msg) && /schema cache|does not exist|could not find/i.test(msg);
      if (looksLikeSchemaCache) {
        try {
          // Retry without quotas field so other settings can be saved
          await updateSiteSettings({
            registration_participant_types: draft.participantTypes,
            registration_institution_visible: (draft as any).registrationInstitutionVisible,
            registration_institution_optional: (draft as any).registrationInstitutionOptional,
          });
          setIsEditing(false);
          setMessage({
            type: 'success',
            text: 'Saved without quotas. Please apply the DB migration for site-level quotas and click “Reset API cache” in Supabase, then try saving quotas again.'
          });
          setTimeout(() => setMessage(null), 6000);
          return;
        } catch (e2: any) {
          const msg2 = String(e2?.message || e2 || '');
          setMessage({ type: 'error', text: msg2 || 'Save failed (retry without quotas also failed)' });
          return;
        }
      }
      setMessage({ type: 'error', text: msg || 'Save failed' });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    // reset draft from siteSettings (no deep merge needed here)
    setDraft(prev => ({ ...prev }));
    setIsEditing(false);
    setMessage(null);
  };

  const addParticipantType = () => {
    const t = (newType || '').trim();
    if (!t) return;
    setDraft(prev => ({ ...prev, participantTypes: [...(prev.participantTypes || []), t] }));
    setNewType('');
  };

  const removeParticipantType = (idx: number) => {
    setDraft(prev => {
      const list = (prev.participantTypes || []).slice();
      list.splice(idx, 1);
      return { ...prev, participantTypes: list };
    });
  };

  const updateParticipantType = (idx: number, value: string) => {
    setDraft(prev => {
      const list = (prev.participantTypes || []).slice();
      list[idx] = value;
      return { ...prev, participantTypes: list };
    });
  };

  const moveParticipantType = (from: number, to: number) => {
    setDraft(prev => {
      const list = (prev.participantTypes || []).slice();
      if (to < 0 || to >= list.length) return prev;
      const item = list.splice(from, 1)[0];
      list.splice(to, 0, item);
      return { ...prev, participantTypes: list };
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Registration Modal</h2>
          <p className="text-gray-600">Owner-managed participant types used by the registration modal</p>
        </div>
        <div>
          {/* Only allow owners to toggle editing. Determine owner status from adminUsers+user */}
          {(() => {
            try {
              const uid = user?.id;
              const isListedAdmin = !!adminUsers?.find((a: any) => a.user_id === uid && (a.role === 'owner' || a.role === 'admin' || a.is_primary));
              const hasPermission = !!(myPermissions?.can_registrations || myPermissions?.can_events);
              if (!isListedAdmin && !hasPermission) return null;
            } catch {
              return null;
            }
            return (
              <button
                onClick={() => setIsEditing(e => !e)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-500 flex items-center transition-colors"
              >
                {isEditing ? (
                  <><X size={16} className="mr-2" /> Cancel</>
                ) : (
                  <><Save size={16} className="mr-2" /> Edit</>
                )}
              </button>
            );
          })()}
        </div>
      </div>

      {message && (
        <div className={`rounded-lg p-4 flex items-center ${message.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <div className="text-sm text-gray-700">{message.text}</div>
        </div>
      )}

      {!isEditing && (
        <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
          <div>
            <h3 className="font-semibold mb-2 text-gray-900">Participant Types</h3>
            <div className="text-sm text-gray-900">{(draft.participantTypes || []).join(', ')}</div>
          </div>
          <div>
            <h3 className="font-semibold mt-2 mb-2 text-gray-900">Institution / College field</h3>
            <div className="text-sm text-gray-900">
              {(draft as any).registrationInstitutionVisible ? (
                <span>Visible to viewers — {(draft as any).registrationInstitutionOptional ? 'Optional' : 'Required'}</span>
              ) : (
                <span className="text-gray-500">Hidden from viewers</span>
              )}
            </div>
          </div>
        </div>
      )}

      {isEditing && (
        <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
          <div>
            <h3 className="font-semibold mb-2 text-gray-900">Institution / College field</h3>
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={(draft as any).registrationInstitutionVisible}
                  onChange={(e) => setDraft(prev => ({ ...prev, registrationInstitutionVisible: e.target.checked }))}
                />
                <span>Show Institution field to viewers</span>
              </label>
              <label className="flex items-center space-x-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={(draft as any).registrationInstitutionOptional}
                  onChange={(e) => setDraft(prev => ({ ...prev, registrationInstitutionOptional: e.target.checked }))}
                  disabled={!(draft as any).registrationInstitutionVisible}
                />
                <span>Make Institution optional</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Participant Types</label>
            <div className="flex gap-2">
              <input value={newType} onChange={(e) => setNewType(e.target.value)} placeholder="New type (e.g. Student)" className="border rounded p-2 flex-1 text-gray-900" />
              <button onClick={addParticipantType} className="px-3 py-2 bg-green-600 text-white rounded">Add</button>
            </div>
            <ul className="mt-3 space-y-2">
              {(draft.participantTypes || []).map((t: string, i: number) => (
                <li key={i} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex items-center gap-2 w-full">
                    <Move className="text-slate-400" />
                    <input
                      className="flex-1 border rounded px-2 py-1 text-gray-900"
                      value={t}
                      onChange={(e) => updateParticipantType(i, e.target.value)}
                    />
                    {/* Quota per type */}
                    <input
                      type="number"
                      min={0}
                      className="w-28 border rounded px-2 py-1 ml-2 text-gray-900"
                      value={(draft as any).participantQuotas?.[t] ?? ''}
                      onChange={(e) => setDraft(prev => ({
                        ...prev,
                        participantQuotas: { ...(prev as any).participantQuotas, [t]: e.target.value === '' ? undefined : Math.max(0, parseInt(e.target.value || '0')) }
                      }))}
                      placeholder="limit"
                      title="Max registrations for this type (0 = closed, blank = unlimited)"
                    />
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button aria-label="move up" disabled={i === 0} onClick={() => moveParticipantType(i, i - 1)} className="px-2 py-1 border rounded text-sm">↑</button>
                    <button aria-label="move down" disabled={i === (draft.participantTypes || []).length - 1} onClick={() => moveParticipantType(i, i + 1)} className="px-2 py-1 border rounded text-sm">↓</button>
                    <button onClick={() => removeParticipantType(i)} className="text-red-600">Remove</button>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button onClick={handleCancel} className="px-4 py-2 rounded border text-gray-900">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500">
              {saving ? 'Saving…' : 'Save Settings'}
            </button>
          </div>
        </div>
      )}

      {/* Preview panel: show admins a small mock registration modal using the current draft values */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="font-semibold mb-3 text-gray-900">Preview</h3>
        <div className="flex items-center gap-3">
          <p className="text-sm text-gray-700">Open a live preview of the registration modal using the draft values.</p>
          <button
            className="px-3 py-2 bg-indigo-600 text-white rounded"
            onClick={() => setShowPreview(true)}
          >
            Open Preview
          </button>
        </div>
      </div>

      {/* Live modal preview overlay (opened by button) */}
      {showPreview && (
        <RegistrationModal
          isOpen={true}
          onClose={() => setShowPreview(false)}
          eventTitle="preview"
          eventId={-1}
          previewOverrides={{
            siteSettings: {
              registration_participant_types: draft.participantTypes,
              registration_photo_default_label: null,
              registration_photo_default_required: false,
              registration_form_fields: null,
              registration_institution_visible: (draft as any).registrationInstitutionVisible,
              registration_institution_optional: (draft as any).registrationInstitutionOptional,
              registration_participant_quotas: (draft as any).participantQuotas,
            },
            events: [{ id: -1, registration_participant_types: draft.participantTypes }],
            addRegistration: addRegistration
          }}
        />
      )}
    </div>
  );
};

export default RegistrationModalSettings;
