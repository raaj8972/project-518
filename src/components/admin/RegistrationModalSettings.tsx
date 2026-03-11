import React, { useEffect, useState } from 'react';
import { Save, X, GripVertical, Plus, ArrowUp, ArrowDown, Trash2, Settings2, Eye, Building2, Sparkles } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { RegistrationModal } from '../RegistrationModal';

// ─── Styling tokens ─────────────────────────────
const inputCls = 'w-full bg-white/[0.04] border border-white/10 rounded-xl py-2.5 px-3.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 focus:bg-white/[0.06] transition-all';
const labelCls = 'block text-[10px] font-black text-white/30 uppercase tracking-[0.15em] mb-2';

export const RegistrationModalSettings: React.FC = () => {
  const { siteSettings, updateSiteSettings, adminUsers, user, myPermissions, addRegistration } = useData() as any;
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [newType, setNewType] = useState('');
  const [showPreview, setShowPreview] = useState(false);

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
          await updateSiteSettings({
            registration_participant_types: draft.participantTypes,
            registration_institution_visible: (draft as any).registrationInstitutionVisible,
            registration_institution_optional: (draft as any).registrationInstitutionOptional,
          });
          setIsEditing(false);
          setMessage({
            type: 'success',
            text: 'Saved without quotas. Please apply the DB migration for site-level quotas and click "Reset API cache" in Supabase, then try saving quotas again.'
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

  // Permission check
  const canEdit = (() => {
    try {
      const uid = user?.id;
      const isListedAdmin = !!adminUsers?.find((a: any) => a.user_id === uid && (a.role === 'owner' || a.role === 'admin' || a.is_primary));
      const hasPermission = !!(myPermissions?.can_registrations || myPermissions?.can_events);
      return isListedAdmin || hasPermission;
    } catch { return false; }
  })();

  return (
    <div className="space-y-6">

      {/* ═══ Hero Header ═══ */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600/20 via-purple-600/10 to-transparent border border-white/10 p-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/10 blur-[80px] rounded-full pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Settings2 size={14} className="text-indigo-400" />
              <span className="text-[10px] font-black text-indigo-400/80 uppercase tracking-[0.2em]">Configuration</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">Registration Modal</h2>
            <p className="text-sm text-gray-400 mt-1 font-medium">
              Manage participant types, institution field, and quotas
            </p>
          </div>

          {canEdit && (
            <button
              onClick={() => setIsEditing(e => !e)}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all border ${
                isEditing
                  ? 'bg-rose-500/15 border-rose-500/30 text-rose-400 hover:bg-rose-500/25'
                  : 'bg-gradient-to-r from-indigo-600 to-indigo-500 border-indigo-500/30 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02]'
              }`}
            >
              {isEditing ? <><X size={14} /> Cancel</> : <><Save size={14} /> Edit Settings</>}
            </button>
          )}
        </div>
      </div>

      {/* ═══ Alerts ═══ */}
      {message && (
        <div className={`rounded-xl px-4 py-3 text-sm font-medium border animate-in fade-in duration-300 ${
          message.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
            : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
        }`}>
          {message.text}
        </div>
      )}

      {/* ═══ View Mode (Read-only) ═══ */}
      {!isEditing && (
        <div className="rounded-2xl bg-white/[0.02] border border-white/5 overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5 bg-gradient-to-r from-indigo-500/10 to-transparent flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
              <Eye size={14} className="text-indigo-400" />
            </div>
            <h3 className="text-sm font-black text-white tracking-tight">Current Settings</h3>
          </div>
          <div className="p-6 space-y-5">
            <div>
              <h4 className={labelCls}>Participant Types</h4>
              <div className="flex flex-wrap gap-2">
                {(draft.participantTypes || []).map((t: string, i: number) => (
                  <span key={i} className="px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white font-medium">
                    {t}
                    {(draft as any).participantQuotas?.[t] != null && (
                      <span className="ml-2 text-[10px] text-indigo-400 font-bold">max {(draft as any).participantQuotas[t]}</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <h4 className={labelCls}>Institution / College Field</h4>
              <div className="flex items-center gap-2">
                <Building2 size={14} className="text-gray-500" />
                <span className="text-sm text-gray-300 font-medium">
                  {(draft as any).registrationInstitutionVisible ? (
                    <>Visible — {(draft as any).registrationInstitutionOptional ? <span className="text-yellow-400/70">Optional</span> : <span className="text-emerald-400/70">Required</span>}</>
                  ) : (
                    <span className="text-gray-500">Hidden from viewers</span>
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Edit Mode ═══ */}
      {isEditing && (
        <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
          {/* Institution Settings Card */}
          <div className="rounded-2xl bg-white/[0.02] border border-white/5 overflow-hidden">
            <div className="px-6 py-4 border-b border-white/5 bg-gradient-to-r from-purple-500/10 to-transparent flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Building2 size={14} className="text-purple-400" />
              </div>
              <h3 className="text-sm font-black text-white tracking-tight">Institution / College Field</h3>
            </div>
            <div className="p-6 flex flex-wrap gap-6">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={(draft as any).registrationInstitutionVisible}
                    onChange={(e) => setDraft(prev => ({ ...prev, registrationInstitutionVisible: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-6 bg-white/[0.06] border border-white/10 rounded-full peer-checked:bg-indigo-500/30 peer-checked:border-indigo-500/30 transition-all" />
                  <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-gray-400 rounded-full peer-checked:translate-x-4 peer-checked:bg-indigo-400 transition-all shadow-sm" />
                </div>
                <span className="text-sm text-gray-300 font-medium group-hover:text-white transition-colors">Show Institution field</span>
              </label>
              <label className={`flex items-center gap-3 cursor-pointer group ${!(draft as any).registrationInstitutionVisible ? 'opacity-30 pointer-events-none' : ''}`}>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={(draft as any).registrationInstitutionOptional}
                    onChange={(e) => setDraft(prev => ({ ...prev, registrationInstitutionOptional: e.target.checked }))}
                    disabled={!(draft as any).registrationInstitutionVisible}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-6 bg-white/[0.06] border border-white/10 rounded-full peer-checked:bg-yellow-500/30 peer-checked:border-yellow-500/30 transition-all" />
                  <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-gray-400 rounded-full peer-checked:translate-x-4 peer-checked:bg-yellow-400 transition-all shadow-sm" />
                </div>
                <span className="text-sm text-gray-300 font-medium group-hover:text-white transition-colors">Make optional</span>
              </label>
            </div>
          </div>

          {/* Participant Types Card */}
          <div className="rounded-2xl bg-white/[0.02] border border-white/5 overflow-hidden">
            <div className="px-6 py-4 border-b border-white/5 bg-gradient-to-r from-indigo-500/10 to-transparent flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                <Sparkles size={14} className="text-indigo-400" />
              </div>
              <h3 className="text-sm font-black text-white tracking-tight">Participant Types</h3>
            </div>
            <div className="p-6 space-y-4">
              {/* Add new */}
              <div className="flex gap-3">
                <input
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addParticipantType()}
                  placeholder="New type (e.g. Student)"
                  className={inputCls + ' flex-1'}
                />
                <button
                  onClick={addParticipantType}
                  className="px-4 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 font-bold text-sm transition-all flex items-center gap-2"
                >
                  <Plus size={14} /> Add
                </button>
              </div>

              {/* List */}
              <div className="space-y-2">
                {(draft.participantTypes || []).map((t: string, i: number) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all group">
                    {/* Drag handle */}
                    <GripVertical size={14} className="text-gray-700 group-hover:text-gray-500 transition-colors flex-shrink-0" />

                    {/* Type name */}
                    <input
                      className="flex-1 bg-transparent border-0 text-sm text-white font-medium focus:outline-none focus:ring-0 placeholder-gray-600"
                      value={t}
                      onChange={(e) => updateParticipantType(i, e.target.value)}
                    />

                    {/* Quota */}
                    <input
                      type="number"
                      min={0}
                      className="w-20 bg-white/[0.04] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white text-center focus:outline-none focus:border-indigo-500/50 transition-all"
                      value={(draft as any).participantQuotas?.[t] ?? ''}
                      onChange={(e) => setDraft(prev => ({
                        ...prev,
                        participantQuotas: { ...(prev as any).participantQuotas, [t]: e.target.value === '' ? undefined : Math.max(0, parseInt(e.target.value || '0')) }
                      }))}
                      placeholder="∞"
                      title="Max registrations (blank = unlimited)"
                    />

                    {/* Reorder + Delete */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        aria-label="move up"
                        disabled={i === 0}
                        onClick={() => moveParticipantType(i, i - 1)}
                        className="p-1.5 rounded-lg bg-white/[0.03] border border-white/5 hover:border-white/15 text-gray-500 hover:text-white disabled:opacity-20 transition-all"
                      >
                        <ArrowUp size={12} />
                      </button>
                      <button
                        aria-label="move down"
                        disabled={i === (draft.participantTypes || []).length - 1}
                        onClick={() => moveParticipantType(i, i + 1)}
                        className="p-1.5 rounded-lg bg-white/[0.03] border border-white/5 hover:border-white/15 text-gray-500 hover:text-white disabled:opacity-20 transition-all"
                      >
                        <ArrowDown size={12} />
                      </button>
                      <button
                        onClick={() => removeParticipantType(i)}
                        className="p-1.5 rounded-lg bg-white/[0.03] border border-white/5 hover:border-rose-500/20 hover:bg-rose-500/10 text-gray-500 hover:text-rose-400 transition-all"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Save / Cancel */}
              <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                <button
                  onClick={handleCancel}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-400 hover:text-white bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02] disabled:opacity-50 transition-all"
                >
                  {saving ? 'Saving…' : 'Save Settings'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Preview Card ═══ */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/5 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className={labelCls + ' mb-1'}>Live Preview</h3>
          <p className="text-sm text-gray-400 font-medium">Open a live preview of the registration modal with current draft values.</p>
        </div>
        <button
          className="px-5 py-2.5 rounded-xl text-sm font-bold bg-purple-500/15 border border-purple-500/30 text-purple-400 hover:bg-purple-500/25 transition-all flex items-center gap-2 shrink-0"
          onClick={() => setShowPreview(true)}
        >
          <Eye size={14} /> Open Preview
        </button>
      </div>

      {/* Live modal preview overlay */}
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
