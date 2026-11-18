import { useState } from 'react';
import { ProfileContactLinks } from './ProfileContactLinks';
import { personBatch, type FamilyPerson } from '../../utils/familyPeople';
import { PortraitFrame } from './PortraitFrame';

export function FamilyPersonCard({ person, head = false, council = false }: { person: FamilyPerson; head?: boolean; council?: boolean }) {
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const batch = personBatch(person);
  const name = person.name || 'Name to be announced';
  return <article className={`family-person ${head ? 'family-person--head' : ''} ${council ? 'family-person--council' : ''}`}>
    <PortraitFrame kind={council ? 'council' : head ? 'head' : 'member'}>
        {person.image && failedImage !== person.image
          ? <img src={person.image} alt={name} loading="lazy" decoding="async" onError={() => setFailedImage(person.image)} />
          : <span aria-label={`Photo unavailable for ${name}`}>{name.split(/\s+/).map(word => word[0]).slice(0, 2).join('')}</span>}
    </PortraitFrame>
    <div className="family-person-details">
      <h5>{name}</h5>
      {batch && <p className="family-profile-batch">Batch {batch}</p>}
      <ProfileContactLinks name={name} instagram={person.social_links?.instagram} phone={person.phone} showPhone={head || council} />
    </div>
  </article>;
}
