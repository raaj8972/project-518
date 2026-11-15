import React, { useState } from 'react';
import { InstagramLogoIcon, VideoIcon, SpeakerLoudIcon, MobileIcon, ExternalLinkIcon } from '@radix-ui/react-icons';
import { eventLink } from '../../utils/eventPresentation';

interface FounderCardProps {
  founder: any;
  compact?: boolean;
  isActive?: boolean;
}

/** Small designer attribution; the family and committee sections carry the page hierarchy. */
export const FounderCard: React.FC<FounderCardProps> = ({ founder }) => {
  const [imageFailed, setImageFailed] = useState(false);
  const isRaaj = String(founder.name || '').toLowerCase().includes('raaj');
  const role = isRaaj ? 'System Designer' : founder.role || 'System Designer';
  const links = [
    { name: 'Instagram', url: eventLink(founder.social_links?.instagram), icon: InstagramLogoIcon },
    { name: 'YouTube', url: eventLink(founder.social_links?.youtube), icon: VideoIcon },
    { name: 'Facebook', url: eventLink(founder.social_links?.facebook), icon: ExternalLinkIcon },
    { name: 'Spotify', url: eventLink(founder.social_links?.spotify), icon: SpeakerLoudIcon },
  ].filter(link => link.url);
  const phone = typeof founder.phone === 'string' ? founder.phone.trim() : '';
  return <article className="family-designer-credit">
    <div className="family-designer-portrait">{founder.image && !imageFailed ? <img src={founder.image} alt={founder.name} width="120" height="140" decoding="async" onError={() => setImageFailed(true)} /> : <span aria-hidden="true">{String(founder.name || 'R').slice(0, 1)}</span>}</div>
    <div className="family-designer-copy"><h2 className="family-designer-role">{role}</h2><h3 className="family-designer-name">{founder.name}</h3></div>
    {(links.length > 0 || phone) && <div className="family-designer-socials">{links.map(link => { const Icon = link.icon; return <a key={link.name} href={link.url} target="_blank" rel="noopener noreferrer" aria-label={`${founder.name} on ${link.name}`}><Icon /></a>; })}{phone && <a href={`tel:${phone.replace(/[^\d+]/g, '')}`} aria-label={`Call ${founder.name}`}><MobileIcon /></a>}</div>}
  </article>;
};
