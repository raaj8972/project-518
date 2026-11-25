import { useMemo } from 'react';
import { useData } from '../context/DataContext';
import { SEO } from '../components/SEO';
import { BRAND_NAME, BRAND_YEAR } from '../constants/brand';
import { SponsorDirectory } from '../components/Sponsors/SponsorDirectory';
import { sponsorshipTeamContacts } from '../utils/sponsorshipContacts';
import { resolvePartnerCatalog } from '../utils/homepageContent';
import '../styles/SponsorDirectory.css';

export function Sponsors() {
  const { sponsors, homepageSettings, sponsorshipSettings, sponsorshipPackages, socialMediaSettings, coreCommittees, coreTeamMembers, loading, lastError, refreshAll } = useData();
  const year = Number(homepageSettings?.brand_year) || Number(BRAND_YEAR);
  const partners = useMemo(() => resolvePartnerCatalog(sponsors, homepageSettings?.sponsor_logos, year), [sponsors, homepageSettings?.sponsor_logos, year]);
  const teamContacts = useMemo(() => sponsorshipTeamContacts(coreCommittees, coreTeamMembers), [coreCommittees, coreTeamMembers]);
  return <>
    <SEO title="Sponsors" description={`Meet the partners who make ${BRAND_NAME} ${year} possible.`} canonical="https://ricorrenza.fun/sponsors" />
    <SponsorDirectory partners={partners} year={year} settings={sponsorshipSettings} packages={sponsorshipPackages}
      teamContacts={teamContacts} loading={loading} error={!partners.length ? lastError : null} onRetry={() => { void refreshAll(); }}
      instagramUrl={socialMediaSettings?.instagram_enabled ? socialMediaSettings.instagram_url || undefined : undefined} />
  </>;
}

export default Sponsors;
