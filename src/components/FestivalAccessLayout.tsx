import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, HeartPulse, ShieldCheck, type LucideIcon } from 'lucide-react';
import { BRAND_NAME, BRAND_YEAR } from '../constants/brand';
import '../styles/StaffLogin.css';
import '../styles/CouncilLogin.css';

interface Props {
  title: string;
  eyebrow: string;
  description: string;
  sectionLabel: string;
  accessLabel: string;
  footerLabel: string;
  icon: LucideIcon;
  children: ReactNode;
}

export function FestivalAccessLayout({ title, eyebrow, description, sectionLabel, accessLabel, footerLabel, icon: Icon, children }: Props) {
  return (
    <main className="staff-login council-festival">
      <div className="staff-login-background" aria-hidden="true" />
      <div className="council-festival-shell">
        <header className="council-festival-brand">
          <Link to="/" className="council-college" aria-label="IQ City Medical College Hospital, home">
            <HeartPulse size={34} strokeWidth={1.5} />
            <span><strong>IQ CITY</strong><small>MEDICAL COLLEGE HOSPITAL</small></span>
          </Link>
          <div className="council-festival-title" aria-label={`${BRAND_NAME} ${BRAND_YEAR}`}>
            <p>Ricorren<span>Z</span>a</p>
            <div className="council-festival-year"><span />{BRAND_YEAR}<span /></div>
            <div className="council-festival-caption">THE ANNUAL CULTURAL FEST</div>
          </div>
        </header>
        <section className="council-access" aria-labelledby="festival-access-heading">
          <Link to="/login" className="council-back"><ArrowLeft size={16} />Admin gateway</Link>
          <p className="council-eyebrow"><span />{eyebrow}</p>
          <h1 id="festival-access-heading">{title}</h1>
          <p className="council-intro">{description}</p>
          <div className="council-section-label"><span><Icon size={19} />{sectionLabel}</span><span><ShieldCheck size={15} />{accessLabel}</span></div>
          {children}
          <div className="council-panel-footer"><span>{footerLabel}</span><span>{BRAND_NAME} {BRAND_YEAR}</span></div>
        </section>
        <footer className="council-footer">© {BRAND_YEAR} {BRAND_NAME} Fest Committee</footer>
      </div>
    </main>
  );
}
