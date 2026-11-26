import { expect, it, vi } from 'vitest';
import { makeEventDraft, restoreEventDraft, serializeEventDraft, validateEventDraft } from '../src/components/admin/events/eventEditor';
import { persistEventDraft, type EventSaveProgress } from '../src/components/admin/events/eventPersistence';
import type { Event, EventCoordinator } from '../src/types/data';

const source = { id: 15, title: 'College debate', category: 'Academic', description: 'A published description.', image: '/poster.jpg', highlights: ['Open discussion'], rules: ['Respect the time limit.'], registration_open: true, visible: true, registration_opens_at: '2027-12-19T07:30:00Z', registration_participant_types: ['MBBS'], registration_participant_quotas: { MBBS: 0 } } as unknown as Event;
const coordinator = (id: number, order_position: number) => ({ id, event_id: 15, name: 'Contact ' + id, phone: '+91 12345', order_position }) as EventCoordinator;
const draft = () => makeEventDraft(source, [coordinator(1, 1), coordinator(2, 2)], 'https://chat.whatsapp.com/Invite');

it('preserves eligibility, zero quotas, media and protected links and serializes registration windows in India time', () => {
  const state = draft(); state.fields.registration_timer_enabled = true; state.fields.registration_closes_at = '2027-12-19T17:00';
  expect(state.fields.registration_opens_at).toBe('2027-12-19T13:00');
  expect(validateEventDraft(state)).toBeNull();
  const data = serializeEventDraft(state);
  expect(data.registration_opens_at).toBe('2027-12-19T07:30:00.000Z');
  expect(data.registration_closes_at).toBe('2027-12-19T11:30:00.000Z');
  expect(data.registration_participant_quotas).toEqual({ MBBS: 0 });
  expect(data.whatsapp_group_link).toBe('https://chat.whatsapp.com/Invite');
  expect(data).not.toHaveProperty('coordinators'); expect(data).not.toHaveProperty('current_registrations');
  state.fields.whatsapp_group_link = '';
  // The private-group trigger interprets an empty string as removal; NULL means no change.
  expect(serializeEventDraft(state).whatsapp_group_link).toBe('');
});
it('validates hidden sections and survives malformed saved drafts without inventing notification consent', () => {
  const state = draft(); state.fields.team_min_members = '6'; state.fields.team_max_members = '3';
  expect(validateEventDraft(state)?.section).toBe('registration');
  state.fields.team_min_members = ''; state.fields.team_max_members = ''; state.fields.rules_link = 'javascript:alert(1)';
  expect(validateEventDraft(state)?.section).toBe('rules');
  const restored = restoreEventDraft({ fields: { ...state.fields, title: 'Keep this edit', registration_participant_quotas: null, highlights: [null, 'Keep highlight'] }, sections: [null, { heading: 'Eligibility', blocks: [null, { items: [null, 'Real rule'] }] }], coordinators: [null], notify: true }, draft());
  expect(restored.fields.title).toBe('Keep this edit'); expect(restored.fields.highlights).toEqual(['Keep highlight']); expect(restored.fields.registration_participant_quotas).toEqual({ MBBS: 0 }); expect(restored.sections[0].blocks?.[0].items).toEqual(['Real rule']); expect(restored.notify).toBe(false);
});
it('retries only unfinished coordinator writes after an event has been created', async () => {
  const state = draft(); state.coordinators = [{ key: 'new-1', name: 'First contact', phone: '100' }, { key: 'new-2', name: 'Second contact', phone: '200' }];
  const progress: EventSaveProgress = { coordinators: [] };
  const writes = { create: vi.fn().mockResolvedValue({ id: 90 }), update: vi.fn().mockResolvedValue(undefined), addCoordinator: vi.fn().mockResolvedValueOnce({ id: 100 }).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ id: 101 }), updateCoordinator: vi.fn(), deleteCoordinator: vi.fn() };
  await expect(persistEventDraft(state, writes, progress, () => {})).rejects.toThrow('offline');
  expect(progress.id).toBe(90); expect(progress.coordinators).toHaveLength(1);
  await persistEventDraft(state, writes, progress, () => {});
  expect(writes.create).toHaveBeenCalledTimes(1); expect(writes.update).not.toHaveBeenCalled(); expect(writes.addCoordinator).toHaveBeenCalledTimes(3);
  expect(progress.coordinators.map(coord => coord.id)).toEqual([100, 101]);
});
it('saves both contact order positions when their order is reversed and removes only deleted contacts', async () => {
  const state = draft(); state.coordinators.reverse();
  const progress: EventSaveProgress = { id: source.id, payload: JSON.stringify(serializeEventDraft(state)), coordinators: draft().coordinators };
  const writes = { create: vi.fn(), update: vi.fn(), addCoordinator: vi.fn(), updateCoordinator: vi.fn().mockResolvedValue(undefined), deleteCoordinator: vi.fn().mockResolvedValue(undefined) };
  await persistEventDraft(state, writes, progress, () => {});
  expect(writes.updateCoordinator).toHaveBeenCalledWith(2, expect.objectContaining({ order_position: 1 })); expect(writes.updateCoordinator).toHaveBeenCalledWith(1, expect.objectContaining({ order_position: 2 }));
  state.coordinators = [state.coordinators[0]]; await persistEventDraft(state, writes, progress, () => {});
  expect(writes.deleteCoordinator).toHaveBeenCalledExactlyOnceWith(1);
});
