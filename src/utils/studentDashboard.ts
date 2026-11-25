import { eventWindow } from './scheduleClashes';
import { eventDate, eventTime } from './eventPresentation';

export interface StudentRegistration {
  id: string;
  event_id?: string | number;
  event_title?: string;
  status?: string | null;
  is_active?: boolean | null;
  deleted_at?: string | null;
  teams?: { name: string } | null;
  team_name?: string | null;
  is_team_registration?: boolean;
  event?: {
    title?: string; name?: string; image?: string; image_url?: string;
    date?: string; time?: string; venue?: string; category?: unknown;
  } | null;
}

export function registrationTitle(registration: StudentRegistration) {
  return registration.event?.title || registration.event?.name || registration.event_title || 'Festival event';
}

export function registrationStatus(status?: string | null) {
  if (status === 'approved') return { label: 'Approved', tone: 'success' };
  if (status === 'rejected') return { label: 'Not approved', tone: 'danger' };
  return { label: status === 'pending' || !status ? 'Pending review' : status.replace(/_/g, ' '), tone: 'pending' };
}

export function registrationStart(registration: StudentRegistration) {
  const date = registration.event?.date;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const confirmed = eventWindow({ id: registration.event_id || registration.id, title: registrationTitle(registration), date, time: registration.event?.time });
  if (confirmed) return confirmed.start;
  const start = new Date(`${date}T23:59:59+05:30`).getTime();
  return Number.isFinite(start) && new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) === date ? start : null;
}

export function upcomingRegistrations(registrations: StudentRegistration[], now = Date.now()) {
  return registrations.filter(reg => !reg.deleted_at && reg.status === 'approved' && (registrationStart(reg) ?? 0) >= now)
    .sort((a, b) => registrationStart(a)! - registrationStart(b)!);
}

export function registrationWhen(registration: StudentRegistration) {
  return [eventDate(registration.event?.date), registration.event?.time ? eventTime(registration.event.time) : null].filter(Boolean).join(' · ');
}

interface PassSummary {
  valid_date?: string | null;
  is_used?: boolean | null;
  scanned_at?: string | null;
}

export function studentPassStatus(pass: PassSummary, now = new Date()) {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now);
  if (pass.is_used || pass.scanned_at) return { label: 'Already checked in', tone: 'neutral' };
  if (pass.valid_date && pass.valid_date < today) return { label: 'Expired', tone: 'neutral' };
  if (pass.valid_date && pass.valid_date > today) return { label: 'Upcoming', tone: 'pending' };
  return { label: 'Ready for entry', tone: 'success' };
}

export function preferredStudentPass<T extends PassSummary>(passes: T[], now = new Date()): T | undefined {
  return passes.find(pass => studentPassStatus(pass, now).tone === 'success')
    || passes.find(pass => studentPassStatus(pass, now).tone === 'pending')
    || passes[0];
}
