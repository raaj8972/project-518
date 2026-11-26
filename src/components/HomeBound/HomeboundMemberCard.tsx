import { useState, type CSSProperties } from 'react';
import { Crown, Guitar, Heart, Mic2, Music2, Piano, SlidersHorizontal } from 'lucide-react';
import { InstagramLogoIcon } from '@radix-ui/react-icons';
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

function Drumsticks({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 40 48" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" aria-hidden="true"><path d="m5 3 31 40-2 2L3 6C1 3 3 1 5 3Zm29 0L3 43l2 2L36 6c2-3 0-5-2-3Z" /><path d="m6 6 5 7m20-7-5 7" /></svg>;
}

function PassFrame({ variant }: { variant: number }) {
  const outlines = [
    'M3 20 30 9 87 5 119 7 208 2 235 21 238 96 235 165 239 283 235 354 222 382 126 397 65 393 19 384 3 365 6 296 2 189Z',
    'M4 25 24 11 87 7 123 5 217 2 231 18 239 62 235 142 238 226 232 363 213 388 129 397 77 393 22 398 4 380 8 304 3 186Z',
    'M3 19 24 7 104 4 156 8 212 2 237 25 234 101 239 142 234 226 237 357 218 383 141 397 78 391 24 397 3 379 7 291 2 174Z',
    'M4 26 27 9 95 4 132 7 218 1 235 22 238 105 234 162 238 244 234 361 214 387 133 397 63 394 23 399 3 377 7 282 2 174Z',
  ];
  return <svg className="hb-member__frame" viewBox="0 0 240 400" preserveAspectRatio="none" fill="none" aria-hidden="true">
    <path className="hb-member__frame-glow" d={outlines[variant]} />
    <path className="hb-member__frame-edge" d={outlines[variant]} />
    <path className="hb-member__frame-crease" d="m4 26 13-4-3-9 21-2M214 5l7 17 15 6-13 7 11 11M4 361l11-8-3 19 22 11-5 10m162-8 16-10 4 8 14-19 9 3M48 9l2 6-21 4m94 375 8-8 12 4 17-8" />
    <path className="hb-member__frame-scratch" d="m5 79 7 8-5 18m226 51-7 18 9 9m-8 117 8 19-9 11M8 307l7 15-5 17M63 7 80 9m-6 379 16 3" />
  </svg>;
}

export function HomeboundMemberCard({ member, index, icon, onSelect }: HomeboundMemberCardProps) {
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const category = icon ?? getHomeboundCategory(member);
  const variant = index % ACCENTS.length;
  const { instagram } = getHomeboundSocialLinks(member);
  const Decoration = member.is_featured ? Crown : category === 'vocals' ? (index % 2 ? Heart : Mic2)
    : category === 'guitars' ? Guitar : category === 'drums' ? Drumsticks : category === 'keys' ? Piano : category === 'beatbox' ? Mic2 : category === 'music' ? Music2 : SlidersHorizontal;
  const initials = member.name.trim().split(/\s+/).map(part => part[0]).slice(0, 2).join('');
  const showImage = Boolean(member.image?.trim()) && failedImage !== member.image;

  return (
    <article className="hb-member" data-variant={variant} data-instrument={category} data-featured={member.is_featured === true} style={{ '--member-accent': ACCENTS[variant] } as CSSProperties}>
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
      <PassFrame variant={variant} />
      {variant === 0 && <><span className="hb-member__tape" aria-hidden="true" /><span className="hb-member__tape hb-member__tape--lower" aria-hidden="true" /></>}
      <span className="hb-member__paper" aria-hidden="true" />
      {instagram && (
        <a className="hb-member__instagram" href={instagram} target="_blank" rel="noopener noreferrer" aria-label={`${member.name} on Instagram (opens in a new tab)`}>
          <span className="hb-member__instagram-mark"><InstagramLogoIcon aria-hidden="true" /></span>
        </a>
      )}
    </article>
  );
}
