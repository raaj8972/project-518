// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { BandMember } from '../src/types/data';
import { HomeBound } from '../src/pages/HomeBound';
import { DEFAULT_HOMEBOUND_CONTENT, readHomeboundContent } from '../src/utils/homeboundContent';

const mocks = vi.hoisted(() => ({ data: {
  bandMembers: [] as BandMember[],
  formSettings: null as { audition_form_enabled: boolean } | null,
  homeboundSettings: null as { instagram_enabled: boolean; instagram_url: string | null; page_content?: unknown } | null,
  loading: false, isLoaded: true, connectionStatus: 'ok', refreshAll: vi.fn(),
} }));
vi.mock('../src/context/DataContext', () => ({ useData: () => mocks.data }));
vi.mock('../src/components/SEO', () => ({ SEO: () => null }));
vi.mock('../src/components/AuditionModal', () => ({
  AuditionModal: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => isOpen
    ? <div role="dialog" aria-label="Submit a band audition"><button type="button" onClick={onClose}>Close audition</button></div> : null,
}));

function roster(): BandMember[] {
  return ['Vocals', 'Vocals', 'Guitar', 'Bass', 'Keyboard', 'Drums', 'Other', 'Vocals', 'Vocals', 'Vocals', 'Drums', 'Vocals'].map((category, index) => ({
    id: index + 1, name: `Musician ${index + 1}`, role: category === 'Other' ? 'Sound engineer' : category,
    specialty: category, category, description: `Biography for musician ${index + 1}.`, image: `/portrait-${index + 1}.webp`,
    enabled: index !== 11, is_featured: index === 0, order_position: index + 1, social_links: null,
    achievements: index === 0 ? ['Campus band finalist'] : null, created_at: null, updated_at: null,
  }));
}

let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  mocks.data.bandMembers = roster();
  mocks.data.formSettings = null; mocks.data.homeboundSettings = null;
  mocks.data.loading = false; mocks.data.isLoaded = true; mocks.data.connectionStatus = 'ok';
  mocks.data.refreshAll.mockClear();
  vi.stubGlobal('innerWidth', 1024);
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { callback(0); return 1; });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); });

async function renderPage() {
  await act(async () => root.render(<MemoryRouter initialEntries={['/home-bound']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><HomeBound /></MemoryRouter>));
}
async function click(node: Element | null) { expect(node).not.toBeNull(); await act(async () => (node as HTMLElement).click()); }
const button = (label: string) => [...host.querySelectorAll<HTMLButtonElement>('button')].find(item => item.getAttribute('aria-label') === label || item.textContent?.trim() === label) ?? null;
const filter = (label: string) => [...host.querySelectorAll<HTMLButtonElement>('[aria-label="Filter band members"] button')].find(item => item.textContent?.startsWith(`${label} (`))!;
const visibleNames = () => [...host.querySelectorAll('.hb-member__name')].map(item => item.textContent);

it('shows the real published counts and resets pagination in both directions when filters change', async () => {
  await renderPage();
  expect([...host.querySelectorAll('.hb-filters button')].map(item => item.textContent)).toEqual(['All (11)', 'Vocals (5)', 'Guitars (2)', 'Keys (1)', 'Drums (2)', 'Crew (1)']);
  expect(host.querySelector('.hb-member-count')?.textContent).toContain('11');
  expect(visibleNames()).toEqual(['Musician 1', 'Musician 2', 'Musician 3', 'Musician 4']);
  expect(host.textContent).not.toContain('Musician 12');
  await click(button('Band members page 3'));
  await click(filter('Vocals'));
  expect(filter('Vocals').getAttribute('aria-pressed')).toBe('true');
  expect(visibleNames()).toEqual(['Musician 1', 'Musician 2', 'Musician 8', 'Musician 9']);
  expect(button('Band members page 1')?.getAttribute('aria-current')).toBe('page');
  await click(button('Next band members'));
  expect(visibleNames()).toEqual(['Musician 10']);
  await click(filter('All'));
  expect(visibleNames()).toEqual(['Musician 1', 'Musician 2', 'Musician 3', 'Musician 4']);
  await click(filter('Guitars'));
  expect(visibleNames()).toEqual(['Musician 3', 'Musician 4']);
  expect(host.querySelector('.hb-pagination')).toBeNull();
});

it('reaches every published member using next and dot controls and clamps after a realtime roster shrink', async () => {
  await renderPage();
  expect(button('Previous band members')?.disabled).toBe(true);
  await click(button('Next band members'));
  expect(visibleNames()).toEqual(['Musician 5', 'Musician 6', 'Musician 7', 'Musician 8']);
  await click(button('Band members page 3'));
  expect(visibleNames()).toEqual(['Musician 9', 'Musician 10', 'Musician 11']);
  expect(button('Next band members')?.disabled).toBe(true);
  expect(host.querySelector('[role="status"]')?.textContent).toContain('Page 3 of 3');
  mocks.data.bandMembers = mocks.data.bandMembers.slice(0, 5);
  await renderPage();
  expect(visibleNames()).toEqual(['Musician 5']);
  expect(button('Band members page 2')?.getAttribute('aria-current')).toBe('page');
  await click(button('Previous band members'));
  expect(visibleNames()).toEqual(['Musician 1', 'Musician 2', 'Musician 3', 'Musician 4']);
});

it('omits disabled and unsafe band links while retaining valid links on actual member profiles', async () => {
  mocks.data.homeboundSettings = { instagram_enabled: false, instagram_url: 'https://www.instagram.com/homebound/' };
  mocks.data.bandMembers = roster().map(row => row.id === 1 ? { ...row, social_links: { instagram: 'javascript:alert(1)', youtube: 'data:text/html,test', spotify: 'file:///tmp/music' } } : row);
  await renderPage();
  expect(button('Listen to Homebound')).toBeNull();
  expect(host.querySelector('.hb-encore')).toBeNull();
  expect(host.querySelector('a[href^="javascript:"]')).toBeNull();
  await click(button('View Musician 1 profile'));
  expect(document.querySelector('.hb-profile__socials a')).toBeNull();
  await click(document.querySelector('[aria-label="Close member profile"]'));
  mocks.data.homeboundSettings = { instagram_enabled: true, instagram_url: 'javascript:alert(1)' };
  mocks.data.bandMembers = roster().map(row => row.id === 1 ? { ...row, social_links: { instagram: '//www.instagram.com/musician/', youtube: 'https://youtube.com/watch?v=homebound' } } : row);
  await renderPage();
  expect([...host.querySelectorAll('.hb-encore a')].map(item => item.textContent)).toEqual(['Listen to Homebound']);
  await click(button('View Musician 1 profile'));
  expect(document.querySelector('.hb-profile__socials a')?.getAttribute('href')).toBe('https://www.instagram.com/musician/');
  expect([...document.querySelectorAll('.hb-profile__socials a')].map(item => item.textContent)).toEqual(['instagram', 'youtube']);
});

it('opens the selected real biography, closes on Escape and restores focus and scrolling', async () => {
  await renderPage();
  const trigger = button('View Musician 1 profile')!; trigger.focus();
  await click(trigger);
  expect(document.querySelector('[role="dialog"]')?.getAttribute('aria-labelledby')).toBe('hb-profile-name');
  expect(document.querySelector('.hb-profile')?.textContent).toContain('Biography for musician 1.');
  expect(document.querySelector('.hb-profile li')?.textContent).toBe('Campus band finalist');
  expect(document.body.style.overflow).toBe('hidden');
  await act(async () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
  expect(document.querySelector('.hb-profile')).toBeNull();
  expect(document.body.style.overflow).toBe('');
  expect(document.activeElement).toBe(trigger);
});

it('opens auditions only when the admin form setting is enabled', async () => {
  mocks.data.formSettings = { audition_form_enabled: false };
  await renderPage();
  expect(button('Join the band')).toBeNull();
  expect(document.querySelector('[aria-label="Submit a band audition"]')).toBeNull();
  mocks.data.formSettings = { audition_form_enabled: true };
  await renderPage();
  await click(button('Join the band'));
  expect(document.querySelector('[aria-label="Submit a band audition"]')).not.toBeNull();
  await click(button('Close audition'));
  expect(document.querySelector('[aria-label="Submit a band audition"]')).toBeNull();
});

it('shows loading, announced-empty and offline retry states without inventing members', async () => {
  mocks.data.bandMembers = []; mocks.data.loading = true; mocks.data.isLoaded = false;
  await renderPage();
  expect(host.querySelector('#homebound-members')?.getAttribute('aria-busy')).toBe('true');
  expect(host.querySelectorAll('.hb-member-skeleton')).toHaveLength(4);
  expect(visibleNames()).toEqual([]);
  expect(host.querySelector('.hb-empty')).toBeNull();
  mocks.data.loading = false; mocks.data.isLoaded = true;
  await renderPage();
  expect(host.textContent).toContain('The lineup is coming together.');
  expect(host.textContent).not.toContain('15 passionate medicos');
  await click(filter('Keys'));
  expect(host.textContent).toContain('Our keys lineup will appear here once announced.');
  await click(button('Meet the whole band'));
  expect(filter('All').getAttribute('aria-pressed')).toBe('true');
  mocks.data.connectionStatus = 'offline';
  await renderPage();
  expect(host.textContent).toContain('We couldn’t load the lineup. Please try again.');
  await click(button('Try again'));
  expect(mocks.data.refreshAll).toHaveBeenCalledOnce();
});

function setPageContent(value: unknown) {
  mocks.data.homeboundSettings = {
    instagram_enabled: true,
    instagram_url: 'https://www.instagram.com/homebound/',
    ...mocks.data.homeboundSettings,
    page_content: readHomeboundContent(value),
  };
}
const filterLabels = () => [...host.querySelectorAll('.hb-filters button')].map(item => item.textContent);

it('gives Beatboxing its own count and filter without classifying custom roles as crew or guitar', async () => {
  const base = roster()[0];
  mocks.data.bandMembers = [...roster(),
    { ...base, id: 21, name: 'Beatbox artist', category: 'Beatboxing', role: 'Backing vocals', specialty: 'Vocal percussion', order_position: 21, is_featured: false },
    { ...base, id: 22, name: 'Theremin artist', category: 'Theremin', role: 'Guitar', specialty: 'Experimental music', order_position: 22, is_featured: false },
  ];
  setPageContent({ categories: [...DEFAULT_HOMEBOUND_CONTENT.categories, { id: 'beatbox', label: 'Beatboxing', icon: 'beatbox', aliases: [], enabled: true }] });
  await renderPage();
  expect(filterLabels()).toEqual(['All (13)', 'Vocals (5)', 'Guitars (2)', 'Keys (1)', 'Drums (2)', 'Crew (1)', 'Beatboxing (1)']);
  await click(filter('Beatboxing'));
  expect(visibleNames()).toEqual(['Beatbox artist']);
  await click(filter('Guitars'));
  expect(visibleNames()).toEqual(['Musician 3', 'Musician 4']);
  await click(filter('Crew'));
  expect(visibleNames()).toEqual(['Musician 7']);
  await click(filter('All'));
  await click(button('Band members page 4'));
  expect(visibleNames()).toEqual(['Theremin artist']);
});

it('renames and reorders category filters while preserving their stable member assignments', async () => {
  const original = DEFAULT_HOMEBOUND_CONTENT.categories;
  setPageContent({ categories: [original[3], { ...original[0], label: 'Singers' }, original[1], original[2], original[4]] });
  await renderPage();
  expect(filterLabels()).toEqual(['All (11)', 'Drums (2)', 'Singers (5)', 'Guitars (2)', 'Keys (1)', 'Crew (1)']);
  await click(filter('Singers'));
  expect(visibleNames()).toEqual(['Musician 1', 'Musician 2', 'Musician 8', 'Musician 9']);
  await click(button('Next band members'));
  expect(visibleNames()).toEqual(['Musician 10']);
  setPageContent({ categories: [{ ...original[0], label: 'Lead & backing voices' }, original[4], original[3], original[2], original[1]] });
  await renderPage();
  expect(filter('Lead & backing voices').getAttribute('aria-pressed')).toBe('true');
  expect(visibleNames()).toEqual(['Musician 10']);
  expect(filterLabels()).toEqual(['All (11)', 'Lead & backing voices (5)', 'Crew (1)', 'Drums (2)', 'Keys (1)', 'Guitars (2)']);
});

it('resets a hidden or deleted selected category to All page one and retains every artist for pagination', async () => {
  await renderPage();
  await click(filter('Vocals'));
  await click(button('Next band members'));
  setPageContent({ categories: DEFAULT_HOMEBOUND_CONTENT.categories.map(category => ({ ...category, enabled: category.id !== 'vocals' })) });
  await renderPage();
  expect(filter('Vocals')).toBeUndefined();
  expect(filter('All').getAttribute('aria-pressed')).toBe('true');
  expect(button('Band members page 1')?.getAttribute('aria-current')).toBe('page');
  expect(visibleNames()).toEqual(['Musician 1', 'Musician 2', 'Musician 3', 'Musician 4']);
  await click(button('Next band members'));
  expect(visibleNames()).toEqual(['Musician 5', 'Musician 6', 'Musician 7', 'Musician 8']);
  await click(filter('Drums'));
  setPageContent({ categories: DEFAULT_HOMEBOUND_CONTENT.categories.filter(category => category.id !== 'drums') });
  await renderPage();
  expect(filter('Drums')).toBeUndefined();
  expect(filter('All').getAttribute('aria-pressed')).toBe('true');
  expect(visibleNames()).toEqual(['Musician 1', 'Musician 2', 'Musician 3', 'Musician 4']);
  await click(button('Band members page 3'));
  expect(visibleNames()).toEqual(['Musician 9', 'Musician 10', 'Musician 11']);
  setPageContent({ categories: [] });
  await renderPage();
  expect(filterLabels()).toEqual(['All (11)']);
  expect(visibleNames()).toEqual(['Musician 9', 'Musician 10', 'Musician 11']);
});

it('renders saved copy, photos, headings, CTA labels and gallery links across the entire page', async () => {
  mocks.data.formSettings = { audition_form_enabled: true };
  mocks.data.bandMembers = roster().map(member => member.id === 1 ? { ...member, social_links: { youtube: 'https://youtube.com/watch?v=custom-band' } } : member);
  setPageContent({
    hero_title: 'Campus Collective', hero_subtitle: 'Our stage. Our sound.', hero_image: '/uploads/own-stage.webp', hero_image_alt: 'Our new stage photo', hero_wordmark_enabled: false,
    about_heading: 'Our story', about_text: 'We are {member_count} musicians, sharing {member_count} stories.', about_image: '/uploads/our-band.webp', about_image_alt: 'Our actual band photo',
    band_heading: 'The musicians', all_label: 'Everyone', journey_heading: 'From dorms\nto stages',
    journey_items: [{ id: 'demo', title: 'First demo', subtitle: 'Recorded together', image: '/uploads/first-demo.webp', image_alt: 'Our first recording', enabled: true }],
    encore_text: 'Stay close to the music', listen_label: 'Hear our sound', follow_label: 'Find our band', audition_label: 'Audition now',
    footer_text: 'Our collective', footer_subtitle: 'Campus, 2027', gallery_label: 'See our photos', gallery_url: '/gallery?tag=homebound',
  });
  await renderPage();
  expect(host.querySelector('.hb-title__text')?.textContent).toBe('Campus Collective');
  expect(host.querySelector('.hb-hero__subtitle')?.textContent).toBe('Our stage. Our sound.');
  expect(host.querySelector('.hb-hero__stage')?.getAttribute('src')).toBe('/uploads/own-stage.webp');
  expect(host.querySelector('.hb-hero__stage')?.getAttribute('alt')).toBe('Our new stage photo');
  expect(host.querySelector('.hb-paper-heading')?.textContent).toBe('Our story');
  expect(host.querySelector('.hb-about__copy p')?.textContent).toBe('We are 11 musicians, sharing 11 stories.');
  expect(host.querySelector('.hb-about__polaroid img')?.getAttribute('src')).toBe('/uploads/our-band.webp');
  expect(host.querySelector('.hb-about__polaroid img')?.getAttribute('alt')).toBe('Our actual band photo');
  expect(host.querySelector('#homebound-band')?.textContent).toBe('The musicians');
  expect(filter('Everyone').textContent).toBe('Everyone (11)');
  expect(host.querySelector('#homebound-journey')?.textContent).toBe('From dorms\nto stages');
  expect(host.querySelector('.hb-journey__polaroid figcaption')?.textContent).toBe('First demoRecorded together');
  expect(host.querySelector('.hb-journey__polaroid img')?.getAttribute('src')).toBe('/uploads/first-demo.webp');
  expect(host.querySelector('.hb-encore > p')?.textContent).toBe('Stay close to the music');
  expect([...host.querySelectorAll('.hb-encore a')].map(item => item.textContent)).toEqual(['Hear our sound', 'Find our band']);
  await click(button('Audition now'));
  expect(document.querySelector('[aria-label="Submit a band audition"]')).not.toBeNull();
  await click(button('Close audition'));
  expect(host.querySelector('.hb-page-credit')?.textContent).toContain('Our collectiveCampus, 2027');
  expect(host.querySelector('.hb-page-credit a')?.textContent).toBe('See our photos');
  expect(host.querySelector('.hb-page-credit a')?.getAttribute('href')).toBe('/gallery?tag=homebound');
  await click(button('View Musician 1 profile'));
  expect(document.querySelector('.hb-profile .hb-eyebrow')?.textContent).toBe('The musicians');
});

it.each([
  ['hero', '.hb-hero'], ['about', '.hb-about'], ['band', '.hb-band'],
  ['journey', '.hb-journey'], ['encore', '.hb-encore'], ['footer', '.hb-page-credit'],
] as const)('keeps the explicitly disabled %s section hidden after rerendering', async (section, selector) => {
  mocks.data.formSettings = { audition_form_enabled: true };
  setPageContent({ sections: { [section]: false } });
  await renderPage();
  expect(host.querySelector(selector)).toBeNull();
  await renderPage();
  expect(host.querySelector(selector)).toBeNull();
  if (section !== 'band') expect(host.querySelector('.hb-band')).not.toBeNull();
  if (section === 'hero') expect(host.querySelector('.homebound-page--without-hero')).not.toBeNull();
});

it('adds, reorders, hides and deletes journey cards, including keeping a saved empty list empty', async () => {
  const cards = [
    { id: 'first', title: 'First practice', subtitle: 'Before the stage', image: '/first.webp', image_alt: 'First practice photo', enabled: true },
    { id: 'private', title: 'Hidden moment', subtitle: 'Not published', image: '/private.webp', image_alt: 'Private photo', enabled: false },
    { id: 'second', title: 'New recording', subtitle: 'The next chapter', image: '/second.webp', image_alt: 'New recording photo', enabled: true },
  ];
  setPageContent({ journey_items: cards });
  await renderPage();
  const titles = () => [...host.querySelectorAll('.hb-journey__polaroid strong')].map(item => item.textContent);
  expect(titles()).toEqual(['First practice', 'New recording']);
  expect(host.querySelector('img[src="/private.webp"]')).toBeNull();
  setPageContent({ journey_items: [cards[2], cards[0]] });
  await renderPage();
  expect(titles()).toEqual(['New recording', 'First practice']);
  setPageContent({ journey_items: [cards[2]] });
  await renderPage();
  expect(titles()).toEqual(['New recording']);
  setPageContent({ journey_items: [] });
  await renderPage();
  expect(titles()).toEqual([]);
  expect(host.querySelector('.hb-journey__heading')).not.toBeNull();
  expect(host.querySelector('img[src="/images/homebound/journey-rehearsals.webp"]')).toBeNull();
});

it('keeps intentionally cleared photos and copy empty instead of restoring defaults', async () => {
  setPageContent({
    hero_image: '', hero_wordmark_image: '', hero_subtitle: '', about_image: '', about_text: '',
    journey_items: [{ id: 'text-only', title: 'A memory', subtitle: '', image: '', image_alt: '', enabled: true }],
    gallery_url: '', gallery_label: '',
  });
  await renderPage();
  expect(host.querySelector('.hb-hero__stage')).toBeNull();
  expect(host.querySelector('.hb-title__art')).toBeNull();
  expect(host.querySelector('.hb-title__text')?.textContent).toBe('Homebound');
  expect(host.querySelector('.hb-hero__subtitle')?.textContent).toBe('');
  expect(host.querySelector('.hb-about__photo')).toBeNull();
  expect(host.querySelector('.hb-about__copy p')?.textContent).toBe('');
  expect(host.querySelector('.hb-journey__polaroid img')).toBeNull();
  expect(host.querySelector('.hb-journey__polaroid strong')?.textContent).toBe('A memory');
  expect(host.querySelector('.hb-page-credit a')).toBeNull();
  await renderPage();
  expect(host.querySelector('.hb-hero__stage')).toBeNull();
  expect(host.querySelector('.hb-about__photo')).toBeNull();
});

it('shows edited text when title artwork is disabled and falls back if custom artwork fails', async () => {
  setPageContent({ hero_title: 'Our renamed band', hero_wordmark_enabled: false });
  await renderPage();
  expect(host.querySelector('.hb-title__art')).toBeNull();
  expect(host.querySelector('.hb-title__text')?.textContent).toBe('Our renamed band');
  setPageContent({ hero_title: 'Our renamed band', hero_wordmark_enabled: true, hero_wordmark_image: '/uploads/new-wordmark.webp' });
  await renderPage();
  expect(host.querySelector('.hb-title__art')?.getAttribute('src')).toBe('/uploads/new-wordmark.webp');
  await act(async () => host.querySelector('.hb-title__art')!.dispatchEvent(new Event('error')));
  expect(host.querySelector('.hb-title__art')).toBeNull();
  expect(host.querySelector('.hb-title__text')?.textContent).toBe('Our renamed band');
  setPageContent({ hero_title: 'Our renamed band', hero_wordmark_enabled: true, hero_wordmark_image: '/uploads/replaced-wordmark.webp' });
  await renderPage();
  expect(host.querySelector('.hb-title__art')?.getAttribute('src')).toBe('/uploads/replaced-wordmark.webp');
});

it('never renders executable saved image URLs or gallery links', async () => {
  setPageContent({ hero_image: 'data:text/html,test', about_image: 'javascript:alert(1)', hero_wordmark_image: 'file:///tmp/private', gallery_url: 'javascript:alert(1)', journey_items: [{ id: 'unsafe', title: 'Safe caption', image: 'data:image/svg+xml,test', enabled: true }] });
  await renderPage();
  expect(host.querySelector('.hb-hero__stage')).toBeNull();
  expect(host.querySelector('.hb-about__photo')).toBeNull();
  expect(host.querySelector('.hb-title__art')).toBeNull();
  expect(host.querySelector('.hb-journey__polaroid img')).toBeNull();
  expect(host.querySelector('.hb-page-credit a')).toBeNull();
  expect(host.querySelector('a[href^="javascript:"], img[src^="data:"], img[src^="file:"]')).toBeNull();
  expect(host.querySelector('.hb-journey__polaroid strong')?.textContent).toBe('Safe caption');
});

it('shows a replacement profile photo and biography after realtime updates even when the previous photo failed', async () => {
  await renderPage();
  await click(button('View Musician 1 profile'));
  const dialog = document.querySelector('.hb-profile');
  const failedPhoto = document.querySelector<HTMLImageElement>('.hb-profile__image')!;
  expect(failedPhoto.getAttribute('src')).toBe('/portrait-1.webp');
  await act(async () => failedPhoto.dispatchEvent(new Event('error')));
  expect(failedPhoto.hidden).toBe(true);

  mocks.data.bandMembers = mocks.data.bandMembers.map(member => member.id === 1
    ? { ...member, image: '/uploads/replacement-portrait.webp', description: 'Updated artist biography from the admin.' }
    : member);
  await renderPage();

  const replacement = document.querySelector<HTMLImageElement>('.hb-profile__image')!;
  expect(document.querySelector('.hb-profile')).toBe(dialog);
  expect(replacement).not.toBe(failedPhoto);
  expect(replacement.getAttribute('src')).toBe('/uploads/replacement-portrait.webp');
  expect(replacement.hidden).toBe(false);
  expect(dialog?.textContent).toContain('Updated artist biography from the admin.');
  expect(dialog?.textContent).not.toContain('Biography for musician 1.');
  expect(document.body.style.overflow).toBe('hidden');
});
