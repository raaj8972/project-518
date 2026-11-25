// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { Events } from '../src/pages/Events';

const mocks = vi.hoisted(() => ({ signedIn: false, ready: true, count: 7, uuid: false, winners: [] as any[], registration: vi.fn(), refresh: vi.fn() }));
vi.mock('../src/context/DataContext', () => ({ useData: () => ({
  events: Array.from({ length: mocks.count }, (_, index) => ({ id: mocks.uuid && index === 0 ? 'cfe572fa-1000-4000-8000-92f7fa417ada' : index + 1, title: index === 24 ? 'Inter-College Medical Research and Clinical Case Presentation Championship' : `Arena event ${index + 1}`, category: index === 1 ? 'Fashion' : index % 2 ? 'Cultural' : 'Academic', image: '/poster.jpg', description: 'Event description.', registration_open: true, visible: index < mocks.count - 1, rules: ['Bring college ID.'] })),
  eventCoordinators: [], eventWinners: mocks.winners, adminUsers: [], connectionStatus: 'connected', refreshAll: mocks.refresh, updateEvent: vi.fn(), loading: false,
}) }));
vi.mock('../src/context/AuthContext', () => ({ useAuth: () => ({ user: null, isAuthenticated: false }) }));
vi.mock('../src/context/StudentAuthContext', () => ({ useStudentAuth: () => ({ isAuthenticated: mocks.signedIn, isProfileComplete: mocks.ready, isApproved: mocks.ready }) }));
vi.mock('../src/context/EventCartContext', () => ({ useEventCart: () => ({ isInCart: () => false }) }));
vi.mock('../src/components/ToastProvider', () => ({ useToast: () => ({ push: vi.fn() }) }));
vi.mock('../src/services/roundWinners', () => ({ getRoundWinners: async () => [] }));
vi.mock('../src/services/rankingData', () => ({ getRankingData: vi.fn() }));
vi.mock('../src/components/Events/EventsArenaHero', () => ({ EventsArenaHero: () => <header><h1>EVENTS</h1></header> }));
vi.mock('../src/components/dashboard/ProfileModal', () => ({ default: () => null }));
vi.mock('../src/components/CartDrawer', () => ({ CartDrawer: () => null }));
vi.mock('../src/components/RegistrationModal', () => ({ RegistrationModal: (props: any) => { mocks.registration(props); return <div data-registration-event={props.eventId}>Registration for {props.eventTitle}</div>; } }));
vi.mock('../src/lib/supabase', () => ({ supabase: {
  auth: { getSession: async () => ({ data: { session: { user: { id: 'student' } } } }) },
  from: () => ({ select() { return this; }, eq() { return this; }, neq: async () => ({ data: [] }) }),
  channel: () => ({ on() { return this; }, subscribe() { return this; } }), removeChannel: vi.fn(),
} }));
let host: HTMLDivElement; let root: Root;
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  mocks.signedIn = false; mocks.ready = true; mocks.count = 7; mocks.uuid = false; mocks.winners = []; mocks.registration.mockClear();
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { callback(0); return 1; });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  Element.prototype.scrollIntoView = vi.fn(); window.scrollTo = vi.fn();
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); });
function Location() { const location = useLocation(); return <output>{location.pathname}{location.search}</output>; }
const render = async (url = '/events') => act(async () => root.render(<MemoryRouter initialEntries={[url]}><Events /><Location /></MemoryRouter>));
const click = async (node: Element | null) => { expect(node).toBeTruthy(); await act(async () => (node as HTMLElement).click()); };
it('shows four posters first, reveals the full list, filters categories and keeps hidden events unpublished', async () => {
  await render();
  expect([...host.querySelectorAll('.arena-category-button')].map(button => button.textContent)).toEqual(['All', 'Cultural', 'Academic']);
  expect(host.querySelectorAll('.arena-event')).toHaveLength(4);
  await click(host.querySelector('.arena-view-all button'));
  expect(host.querySelectorAll('.arena-event')).toHaveLength(6);
  const cultural = [...host.querySelectorAll('.arena-category-button')].find(button => button.textContent === 'Cultural')!;
  await click(cultural);
  expect(host.querySelectorAll('.arena-event')).toHaveLength(3);
  expect(cultural.getAttribute('aria-pressed')).toBe('true');
  expect(host.textContent).not.toContain('Arena event 7');
  expect(host.querySelector('.arena-category-badge')?.textContent).toBe('Cultural');
  const academic = [...host.querySelectorAll('.arena-category-button')].find(button => button.textContent === 'Academic')!;
  await click(academic);
  expect(host.querySelectorAll('.arena-event')).toHaveLength(3);
  expect(host.querySelector('.arena-category-badge')?.textContent).toBe('Academic');
});
it('opens the shared event even if it is beyond the first four, and retains it through sign in', async () => {
  await render('/events?event=1');
  expect(document.querySelector('.arena-details h2')?.textContent).toBe('Arena event 1');
  await click(document.querySelector('.arena-details-footer button'));
  expect(document.querySelector('.arena-auth-dialog')?.textContent).toContain('Arena event 1');
  await click(document.querySelector('.arena-auth-dialog .arena-gold-button'));
  const url = host.querySelector('output')!.textContent!;
  expect(url).toContain('/student/login?mode=signup');
  expect(new URL('https://example.test' + url).searchParams.get('redirect')).toBe('/events?event=1');
});
it('opens the connected registration modal for a signed-in student', async () => {
  mocks.signedIn = true;
  await render();
  await click(host.querySelector('.arena-event-trigger'));
  await click(document.querySelector('.arena-details-footer button'));
  expect(host.querySelector('[data-registration-event="6"]')).toBeTruthy();
  expect(mocks.registration.mock.lastCall?.[0].eventTitle).toBe('Arena event 6');
});
it('handles 25 published events with long titles, lazy images and complete category results', async () => {
  mocks.count = 26;
  await render();
  expect(host.querySelectorAll('.arena-event')).toHaveLength(4);
  await click(host.querySelector('.arena-view-all button'));
  expect(host.querySelectorAll('.arena-event')).toHaveLength(25);
  expect(new Set([...host.querySelectorAll('.arena-event')].map(card => card.id)).size).toBe(25);
  expect(host.querySelectorAll('.arena-poster-image[loading="lazy"]')).toHaveLength(21);
  expect(host.textContent).toContain('Clinical Case Presentation Championship');
  const cultural = [...host.querySelectorAll('.arena-category-button')].find(button => button.textContent === 'Cultural')!;
  await click(cultural);
  await click(host.querySelector('.arena-view-all button'));
  expect(host.querySelectorAll('.arena-event')).toHaveLength(12);
  const academic = [...host.querySelectorAll('.arena-category-button')].find(button => button.textContent === 'Academic')!;
  await click(academic);
  await click(host.querySelector('.arena-view-all button'));
  expect(host.querySelectorAll('.arena-event')).toHaveLength(13);
});
it('preserves a UUID winner event link all the way to the named honour card and event details', async () => {
  mocks.uuid = true;
  mocks.winners = [{ id: 41, event_id: 'cfe572fa-1000-4000-8000-92f7fa417ada', name: 'Raaj', position: 1 }];
  await render();
  expect(host.querySelector('.honours-card h3')?.textContent).toBe('Arena event 1');
  expect(host.querySelector('.honours-card')?.textContent).toContain('Raaj');
  await click(host.querySelector('.honours-event-link'));
  expect(document.querySelector('.arena-details h2')?.textContent).toBe('Arena event 1');
});

it('routes a signed-in student with an incomplete profile to IQMG setup before opening registration',async()=>{mocks.signedIn=true;mocks.ready=false;await render();await click(host.querySelector('.arena-event-trigger'));await click(document.querySelector('.arena-details-footer button'));expect(mocks.registration).not.toHaveBeenCalled();const url=host.querySelector('output')!.textContent!;expect(url).toContain('/dashboard?returnTo=');expect(new URL('https://example.test'+url).searchParams.get('returnTo')).toBe('/events?event=6');});
