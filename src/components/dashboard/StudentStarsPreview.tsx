import { Link } from 'react-router-dom';
import { ArrowRightIcon, StarIcon } from '@radix-ui/react-icons';
import { useTopStars } from '../../hooks/useTopStars';

export default function StudentStarsPreview() {
  const { stars, loading, error, refetch } = useTopStars(3);
  return <section className="sd-panel sd-stars">
    <div className="sd-section-heading">
      <h2>
        <StarIcon /> Rico Stars</h2>
      <Link to="/dashboard/community">Community <ArrowRightIcon />
      </Link>
    </div>
    <p className="sd-section-description">A little recognition. A lot of festival spirit.</p>
    {loading ? <div className="sd-skeleton sd-skeleton-row" aria-label="Loading community stars" /> : error ? <div className="sd-inline-empty">
      <p>Community could not load.</p>
      <button className="sd-text-button" onClick={() => void refetch()}>Try again</button>
    </div> : stars.some(star => star.rank > 0) ? <ol className="sd-stars-list">
      {stars.filter(star => star.rank > 0).map((star) => <li key={star.id}>
        <Link to="/dashboard/community">
          <span className="sd-star-rank">
            {String(star.rank).padStart(2, '0')}
          </span>
          <span className="sd-avatar">
            {star.avatar_url ? <img src={star.avatar_url} alt="" loading="lazy" /> : star.full_name?.slice(0, 1)}
          </span>
          <span>
            <strong>
              {star.full_name}
            </strong>
            <small>
              {star.batch || 'Festival community'}
            </small>
          </span>
          <ArrowRightIcon />
        </Link>
      </li>)}
    </ol> : <div className="sd-inline-empty">
      <StarIcon />
      <div>
        <strong>The stage is yours.</strong>
        <p>Join events and meet the festival community.</p>
      </div>
    </div>}
    <Link className="sd-community-link" to="/dashboard/community">Meet your fellow Ricoians <ArrowRightIcon />
    </Link>
  </section>;
}
