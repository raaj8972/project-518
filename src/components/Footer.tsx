import { memo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRightIcon, ArrowTopRightIcon, ArrowUpIcon, InstagramLogoIcon, VideoIcon } from '@radix-ui/react-icons';
import { useData } from '../context/DataContext';
import { BRAND_NAME, BRAND_YEAR, COPYRIGHT_YEAR, DESIGNER_INSTAGRAM_URL } from '../constants/brand';
import { SITE_FEATURES } from '../constants/siteFeatures';
import { FestivalCrown } from './Home/FestivalSectionHeading';
import '../styles/FestivalFooter.css';

const EXPLORE_LINKS = [
  { label: 'Home', to: '/' },
  { label: 'Events', to: '/events' },
  { label: 'Schedule', to: '/schedule' },
  { label: 'Gallery', to: '/gallery' },
];
const FESTIVAL_LINKS = [
  { label: 'Home Bound', to: '/home-bound' },
  { label: 'Rico Family', to: '/rico-family' },
  { label: 'Our partners', to: '/sponsors' },
  ...(SITE_FEATURES.sports ? [{ label: 'Sports', to: '/sports' }] : []),
];

export const Footer = memo(function Footer() {
  const { socialMediaSettings, homepageSettings } = useData();
  const { pathname } = useLocation();
  const isHomeBound = pathname === '/home-bound' || pathname.startsWith('/home-bound/');
  if (pathname.startsWith('/admin') || pathname.startsWith('/security-') || pathname.startsWith('/coordinator/dashboard') || pathname.startsWith('/dashboard')) return null;
  // Homebound includes its own compact music-page footer beneath the journey.
  if (isHomeBound) return null;

  const socials = isHomeBound ? [] : [
    ...(socialMediaSettings?.instagram_enabled && socialMediaSettings.instagram_url ? [{ label: 'Instagram', href: socialMediaSettings.instagram_url, Icon: InstagramLogoIcon }] : []),
    ...(socialMediaSettings?.youtube_enabled && socialMediaSettings.youtube_url ? [{ label: 'YouTube', href: socialMediaSettings.youtube_url, Icon: VideoIcon }] : []),
  ];
  const logo = homepageSettings?.brand_logo_url || '/images/ricorrenza-medical-mark.svg';
  const navigation = (links: typeof EXPLORE_LINKS) => <ul>{links.map(link => <li key={link.to}><Link to={link.to} aria-current={pathname === link.to ? 'page' : undefined}>{link.label}<ArrowTopRightIcon aria-hidden="true" /></Link></li>)}</ul>;

  return <footer className="festival-footer" aria-label="Festival footer">
    <div className="festival-footer__atmosphere" aria-hidden="true" />
    <div className="festival-footer__content">
      <div className="festival-footer__ornament" aria-hidden="true"><span /><FestivalCrown /><span /></div>
      <div className="festival-footer__welcome">
        <p>Made of moments.<br /><em>Remembered together.</em></p>
        <Link className="festival-footer__events-link" to="/events">Find your next experience <ArrowRightIcon aria-hidden="true" /></Link>
      </div>
      <div className="festival-footer__grid">
        <div className="festival-footer__identity">
          <Link className="festival-footer__brand" to="/" aria-label={`${BRAND_NAME} ${BRAND_YEAR} home`}><img src={logo} alt="" width="42" height="48" loading="lazy" /><span>{BRAND_NAME}<small>{BRAND_YEAR} · The annual celebration</small></span></Link>
          <p>Culture, creativity and a campus<br className="festival-footer__desktop-break" /> full of stories worth sharing.</p>
          <div className="festival-footer__location"><span aria-hidden="true" />IQ City Medical College<span>Durgapur, West Bengal</span></div>
        </div>
        <nav className="festival-footer__nav" aria-label="Explore the festival"><h2>Explore</h2>{navigation(EXPLORE_LINKS)}</nav>
        <nav className="festival-footer__nav" aria-label="Meet Ricorrenza"><h2>The festival</h2>{navigation(FESTIVAL_LINKS)}</nav>
        <div className="festival-footer__connect">
          <h2>{socials.length ? 'Stay connected' : 'Be part of it'}</h2>
          {socials.length > 0 ? <><p>A little closer to the celebration.</p><div className="festival-footer__socials">{socials.map(({ label, href, Icon }) => <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={`Ricorrenza on ${label} (opens in a new tab)`}><Icon aria-hidden="true" /><span>{label}</span><ArrowTopRightIcon aria-hidden="true" /></a>)}</div></> : <><p>Find your people.<br />Make your memories.</p><Link className="festival-footer__family-link" to="/rico-family">Meet the Rico Family<ArrowTopRightIcon aria-hidden="true" /></Link></>}
        </div>
      </div>
      <Link className="festival-footer__wordmark" to="/" aria-label={`${BRAND_NAME} home`}>{BRAND_NAME}<span aria-hidden="true">{BRAND_YEAR}</span></Link>
      <div className="festival-footer__bottom">
        <p>© {BRAND_YEAR}–{COPYRIGHT_YEAR} {BRAND_NAME}<span>All rights reserved.</span></p>
        <a className="festival-footer__credit" href={DESIGNER_INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">Crafted by <strong>RAAJ</strong><ArrowTopRightIcon aria-hidden="true" /></a>
        <a className="festival-footer__top" href="#main-content">Back to top<ArrowUpIcon aria-hidden="true" /></a>
      </div>
    </div>
  </footer>;
});

export default Footer;
