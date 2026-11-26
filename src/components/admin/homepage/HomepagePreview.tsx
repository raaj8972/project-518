import { lazy, memo, Suspense, useContext, useMemo, useState } from 'react';
import { UNSAFE_LocationContext } from 'react-router-dom';
import { DataPreviewProvider, useData } from '../../../context/DataContext';
import { FestivalSceneProvider } from '../../ui/festival/FestivalSceneReadiness';
import { WebsitePreviewFrame } from '../layout/WebsitePreviewFrame';
import { serializeHomepageDraft, type HomepageDraft, type HomepageSection } from './homepageForm';
import type { SocialDraft } from './HomepageSocialEditor';
import type { RoadmapItemDraft } from '../../../utils/homepageRoadmap';
import type { Sponsor, DataContextType } from '../../../types/data';
import type { AboutDraft } from './HomepageAboutEditor';
import type { LeadDraft } from './LeadEditor';
import type { HeroMediaV2 } from '../../../services/heroMediaService';
const PublicHome = lazy(() => import('../../../pages/Home').then(module => ({ default: module.Home })));
const PublicNavbar = lazy(() => import('../../Navbar'));
const PublicFooter = lazy(() => import('../../Footer'));
interface PreviewPerson { id?: number | string; name?: string; full_name?: string; photo_url?: string | null; image_url?: string | null; image?: string | null; enabled?: boolean; }
interface Props {
  form: HomepageDraft;
  activeSection: HomepageSection;
  onSelectSection: (section: HomepageSection) => void;
  faculty?: PreviewPerson[];
  heads?: PreviewPerson[];
  sponsors?: Sponsor[];
  mediaOverride?: HeroMediaV2 | null;
  mediaPending?: boolean;
  about?: AboutDraft | null;
  leadOverrides?: LeadDraft[];
  social?:SocialDraft|null;
  roadmapItems?:RoadmapItemDraft[];
  dirty: boolean;
}

function HomepagePreviewView({ form, activeSection, dirty, about, leadOverrides = [], social, roadmapItems = [] }: Props) {
  const live = useData();
  const locationContext = useContext(UNSAFE_LocationContext);
  const [mobile, setMobile] = useState(false);
  const overrides = useMemo<Partial<DataContextType>>(() => ({
    homepageSettings: { ...live.homepageSettings, ...serializeHomepageDraft(form) } as DataContextType['homepageSettings'],
    aboutSettings: about ? { id: -1, updated_at: null, ...live.aboutSettings, ...about } : live.aboutSettings,
    socialMediaSettings: social ? { id: -1, created_at: '', updated_at: '', ...live.socialMediaSettings, ...social } : live.socialMediaSettings,
    roadmapMilestones: roadmapItems.map((item, index) => ({ ...item, id: item.id ?? -(index + 1), created_at: '', updated_at: '' })),
    facultyHeads: (live.facultyHeads || []).map(person => {
      const edit = leadOverrides.find(item => item.kind === 'faculty' && item.id === person.id);
      return edit ? { ...person, ...edit, title: edit.role } : person;
    }),
    coreTeamMembers: (live.coreTeamMembers || []).map(person => {
      const edit = leadOverrides.find(item => item.kind !== 'faculty' && item.id === person.id);
      return edit ? { ...person, ...edit } : person;
    }),
  }), [live.homepageSettings, live.aboutSettings, live.socialMediaSettings, live.facultyHeads, live.coreTeamMembers, form, about, social, roadmapItems, leadOverrides]);
  return <aside className="studio-preview studio-preview--actual" aria-label="Homepage draft preview">
    <WebsitePreviewFrame title="/ · Actual homepage" mobile={mobile} onMobileChange={setMobile} dirty={dirty} readOnly focusSelector={({ content: '.spider-hero', branding: 'nav', about: '#about', roadmap: '#roadmap', partners: '.festival-partners', people: '.home-leadership', social: '.festival-footer', films: '[data-homepage-film]' } as Partial<Record<HomepageSection, string>>)[activeSection]}>
      <UNSAFE_LocationContext.Provider value={{ ...locationContext, location: { ...locationContext.location, pathname: '/', search: '', hash: '' } }}>
        <DataPreviewProvider overrides={overrides}><FestivalSceneProvider required={false}>
          <style>{'.gsap-fade-up,.scroll-animate,.scroll-animate-3d{opacity:1!important;visibility:visible!important;transform:none!important}.studio-public-home{pointer-events:none}'} </style>
          <Suspense fallback={<p style={{ padding: 25 }}>Loading the actual homepage…</p>}>
            <div className="studio-public-home"><PublicNavbar /><PublicHome preview={{ mobile }} /><PublicFooter /></div>
          </Suspense>
        </FestivalSceneProvider></DataPreviewProvider>
      </UNSAFE_LocationContext.Provider>
    </WebsitePreviewFrame>
    <p className="studio-preview-footnote">The actual homepage, with your unsaved changes. Scroll to compare its sections. The cinematic entry plays on the public website.</p>
    <span className="sr-only">Editing {activeSection}</span>
  </aside>;
}
export const HomepagePreview = memo(HomepagePreviewView);
