// @vitest-environment jsdom
import React, { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { EventCard } from '../src/components/Events/EventCard';
import { RulesModal } from '../src/components/Events/RulesModal';
import { presentRules } from '../src/utils/eventPresentation';

vi.mock('../src/context/StudentAuthContext',()=>({useStudentAuth:()=>({user:null,isAuthenticated:false})}));
const register = vi.fn();
const sample = { id: 31, title: 'Battle of Bands', category: 'Cultural', description: 'Let the music dominate.', date: '2026-11-23', time: '18:30', venue: 'Main Stage', rules: ['Bring your college ID.', 'Keep the set under 10 minutes.'], image: '/poster.png', registration_open: true };
let host: HTMLDivElement; let root: Root;
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { callback(0); return 1; });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host); register.mockClear();
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); document.body.style.overflow = ''; });
function Fixture({ closed = false }: { closed?: boolean }) {
  const [open, setOpen] = useState(false); const [rules, setRules] = useState(false);
  return <MemoryRouter><EventCard event={{ ...sample, registration_open: !closed }} index={0} isOwner={false} isFlipped={open} onFlip={() => setOpen(value => !value)} onRegister={register} onOpenRules={() => setRules(true)} isRulesExpanded={false} onToggleRules={() => {}} eventWinners={[]} coordinators={[{ name: 'Festival coordinator', phone: '+91 98765 43210' }]} posterFit="cover" updateEvent={async () => {}} />{rules && <RulesModal isOpen onClose={() => setRules(false)} eventTitle={sample.title} rules={presentRules(sample.rules)} />}</MemoryRouter>;
}
const click = async (element: Element | null) => { expect(element).toBeTruthy(); await act(async () => (element as HTMLElement).click()); };
it('opens real details, coordinator and numbered rules; Escape closes only the top dialog and restores scroll ownership', async () => {
  document.body.style.overflow = 'auto';
  await act(async () => root.render(<Fixture />));
  const trigger = host.querySelector('button') as HTMLButtonElement; trigger.focus();
  await click(trigger);
  const detail = document.querySelector('.arena-details');
  expect(detail?.getAttribute('role')).toBe('dialog');
  expect(detail?.textContent).toContain('23 Nov 2026');
  expect(detail?.textContent).toContain('6:30 PM IST');
  expect(detail?.textContent).toContain('Main Stage');
  expect(detail?.querySelector('a[href="tel:+919876543210"]')).toBeTruthy();
  expect(document.body.style.overflow).toBe('hidden');
  await click(detail?.querySelector('.arena-rules-link') || null);
  expect(document.querySelector('.arena-rule')?.textContent).toContain('01Bring your college ID.');
  await act(async () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
  expect(document.querySelector('.arena-rulebook')).toBeNull();
  expect(document.querySelector('.arena-details')).toBeTruthy();
  expect(document.body.style.overflow).toBe('hidden');
  await act(async () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
  expect(document.querySelector('.arena-details')).toBeNull();
  expect(document.body.style.overflow).toBe('auto');
  expect(document.activeElement).toBe(trigger);
});
it('opens registration only for events accepting entries', async () => {
  await act(async () => root.render(<Fixture />));
  await click(host.querySelector('button'));
  await click(document.querySelector('.arena-details-footer button'));
  expect(register).toHaveBeenCalledWith(31);
  await act(async () => root.render(<Fixture closed />));
  const closedButton = document.querySelector('.arena-details-footer button') as HTMLButtonElement;
  expect(closedButton.disabled).toBe(true);
  await click(closedButton);
  expect(register).toHaveBeenCalledTimes(1);
});
