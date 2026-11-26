import { useState } from 'react';
import { EnvelopeClosedIcon } from '@radix-ui/react-icons';
import type { Event } from '../../../types/data';
import { eventDate, eventTime } from '../../../utils/eventPresentation';
import { EventAdminDialog } from './EventAdminDialog';
import { EditorField } from './EventEditorDialog';
import { notificationRules } from './eventEditor';

export interface EventMailDraft { type: 'schedule' | 'rules' | 'combined'; message: string; rules: { text: string; kind: string; highlight: boolean }[] }
export function EventNotificationDialog({ event, onClose, onSend }: { event: Event; onClose: () => void; onSend: (draft: EventMailDraft) => Promise<string> }) {
  const [draft, setDraft] = useState<EventMailDraft>(() => ({ type: 'rules', message: '', rules: notificationRules(event.rules) }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState('');
  const send = async () => { if (busy) return; setBusy(true); setError(''); try { setSent(await onSend(draft)); } catch (reason) { setError(reason instanceof Error ? reason.message : 'The notification could not send.'); } finally { setBusy(false); } };
  return <EventAdminDialog title="Notify participants" description={event.title} onClose={onClose} busy={busy} footer={<><span>{sent ? 'This broadcast is complete.' : 'Only approved registrations for this event receive this email.'}</span><div><button type="button" className="event-admin-button is-secondary" disabled={busy} onClick={onClose}>{sent ? 'Done' : 'Cancel'}</button>{!sent && <button type="button" className="event-admin-button is-primary" disabled={busy} onClick={() => void send()}><EnvelopeClosedIcon />{busy ? 'Sending…' : 'Send update'}</button>}</div></>}>
    <div className="event-admin-dialog__body">{error && <p className="event-admin-feedback is-error" role="alert">{error}</p>}{sent ? <p className="event-admin-feedback" role="status">{sent}</p> : <fieldset disabled={busy}>
      <EditorField label="Update type"><select value={draft.type} onChange={change => setDraft(previous => ({ ...previous, type: change.target.value as EventMailDraft['type'] }))}><option value="rules">Rules update</option><option value="schedule">Schedule or venue update</option><option value="combined">Schedule and rules update</option></select></EditorField>
      {draft.type !== 'rules' && <div className="event-email-schedule"><span><small>Date</small>{eventDate(event.date)}</span><span><small>Time</small>{eventTime(event.time)}</span><span><small>Venue</small>{event.venue || 'To be announced'}</span></div>}
      <EditorField label="Message to participants"><textarea rows={4} value={draft.message} onChange={change => setDraft(previous => ({ ...previous, message: change.target.value }))} placeholder="Briefly explain the update and any action participants should take." /></EditorField>
      {draft.type !== 'schedule' && <section className="event-editor-group"><header><h3>Highlight changed rules</h3><p>Selected rules will be marked as updated in the email.</p></header>{draft.rules.length ? <div className="event-email-rule-picker">{draft.rules.map((rule, index) => <label key={index}><input type="checkbox" checked={rule.highlight} onChange={change => setDraft(previous => ({ ...previous, rules: previous.rules.map((item, pos) => pos === index ? { ...item, highlight: change.target.checked } : item) }))} /><span>{rule.text}</span></label>)}</div> : <p className="event-admin-hint">No saved rules. The email will direct participants to the event page.</p>}</section>}
      <p className="event-admin-hint">Review the saved event details before sending. Each send processes up to 100 approved registrations.</p>
    </fieldset>}</div>
  </EventAdminDialog>;
}
