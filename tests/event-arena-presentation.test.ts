import { expect, it } from 'vitest';
import { eventCategory, eventDate, eventField, eventLink, eventText, eventTime, presentRules, filterEventCatalog } from '../src/utils/eventPresentation';

it('formats actual event logistics while keeping missing values unannounced', () => {
  expect(eventDate('2026-11-23')).toBe('23 Nov 2026');
  expect(eventTime('18:30:00')).toBe('6:30 PM IST');
  expect(eventTime('00:15')).toBe('12:15 AM IST');
  expect(eventField('TBA')).toBe('To be announced');
  expect(eventDate('')).toBe('To be announced');
  expect(eventCategory({ name: ' Cultural ' })).toBe('Cultural');
  expect(eventText('<p>Take the stage.</p><p>Bring your team &amp; ID.</p>')).toBe('Take the stage.\n\nBring your team & ID.');
});

it('renders both admin rulebook formats, preserves text sections and numbers across blocks', () => {
  const sections = [{ heading: 'Eligibility', blocks: [{ kind: 'text', content: 'Current students only.' }, { kind: 'points', items: ['Bring college ID.', 'Arrive on time.'] }, { kind: 'points', title: 'Stage', items: ['No props on fire.'] }] }];
  const v2 = presentRules(['__SR__' + JSON.stringify({ v: 2, sections })]);
  expect(v2.map(rule => rule.content)).toEqual(['Eligibility', 'Current students only.', 'Bring college ID.', 'Arrive on time.', 'Stage', 'No props on fire.']);
  expect(v2.filter(rule => rule.level === 'numbered').map(rule => rule.index)).toEqual([1, 2, 3]);
  expect(presentRules(['__SR__' + JSON.stringify(sections)])).toEqual(v2);
  expect(presentRules(['Arrive on time.', ''])).toEqual([{ content: 'Arrive on time.', level: 'numbered', index: 1 }]);
  expect(presentRules(['__SR__broken'])).toEqual([]);
  expect(presentRules(null)).toEqual([]);
});

it('accepts official external links and rejects executable or malformed URLs', () => {
  expect(eventLink('https://example.org/rules.pdf')).toBe('https://example.org/rules.pdf');
  expect(eventLink('javascript:alert(1)')).toBeUndefined();
  expect(eventLink('data:text/html,hello')).toBeUndefined();
  expect(eventLink('not a link')).toBeUndefined();
});
it('finds events in a 25-event admin catalog without mixing publication and category filters', () => {
  const events = Array.from({ length: 25 }, (_, index) => ({ title: `Competition ${index + 1}`, venue: index === 8 ? 'Lecture Hall' : 'Main Stage', category: index % 2 ? 'Fashion' : 'Academic', visible: index % 4 !== 0 }));
  expect(filterEventCatalog(events, '  LECTURE HALL ', 'All', 'all')).toEqual([events[8]]);
  expect(filterEventCatalog(events, '', 'Academic', 'hidden')).toHaveLength(7);
  expect(filterEventCatalog(events, '', 'Cultural', 'published')).toHaveLength(12);
  expect(filterEventCatalog(events, '', 'All', 'all')).toHaveLength(25);
  expect(filterEventCatalog(events, 'not found', 'All', 'all')).toEqual([]);
});
