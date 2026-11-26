// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { HeroMediaManagement } from '../src/components/admin/HeroMediaManagement';
import { RicoFamilyManagement } from '../src/components/admin/RicoFamilyManagement';
import { OwnerAdminLayout } from '../src/components/admin/layout/OwnerAdminLayout';
import { getAdminSections } from '../src/constants/adminSections';
const mocks = vi.hoisted(() => ({ load: vi.fn(), save: vi.fn() }));
vi.mock('../src/services/heroMediaService', async importOriginal => ({ ...await importOriginal<typeof import('../src/services/heroMediaService')>(), heroMediaService: { getHeroMedia: mocks.load, saveHeroMedia: mocks.save } }));
vi.mock('../src/components/ImageUpload', () => ({ ImageUpload: ({ currentImage, onImageSelect, folder }: any) => <button aria-label={`Upload ${folder}`} onClick={() => onImageSelect('draft-image.jpg')}>{currentImage || 'No image'}</button> }));
vi.mock('../src/context/DataContext', () => ({ useData: () => ({ facultyHeads: [], coreTeamMembers: [], coreCommittees: [] }) }));
vi.mock('../src/components/admin/FacultyHeadsManagement', () => ({ FacultyHeadsManagement: () => <p>Faculty editor</p> }));
vi.mock('../src/components/admin/CouncilManagement', () => ({ CouncilManagement: () => <p>Council editor</p> }));
vi.mock('../src/components/admin/CommitteesManagement', () => ({ CommitteesManagement: () => <p>Committees editor</p> }));
vi.mock('../src/components/admin/TeamMembersManagement', () => ({ TeamMembersManagement: ({ isHeadMode }: any) => <p>{isHeadMode ? 'Heads editor' : 'Members editor'}</p> }));
let root: Root, container: HTMLDivElement;
const media = { enabled: true, background_type: 'image', image_url: 'saved.jpg', mobile_image_url: '', video_url: '', mobile_video_url: '', poster_url: '', mobile_poster_url: '', overlay_color: '#000000', overlay_opacity: .35, desktop_zoom: 1, desktop_offset_x: 0, desktop_offset_y: 0, mobile_zoom: 1, mobile_offset_x: 0, mobile_offset_y: 0 };
beforeEach(() => { (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true; vi.clearAllMocks(); sessionStorage.clear(); mocks.load.mockResolvedValue(media); mocks.save.mockResolvedValue(undefined); container = document.createElement('div'); document.body.append(container); root = createRoot(container); });
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });
async function click(label: string) { const button = [...container.querySelectorAll<HTMLButtonElement>('button')].find(node => node.getAttribute('aria-label') === label || node.textContent?.trim() === label); expect(button, label).toBeTruthy(); await act(async () => button!.click()); }
async function mountHero() { await act(async () => root.render(<HeroMediaManagement />)); }
it('preserves edits across device and page changes, then saves both device drafts', async () => {
  await mountHero(); await click('Upload home/desktop'); await click('Mobile media'); await click('Upload home/mobile'); await click('Desktop media');
  expect(mocks.load).toHaveBeenCalledTimes(1);
  expect(container.querySelector('[aria-label="Upload home/desktop"]')?.textContent).toBe('draft-image.jpg');
  await click('Home Bound Page'); await click('Home Page');
  expect(container.querySelector('[aria-label="Upload home/desktop"]')?.textContent).toBe('draft-image.jpg');
  await click('Save changes');
  expect(mocks.save).toHaveBeenCalledWith('home', expect.objectContaining({ image_url: 'draft-image.jpg', mobile_image_url: 'draft-image.jpg' }));
  expect(sessionStorage.getItem('owner_hero_draft_home')).toBeNull();
});
it('recovers a draft after remount and retains it after a save failure', async () => {
  await mountHero(); await click('Upload home/desktop');
  await act(async () => root.unmount()); root = createRoot(container); await mountHero();
  expect(container.querySelector('[aria-label="Upload home/desktop"]')?.textContent).toBe('draft-image.jpg');
  mocks.save.mockRejectedValueOnce(new Error('offline')); await click('Save changes');
  expect(container.textContent).toContain('Save failed'); expect(sessionStorage.getItem('owner_hero_draft_home')).not.toBeNull();
  await click('Discard changes'); expect(container.querySelector('[aria-label="Upload home/desktop"]')?.textContent).toBe('saved.jpg');
});
it('shows a retryable fetch failure instead of a spinner or editable defaults', async () => {
  mocks.load.mockRejectedValueOnce(new Error('offline')); await mountHero();
  expect(container.querySelector('[role="alert"]')?.textContent).toContain('could not load'); expect(container.querySelector('[aria-label="Upload home/desktop"]')).toBeNull();
  await click('Try again'); expect(container.querySelector('[aria-label="Upload home/desktop"]')).not.toBeNull();
});
function Location() { const location = useLocation(); return <output>{location.search}</output>; }
it('opens the exact people section and keeps section changes in the URL', async () => {
  await act(async () => root.render(<MemoryRouter initialEntries={['/admin/rico-family?section=committees']}><RicoFamilyManagement /><Location /></MemoryRouter>));
  expect(container.textContent).toContain('Committees editor'); expect(container.textContent).not.toContain('Faculty editor');
  const members = [...container.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent?.includes('Team Members'))!;
  await act(async () => members.click()); expect(container.textContent).toContain('Members editor'); expect(container.querySelector('output')?.textContent).toBe('?section=members');
  expect(container.querySelectorAll('.owner-people-tabs')).toHaveLength(1);
});
it('keeps every child tool reachable within its parent and excludes unavailable sports tools from navigation', async () => {
  const tabs = getAdminSections(true, true);
  await act(async () => root.render(<MemoryRouter><OwnerAdminLayout user={{}} isOwner isAdmin activeTab="homepage" setActiveTab={() => {}} visibleTabs={tabs} isSidebarOpen={false} setIsSidebarOpen={() => {}} onLogout={() => {}} onNavigateHome={() => {}} autoLogoutEnabled={false} setAutoLogoutEnabled={() => {}} isTOTPEnabled><h2>Homepage editor</h2></OwnerAdminLayout></MemoryRouter>));
  const sidebarNames = [...container.querySelectorAll('.owner-nav-link')].map(node => node.textContent);
  expect(sidebarNames).not.toContain('Hero Media'); expect(sidebarNames).not.toContain('Auction');
  expect(container.querySelector('.owner-section-tabs')).toBeNull();
  expect(sidebarNames).not.toContain('Social Media');
  expect(sidebarNames).not.toContain('Roadmap');
  expect(container.querySelectorAll('h1')).toHaveLength(1);
  const regular = getAdminSections(true, false); expect(regular.find(tab => tab.id === 'sports-auction')?.unavailableReason).toBeUndefined();
  const ids = new Set(tabs.map(tab => tab.id)); for (const tab of tabs) if (tab.parent) expect(ids.has(tab.parent)).toBe(true);
});
it('edits the requested page media without presenting an unrelated page selector or writing Home',async()=>{
  sessionStorage.setItem('owner_hero_draft_home','keep-home-draft');
  await act(async()=>root.render(<HeroMediaManagement pageKey="events"/>));
  expect(mocks.load).toHaveBeenCalledWith('events',{strict:true});
  expect(container.textContent).toContain('Events Page background');
  expect([...container.querySelectorAll('button')].some(button=>button.textContent?.trim()==='Home Page')).toBe(false);
  await click('Upload events/desktop');await click('Save changes');
  expect(mocks.save).toHaveBeenCalledWith('events',expect.objectContaining({image_url:'draft-image.jpg'}));
  expect(sessionStorage.getItem('owner_hero_draft_home')).toBe('keep-home-draft');
});
