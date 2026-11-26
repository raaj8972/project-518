// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { HomepageManagement } from '../src/components/admin/HomepageManagement';
const mocks = vi.hoisted(() => ({ settings: { hero_title: 'Ricorrenza', show_faculty_heads: true, show_committee_heads: true, leadership_carousel_speed_ms: 2500 }, save: vi.fn(), updateFaculty: vi.fn(), updateTeam: vi.fn() }));
vi.mock('../src/context/DataContext', () => ({ useData: () => ({ homepageSettings: mocks.settings, updateHomepageSettings: mocks.save, isOwner: () => true, events: [], facultyHeads: [], coreTeamMembers: [], roadmapMilestones: [], updateFacultyHead: mocks.updateFaculty, updateCoreTeamMember: mocks.updateTeam }) }));
vi.mock('../src/components/ImageUpload', () => ({ ImageUpload: () => null }));
vi.mock('../src/context/SavingProgressContext', () => ({ useSavingProgress: () => ({ withSteps() {}, done() {} }) }));
vi.mock('../src/services/heroMediaService', async original => ({ ...await original<any>(), heroMediaService: { getHeroMedia: async () => null } }));
let host: HTMLDivElement, root: Root;
beforeEach(() => { (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true; localStorage.clear(); vi.clearAllMocks(); mocks.save.mockResolvedValue(undefined); host = document.createElement('div'); document.body.append(host); root = createRoot(host); });
afterEach(async () => { await act(async () => root.unmount()); host.remove(); localStorage.clear(); });
async function mount() { await act(async () => root.render(<MemoryRouter initialEntries={['/admin/homepage?edit=people']}><HomepageManagement /></MemoryRouter>)); }
it('removes the duplicate people editor and ignores its old unsaved settings', async () => {
  localStorage.setItem('admin_homepage_form_draft', JSON.stringify({ hero_title: 'Ricorrenza', show_faculty_heads: false, leadership_carousel_speed_ms: 4200, instagram_trailer_enabled: true, instagram_trailer_url: 'https://instagram.com/reel/old-draft', instagram_aftermovie_enabled: true }));
  localStorage.setItem('homepage_lead_resource_draft', JSON.stringify({ 'faculty-1': { name: 'Unpublished edit' } }));
  await mount();
  expect(host.querySelector('[aria-label="People & leadership"]')).toBeNull();
  expect(host.querySelector('[aria-label="Films & reels"]')).toBeNull();
  expect(host.textContent).not.toContain('Leadership profiles');
  const save = [...host.querySelectorAll<HTMLButtonElement>('button')].find(button => button.getAttribute('aria-label') === 'Save changes')!;
  expect(save.disabled).toBe(true);
  const title = [...host.querySelectorAll('label')].find(label => label.textContent === 'Festival title')!;
  const input = document.getElementById(title.htmlFor)!;
  await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, 'New festival title'); input.dispatchEvent(new Event('input', { bubbles: true })); });
  await act(async () => save.click());
  expect(mocks.save).toHaveBeenCalledTimes(1);
  const payload = mocks.save.mock.calls[0][0];
  expect(payload.hero_title).toBe('New festival title');
  for (const key of ['show_faculty_heads', 'show_committee_heads', 'leadership_carousel_speed_ms', 'committee_marquee_speed_px_per_sec', 'committee_marquee_direction', 'instagram_trailer_enabled', 'instagram_trailer_url', 'instagram_aftermovie_enabled', 'instagram_aftermovie_url']) expect(payload).not.toHaveProperty(key);
  expect(mocks.updateFaculty).not.toHaveBeenCalled(); expect(mocks.updateTeam).not.toHaveBeenCalled();
});
