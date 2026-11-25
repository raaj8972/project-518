import { useState, type CSSProperties } from 'react';
import { Crown, Drum, Guitar, Heart, Instagram, Mic2, Music2, Piano, SlidersHorizontal } from 'lucide-react';
import type { BandMember } from '../../types/data';
import { getHomeboundCategory, getHomeboundSocialLinks } from '../../utils/homebound';
import type { HomeboundIcon } from '../../utils/homeboundContent';

interface HomeboundMemberCardProps {
  member: BandMember;
  index: number;
  icon?: HomeboundIcon;
  onSelect: (member: BandMember) => void;
}

const ACCENTS = ['#ff673f', '#e167ee', '#57f4d2', '#ffd04b'];

export function HomeboundMemberCard({ member, index, icon, onSelect }: HomeboundMemberCardProps) {
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const category = icon ?? getHomeboundCategory(member);
  const { instagram } = getHomeboundSocialLinks(member);
  const Decoration = member.is_featured ? Crown : category === 'vocals' ? (index % 2 ? Heart : Mic2)
    : category === 'guitars' ? Guitar : category === 'drums' ? Drum : category === 'keys' ? Piano : category === 'beatbox' ? Mic2 : category === 'music' ? Music2 : SlidersHorizontal;
  const initials = member.name.trim().split(/\s+/).map(part => part[0]).slice(0, 2).join('');
  const showImage = Boolean(member.image?.trim()) && failedImage !== member.image;

  return (
    <article className="hb-member" style={{ '--member-accent': ACCENTS[index % ACCENTS.length] } as CSSProperties}>
      <button type="button" className="hb-member__open" aria-label={`View ${member.name} profile`} onClick={() => onSelect(member)}>
        {showImage ? (
          <img className="hb-member__image" src={member.image} alt="" loading="lazy" decoding="async" onError={() => setFailedImage(member.image)} />
        ) : (
          <span className="hb-member__image hb-member__fallback" aria-hidden="true"><span>{initials}</span><Mic2 /></span>
        )}
        <span className="hb-member__shade" aria-hidden="true" />
        <Decoration className="hb-member__doodle" aria-hidden="true" strokeWidth={1.25} />
        <span className="hb-member__info">
          <span className="hb-member__name">{member.name}</span>
          <span className="hb-member__role">{member.role}</span>
        </span>
      </button>
      <span className="hb-member__tape" aria-hidden="true" />
      <span className="hb-member__paper" aria-hidden="true" />
      {instagram && (
        <a className="hb-member__instagram" href={instagram} target="_blank" rel="noopener noreferrer" aria-label={`${member.name} on Instagram (opens in a new tab)`}>
          <Instagram aria-hidden="true" />
        </a>
      )}
    </article>
  );
}
