// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it } from 'vitest';
import DynamicBadge from '../src/components/dashboard/DynamicBadge';
import { studentTier, studentTierProgress } from '../src/utils/studentTiers';

afterEach(() => { document.body.innerHTML = ''; });
it('recognises the database Elite tier and its legacy Platinum alias', () => {
  expect(studentTier(' elite ').label).toBe('Elite');
  expect(studentTier('ELITE').id).toBe('elite');
  expect(studentTier('platinum').label).toBe('Elite');
  expect(studentTier('gold').label).toBe('Gold');
});
it('matches server thresholds and measures progress within the current tier', () => {
  expect(studentTierProgress(99).tier.id).toBe('bronze');
  expect(studentTierProgress(100).tier.id).toBe('silver');
  expect(studentTierProgress(300).percent).toBe(50);
  expect(studentTierProgress(500).tier.id).toBe('gold');
  expect(studentTierProgress(1000).tier.id).toBe('elite');
  expect(studentTierProgress(1400).percent).toBe(100);
  expect(studentTierProgress(-5).percent).toBe(0);
});
it('renders Elite accessibly instead of falling back to Bronze', async () => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  const host = document.createElement('div'); document.body.append(host);
  const root = createRoot(host);
  try {
    await act(async () => root.render(<DynamicBadge tier="elite" showLabel />));
    expect(host.querySelector('[aria-label="Elite tier"]')).not.toBeNull();
    expect(host.textContent).toBe('Elite');
    expect(host.querySelector('.student-elite-badge')).not.toBeNull();
    expect(host.textContent).not.toContain('Bronze');
  } finally { await act(async () => root.unmount()); }
});
