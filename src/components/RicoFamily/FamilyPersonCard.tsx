import { useState } from 'react';
import { InstagramLogoIcon } from '@radix-ui/react-icons';
import { personInstagram, type FamilyPerson } from '../../utils/familyPeople';

export function FamilyPersonCard({ person, head = false, council = false }: { person: FamilyPerson; head?: boolean; council?: boolean }) {
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const instagram = personInstagram(person);
  const name = person.name || 'Name to be announced';
  return <article className={`family-person ${head ? 'family-person--head' : ''} ${council ? 'family-person--council' : ''}`}>
    <div className="family-person-photo">
      <div className="family-person-portrait">
        {person.image && failedImage !== person.image
          ? <img src={person.image} alt={name} loading="lazy" decoding="async" onError={() => setFailedImage(person.image)} />
          : <span aria-label={`Photo unavailable for ${name}`}>{name.split(/\s+/).map(word => word[0]).slice(0, 2).join('')}</span>}
      </div>
      {(head || council) && <span className="family-person-head-badge">{council ? 'Council' : 'Head'}</span>}
    </div>
    <div className="family-person-details">
      <h5>{name}</h5>
      {instagram && <a href={instagram.url} target="_blank" rel="noopener noreferrer" aria-label={`${name} on Instagram`}><InstagramLogoIcon aria-hidden="true" /> <span>{instagram.handle}</span></a>}
    </div>
  </article>;
}
