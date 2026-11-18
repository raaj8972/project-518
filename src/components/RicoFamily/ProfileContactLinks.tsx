import { SocialBrandIcon } from './SocialBrandIcon';
import { facebookProfile, instagramProfile, phoneProfile } from '../../utils/familyPeople';
import '../../styles/FamilyContacts.css';

export function ProfileContactLinks({ name, instagram, facebook, phone, showFacebook = false, showPhone = false, compact = false }: {
  name: string; instagram?: unknown; facebook?: unknown; phone?: unknown; showFacebook?: boolean; showPhone?: boolean; compact?: boolean;
}) {
  const insta = instagramProfile(instagram), fb = facebookProfile(facebook), call = phoneProfile(phone);
  return <div className={`family-contact-links ${compact ? 'family-contact-links--compact' : ''}`} onClick={event => event.stopPropagation()}>
    {insta ? <a className="family-contact family-contact--instagram" href={insta.url} target="_blank" rel="noopener noreferrer" aria-label={`${name} on Instagram`} title={insta.handle}><SocialBrandIcon platform="instagram" /><span>{insta.handle}</span></a>
      : <span className="family-contact family-contact--instagram is-unavailable" aria-label={`${name}: Instagram not added`} title="Instagram profile not added"><SocialBrandIcon platform="instagram" /><span>Instagram</span></span>}
    {showFacebook && (fb ? <a className="family-contact family-contact--facebook" href={fb} target="_blank" rel="noopener noreferrer" aria-label={`${name} on Facebook`}><SocialBrandIcon platform="facebook" /><span>Facebook</span></a>
      : <span className="family-contact family-contact--facebook is-unavailable" aria-label={`${name}: Facebook not added`} title="Facebook profile not added"><SocialBrandIcon platform="facebook" /><span>Facebook</span></span>)}
    {showPhone && call && <a className="family-contact family-contact--phone" href={call.url} aria-label={`Call ${name}`} title={call.number}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.7 2z"/></svg><span>Call</span></a>}
  </div>;
}
