// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { CouncilLightingManagement } from '../src/components/admin/CouncilLightingManagement';
import { FamilyTeams } from '../src/components/RicoFamily/FamilyTeams';
import { councilLightAssignments, councilLightingChanges } from '../src/utils/councilLighting';

const mocks = vi.hoisted(() => ({ people: [] as any[], update: vi.fn(), approval: vi.fn(), requires: false }));
vi.mock('../src/context/DataContext', () => ({ useData: () => ({ coreTeamMembers: mocks.people, updateCoreTeamMember: mocks.update }) }));
vi.mock('../src/context/SavingProgressContext', () => ({ useSavingProgress: () => ({ withSteps: () => ({ next() {} }), done() {} }) }));
vi.mock('../src/hooks/useApprovals', () => ({ useApprovals: () => ({ checkRequiresApproval: async () => mocks.requires, submitForApproval: mocks.approval }) }));
const people = () => ['red', 'blue', 'green', 'yellow'].map((color, index) => ({ id: index + 1, name: `Council ${index + 1}`, image: '/portrait.jpg', enabled: true, is_council: true, is_head: false, committee_id: null, order_position: index + 1, color, social_links: {} })) as any[];
let container: HTMLDivElement, root: Root;
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true; vi.clearAllMocks(); mocks.people = people(); mocks.requires = false;
  mocks.update.mockResolvedValue(undefined); mocks.approval.mockResolvedValue({ success: true });
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.unstubAllGlobals(); });
async function choose(color: string, id: string) {
  const select = document.getElementById(`council-light-${color}`) as HTMLSelectElement;
  await act(async () => { Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')!.set!.call(select, id); select.dispatchEvent(new Event('change', { bubbles: true })); });
}
async function save() { const button = [...container.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent === 'Save council lights')!; await act(async () => button.click()); }

it('renders exactly four council lamps, applies saved colors to the correct people and removes head fixtures', async () => {
  const members = [...people(), { ...people()[0], id: 9, name: 'Committee head', is_council: false, is_head: true, committee_id: 5 }];
  await act(async () => root.render(<FamilyTeams committees={[{ id: 5, name: 'Tech Team', order_position: 1, enabled: true } as any]} members={members} />));
  expect(container.querySelectorAll('.council-light-rig .family-spotlight')).toHaveLength(4);
  expect(container.querySelectorAll('.family-group-heads .family-spotlight')).toHaveLength(0);
  for (const [index, color] of ['red', 'blue', 'green', 'yellow'].entries()) expect(container.querySelector(`[data-council-light="${color}"]`)?.getAttribute('data-target-member')).toBe(String(index + 1));
  expect(container.querySelectorAll('.council-stage-person.is-lit')).toHaveLength(4);
});
it('turns a light off for hidden or unassigned people while keeping four physical fixtures', async () => {
  mocks.people[0].enabled = false; mocks.people[1].color = null;
  await act(async () => root.render(<FamilyTeams committees={[]} members={mocks.people} />));
  expect(container.querySelector('[data-council-light="red"] .family-spotlight--off')).not.toBeNull();
  expect(container.querySelector('[data-council-light="blue"] .family-spotlight--off')).not.toBeNull();
  expect(container.querySelector('[data-council-member="1"]')).toBeNull();
  expect(container.querySelectorAll('.council-rig-light')).toHaveLength(4);
});
it('moves a color assignment and saves only the changed member colors', async () => {
  await act(async () => root.render(<CouncilLightingManagement />)); await choose('red', '2');
  expect((document.getElementById('council-light-blue') as HTMLSelectElement).value).toBe('');
  expect(container.querySelector('[data-council-light="red"]')?.getAttribute('data-target-member')).toBe('2');
  await save();
  expect(mocks.update.mock.calls).toEqual([[1, { color: null }], [2, { color: 'red' }]]);
  expect(container.querySelector('[role="status"]')?.textContent).toContain('saved');
});
it('preserves failed selections for retry and respects approval requirements', async () => {
  mocks.update.mockRejectedValueOnce(new Error('offline'));
  await act(async () => root.render(<CouncilLightingManagement />)); await choose('green', ''); await save();
  expect(container.querySelector('[role="alert"]')?.textContent).toContain('offline');
  expect((document.getElementById('council-light-green') as HTMLSelectElement).value).toBe('');
  await save(); expect(mocks.update).toHaveBeenCalledWith(3, { color: null });
  await act(async () => root.unmount()); root = createRoot(container); mocks.requires = true;
  await act(async () => root.render(<CouncilLightingManagement />)); await choose('yellow', ''); await save();
  expect(mocks.approval).toHaveBeenCalledWith('core_team_member', 'update', { color: null }, 4);
});
it('reads persisted assignments, supports existing aliases and rejects invalid duplicate targets', () => {
  const rows = people(); rows[2].color = 'emerald'; rows[3].color = 'amber';
  expect(councilLightAssignments(rows)).toEqual({ red: 1, blue: 2, green: 3, yellow: 4 });
  expect(councilLightingChanges(rows, { red: 1, blue: 2, green: 3, yellow: 4 })).toEqual([]);
  expect(() => councilLightingChanges(rows, { red: 1, blue: 1, green: 3, yellow: 4 })).toThrow('different council member');
  expect(() => councilLightingChanges(rows, { red: 999, blue: 2, green: 3, yellow: 4 })).toThrow('no longer available');
});
