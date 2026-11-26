import { expect, it } from 'vitest';
import { durationFromTime, linkedSlot, emptySlot, normalizeScheduleImport, slotPayload, venueConflicts } from '../src/components/admin/schedule/scheduleEditor';
import { scheduleDayType, scheduleEventWindow } from '../src/utils/schedulePresentation';
import { scheduleRecipients, renderScheduleBroadcast } from '../shared/scheduleBroadcast';
import type { Event, ScheduleDay } from '../src/types/data';
it('preserves text event IDs and honors explicit editions ahead of legacy tags', () => {
  const draft = linkedSlot(emptySlot(1), { id: 'event-quiz-final', title: 'Campus quiz', venue: 'Hall', category: 'Academic', time: '9 AM - 10:30 AM' } as unknown as Event);
  expect(slotPayload(draft)).toMatchObject({ event_id: 'event-quiz-final', duration: '1 hour 30 min', title: 'Campus quiz', schedule_day_id: 1 });
  expect(scheduleDayType({ schedule_type: 'mains', title: 'Opening' } as ScheduleDay)).toBe('mains');
  expect(scheduleDayType({ schedule_type: 'prelims', title: '[MAINS]' } as ScheduleDay)).toBe('prelims');
  expect(scheduleDayType({ title: '[MAINS]' } as ScheduleDay)).toBe('mains');
});
it('calculates time ranges and interprets human duration units correctly', () => {
  expect(durationFromTime('11:30 PM – 1 AM')).toBe('1 hour 30 min');
  expect(durationFromTime('9:00 to 10:15')).toBe('1 hour 15 min');
  expect(durationFromTime('TBA')).toBe(''); expect(durationFromTime('9 AM - 27 PM')).toBe('');
  const range = scheduleEventWindow({ id: 1, title: '', time: '9 AM', duration: '2 hours 15 min' } as any, '2027-01-08')!;
  expect(range.end - range.start).toBe(135 * 60000);
});
it('normalizes flat scanner output and nested days, rejects missing dates without inventing data', () => {
  const flat = normalizeScheduleImport([{ date: '2027-01-08', title: 'Campus quiz', start_time: '9 AM', end_time: '10 AM', category: 'Academic' }, { date: '2027-01-08', title: 'Debate', start_time: '11 AM' }], 'mains');
  expect(flat).toHaveLength(1); expect(flat[0]).toMatchObject({ schedule_type: 'mains', date: '2027-01-08', events: [{ title: 'Campus quiz', time: '9 AM – 10 AM', type: 'Academic' }, { title: 'Debate', time: '11 AM' }] });
  expect(normalizeScheduleImport([{ date: '2027-01-08', day: 'Final day', events: [{ title: 'Band', time: '7 PM' }] }], 'mains')[0].day).toBe('Final day');
  expect(() => normalizeScheduleImport([{ title: 'Missing date' }], 'mains')).toThrow('valid date');
  expect(() => normalizeScheduleImport([{ date: '2027-02-30', title: 'Bad date' }], 'mains')).toThrow('valid date');
});
it('flags actual venue overlaps while allowing parallel events in different halls', () => {
  const days = [{ date: '2027-01-08', events: [{ id: 1, title: 'Quiz', time: '9 AM - 11 AM', venue: 'Hall A' }, { id: 2, title: 'Debate', time: '10 AM - 12 PM', venue: 'hall a' }, { id: 3, title: 'Dance', time: '10 AM - 12 PM', venue: 'Hall B' }, { id: 4, title: 'Music', time: '12 PM - 1 PM', venue: 'Hall A' }] }] as ScheduleDay[];
  const conflicts = venueConflicts(days); expect([...conflicts.keys()]).toEqual([1, 2]); expect(conflicts.get(1)).toEqual(['Debate']);
});
it('deduplicates recipients case-insensitively and renders current, escaped branding for either edition', () => {
  const audience = scheduleRecipients([{ id: '1', email: ' Quiz@College.edu ' }, { id: '2', email: 'quiz@college.edu' }, { id: '3', email: 'band@college.edu' }, { id: '4', email: 'invalid' }], [{ recipient_email: 'BAND@College.edu' }]);
  expect(audience.total).toBe(2); expect(audience.pending.map(row => row.email)).toEqual(['quiz@college.edu']);
  const email = renderScheduleBroadcast({ name: '<script>name</script>', year: 2027, editions: ['Mains'], siteUrl: 'https://ricorrenza.fun' });
  expect(email.subject).toContain('2027'); expect(email.html).toContain('Mains'); expect(email.html).toContain('&lt;script&gt;'); expect(email.html).not.toContain('2026'); expect(email.html).not.toContain('<script>');
});
