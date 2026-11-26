import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, type LucideIcon } from 'lucide-react';
import { BRAND_NAME, BRAND_YEAR } from '../constants/brand';
import { BrandMark } from './BrandMark';
import '../styles/StaffLogin.css';
import '../styles/StaffPortal.css';

type PortalIcon = LucideIcon;
interface Props {
  title: string;
  eyebrow: string;
  description: string;
  icon: PortalIcon;
  storyTitle: ReactNode;
  storyDescription: string;
  features: { icon: PortalIcon; label: string }[];
  footerLabel: string;
  children: ReactNode;
}

export function StaffPortalLayout({ title, eyebrow, description, icon: Icon, storyTitle, storyDescription, features, footerLabel, children }: Props) {
  return <div className="staff-login staff-portal">
    <div className="staff-login-background" aria-hidden="true" />
    <div className="staff-portal-layout">
      <aside className="staff-portal-story" aria-label={eyebrow}>
        <Link className="staff-portal-brand" to="/"><BrandMark allowCachedWhileLoading width={34} height={34} alt="" /><span>{BRAND_NAME}<small>{BRAND_YEAR} · IQ City</small></span></Link>
        <div className="staff-portal-story-copy">
          <p className="staff-login-portal-kicker"><span />Behind every great festival</p>
          <h2>{storyTitle}</h2>
          <p>{storyDescription}</p>
          <div className="staff-portal-features">{features.map(({ icon: FeatureIcon, label }) => <span key={label}><FeatureIcon size={18} />{label}</span>)}</div>
        </div>
        <p className="staff-portal-story-footer">Culture. Competition. Community.</p>
      </aside>
      <section className="staff-login-access" aria-labelledby="staff-portal-heading">
        <div className="staff-login-card">
          <Link className="staff-portal-back" to="/login"><ArrowLeft size={15} />All access roles</Link>
          <header className="staff-login-header">
            <div className="staff-portal-icon" aria-hidden="true"><Icon size={27} strokeWidth={1.5} /></div>
            <p className="staff-login-portal-kicker"><span />{eyebrow}</p>
            <h1 id="staff-portal-heading">{title}</h1>
            <p className="staff-login-heading-intro">{description}</p>
          </header>
          {children}
          <footer className="staff-portal-card-footer"><span><Check size={14} />{footerLabel}</span><span>{BRAND_NAME} {BRAND_YEAR}</span></footer>
        </div>
        <p className="staff-login-copyright">© {BRAND_YEAR} {BRAND_NAME} Fest Committee</p>
      </section>
    </div>
  </div>;
}
