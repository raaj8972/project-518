import { expect, it, vi } from 'vitest';
import type { jsPDF as Pdf } from 'jspdf';
import { downloadSchedulePdf } from '../src/utils/schedulePdf';
import type { TimelineDay } from '../src/utils/schedulePresentation';

const saved = vi.hoisted(() => ({ name: '', pdf: null as Pdf | null }));
vi.mock('jspdf', async original => {
  const actual = await original<typeof import('jspdf')>();
  return { ...actual, jsPDF: class {
    constructor() {
      const pdf = new actual.jsPDF();
      pdf.save = (name?: string) => { saved.name = name || ''; saved.pdf = pdf; return pdf; };
      return pdf;
    }
  } };
});

it('creates a valid paginated PDF containing every day and event, with the selected edition and IST times', async () => {
  const events = Array.from({ length: 45 }, (_, id) => ({ id, title: `Published performance ${id + 1}`, time: '1:00 PM - 3:00 PM', duration: '60', venue: 'Main Stage', type: 'music', event_id: null, guest_artist_id: null, schedule_day_id: 1, created_at: null, updated_at: null }));
  const days: TimelineDay[] = [{ id: 1, day: 'Day 1', date: '2027-12-19', title: '[MAINS] Opening day', events, created_at: null, updated_at: null }, { id: 2, day: 'Day 2', date: '2027-12-20', title: '[MAINS] The finale', events: [{ ...events[0], id: 99, title: 'Final performance' }], created_at: null, updated_at: null }];
  await downloadSchedulePdf(days, 'mains', 2027);
  expect(saved.name).toBe('ricorrenza-2027-mains-schedule.pdf');
  expect(saved.pdf!.getNumberOfPages()).toBeGreaterThan(1);
  const content = saved.pdf!.output();
  expect(content.startsWith('%PDF-')).toBe(true);
  for (const text of ['MAIN FESTIVAL', 'ALL TIMES IST', 'December 19', 'December 20', '1:00 PM - 3:00 PM', 'Published performance 45', 'Final performance']) expect(content).toContain(text);
  expect(content).not.toContain('[MAINS]');
});
