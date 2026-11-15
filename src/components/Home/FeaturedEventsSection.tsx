import { useReducedMotion } from 'framer-motion';
import { ArrowRightIcon, LightningBoltIcon, PersonIcon, SpeakerLoudIcon, StarIcon, MagicWandIcon } from '@radix-ui/react-icons';
import AutoCarousel from '../AutoCarousel';
import { FestivalSectionHeading } from './FestivalSectionHeading';
import '../../styles/FestivalSections.css';
import '../../styles/FestivalSpotlight.css';

interface Event {
  id: number;
  title: string;
  description: string;
  image: string;
  category?: string;
  featured: boolean;
  visible?: boolean;
}

function CategoryIcon({ category }: { category?: string }) {
  const value = category?.toLowerCase() || '';
  const Icon = /music|band|sing/.test(value) ? SpeakerLoudIcon : /fashion/.test(value) ? PersonIcon : /dance/.test(value) ? MagicWandIcon : StarIcon;
  return <Icon aria-hidden="true" />;
}

export default function FeaturedEventsSection({ featuredEvents, hasManyEvents }: { featuredEvents: Event[]; hasManyEvents: boolean }) {
  const reducedMotion = useReducedMotion();
  if (!featuredEvents.length) return null;
  return <section id="featured-events" className="festival-featured festival-spotlight" aria-labelledby="featured-events-title">
    <div className="festival-spotlight-content">
      <FestivalSectionHeading kind="events" />
      {hasManyEvents && <a className="festival-spotlight-browse" href="/events">View all events <ArrowRightIcon aria-hidden="true" /></a>}
      <AutoCarousel intervalMs={5000} paused={!!reducedMotion} pauseOnHover showArrows showDots showPause stopOnInteraction itemNavigation ariaLabel="Featured events" className="festival-spotlight-deck festival-event-deck">
        {featuredEvents.map(event => <article key={event.id} className="event-spotlight-card" data-spider-web>
          <div className="event-spotlight-inner">
            <div className="event-spotlight-image">
              {event.image ? <img src={event.image} alt={event.title} loading="lazy" decoding="async" onError={e => { e.currentTarget.hidden = true; }} /> : null}
              <div className="event-spotlight-placeholder" aria-hidden="true"><LightningBoltIcon /></div>
              <span className="event-spotlight-category"><CategoryIcon category={event.category} />{event.category || 'Event'}</span>
            </div>
            <div className="event-spotlight-copy"><h3>{event.title}</h3><span className="festival-card-rule" aria-hidden="true" /><p>{event.description}</p></div>
            <footer className="event-spotlight-footer"><span><PersonIcon aria-hidden="true" />By Committee</span><a href="/events" aria-label={`More about ${event.title}`}>More <ArrowRightIcon aria-hidden="true" /></a></footer>
          </div>
        </article>)}
      </AutoCarousel>
    </div>
  </section>;
}
