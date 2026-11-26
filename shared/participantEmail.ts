import { escapeEmailHtml as escape, renderRules } from './eventUpdateEmail';
export type ParticipantEmailKind = 'confirmation' | 'rejection' | 'custom' | 'winner' | 'selection';
export interface ParticipantEmailInput {
  kind: ParticipantEmailKind;
  registration: { id: string; full_name: string; event_title: string; team_members?: unknown };
  event?: { date?: string | null; time?: string | null; venue?: string | null; rules?: unknown[] | null } | null;
  coordinators?: { name: string; phone?: string | null }[];
  subject?: string; message?: string; reason?: string; position?: string; stage?: string;
  logoUrl?: string; stampUrl?: string | null; year?: string | number; hasReceipt?: boolean;
}
const text = (value: unknown) => escape(value).replace(/\n/g, '<br />');
const image = (value?: string | null) => { try { const url = new URL(value || ''); return url.protocol === 'https:' || url.protocol === 'http:' ? escape(url.href) : ''; } catch { return ''; } };

export function renderParticipantEmail(input: ParticipantEmailInput) {
  const reg = input.registration;
  const title = reg.event_title.replace(/[\r\n]/g, ' ');
  const heading = { confirmation: 'Your registration is approved', rejection: 'An update on your registration', custom: 'A message from the organisers', winner: 'Congratulations on your achievement', selection: 'You’re through to the next stage' }[input.kind];
  const subject = (input.kind === 'custom' ? input.subject || `Update: ${title}` : input.kind === 'confirmation' ? `Registration approved: ${title}` : input.kind === 'winner' ? `Congratulations: ${title}` : input.kind === 'selection' ? `Selection update: ${title}` : `Registration update: ${title}`).replace(/[\r\n]/g, ' ');
  let content = '';
  if (input.kind === 'confirmation') {
    let members = reg.team_members;
    if (typeof members === 'string') { try { members = JSON.parse(members); } catch { members = []; } }
    content = `<p>Your entry for <strong>${escape(title)}</strong> is confirmed.</p><table role="presentation" width="100%" style="background:#f2f6ed;border:1px solid #dfe7d8;"><tr><td style="padding:14px 17px;">${[['Date', input.event?.date], ['Time (IST)', input.event?.time], ['Venue', input.event?.venue]].map(([key, value]) => `<p style="margin:5px 0;"><strong>${key}:</strong> ${escape(value || 'To be announced')}</p>`).join('')}</td></tr></table>${Array.isArray(members) && members.length ? `<h2 style="font-size:15px;">Your team</h2><ul>${members.map(member => `<li>${escape(typeof member === 'string' ? member : member?.name || '')}</li>`).join('')}</ul>` : ''}${input.event?.rules?.length ? `<h2 style="font-size:15px;">Event guidelines</h2>${renderRules(input.event.rules)}` : ''}<p>Please keep your registration ID for the event.${input.hasReceipt ? ' Your PDF receipt is attached.' : ''}</p>`;
  } else if (input.kind === 'rejection') content = `<p>We could not approve your entry for <strong>${escape(title)}</strong>.</p><div style="border-left:3px solid #b67d72;padding:10px 15px;background:#fbf4ef;"><strong>Reason</strong><p>${text(input.reason)}</p></div><p>Review the requirements on the event page before applying again.</p>`;
  else if (input.kind === 'winner') content = `<p>You have been named <strong>${escape(input.position || 'a winner')}</strong> in <strong>${escape(title)}</strong>.</p>${input.message ? `<p>${text(input.message)}</p>` : '<p>The organisers will share the next steps with you.</p>'}`;
  else if (input.kind === 'selection') content = `<p>Your entry for <strong>${escape(title)}</strong> has been selected for <strong>${escape(input.stage || 'the next round')}</strong>.</p>${input.message ? `<p>${text(input.message)}</p>` : '<p>Please look out for the next schedule update.</p>'}`;
  else content = `<div style="white-space:normal;">${text(input.message)}</div>`;
  const logo = image(input.logoUrl), stamp = image(input.stampUrl);
  const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1" /></head><body style="margin:0;background:#f3f6f0;color:#35482f;font-family:Arial,Helvetica,sans-serif;line-height:1.7;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:24px 12px;"><table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;background:#fff;border:1px solid #e0e7d9;border-radius:10px;">
  <tr><td style="padding:24px 27px;border-bottom:1px solid #e3e9dd;"><table role="presentation"><tr>${logo ? `<td style="padding-right:15px;"><img src="${logo}" width="46" alt="Festival logo" style="display:block;max-height:58px;object-fit:contain;" /></td>` : ''}<td><strong style="letter-spacing:1px;">RICORRENZA ${escape(input.year || '')}</strong><div style="font-size:10px;letter-spacing:2px;color:#87957b;">PARTICIPANT UPDATE</div></td></tr></table></td></tr>
  <tr><td style="padding:25px 27px;"><p style="font-size:12px;color:#829475;">${escape(title)}</p><h1 style="font-size:24px;line-height:1.3;color:#315339;">${heading}</h1><p>Dear <strong>${escape(reg.full_name)}</strong>,</p><p style="font-size:12px;">Registration ID: <strong>${escape(reg.id)}</strong></p>${content}${input.coordinators?.length ? `<div style="margin-top:22px;padding-top:15px;border-top:1px solid #e3e9dc;"><strong>Event coordinators</strong>${input.coordinators.map(person => `<p>${escape(person.name)}${person.phone ? ` · ${escape(person.phone)}` : ''}</p>`).join('')}</div>` : ''}</td></tr>
  <tr><td style="padding:0 27px 26px;"><table role="presentation" width="100%" style="border-top:1px solid #e3e9dd;"><tr><td style="padding-top:18px;font-size:13px;">Best regards,<br /><strong>The Ricorrenza team</strong></td>${stamp ? `<td align="right" style="padding-top:18px;padding-left:15px;"><img src="${stamp}" alt="Official event signature stamp" width="140" style="display:block;width:140px;max-width:100%;height:auto;" /></td>` : ''}</tr></table></td></tr></table></td></tr></table></body></html>`;
  return { subject, html };
}
