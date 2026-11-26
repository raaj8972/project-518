export interface EventUpdateEmailInput {
  eventId: string | number;
  eventTitle: string;
  updateType: 'schedule' | 'rules' | 'combined';
  message?: string;
  newDetails?: { date?: string; time?: string; venue?: string };
  rules?: unknown[];
  registration: { id: string | number; full_name?: string; team_members?: unknown };
  coordinators?: { name?: string; phone?: string | null }[];
  logoUrl?: string | null;
  stampUrl?: string | null;
  year?: string | number;
}
export const escapeEmailHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));
const safeImage = (value: unknown) => { try { const url = new URL(String(value)); return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? escapeEmailHtml(url.href) : ''; } catch { return ''; } };

export function renderRules(rules: unknown[] = []): string {
  return rules.map(rule => {
    const row = typeof rule === 'string' ? { text: rule } : rule as { text?: string; kind?: string; highlight?: boolean } | null;
    if (!row || typeof row.text !== 'string') return '';
    if (row.text.startsWith('__SR__')) {
      try {
        const data = JSON.parse(row.text.slice(6));
        const sections = Array.isArray(data) ? data : data.sections;
        if (!Array.isArray(sections)) return '';
        return sections.map(section => renderRules([
          ...(section?.heading ? [{ text: section.heading, kind: 'h1', highlight: row.highlight }] : []),
          ...(section?.blocks || [{ items: section?.points || [] }]).flatMap((block: { title?: string; items?: string[] }) => [
            ...(block?.title ? [{ text: block.title, kind: 'h2', highlight: row.highlight }] : []),
            ...(block?.items || []).map(text => ({ text, highlight: row.highlight })),
          ]),
        ])).join('');
      } catch { return ''; }
    }
    const content = escapeEmailHtml(row.text).replace(/\n/g, '<br />');
    const changed = row.highlight ? '<span style="font-size:10px;font-weight:bold;color:#77551e;">UPDATED &nbsp;</span>' : '';
    return `<div style="margin:0 0 9px;padding:8px 10px;border-radius:5px;${row.highlight ? 'background-color:#fff0c2;' : ''}${row.kind === 'h1' || row.kind === 'h2' ? 'font-weight:bold;color:#31553e;' : 'color:#36443b;'}">${changed}${content}</div>`;
  }).join('');
}

/** Table layout and ordinary images work in email clients without CSS positioning. */
export function renderEventUpdateEmail(input: EventUpdateEmailInput) {
  const e = escapeEmailHtml;
  const heading = input.updateType === 'rules' ? 'Rules & guidelines updated' : input.updateType === 'combined' ? 'Schedule & rules updated' : 'Your event details have changed';
  const logo = safeImage(input.logoUrl);
  const stamp = safeImage(input.stampUrl);
  const details = input.newDetails || {};
  const people = Array.isArray(input.registration.team_members) ? input.registration.team_members : [];
  const title = `${input.eventTitle || 'Event'}`.replace(/[\r\n]/g, ' ');
  const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1" /><meta name="color-scheme" content="light" /></head>
  <body style="margin:0;padding:0;background-color:#f3f6f1;color:#26372d;font-family:Arial,Helvetica,sans-serif;line-height:1.6;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f6f1;"><tr><td align="center" style="padding:24px 12px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background-color:#ffffff;border:1px solid #dfe7db;border-radius:12px;">
        <tr><td style="padding:25px 28px;border-bottom:1px solid #e2e9de;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
          ${logo ? `<td width="62" valign="middle"><img src="${logo}" alt="Ricorrenza logo" width="46" style="display:block;width:46px;max-height:58px;object-fit:contain;border:0;" /></td>` : ''}
          <td valign="middle"><div style="font-size:16px;letter-spacing:1px;font-weight:bold;color:#2c5038;">RICORRENZA ${e(input.year || '')}</div><div style="font-size:10px;letter-spacing:2px;color:#6a7b6b;margin-top:3px;">PARTICIPANT UPDATE</div></td>
        </tr></table></td></tr>
        <tr><td style="padding:26px 28px 16px;"><p style="margin:0 0 5px;font-size:12px;color:#71816c;">${e(input.eventTitle)}</p><h1 style="margin:0 0 22px;font-family:Arial,Helvetica,sans-serif;font-size:25px;line-height:1.25;font-weight:bold;color:#294c35;">${heading}</h1>
          <p>Dear <strong>${e(input.registration.full_name || 'Participant')}</strong>,</p><p>The ${input.updateType === 'rules' ? 'rules for' : 'details of'} <strong>${e(input.eventTitle)}</strong> have been updated. Please review the latest information below.</p>
          <p style="font-size:12px;color:#60745f;">Registration ID: <strong>${e(input.registration.id)}</strong></p>
          ${people.length ? `<div style="padding:12px 16px;background-color:#f3f7ef;border:1px solid #e0e8d9;border-radius:7px;"><strong style="font-size:12px;">Your team</strong><ul style="padding-left:18px;margin:6px 0;">${people.map(person => `<li>${e(typeof person === 'string' ? person : person && typeof person === 'object' ? ('name' in person ? person.name : 'full_name' in person ? person.full_name : 'Team member') : '')}</li>`).join('')}</ul></div>` : ''}
          ${input.updateType !== 'rules' ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;border:1px solid #dce7d7;background-color:#f5f8f2;"><tr><td style="padding:15px 18px;"><strong style="color:#365f3f;font-size:13px;">UPDATED SCHEDULE</strong>${[['Date', details.date || 'To be announced'], ['Time (IST)', details.time || 'To be announced'], ['Venue', details.venue || 'To be announced']].map(([label, value]) => `<p style="margin:8px 0 0;font-size:14px;"><strong>${label}:</strong> ${e(value)}</p>`).join('')}</td></tr></table>` : ''}
          ${input.updateType !== 'schedule' ? `<div style="margin:20px 0;"><h2 style="font-size:16px;color:#365f3f;">Current rules & guidelines</h2>${renderRules(input.rules) || '<p>Please check the event page for the current rulebook.</p>'}</div>` : ''}
          ${input.message ? `<div style="border-left:3px solid #729a63;padding:8px 14px;margin:18px 0;background-color:#f6f8f3;"><strong style="font-size:12px;">A note from the organisers</strong><p style="margin:5px 0;font-size:14px;">${e(input.message).replace(/\n/g, '<br />')}</p></div>` : ''}
          <p style="margin:24px 0;"><a href="https://ricorrenza.fun/events?event=${encodeURIComponent(String(input.eventId))}" style="display:inline-block;padding:11px 20px;background-color:#426b52;border-radius:6px;color:#ffffff;text-decoration:none;font-weight:bold;font-size:13px;">View event details</a></p>
          ${(input.coordinators || []).length ? `<div style="padding-top:16px;border-top:1px solid #e2e9de;"><strong style="font-size:12px;color:#4e6651;">Questions? Contact your event coordinators</strong>${(input.coordinators || []).map(coord => `<p style="margin:6px 0;font-size:13px;">${e(coord.name)}${coord.phone ? ` &nbsp; <a href="tel:${e(coord.phone.replace(/[^+\d]/g, ''))}" style="color:#426b52;">${e(coord.phone)}</a>` : ''}</p>`).join('')}</div>` : ''}
        </td></tr>
        <tr><td style="padding:18px 28px 26px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e2e9de;"><tr><td valign="middle" style="padding-top:18px;font-size:13px;color:#60705e;">Best regards,<br /><strong style="color:#36553e;">The Ricorrenza team</strong></td>${stamp ? `<td align="right" valign="middle" style="padding-top:18px;padding-left:14px;"><img src="${stamp}" alt="Official event signature stamp" width="140" style="display:block;width:140px;max-width:100%;height:auto;border:0;" /></td>` : ''}</tr></table></td></tr>
      </table><p style="font-size:10px;color:#7b8875;margin:14px 0 0;">IQ City Medical College, Durgapur · Keep this update for your records.</p>
    </td></tr></table>
  </body></html>`;
  return { subject: `${input.updateType === 'rules' ? 'Rules update' : input.updateType === 'combined' ? 'Schedule & rules update' : 'Event update'}: ${title}`, html };
}
