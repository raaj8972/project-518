'use client';

import { useId, useState, type CSSProperties } from 'react';
import { ArrowRightIcon, CheckCircledIcon } from '@radix-ui/react-icons';
import { Crown, Gem, Trophy, Medal, Star, Shield, ShieldCheck, Target, Zap, Sparkles, Megaphone, GraduationCap, Users, Handshake, Utensils, BadgeCheck, Rocket } from 'lucide-react';
import type { SponsorshipPackage } from '../../types/data';
import { sortSponsorshipPackages, sponsorshipPackageAccent } from '../../utils/sponsorshipPackages';
import { BrochureDownload } from './BrochureDownload';

const tierIcons = { Crown, Gem, Trophy, Medal, Star, Shield, ShieldCheck, Target, Zap, Sparkles, Megaphone, GraduationCap, Users, Handshake, Utensils, BadgeCheck, Rocket };

export function SponsorshipPackagesGrid({ packages, year, brochureUrl, brochureTitle, onEnquire }: { packages: SponsorshipPackage[]; year: number; brochureUrl?: string | null; brochureTitle?: string; onEnquire: (tier?: string) => void }) {
  const id = useId();
  const [expanded, setExpanded] = useState(false);
  const enabled = sortSponsorshipPackages(packages).filter(pkg => pkg.enabled);
  return <section className="sponsor-offers-section" id="sponsorship-packages" aria-labelledby={id}>
    <p className="sponsor-eyebrow">BECOME A PART OF RICORRENZA {year}</p>
    <div className="sponsor-section-heading"><span aria-hidden="true" /><h2 id={id}>Sponsorship Packages</h2><span aria-hidden="true" /></div>
    <p className="sponsor-section-subtitle">Find the right partnership for your brand. Let's build the celebration together.</p>
    {enabled.length ? <div className="sponsor-offers-grid" data-expanded={expanded}>{enabled.map((pkg, index) => {
      const Icon = tierIcons[pkg.icon as keyof typeof tierIcons] || Handshake;
      return <article className="sponsor-offer-card" key={pkg.id} style={{ '--tier-accent': sponsorshipPackageAccent(pkg.color), '--tier-index': index } as CSSProperties}>
        <div className="sponsor-offer-corners" aria-hidden="true" /><header><span className="sponsor-offer-number">{String(index + 1).padStart(2, '0')}</span><Icon strokeWidth={1.3} aria-hidden="true" /><h3>{pkg.tier}</h3><p>Ricorrenza {year}</p></header>
        <ul id={`${id}-benefits-${index}`}>{(pkg.benefits || []).filter(benefit => benefit.trim()).map((benefit, benefitIndex) => <li key={benefitIndex}><CheckCircledIcon aria-hidden="true" /><span>{benefit}</span></li>)}</ul>
        <button className="sponsor-benefits-toggle" type="button" aria-expanded={expanded} aria-controls={`${id}-benefits-${index}`} onClick={() => setExpanded(value => !value)}>{expanded ? 'Show less −' : 'Show all benefits +'}</button>
        <div className="sponsor-offer-bottom"><div className="sponsor-offer-price">{pkg.price}</div><button type="button" onClick={() => onEnquire(pkg.tier)} aria-label={`Enquire about ${pkg.tier}`}>Discuss this partnership<ArrowRightIcon /></button></div>
      </article>;
    })}</div> : <div className="sponsor-offers-empty"><Handshake strokeWidth={1.3} aria-hidden="true" /><h3>Your brand. Our next chapter.</h3><p>Speak with our sponsorship team about a partnership for {year}.</p><button type="button" className="sponsor-action" onClick={() => onEnquire()}>Talk to the team<ArrowRightIcon /></button></div>}
    <p className="sponsor-offers-note">Custom packages and in-kind partnerships are welcome.</p>
    <BrochureDownload url={brochureUrl} year={year} label={brochureTitle || 'Download sponsorship brochure'} />
  </section>;
}
