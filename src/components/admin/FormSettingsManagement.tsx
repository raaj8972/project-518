import React, { useState } from 'react';
import { AlertCircle, Check, Music2, Save, Settings2, X } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useSavingProgress } from '../../context/SavingProgressContext';
import '../../styles/ParticipantFormSettings.css';

const defaults = {
  audition_form_enabled: true,
  membership_form_enabled: true,
  audition_form_message: 'Auditions are currently closed. Please check back later.',
  membership_form_message: 'Membership applications are currently closed. Please check back later.',
};

export const FormSettingsManagement: React.FC = () => {
  const { formSettings, updateFormSettings } = useData();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const savingProgress = useSavingProgress();
  const current = {
    audition_form_enabled: formSettings?.audition_form_enabled ?? defaults.audition_form_enabled,
    membership_form_enabled: formSettings?.membership_form_enabled ?? defaults.membership_form_enabled,
    audition_form_message: formSettings?.audition_form_message || defaults.audition_form_message,
    membership_form_message: formSettings?.membership_form_message || defaults.membership_form_message,
  };
  const [form, setForm] = useLocalStorage('admin_form_settings_draft', current);

  const openEditor = () => { setForm(current); setMessage(null); setIsEditing(true); };
  const handleSave = async () => {
    setSaving(true);
    const steps = savingProgress.withSteps(3, 'Preparing…');
    try {
      steps.next('Saving settings');
      await updateFormSettings(form);
      steps.next('Applying changes');
      setIsEditing(false);
      setMessage({ type: 'success', text: 'Application settings saved. Changes are live on the website.' });
      try { localStorage.removeItem('admin_form_settings_draft'); } catch {}
      steps.done();
    } catch (error) {
      console.error('Error updating form settings:', error);
      setMessage({ type: 'error', text: `Could not save settings: ${(error as Error)?.message || String(error)}` });
      savingProgress.done();
    } finally { setSaving(false); }
  };
  const handleCancel = () => {
    setForm(current); setIsEditing(false); setMessage(null);
    try { localStorage.removeItem('admin_form_settings_draft'); } catch {}
  };

  const forms = [
    { key: 'audition' as const, title: 'Band auditions', description: 'Applications to join the Home Bound band.', Icon: Music2, enabledKey: 'audition_form_enabled' as const, messageKey: 'audition_form_message' as const, enabled: current.audition_form_enabled, accent: 'violet' },
  ];

  return (
    <section className="participant-form-settings">
      <header className="pfs-heading">
        <div>
          <div className="pfs-eyebrow"><Settings2 size={15} /> APPLICATION SETTINGS</div>
          <h2>Application availability</h2>
          <p>Control which applications are open and what visitors see when they are closed.</p>
        </div>
        {!isEditing ? <button type="button" className="pfs-primary" onClick={openEditor}><Settings2 size={17} /> Edit settings</button> : <div className="pfs-heading-actions"><button type="button" className="pfs-quiet" onClick={handleCancel}><X size={16} /> Cancel</button><button type="button" className="pfs-primary" onClick={handleSave} disabled={saving}><Save size={16} /> {saving ? 'Saving…' : 'Save changes'}</button></div>}
      </header>

      {message && <div role="status" className={`pfs-message ${message.type}`}><span>{message.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}</span>{message.text}</div>}

      <div className="pfs-overview">
        <div><span className="pfs-overview-label">APPLICATIONS</span><strong>2</strong><small>Independent forms</small></div>
        <div><span className="pfs-overview-label">CURRENTLY OPEN</span><strong>{forms.filter(item => item.enabled).length}</strong><small>Available to visitors</small></div>
        <div className="pfs-overview-note"><span className="pfs-live-dot" /> Changes apply to public forms as soon as they are saved.</div>
      </div>

      <div className="pfs-list">
        {forms.map(({ key, title, description, Icon, enabledKey, messageKey, enabled, accent }, index) => (
          <article key={key} className={`pfs-card ${accent}`}>
            <div className="pfs-card-top">
              <div className="pfs-card-icon"><Icon size={21} /></div>
              <div className="pfs-card-title"><span className="pfs-card-number">0{index + 1} / APPLICATION</span><h3>{title}</h3><p>{description}</p></div>
              {isEditing ? <button type="button" role="switch" aria-checked={form[enabledKey]} aria-label={`Enable ${title}`} className={`pfs-switch ${form[enabledKey] ? 'on' : ''}`} onClick={() => setForm(previous => ({ ...previous, [enabledKey]: !previous[enabledKey] }))}><span /></button> : <span className={`pfs-status ${enabled ? 'open' : 'closed'}`}><span />{enabled ? 'Open' : 'Closed'}</span>}
            </div>
            <div className="pfs-card-detail">
              <div><span className="pfs-detail-label">FORM STATUS</span><p>{isEditing ? (form[enabledKey] ? 'Visitors can submit an application.' : 'The form is hidden from submissions.') : (enabled ? 'Accepting new applications' : 'Not accepting applications')}</p></div>
              {(isEditing || !enabled) && <label className="pfs-message-field"><span className="pfs-detail-label">MESSAGE SHOWN WHEN CLOSED</span><textarea value={form[messageKey]} disabled={!isEditing} maxLength={240} rows={2} onChange={event => setForm(previous => ({ ...previous, [messageKey]: event.target.value }))} /><small>{form[messageKey].length}/240 characters</small></label>}
            </div>
          </article>
        ))}
      </div>

      <footer className="pfs-footer"><span>Each application type keeps its own open/closed state and message.</span><span>Public forms reflect saved settings right away.</span></footer>
    </section>
  );
};
