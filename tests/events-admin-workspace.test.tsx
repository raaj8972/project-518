// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { EventsManagement } from '../src/components/admin/EventsManagement';
const mocks = vi.hoisted(() => ({ data: {} as any, group: vi.fn(), create: vi.fn(), update: vi.fn(), addCoord: vi.fn(), updateCoord: vi.fn(), removeCoord: vi.fn(), remove: vi.fn(), reorder: vi.fn(), approval: vi.fn(), requiresApproval: vi.fn(), list: vi.fn(), upload: vi.fn(), signed: vi.fn(), removeStamp: vi.fn(), session: vi.fn(), prepare: vi.fn(), fetch: vi.fn(), imageBusy: null as null | ((value: boolean) => void) }));
vi.mock('../src/context/DataContext', () => ({ useData: () => mocks.data }));
vi.mock('../src/hooks/useApprovals', () => ({ useApprovals: () => ({ submitForApproval: mocks.approval, checkRequiresApproval: mocks.requiresApproval }) }));
vi.mock('../src/context/SavingProgressContext', () => ({ useSavingProgress: () => ({ withSteps: () => ({ next() {} }), done() {} }) }));
vi.mock('../src/services/eventWhatsAppGroups', () => ({ getEventWhatsAppGroup: mocks.group }));
vi.mock('../src/components/admin/InlineDescriptionAI', () => ({ InlineDescriptionAI: () => null }));
vi.mock('../src/components/ImageUpload', () => ({ ImageUpload: ({ onImageSelect, onProcessingChange, preserveExistingMedia, cropAspect }: any) => { mocks.imageBusy = onProcessingChange; return <div data-preserve={String(preserveExistingMedia)} data-poster-aspect={cropAspect}><button type="button" onClick={() => onImageSelect('https://files.example/new-poster.webp')}>Upload event poster</button><button type="button" onClick={() => onProcessingChange(true)}>Start poster upload</button></div>; } }));
vi.mock('../src/components/VideoUpload', () => ({ VideoUpload: ({ preserveExistingMedia }: any) => <div data-preserve-video={String(preserveExistingMedia)} /> }));
vi.mock('../src/components/admin/events/AIEventScanner', () => ({ AIEventScanner: ({ onCancel }: any) => <div role="dialog"><button type="button" onClick={onCancel}>Close scanner</button></div> }));
vi.mock('../src/components/admin/EventWinnersEditor', () => ({ default: ({ eventId }: any) => <div data-winners-event={eventId}>Existing winners editor</div> }));
vi.mock('../src/utils/brandAsset', () => ({ prepareBrandAsset: mocks.prepare }));
vi.mock('../src/lib/supabase', () => ({ supabase: { auth: { getSession: mocks.session }, storage: { from: () => ({ list: mocks.list, upload: mocks.upload, createSignedUrl: mocks.signed, remove: mocks.removeStamp }) } } }));
let host: HTMLDivElement, root: Root;
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true; localStorage.clear();
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { callback(0); return 1; }); vi.stubGlobal('cancelAnimationFrame', vi.fn()); vi.stubGlobal('fetch', mocks.fetch);
  for (const fn of [mocks.group, mocks.create, mocks.update, mocks.addCoord, mocks.updateCoord, mocks.removeCoord, mocks.remove, mocks.reorder, mocks.approval, mocks.requiresApproval, mocks.list, mocks.upload, mocks.signed, mocks.removeStamp, mocks.session, mocks.prepare, mocks.fetch]) fn.mockReset();
  mocks.group.mockResolvedValue('https://chat.whatsapp.com/PublishedInvite'); mocks.create.mockResolvedValue({ id: 30 }); mocks.update.mockResolvedValue(undefined); mocks.addCoord.mockResolvedValue({ id: 77 }); mocks.updateCoord.mockResolvedValue(undefined); mocks.removeCoord.mockResolvedValue(undefined); mocks.remove.mockResolvedValue(undefined); mocks.reorder.mockResolvedValue(true); mocks.requiresApproval.mockResolvedValue(false); mocks.approval.mockResolvedValue({ success: true });
  mocks.list.mockResolvedValue({ data: [], error: null }); mocks.upload.mockResolvedValue({ error: null }); mocks.signed.mockResolvedValue({ data: { signedUrl: 'https://files.example/signature.png' }, error: null }); mocks.removeStamp.mockResolvedValue({ error: null }); mocks.session.mockResolvedValue({ data: { session: { access_token: 'test-session' } }, error: null }); mocks.prepare.mockImplementation(async file => file); mocks.fetch.mockResolvedValue(Response.json({ success: true, total: 2, sent: 2, failed: 0 }));
  mocks.data = { events: [{ id: 1, title: 'Campus debate', category: 'Academic', description: 'Published description', date: '2027-12-19', time: '4 PM', venue: 'Main hall', image: '/poster.webp', highlights: [], rules: ['Be on time'], registration_open: true, visible: true, featured: false, current_registrations: 12 }, { id: 2, title: 'Band evening', category: 'Cultural', description: 'Live music', date: '', time: '', venue: '', image: '', highlights: [], rules: [], registration_open: false, visible: false, featured: false, current_registrations: 3 }],
    eventCoordinators: [{ id: 9, event_id: 1, name: 'Published coordinator', phone: '555', order_position: 1 }], eventWinners: [], homepageSettings: { brand_logo_url: 'https://files.example/logo.png', brand_year: 2027 }, siteSettings: { registration_participant_types: ['Select participant type', 'MBBS', 'Nursing'] }, loading: false, connectionStatus: 'ok', addEventWithCoordinators: mocks.create, updateEvent: mocks.update, deleteEvent: mocks.remove, reorderEvents: mocks.reorder, addEventCoordinator: mocks.addCoord, updateEventCoordinator: mocks.updateCoord, deleteEventCoordinator: mocks.removeCoord, refreshAll: vi.fn() };
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); localStorage.clear(); });
const render = async () => { await act(async () => root.render(<EventsManagement />)); };
const dialog = () => document.querySelector<HTMLElement>('.event-admin-dialog')!;
const findButton = (label: string, scope: ParentNode = document) => [...scope.querySelectorAll<HTMLButtonElement>('button')].find(button => button.getAttribute('aria-label') === label || button.textContent?.trim() === label || button.querySelector('strong')?.textContent === label)!;
const click = async (label: string, scope: ParentNode = document) => { const target = findButton(label, scope); expect(target, label).toBeTruthy(); await act(async () => target.click()); };
function input(label: string): HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement {
  return [...document.querySelectorAll<HTMLLabelElement>('label')].find(node => node.querySelector('span')?.textContent === label)?.querySelector('input,textarea,select') as any;
}
async function change(label: string, value: string) { const node = input(label); expect(node, label).toBeTruthy(); await act(async () => { const prototype = node instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : node instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(prototype, 'value')!.set!.call(node, value); node.dispatchEvent(new Event(node instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true })); }); }

it('opens a real add dialog, keeps all sections together and saves contacts only with the event', async () => {
  await render(); expect(mocks.list).not.toHaveBeenCalled(); await click('Add event');
  expect(dialog().getAttribute('role')).toBe('dialog'); expect(document.body.style.overflow).toBe('hidden');
  await click('Create event', dialog()); expect(dialog().querySelector('[role="alert"]')?.textContent).toContain('title');
  await change('Event title', 'New campus event'); await change('Description', 'A complete event introduction.');
  await click('Registration', dialog()); await change('Default registration mode', 'team');
  await click('MBBS', dialog()); await change('MBBS quota', '0');
  await click('Coordinators', dialog()); await click('Add coordinator', dialog()); await change('Coordinator 1 name', 'New coordinator'); await change('Coordinator 1 phone', '100');
  expect(mocks.addCoord).not.toHaveBeenCalled();
  await click('Poster & video', dialog()); expect(dialog().querySelector('[data-preserve="true"]')).not.toBeNull(); expect(dialog().querySelector('[data-preserve-video="true"]')).not.toBeNull(); await click('Upload event poster', dialog());
  await click('Publishing', dialog()); await act(async () => (dialog().querySelector('[aria-label="Feature on the homepage"]') as HTMLInputElement).click());
  await click('Create event', dialog());
  expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ title: 'New campus event', registration_default_mode: 'team', registration_participant_quotas: { MBBS: 0 }, image: 'https://files.example/new-poster.webp', featured: true }), []);
  expect(mocks.addCoord).toHaveBeenCalledWith(expect.objectContaining({ event_id: 30, name: 'New coordinator', phone: '100', order_position: 1 }));
  expect(document.querySelector('.event-admin-dialog')).toBeNull(); expect(mocks.fetch).not.toHaveBeenCalled();
});

it('keeps failed edits, restores them after closing, and never writes contacts on individual keystrokes', async () => {
  await render(); await click('Edit Campus debate'); await change('Event title', 'Updated debate');
  await click('Coordinators', dialog()); await change('Coordinator 1 name', 'Edited coordinator'); expect(mocks.updateCoord).not.toHaveBeenCalled();
  mocks.update.mockRejectedValueOnce(new Error('offline')); await click('Save changes', dialog()); expect(dialog().querySelector('[role="alert"]')?.textContent).toContain('offline');
  await click('Close', dialog()); await click('Edit Campus debate'); expect(input('Event title').value).toBe('Updated debate');
  await click('Save changes', dialog()); expect(mocks.update).toHaveBeenCalledWith(1, expect.objectContaining({ title: 'Updated debate', whatsapp_group_link: 'https://chat.whatsapp.com/PublishedInvite' })); expect(mocks.updateCoord).toHaveBeenCalledWith(9, expect.objectContaining({ name: 'Edited coordinator' }));
});

it('locks save and dismissal while uploads run without disabling the crop/upload controls', async () => {
  await render(); await click('Add event'); await click('Poster & video', dialog()); await click('Start poster upload', dialog());
  expect(findButton('Create event', dialog()).disabled).toBe(true); expect(findButton('Close dialog', dialog()).disabled).toBe(true); expect(dialog().querySelector('fieldset')?.disabled).toBe(false);
  await act(async () => mocks.imageBusy!(false)); expect(findButton('Create event', dialog()).disabled).toBe(false);
});

it('retains the arrangement after a failed order save and exposes event actions and winners', async () => {
  await render(); await click('Feature on homepage'); expect(mocks.update).toHaveBeenCalledWith(1, { featured: true });
  await click('Manage winners (0)'); expect(dialog().querySelector('[data-winners-event="1"]')).not.toBeNull(); await click('Close dialog', dialog());
  await click('Reorder events'); await click('Move Band evening up', dialog()); mocks.reorder.mockResolvedValueOnce(false); await click('Save order', dialog()); expect(dialog().querySelector('[role="alert"]')?.textContent).toContain('could not save');
  await click('Save order', dialog()); expect(mocks.reorder).toHaveBeenLastCalledWith([2, 1]); expect(document.querySelector('.event-admin-dialog')).toBeNull();
});

it('loads branding only on demand and preserves the current stamp when an upload fails', async () => {
  await render(); expect(mocks.list).not.toHaveBeenCalled(); mocks.list.mockResolvedValueOnce({ data: [{ name: 'email_stamp.png' }], error: null }); await click('Email branding');
  expect(dialog().querySelector('header img')?.getAttribute('src')).toBe('https://files.example/logo.png');
  mocks.upload.mockResolvedValueOnce({ error: new Error('Storage unavailable') }); const upload = dialog().querySelector<HTMLInputElement>('[aria-label="Upload email stamp"]')!;
  await act(async () => { Object.defineProperty(upload, 'files', { configurable: true, value: [new File(['test'], 'stamp.png', { type: 'image/png' })] }); upload.dispatchEvent(new Event('change', { bubbles: true })); });
  expect(mocks.removeStamp).not.toHaveBeenCalled(); expect(dialog().querySelector('[alt="Email signature stamp"]')?.getAttribute('src')).toBe('https://files.example/signature.png'); expect(dialog().querySelector('[role="alert"]')?.textContent).toContain('Storage unavailable');
});

it('sends only after the notification review button is clicked and keeps rule highlights in the request', async () => {
  await render(); await click('Notify participants'); expect(mocks.fetch).not.toHaveBeenCalled();
  await change('Update type', 'combined'); await change('Message to participants', 'The venue and rules have changed.');
  await act(async () => (dialog().querySelector('.event-email-rule-picker input') as HTMLInputElement).click());
  await click('Send update', dialog());
  const [url, request] = mocks.fetch.mock.calls[0]; expect(url).toBe('/api/notify-event-update');
  expect(JSON.parse(request.body)).toMatchObject({ eventId: 1, updateType: 'combined', message: 'The venue and rules have changed.', rules: [{ text: 'Be on time', highlight: true }] }); expect(dialog().querySelector('[role="status"]')?.textContent).toContain('2 emails sent');
});

it('does not load an editable protected group after a failed lookup and routes restricted edits to approval', async () => {
  await render(); mocks.group.mockRejectedValueOnce(new Error('Group could not load')); await click('Edit Campus debate'); expect(document.querySelector('.event-admin-dialog')).toBeNull(); expect(host.querySelector('[role="alert"]')?.textContent).toContain('Group could not load');
  mocks.requiresApproval.mockResolvedValue(true); await click('Edit Campus debate'); await change('Event title', 'Pending revision'); await click('Save changes', dialog());
  expect(mocks.approval).toHaveBeenCalledWith('event', 'update', expect.objectContaining({ title: 'Pending revision', coordinators: [expect.objectContaining({ id: 9, name: 'Published coordinator' })] }), 1); expect(mocks.update).not.toHaveBeenCalled(); expect(mocks.updateCoord).not.toHaveBeenCalled();
});

it('filters the catalog and preserves visibility, registration and explicit delete actions', async () => {
  await render(); await change('Search events', 'Band'); expect(host.querySelectorAll('.events-admin-row')).toHaveLength(1);
  await click('Publish event'); expect(mocks.update).toHaveBeenCalledWith(2, { visible: true });
  await click('Open registration now'); expect(mocks.update).toHaveBeenCalledWith(2, { registration_open: true, registration_timer_enabled: false });
  await click('Delete event'); expect(mocks.remove).not.toHaveBeenCalled(); await click('Cancel', dialog()); expect(mocks.remove).not.toHaveBeenCalled();
  await click('Delete event'); await click('Delete event', dialog()); expect(mocks.remove).toHaveBeenCalledExactlyOnceWith(2);
});
