// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { HomeBoundSettings } from '../src/components/admin/HomeBoundSettings';
import { DEFAULT_HOMEBOUND_CONTENT, readHomeboundContent } from '../src/utils/homeboundContent';

const mocks = vi.hoisted(() => ({
  update: vi.fn(), next: vi.fn(), done: vi.fn(),
  data: { homeboundSettings: null as null | { page_content: unknown; instagram_enabled: boolean; instagram_url: string | null } },
}));
vi.mock('../src/context/DataContext', () => ({ useData: () => ({ ...mocks.data, updateHomeboundSettings: mocks.update }) }));
vi.mock('../src/context/SavingProgressContext', () => ({ useSavingProgress: () => ({ withSteps: () => ({ next: mocks.next, done: mocks.done }), done: mocks.done }) }));
vi.mock('../src/components/ImageUpload', () => ({
  ImageUpload: ({ currentImage, onImageSelect, preserveExistingMedia, onProcessingChange }: { currentImage: string; onImageSelect: (value: string) => void; preserveExistingMedia: boolean; onProcessingChange: (busy: boolean) => void }) => <div data-media-upload data-current-image={currentImage} data-preserve={String(preserveExistingMedia)}><button type="button" onClick={() => onImageSelect('https://images.example.com/new-photo.webp')}>Upload replacement photo</button><button type="button" onClick={() => onProcessingChange(true)}>Start upload</button><button type="button" onClick={() => onProcessingChange(false)}>Finish upload</button></div>,
}));

let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  mocks.update.mockReset().mockResolvedValue(undefined); mocks.next.mockClear(); mocks.done.mockClear();
  mocks.data.homeboundSettings = { page_content: readHomeboundContent(DEFAULT_HOMEBOUND_CONTENT), instagram_enabled: true, instagram_url: null };
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); });
async function mount(entry = '/admin/homebound') {
  await act(async () => root.render(<MemoryRouter initialEntries={[entry]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><HomeBoundSettings /></MemoryRouter>));
}
const button = (name: string, within: ParentNode = host) => [...within.querySelectorAll<HTMLButtonElement>('button')].find(item => item.getAttribute('aria-label') === name || item.textContent?.trim() === name)!;
function field(name: string) {
  const label = [...host.querySelectorAll('label')].find(item => item.querySelector(':scope > span')?.textContent?.trim() === name);
  expect(label, `field ${name}`).toBeTruthy();
  return (label!.control || label!.querySelector('input, textarea, select')) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
}
async function click(node: HTMLElement | undefined) { expect(node).toBeTruthy(); await act(async () => node!.click()); }
async function input(name: string, value: string) {
  const node = field(name);
  const prototype = node instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : node instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  await act(async () => { Object.getOwnPropertyDescriptor(prototype, 'value')!.set!.call(node, value); node.dispatchEvent(new Event(node instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true })); });
}
async function check(name: string) { await click(field(name)); }
const save = () => click(button('Save Homebound settings'));
const payload = () => mocks.update.mock.calls.at(-1)![0];

it('saves editable text and visibility, automatically switching a changed title to typed lettering', async () => {
  await mount();
  expect(button('Save Homebound settings').disabled).toBe(true);
  await input('Band title', 'Campus Frequency');
  await input('About description', 'We are {member_count} musicians making our own sound.');
  await input('All artists filter label', 'Everyone');
  await input('Footer text', 'Campus Frequency · IQ City');
  await check('About section');
  await save();
  expect(mocks.update).toHaveBeenCalledTimes(1);
  expect(payload().page_content).toMatchObject({ hero_title: 'Campus Frequency', hero_wordmark_enabled: false, about_text: 'We are {member_count} musicians making our own sound.', all_label: 'Everyone', footer_text: 'Campus Frequency · IQ City', sections: { about: false } });
  expect(host.querySelector('[role="status"]')?.textContent).toContain('settings saved');
  expect(button('Save Homebound settings').disabled).toBe(true);
});

it('opens category deep links and adds, renames, reorders, hides and removes custom filters without removing artists', async () => {
  await mount('/admin/homebound?edit=categories');
  expect(button('Categories').getAttribute('aria-selected')).toBe('true');
  await input('New category name', 'Beatboxing');
  await input('New category icon', 'beatbox');
  await click(button('Add category'));
  await input('Vocals name', 'Voices');
  await click(button('Move Beatboxing up'));
  await check('Show Drums filter');
  await click(button('Delete Keys category'));
  await save();
  const categories = payload().page_content.categories;
  expect(categories.map((item: { label: string }) => item.label)).toEqual(['Voices', 'Guitars', 'Drums', 'Beatboxing', 'Crew']);
  expect(categories.find((item: { id: string }) => item.id === 'beatboxing')).toMatchObject({ label: 'Beatboxing', icon: 'beatbox', enabled: true });
  expect(categories.find((item: { id: string }) => item.id === 'drums').enabled).toBe(false);
  expect(categories[0].id).toBe('vocals');
  expect(categories[0].aliases).toContain('Vocals');
  expect(host.textContent).toContain('Artists stay under All');
});

it('rejects ambiguous names, aliases and blank category names before writing', async () => {
  await mount('/admin/homebound?edit=categories');
  await input('New category name', 'Bass');
  await click(button('Add category'));
  expect(host.querySelector('[role="alert"]')?.textContent).toContain('already used');
  expect(mocks.update).not.toHaveBeenCalled();
  await input('Vocals aliases', 'Guitar');
  await save();
  expect(host.querySelector('[role="alert"]')?.textContent).toContain('already used');
  expect(mocks.update).not.toHaveBeenCalled();
  await input('Vocals name', '');
  await save();
  expect(host.querySelector('[role="alert"]')?.textContent).toContain('Every category needs a name');
  expect(mocks.update).not.toHaveBeenCalled();
});

it('persists intentionally empty categories and journey cards without restoring defaults', async () => {
  await mount('/admin/homebound?edit=categories');
  while (host.querySelector('button[aria-label^="Delete "][aria-label$=" category"]')) await click(host.querySelector<HTMLButtonElement>('button[aria-label^="Delete "][aria-label$=" category"]')!);
  await click(button('Our journey'));
  while (host.querySelector('button[aria-label^="Delete journey item "]')) await click(host.querySelector<HTMLButtonElement>('button[aria-label^="Delete journey item "]')!);
  await save();
  expect(payload().page_content.categories).toEqual([]);
  expect(payload().page_content.journey_items).toEqual([]);
});

it('adds journey photos and captions, supports ordering and visibility, and saves the complete story', async () => {
  await mount('/admin/homebound?edit=journey');
  while (host.querySelector('button[aria-label^="Delete journey item "]')) await click(host.querySelector<HTMLButtonElement>('button[aria-label^="Delete journey item "]')!);
  await click(button('Add journey item'));
  await input('Journey 1 title', 'First rehearsal');
  await input('Journey 1 subtitle', 'Where it began');
  await input('Journey 1 photo description', 'Our band rehearsing together');
  await click(button('Upload replacement photo', host.querySelector('[aria-label="Journey item 1"]')!));
  await click(button('Add journey item'));
  await input('Journey 2 title', 'Our first show');
  await click(button('Move journey item 2 up'));
  await check('Show journey item 1');
  await save();
  expect(payload().page_content.journey_items.map((item: { title: string }) => item.title)).toEqual(['Our first show', 'First rehearsal']);
  expect(payload().page_content.journey_items[0].enabled).toBe(false);
  expect(payload().page_content.journey_items[1]).toMatchObject({ image: 'https://images.example.com/new-photo.webp', image_alt: 'Our band rehearsing together', subtitle: 'Where it began' });
});

it('preserves published media while replacing photos and blocks saving until uploads complete', async () => {
  await mount('/admin/homebound?edit=photos');
  expect([...host.querySelectorAll('[data-media-upload]')].every(item => item.getAttribute('data-preserve') === 'true')).toBe(true);
  const photo = host.querySelector('[aria-label="Hero stage photo"]')!;
  await click(button('Upload replacement photo', photo));
  await click(button('Start upload', photo));
  expect(button('Save Homebound settings').disabled).toBe(true);
  expect(button('Categories').disabled).toBe(true);
  await click(button('Save Homebound settings'));
  expect(mocks.update).not.toHaveBeenCalled();
  await click(button('Finish upload', photo));
  await click(button('Remove image', host.querySelector('[aria-label="About photo"]')!));
  await save();
  expect(payload().page_content.hero_image).toBe('https://images.example.com/new-photo.webp');
  expect(payload().page_content.about_image).toBe('');
});

it('keeps an unsaved draft through realtime updates and Cancel loads the latest saved version', async () => {
  await mount();
  await input('Band title', 'My unsaved band');
  mocks.data.homeboundSettings = { ...mocks.data.homeboundSettings!, page_content: { ...DEFAULT_HOMEBOUND_CONTENT, hero_title: 'New server title' } };
  await mount();
  expect(field('Band title').value).toBe('My unsaved band');
  expect(host.textContent).toContain('Saved content changed while you were editing');
  await click(button('Cancel changes'));
  expect(field('Band title').value).toBe('New server title');
  expect(button('Save Homebound settings').disabled).toBe(true);
});

it('reports database failures, keeps the draft, prevents duplicate saves, and allows retry', async () => {
  let rejectSave!: (cause: Error) => void;
  mocks.update.mockImplementationOnce(() => new Promise((_, reject) => { rejectSave = reject; }));
  await mount();
  await input('Band title', 'Still my draft');
  await click(button('Save Homebound settings'));
  expect(button('Saving…').disabled).toBe(true);
  await click(button('Saving…'));
  expect(mocks.update).toHaveBeenCalledTimes(1);
  await act(async () => rejectSave(new Error('Database unavailable')));
  expect(host.querySelector('[role="alert"]')?.textContent).toContain('Database unavailable');
  expect(field('Band title').value).toBe('Still my draft');
  expect(button('Save Homebound settings').disabled).toBe(false);
  await save();
  expect(mocks.update).toHaveBeenCalledTimes(2);
  expect(payload().page_content.hero_title).toBe('Still my draft');
});

it('validates Instagram and image links, saves handles as profile URLs and retains explicit blank links', async () => {
  await mount('/admin/homebound?edit=links');
  await input('Instagram profile URL or handle', 'https://example.com/profile');
  await save();
  expect(host.querySelector('[role="alert"]')?.textContent).toContain('valid Instagram');
  expect(mocks.update).not.toHaveBeenCalled();
  await input('Instagram profile URL or handle', '@campus.band');
  await input('Gallery link destination', 'javascript:alert(1)');
  await save();
  expect(host.querySelector('[role="alert"]')?.textContent).toContain('valid gallery');
  await input('Gallery link destination', '');
  await check('Show Instagram link');
  await save();
  expect(payload().instagram_url).toBe('https://www.instagram.com/campus.band/');
  expect(payload().instagram_enabled).toBe(false);
  expect(payload().page_content.gallery_url).toBe('');
  await click(button('Photos & title'));
  await input('Hero stage photo URL', 'data:text/html,unsafe');
  await save();
  expect(host.querySelector('[role="alert"]')?.textContent).toContain('Image links must use');
  expect(mocks.update).toHaveBeenCalledTimes(1);
});
