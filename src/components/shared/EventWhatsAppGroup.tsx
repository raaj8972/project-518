import { useEffect, useState } from 'react';
import '../../styles/EventWhatsAppGroup.css';
import { ExternalLinkIcon } from '@radix-ui/react-icons';
import { useStudentAuth } from '../../context/StudentAuthContext';
import { supabase } from '../../lib/supabase';
import { getEventWhatsAppGroup } from '../../services/eventWhatsAppGroups';
import { eventLink } from '../../utils/eventPresentation';

export default function EventWhatsAppGroup({ eventId, eventTitle, eligible = true, approved = false }: {
  eventId: string | number; eventTitle?: string; eligible?: boolean; approved?: boolean;
}) {
  const { user } = useStudentAuth();
  const [result, setResult] = useState<{ key: string; link: string | null; error: boolean }>();
  const [revision, setRevision] = useState(0);
  const key = `${user?.id || ''}:${eventId}:${eligible}`;
  useEffect(() => {
    if (!user || !eligible) return;
    let active = true;
    void getEventWhatsAppGroup(eventId).then(link => {
      if (active) setResult({ key, link: eventLink(link) || null, error: false });
    }).catch(() => { if (active) setResult({ key, link: null, error: true }); });
    const refresh = () => { setResult(undefined); setRevision(value => value + 1); };
    const channel = supabase.channel(`event-whatsapp-${user.id}-${eventId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'registrations', filter: `user_id=eq.${user.id}` }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_whatsapp_groups', filter: `event_id=eq.${eventId}` }, refresh)
      .subscribe();
    window.addEventListener('focus', refresh);
    return () => { active = false; void supabase.removeChannel(channel); window.removeEventListener('focus', refresh); };
  }, [user?.id, eventId, eligible, key, revision]);
  const current = result?.key === key ? result : undefined;
  if (!user || !eligible) return <p className="event-group-note">WhatsApp group unlocks after coordinator approval.</p>;
  if (!current) return <p className="event-group-note" role="status">Checking event group access…</p>;
  if (current.error) return <div className="event-group-note" role="alert">Event group could not load. <button onClick={() => { setResult(undefined); setRevision(value => value + 1); }}>Try again</button></div>;
  if (!current.link) return <p className="event-group-note">{approved ? 'Your event group link will appear here when the coordinator adds it.' : 'WhatsApp group unlocks after coordinator approval.'}</p>;
  return <section className="event-group-card" aria-label={`${eventTitle || 'Event'} WhatsApp group`}>
    <div className="event-group-copy">
      <span className="event-group-label">YOUR EVENT COMMUNITY</span>
      <h3 className="event-group-title">Official WhatsApp group</h3>
      <p>Get timings, venue changes and updates from your coordinator.</p>
    </div>
    <a className="event-group-link" href={current.link} target="_blank" rel="noopener noreferrer" aria-label={`Join ${eventTitle || 'event'} WhatsApp group (opens in a new tab)`}>
      <svg className="event-group-whatsapp-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.653-2.059-1.756-2.208-.103-.149-.011-.23.112-.352.109-.108.248-.283.372-.425.124-.141.165-.242.248-.403.083-.162.041-.303-.021-.424-.062-.121-.553-1.313-.758-1.798-.199-.472-.401-.408-.553-.415-.144-.007-.308-.009-.473-.009s-.432.061-.658.303c-.226.243-.862.839-.862 2.046 0 1.207.883 2.373 1.006 2.537.124.165 1.738 2.654 4.209 3.722.588.253 1.047.404 1.405.518.59.187 1.127.161 1.551.098.473-.071 1.457-.595 1.663-1.169.206-.575.206-1.068.144-1.17-.062-.103-.226-.165-.473-.288m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.334 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
      </svg>
      <span>Join WhatsApp group</span>
      <ExternalLinkIcon aria-hidden="true" />
    </a>
  </section>;
}
