import React, { useId } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowTopRightIcon, CalendarIcon, ChevronRightIcon, Cross2Icon, DashboardIcon, GearIcon, HomeIcon, ImageIcon, InstagramLogoIcon, LockClosedIcon, PersonIcon, VideoIcon } from '@radix-ui/react-icons';
import { useFestivalDialog } from '../../hooks/useFestivalDialog';
import { eventLink } from '../../utils/eventPresentation';
import { BRAND_YEAR, DESIGNER_INSTAGRAM_URL } from '../../constants/brand';
import '../../styles/DoomNavigation.css';

const ART = '/images/doom-menu-reference.png';
export interface DrawerNavItem { name: string; path: string; onHover?: () => void }
interface Props {
  open: boolean;
  items: DrawerNavItem[];
  onClose: () => void;
  onNavigate: () => void;
  socialMediaSettings?: { instagram_enabled?: boolean | null; instagram_url?: string | null; youtube_enabled?: boolean | null; youtube_url?: string | null } | null;
}

function MenuIcon({ path }: { path: string }) {
  if (path === '/') return <HomeIcon />;
  if (path === '/schedule') return <CalendarIcon />;
  if (path === '/gallery') return <ImageIcon />;
  if (path === '/rico-family') return <PersonIcon />;
  if (path === '/dashboard' || path.startsWith('/student/')) return <DashboardIcon />;
  if (path === '/admin') return <GearIcon />;
  if (path === '/login') return <LockClosedIcon />;
  if (path === '/events') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 4c3 1 6 1 9 0v6c0 4-3 6-4.5 7C6 16 3 14 3 10V4Zm2 4 2 .5m2-.5 2-.5M5.5 12c1-1 2.5-1 3.5 0M13 6l7-1 1 6c.6 4-1.7 6.5-3.5 8-1.5-.5-3-1.7-4-3m1-7 2 .2m2-.7 2-.7M15.5 13c1 1 2.3.7 3.1-.4" /></svg>;
  if (path === '/home-bound') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 17V5l11-3v12M9 9l11-3" /><ellipse cx="5.5" cy="18" rx="3.5" ry="2.5" /><ellipse cx="16.5" cy="15" rx="3.5" ry="2.5" /></svg>;
  if (path === '/sponsors') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m2 9 4-5 4 2 4-1 8 5-4 9-4 2-8-5-4-7Zm8-3-3 5 3 2 3-3 6 6M3 12l3-4m12-1 3 5M8 17l2-3m1 5 2-3m1 5 2-3" /></svg>;
  return <DashboardIcon />;
}

/** Original illustration stays raster; the spell and all navigation are live elements. */
function MenuArtwork() {
  return <div className="doom-artwork" aria-hidden="true">
    <svg className="doom-artwork-image" viewBox="0 0 590 395"><image href={ART} width="941" height="1672" /></svg>
    <div className="doom-hand-spell"><span className="doom-spell-core" /><svg className="doom-spell-ring doom-spell-ring--outer" viewBox="0 0 100 100" fill="none"><circle cx="50" cy="50" r="43" stroke="currentColor" strokeWidth="1" strokeDasharray="42 6 3 6 18 10" /><path d="m50 3 3 6-3 4-3-4 3-6Zm47 47-6 3-4-3 4-3 6 3ZM50 97l-3-6 3-4 3 4-3 6ZM3 50l6-3 4 3-4 3-6-3Z" stroke="currentColor" strokeWidth=".8" /></svg><svg className="doom-spell-ring doom-spell-ring--inner" viewBox="0 0 100 100" fill="none"><circle cx="50" cy="50" r="33" stroke="currentColor" strokeWidth="1.5" strokeDasharray="58 22 12 12" /><path d="M25 38c19-33 59-7 43 17-11 17-31 10-24-4 4-8 13-1 7 3" stroke="currentColor" strokeWidth="1.5" /></svg><span className="doom-spell-haze" /></div>
  </div>;
}

function DrawerContent({ items, onClose, onNavigate, socialMediaSettings }: Omit<Props, 'open'>) {
  const reduceMotion = useReducedMotion();
  const titleId = useId();
  const ref = useFestivalDialog(true, onClose);
  const location = useLocation();
  const socials = [
    { name: 'Rico Instagram', label: 'Rico', enabled: socialMediaSettings?.instagram_enabled, url: eventLink(socialMediaSettings?.instagram_url), icon: InstagramLogoIcon },
    { name: 'YouTube', label: 'YouTube', enabled: socialMediaSettings?.youtube_enabled, url: eventLink(socialMediaSettings?.youtube_url), icon: VideoIcon },
  ].filter(social => social.enabled && social.url);
  return <motion.div className="doom-menu-layer" initial="closed" animate="open" exit="closed" data-doom-menu>
    <motion.button type="button" tabIndex={-1} className="doom-menu-backdrop" aria-label="Close navigation menu" onClick={onClose} variants={{ open: { opacity: 1 }, closed: { opacity: 0 } }} transition={{ duration: reduceMotion ? 0 : .3 }} />
    <div className="doom-opening-wave" aria-hidden="true" />
    <motion.div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId} id="festival-mobile-menu" className="doom-drawer" data-lenis-prevent variants={{ open: { x: 0, opacity: 1, transition: { duration: reduceMotion ? 0 : .65, ease: [.16, 1, .3, 1] } }, closed: { x: reduceMotion ? 0 : '-104%', opacity: reduceMotion ? 0 : .6, transition: { duration: reduceMotion ? 0 : .3, ease: [.4, 0, 1, 1] } } }}>
      <h2 className="sr-only" id={titleId}>Ricorrenza {BRAND_YEAR} navigation</h2>
      <button type="button" className="doom-close" aria-label="Close menu" onClick={onClose}><Cross2Icon /></button>
      <div className="doom-scroll" data-lenis-prevent>
        <MenuArtwork />
        <nav className="doom-links" aria-label="Main navigation">{items.map((item, index) => {
          const isDashboard = item.path === '/dashboard' || item.path.startsWith('/student/');
          const locked = item.path.startsWith('/student/');
          const label = isDashboard ? 'Dashboard' : item.path === '/home-bound' ? 'Homebound' : item.name;
          const active = location.pathname === item.path;
          return <Link key={item.path} to={item.path} onClick={onNavigate} onMouseEnter={item.onHover} aria-current={active ? 'page' : undefined} className={`doom-nav-link ${active ? 'is-active' : ''}`} style={{ '--doom-item': index } as React.CSSProperties}>
            <span className="doom-link-energy" aria-hidden="true" />
            <span className="doom-link-portrait" aria-hidden="true" />
            <span className="doom-nav-icon" aria-hidden="true"><MenuIcon path={item.path} /></span><span className="doom-nav-label">{label}</span>{locked ? <LockClosedIcon className="doom-link-end" aria-label="Sign in to access your dashboard" /> : <ChevronRightIcon className="doom-link-end" aria-hidden="true" />}
          </Link>;
        })}</nav>
        <div className="doom-bottom-art" aria-hidden="true"><svg viewBox="0 1148 590 345"><image href={ART} width="941" height="1672" /></svg><span /></div>
        <footer className="doom-menu-footer">
          {socials.length > 0 && <nav className="doom-socials" aria-label="Festival social accounts">{socials.map(social => { const Icon = social.icon; return <a key={social.name} href={social.url} target="_blank" rel="noopener noreferrer" aria-label={social.name} title={social.name}><Icon /><span>{social.label}</span></a>; })}</nav>}
          <p>IQ CITY MEDICAL COLLEGE HOSPITAL</p><span className="doom-location"><i />DURGAPUR<i /></span>
          <div className="doom-designer-credit"><span>DESIGNED BY</span><a href={DESIGNER_INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" aria-label="Raaj on Instagram"><InstagramLogoIcon /><strong>RAAJ</strong><ArrowTopRightIcon /></a></div>
        </footer>
      </div>
      <div className="doom-edge-light" aria-hidden="true" />
      <div className="doom-embers" aria-hidden="true">{Array.from({ length: 10 }, (_, index) => <i key={index} style={{ '--ember': index } as React.CSSProperties} />)}</div>
    </motion.div>
  </motion.div>;
}

export function DoomNavigationDrawer({ open, ...props }: Props) {
  if (typeof document === 'undefined') return null;
  return createPortal(<AnimatePresence>{open && <DrawerContent key="doom-navigation" {...props} />}</AnimatePresence>, document.body);
}
