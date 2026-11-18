import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
// Explicit ESM path makes this an actual distribution comparison even when the
// test runner externalizes the normal package import to Node's CJS entry.
// @ts-expect-error The installed package publishes declarations for its public entry only.
import * as esm from '../node_modules/lucide-react/dist/esm/lucide-react.js';
import { SponsorIconCatalog } from '../src/lib/sponsorIconCatalog';

it('preserves every configured icon name, alias and nested catalog entry', () => {
  const actual = SponsorIconCatalog as Record<string, any>;
  expect(Object.keys(actual).sort()).toEqual(Object.keys(esm).sort());
  expect(Object.keys(actual.icons).sort()).toEqual(Object.keys(esm.icons).sort());
});

it('renders exactly the same SVG for all icon components and aliases with existing props', () => {
  const actual = SponsorIconCatalog as Record<string, any>;
  const expected = esm as Record<string, any>;
  let compared = 0;
  for (const [name, Icon] of Object.entries(actual)) {
    if (!Icon?.$$typeof) continue;
    const props = { size: 31, strokeWidth: 1.5, absoluteStrokeWidth: true, color: '#d6bc78', className: 'existing-icon', 'aria-label': 'Sponsor category' };
    expect(renderToStaticMarkup(React.createElement(Icon, props)), name).toBe(renderToStaticMarkup(React.createElement(expected[name], props)));
    compared++;
  }
  expect(compared).toBeGreaterThan(4000);
});
