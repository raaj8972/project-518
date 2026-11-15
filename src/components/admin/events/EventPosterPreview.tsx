import { EventPoster } from '../../Events/EventPoster';
import { EVENT_POSTER_GUIDE } from '../../../utils/eventPresentation';

/** Exactly the same poster component visitors see, with live form values. */
export function EventPosterPreview({ event }: { event: any }) {
  return <section className="arena-studio-preview" aria-label="Live event card preview"><p className="arena-eyebrow">PUBLIC EVENT CARD / LIVE PREVIEW</p><EventPoster event={event} /><p><strong>{EVENT_POSTER_GUIDE}</strong><br />Use a text-free cinematic image. Keep the subject in the upper half or toward the right. The title, category, date and venue are added automatically over the lower fade.</p></section>;
}
