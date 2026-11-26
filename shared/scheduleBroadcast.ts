import { escapeEmailHtml } from './eventUpdateEmail';
export type ScheduleRecipient = { id: string; email: string; full_name?: string | null };
export function scheduleRecipients(rows: ScheduleRecipient[], logs: { recipient_email: string }[]) {
  const received = new Set(logs.map(log => log.recipient_email?.trim().toLowerCase()).filter(Boolean));
  const unique = new Map<string, ScheduleRecipient>();
  for (const row of rows) {
    const email = row.email?.trim().toLowerCase();
    if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !unique.has(email)) unique.set(email, { ...row, email });
  }
  return { total: unique.size, pending: [...unique.values()].filter(row => !received.has(row.email)) };
}
export function renderScheduleBroadcast({ name, year, editions, siteUrl }: { name?: string | null; year: number; editions: string[]; siteUrl: string }) {
  const e = escapeEmailHtml;
  const url = new URL('/schedule', siteUrl);
  if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Invalid website URL.');
  return { subject: `Ricorrenza ${year} · Festival schedule`, html: `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1" /></head><body style="margin:0;background:#f2f5ee;font-family:Arial,Helvetica,sans-serif;color:#2e4032;line-height:1.7;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:28px 14px;"><table role="presentation" width="580" cellpadding="0" cellspacing="0" style="width:100%;max-width:580px;background:#fff;border:1px solid #dfe6d7;border-radius:12px;"><tr><td style="padding:25px 28px;border-bottom:1px solid #e3e9dc;font-weight:bold;letter-spacing:1px;">RICORRENZA ${e(year)}</td></tr><tr><td style="padding:28px;"><h1 style="margin:0 0 20px;font-size:26px;line-height:1.3;">Your festival, hour by hour.</h1><p>Dear <strong>${e(name || 'Participant')}</strong>,</p><p>The festival programme is available. Check the latest event times and venues before you arrive.</p><p style="font-size:13px;color:#718264;">Available: ${editions.map(e).join(' &middot; ')}. All times are in IST.</p><p style="margin:26px 0;"><a href="${e(url.href)}" style="display:inline-block;background:#426b52;padding:12px 22px;color:#fff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:bold;">View festival schedule</a></p><p style="font-size:12px;color:#7e8d72;">Timings may change. The website always has the current programme.</p><p style="border-top:1px solid #e3e9dc;padding-top:20px;font-size:13px;">See you at the festival,<br /><strong>The Ricorrenza team</strong></p></td></tr></table></td></tr></table></body></html>` };
}
