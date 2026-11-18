import { useId } from 'react';
import DOMPurify from 'dompurify';
import { ArrowTopRightIcon } from '@radix-ui/react-icons';
import { Link } from 'react-router-dom';
import { BRAND_NAME, BRAND_YEAR } from '../../constants/brand';
import { FestivalCrown, FestivalLaurel } from './FestivalSectionHeading';
import '../../styles/FestivalAbout.css';

interface AboutSettings {
  enabled: boolean;
  hero_title?: string | null;
  hero_heading?: string | null;
  hero_paragraphs?: string[];
  tracks?: string[];
  zones?: string[];
  stats?: { value: string; label: string }[];
  tracksLabel?: string | null;
  zonesLabel?: string | null;
}

const DEFAULT_PARAGRAPHS = [
  `${BRAND_NAME} brings the campus of IQ City Medical College together through music, art, culture and competition.`,
  'From the first performance to the final encore, it is a celebration of the people, ideas and friendships that make our college our own.',
];

export default function AboutSection({ aboutSettings }: { aboutSettings: AboutSettings | null }) {
  const id = useId();
  if (aboutSettings?.enabled !== true) return null;
  const paragraphs = aboutSettings.hero_paragraphs?.filter(paragraph => paragraph.trim()) || [];
  const stats = aboutSettings.stats?.filter(stat => stat.value.trim() && stat.label.trim()) || [];
  const features = [
    { title: aboutSettings.tracksLabel || 'Festival tracks', items: aboutSettings.tracks?.length ? aboutSettings.tracks : ['Music & live performances', 'Art & creative expression', 'Culture & competition', 'Campus experiences'] },
    { title: aboutSettings.zonesLabel || 'Experience zones', items: aboutSettings.zones?.length ? aboutSettings.zones : ['The main stage', 'Creative showcases', 'Campus celebrations', 'Community & connection'] },
  ];

  return <section id="about" className="festival-about" aria-labelledby={`${id}-title`}>
    <div className="festival-about__atmosphere" aria-hidden="true" />
    <div className="festival-about__content">
      <div className="festival-about__chapter" aria-hidden="true"><span>The heart of the festival</span><i /><span>Est. 2015</span></div>
      <div className="festival-about__introduction">
        <div className="festival-about__story">
          <p className="festival-about__eyebrow"><FestivalCrown /> Our story. Our people. Our celebration.</p>
          <h2 id={`${id}-title`}>{aboutSettings.hero_title || 'About Ricorrenza'}</h2>
          <div className="festival-about__rule" aria-hidden="true"><span /><i /><span /></div>
          <h3>{aboutSettings.hero_heading || 'A campus. A culture. A thousand memories.'}</h3>
          <div className="festival-about__prose">
            {(paragraphs.length ? paragraphs : DEFAULT_PARAGRAPHS).map((paragraph, index) => <p key={index} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(paragraph, { USE_PROFILES: { html: true } }) }} />)}
          </div>
          <Link className="festival-about__story-link" to="/rico-family">Meet the people behind it <ArrowTopRightIcon aria-hidden="true" /></Link>
        </div>
        <div className="festival-about__emblem" aria-label={`Ricorrenza ${BRAND_YEAR}, IQ City Medical College, Durgapur`}>
          <div className="festival-about__seal">
            <svg className="festival-about__seal-rings" viewBox="0 0 400 400" fill="none" aria-hidden="true">
              <circle cx="200" cy="200" r="186" stroke="currentColor" strokeWidth=".8" />
              <circle cx="200" cy="200" r="177" stroke="currentColor" strokeWidth=".5" strokeDasharray="1 7" />
              <circle cx="200" cy="200" r="157" stroke="currentColor" strokeWidth=".7" />
              <path d="M200 2v27M200 371v27M2 200h27M371 200h27" stroke="currentColor" />
              {[45,135,225,315].map(angle => <path key={angle} d="m200 8 4 9-4 9-4-9Z" fill="currentColor" transform={`rotate(${angle} 200 200)`} />)}
            </svg>
            <p className="festival-about__seal-caption">Medicine at heart · Culture in motion</p>
            <div className="festival-about__crest"><FestivalLaurel /><img src="/images/ricorrenza-medical-mark.svg" alt="" width="90" height="110" loading="lazy" /><FestivalLaurel /></div>
            <p className="festival-about__seal-name">{BRAND_NAME}</p>
            <span className="festival-about__seal-year">{BRAND_YEAR}</span>
            <p className="festival-about__seal-place">IQ City Medical College<span>Durgapur</span></p>
          </div>
          <p className="festival-about__emblem-caption"><span /> Many talents. One Ricorrenza. <span /></p>
        </div>
      </div>
      <div className="festival-about__experiences">
        {features.map((feature, index) => <div className="festival-about__experience" key={index}>
          <span className="festival-about__index" aria-hidden="true">0{index + 1}</span>
          <div><h3>{feature.title}</h3><ul>{feature.items.filter(item => item.trim()).map((item, itemIndex) => <li key={itemIndex}><span aria-hidden="true">◇</span>{item}</li>)}</ul></div>
        </div>)}
      </div>
      {stats.length > 0 && <dl className="festival-about__stats" aria-label="Festival at a glance">{stats.map((stat, index) => <div key={index}><dt>{stat.label}</dt><dd>{stat.value}</dd></div>)}</dl>}
    </div>
  </section>;
}
