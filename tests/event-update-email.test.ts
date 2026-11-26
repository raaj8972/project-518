import { expect, it } from 'vitest';
import { renderEventUpdateEmail, type EventUpdateEmailInput } from '../shared/eventUpdateEmail';
const input = (): EventUpdateEmailInput => ({ eventId: 15, eventTitle: 'Campus debate', updateType: 'combined', registration: { id: 91, full_name: 'Published Participant', team_members: [{ name: 'Team member' }] }, newDetails: { date: '2027-12-19', time: '4 PM', venue: 'Main auditorium' }, logoUrl: 'https://files.example/logo.png', stampUrl: 'https://files.example/stamp.png', year: 2027, rules: [{ text: 'Please arrive early.', highlight: true }], coordinators: [{ name: 'Coordinator', phone: '+91 9000000000' }] });
it('places the brand logo in the masthead and the stamp after the content without overlapping the message', () => {
  const { html, subject } = renderEventUpdateEmail(input());
  expect(subject).toBe('Schedule & rules update: Campus debate');
  expect(html.indexOf('logo.png')).toBeLessThan(html.indexOf('Dear <strong>'));
  expect(html.indexOf('stamp.png')).toBeGreaterThan(html.indexOf('Questions? Contact'));
  expect(html).toContain('width="140"'); expect(html).not.toContain('margin-top: -'); expect(html).not.toContain('background-image'); expect(html).not.toContain('wikipedia');
  for (const text of ['UPDATED SCHEDULE', 'Current rules', 'Please arrive early.', 'UPDATED', 'Team member', 'Registration ID:', 'Main auditorium', 'Published Participant']) expect(html).toContain(text);
});
it('renders structured and legacy rules and escapes participant content and unsafe images', () => {
  const data = input(); data.updateType = 'rules'; data.registration.full_name = '<img src=x onerror=alert(1)>'; data.message = '<script>bad()</script>'; data.logoUrl = 'javascript:alert(1)';
  data.rules = ['__SR__' + JSON.stringify({ v: 2, sections: [{ heading: 'Eligibility', blocks: [{ style: 'number', title: 'Round one', items: ['Bring a college ID.'] }] }] })];
  const { html } = renderEventUpdateEmail(data);
  expect(html).toContain('Eligibility'); expect(html).toContain('Bring a college ID.'); expect(html).not.toContain('__SR__');
  expect(html).toContain('&lt;script&gt;bad()&lt;/script&gt;'); expect(html).not.toContain('<img src=x'); expect(html).not.toContain('javascript:');
  expect(html).not.toContain('UPDATED SCHEDULE');
});
