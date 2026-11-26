import type { TimelineDay, ScheduleType } from './schedulePresentation';
import { scheduleDate, scheduleDayTitle, scheduleTime } from './schedulePresentation';

/** Load the PDF library only when a visitor asks for a download. */
export async function downloadSchedulePdf(days: TimelineDay[], type: ScheduleType, year: string | number) {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF();
  const width = pdf.internal.pageSize.getWidth();
  const height = pdf.internal.pageSize.getHeight();
  let y = 0;
  const clean = (text: string) => text.replace(/[–—]/g, '-').replace(/[^\x20-\x7e\n]/g, '');
  const newPage = (first = false) => {
    if (!first) pdf.addPage();
    pdf.setFillColor(5, 25, 17); pdf.rect(0, 0, width, 32, 'F');
    pdf.setTextColor(239, 216, 153); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(19);
    pdf.text(`RICORRENZA ${year}`, 16, 14);
    pdf.setFontSize(9); pdf.setTextColor(219, 235, 215);
    pdf.text(`RICO SCHEDULE / ${type === 'mains' ? 'MAIN FESTIVAL' : 'PRELIMS'} / ALL TIMES IST`, 16, 23);
    y = 45;
  };
  const room = (space: number) => { if (y + space > height - 22) newPage(); };
  newPage(true);
  for (const day of days) {
    const heading = clean(`${day.day} | ${scheduleDate(day.date)}${scheduleDayTitle(day) ? ` | ${scheduleDayTitle(day)}` : ''}`);
    const lines = pdf.splitTextToSize(heading, width - 32) as string[];
    room(lines.length * 5 + 24);
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(12); pdf.setTextColor(14, 72, 43);
    pdf.text(lines, 16, y); y += lines.length * 5 + 6;
    if (!day.events.length) {
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10); pdf.setTextColor(80, 88, 80);
      pdf.text('Events to be announced.', 16, y); y += 12;
    }
    for (const event of day.events) {
      pdf.setFontSize(10);
      const title = pdf.splitTextToSize(clean(event.title), width - 40) as string[];
      const venue = pdf.splitTextToSize(clean(event.venue || event.location || 'Venue to be announced'), width - 40) as string[];
      room(19 + (title.length + venue.length) * 4.5);
      pdf.setFont('helvetica', 'bold'); pdf.setTextColor(15, 80, 48);
      pdf.text(clean(scheduleTime(event, day.date)), 18, y); y += 5;
      pdf.setTextColor(24, 30, 25); pdf.text(title, 18, y); y += title.length * 4.5 + 1;
      pdf.setFont('helvetica', 'normal'); pdf.setTextColor(85, 90, 85);
      pdf.text(venue, 18, y); y += venue.length * 4.5 + 5;
      pdf.setDrawColor(214, 222, 212); pdf.line(16, y, width - 16, y); y += 8;
    }
    y += 5;
  }
  const pages = pdf.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    pdf.setPage(page); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8); pdf.setTextColor(90, 96, 88);
    pdf.text('Timings are tentative and subject to change. Check the website for updates.', 16, height - 12);
    pdf.text(`${page} / ${pages}`, width - 16, height - 12, { align: 'right' });
  }
  pdf.save(`ricorrenza-${year}-${type}-schedule.pdf`);
}
