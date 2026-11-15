// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { WinnersSection } from '../src/components/Events/WinnersSection';
it('joins winners to the real event title, preserves ties and includes Special Mention', () => {
  const markup = renderToStaticMarkup(<WinnersSection events={[{ id: 9, title: 'Med Quiz', category: 'Academic' }]} eventWinners={[
    { id: 1, event_id: '9', name: 'First participant', position: 1 },
    { id: 2, event_id: 9, name: 'Tied participant', position: 1 },
    { id: 3, event_id: 9, name: 'Mention participant', position: 4 },
  ]} />);
  const host = document.createElement('div'); host.innerHTML = markup;
  expect(host.querySelectorAll('article')).toHaveLength(1);
  expect(host.querySelector('h3')?.textContent).toBe('Med Quiz');
  expect(host.querySelector('.honours-card-header')?.textContent).toContain('Academic');
  expect(host.querySelectorAll('.honours-placements>li')).toHaveLength(2);
  expect(host.querySelector('.honours-placement--first')?.textContent).toContain('Tied participant');
  expect(host.textContent).toContain('Special mention');
  expect(host.textContent).toContain('Mention participant');
});
it('opens an available winner profile and leaves manually entered names as text', async () => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  const host = document.createElement('div'); document.body.appendChild(host); const root = createRoot(host); const profile = vi.fn();
  try {
    await act(async () => root.render(<WinnersSection onOpenProfile={profile} eventWinners={[{ id: 1, event_id: 9, event_title: 'Dance Battle', name: 'Team leader', user_id: 'winner-profile', position: 1 }, { id: 2, event_id: 9, name: 'Manual entry', position: 2 }]} />));
    expect(host.querySelectorAll('button')).toHaveLength(1);
    await act(async () => (host.querySelector('button') as HTMLButtonElement).click());
    expect(profile).toHaveBeenCalledWith('winner-profile');
    expect(host.textContent).toContain('Manual entry');
  } finally { await act(async () => root.unmount()); host.remove(); }
});
it('does not display an empty honour roll or invented winners', () => {
  expect(renderToStaticMarkup(<WinnersSection eventWinners={[]} />)).toBe('');
  expect(renderToStaticMarkup(<WinnersSection eventWinners={[{ event_id: 2, name: '' }]} />)).toBe('');
});
