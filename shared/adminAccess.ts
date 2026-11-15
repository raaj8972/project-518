export const ADMIN_PAGES = [
  { id:'events', label:'Events', group:'Festival', flag:'can_events' },
  { id:'categories', label:'Event categories', group:'Festival', flag:'can_events' },
  { id:'schedule', label:'Festival schedule', group:'Festival', flag:'can_schedule' },
  { id:'sponsors', label:'Sponsors', group:'Festival', flag:'can_sponsors' },
  { id:'homebound', label:'Home Bound', group:'Festival', flag:'can_homebound' },
  { id:'registrations', label:'Event registrations', group:'Participants', flag:'can_registrations' },
  { id:'student-system', label:'Student ID approvals', group:'Participants', flag:'can_registrations' },
  { id:'student-passes', label:'Entry passes', group:'Participants', flag:'can_security_passes' },
  { id:'security-passes', label:'Pass security', group:'Participants', flag:'can_security_passes' },
  { id:'reg-photos', label:'Registration photos', group:'Participants', flag:'can_registration_photos' },
  { id:'auditions', label:'Auditions', group:'Participants', flag:'' },
  { id:'memberships', label:'Memberships', group:'Participants', flag:'' },
  { id:'registration-modal', label:'Registration form', group:'Participants', flag:'can_registrations' },
  { id:'homepage', label:'Homepage editor', group:'Website', flag:'' },
  { id:'hero-media', label:'Hero media', group:'Website', flag:'' },
  { id:'gallery', label:'Photo gallery', group:'Website', flag:'can_gallery' },
  { id:'social', label:'Social media', group:'Website', flag:'' },
  { id:'about', label:'About page', group:'Website', flag:'' },
  { id:'roadmap', label:'Festival roadmap', group:'Website', flag:'' },
  { id:'shoutouts', label:'Shout-outs', group:'Website', flag:'' },
  { id:'rico-family', label:'Rico Family & committees', group:'People', flag:'can_core_team' },
  { id:'band', label:'Band members', group:'People', flag:'' },
  { id:'guest-artists', label:'Guest artists', group:'People', flag:'can_guest_artists' },
  { id:'chief-guests', label:'Chief guests', group:'People', flag:'can_chief_guests' },
  { id:'sports-seasons', label:'Sports seasons', group:'Sports', flag:'can_sports' },
  { id:'sports-teams', label:'Sports teams', group:'Sports', flag:'can_sports' },
  { id:'sports-matches', label:'Sports matches', group:'Sports', flag:'can_sports' },
  { id:'sports-auction', label:'Sports auction', group:'Sports', flag:'can_sports' },
  { id:'sports-registrations', label:'Sports registrations', group:'Sports', flag:'can_sports' },
  { id:'sports-registration-model', label:'Sports registration form', group:'Sports', flag:'can_sports' },
  { id:'sports-announcements', label:'Sports announcements', group:'Sports', flag:'can_sports' },
  { id:'annual-events', label:'Annual sports events', group:'Sports', flag:'can_sports' },
  { id:'annual-schedule', label:'Annual sports schedule', group:'Sports', flag:'can_sports' },
  { id:'annual-registrations', label:'Annual sports registrations', group:'Sports', flag:'can_sports' },
  { id:'annual-registration-model', label:'Annual sports registration form', group:'Sports', flag:'can_sports' },
  { id:'announcements', label:'Announcements', group:'Communication', flag:'' },
  { id:'support-chat', label:'Support chat', group:'Communication', flag:'' },
] as const;
export const ADMIN_PAGE_IDS = new Set<string>(ADMIN_PAGES.map(page=>page.id));
export function validateAdminPages(value: unknown): string[] {
  if (!Array.isArray(value) || value.some(page=>typeof page!=='string' || !ADMIN_PAGE_IDS.has(page))) throw new Error('Choose valid management pages.');
  return [...new Set(value)] as string[];
}
export function flagsForAdminPages(pages: string[]): Record<string, boolean> {
  const selected = new Set(pages);
  return Object.fromEntries([...new Set(ADMIN_PAGES.map(page=>page.flag).filter(Boolean))].map(flag=>[flag, ADMIN_PAGES.some(page=>page.flag===flag && selected.has(page.id))]));
}
