import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowTopRightIcon, ChatBubbleIcon, ChevronRightIcon, HeartFilledIcon, HeartIcon, MagnifyingGlassIcon, StarIcon } from '@radix-ui/react-icons';
import { useTopStars, type TopStarProfile } from '../../hooks/useTopStars';
import { useXPEngine } from '../../hooks/useXPEngine';
import { useStudentAuth } from '../../context/StudentAuthContext';
import { supabase } from '../../lib/supabase';
import ProfileModal from '../../components/dashboard/ProfileModal';

export default function Community() {
  const [params,setParams] = useSearchParams();
  const crowd=params.get('view')==='crowd';
  const requestedYear=Number(params.get('year'))||undefined;
  const { stars, editions, year, loading, error, refetch, updateStar } = useTopStars(Number.POSITIVE_INFINITY, crowd?'likes':'points',requestedYear);
  const { user } = useStudentAuth();
  const { likeProfile } = useXPEngine();
  const [search, setSearch] = useState('');
  const [batch, setBatch] = useState('All');
  const [selected, setSelected] = useState<TopStarProfile | null>(null);
  const [likes, setLikes] = useState<Set<string>>(new Set());
  const [pendingLike, setPendingLike] = useState<string | null>(null);
  const likeLock = useRef(false);
  const [visibleCount, setVisibleCount] = useState(30);
  useEffect(() => {
    if (!user) return;
    let active = true;
    const load = async () => {
      const { data } = await supabase.from('profile_likes').select('profile_id').eq('liker_id', user.id);
      if (active && data) setLikes(new Set(data.map(like => like.profile_id)));
    };
    void load();
    const channel = supabase.channel('student-community-likes').on('postgres_changes', { event: '*', schema: 'public', table: 'profile_likes', filter: `liker_id=eq.${user.id}` }, () => void load()).subscribe();
    return () => { active = false; void supabase.removeChannel(channel); };
  }, [user]);
  useEffect(() => { setVisibleCount(30); }, [search, batch, crowd, requestedYear]);
  const batches = useMemo(() => [...new Set(stars.map(star => star.batch).filter(Boolean))] as string[], [stars]);
  const filtered = stars.filter(star => (batch === 'All' || star.batch === batch) && `${star.full_name} ${star.batch || ''}`.toLowerCase().includes(search.trim().toLowerCase()));
  const like = async (id: string) => {
    if (!user || likeLock.current || id === user.id) return;
    likeLock.current = true;
    setPendingLike(id);
    try {
      const result = await likeProfile(id);
      if (result === 'liked' || result === 'unliked') {
        setLikes(previous => { const next = new Set(previous); if (result === 'liked') next.add(id); else next.delete(id); return next; });
        updateStar(id, result === 'liked' ? 1 : -1);
      }
    } finally { likeLock.current = false; setPendingLike(null); }
  };
  return <div className="sd-community-page">
    <div className="sd-page-heading">
      <div>
        <p className="sd-eyebrow">THE PEOPLE MAKE THE FESTIVAL</p>
        <h1>Your kind of community<span className="sd-heading-dot">.</span>
        </h1>
        <p>Meet the Ricoians taking part. Give someone a little recognition.</p>
      </div>
      <Link className="sd-button sd-button-secondary" to="/dashboard/vibes">
        <ChatBubbleIcon /> Shoutouts <ArrowTopRightIcon />
      </Link>
    </div>
    <section className="sd-community-intro">
      <StarIcon />
      <div>
        <h2>Rico Stars</h2>
        <p>Celebrating participation, talent, and a little community love.</p>
      </div>
      <span>R POINTS LEADERBOARD</span>
    </section>
    <div className="sd-score-controls"><div className="sd-chips"><button aria-pressed={!crowd} onClick={()=>setParams({...Object.fromEntries(params),view:'performance'})}>Rico Stars · Performance</button><button aria-pressed={crowd} onClick={()=>setParams({...Object.fromEntries(params),view:'crowd'})}>Crowd Favourite · Likes</button></div><label>Festival edition<select value={requestedYear||year||''} onChange={event=>setParams({...Object.fromEntries(params),year:event.target.value})}>{(editions||[]).map(edition=><option key={edition} value={edition}>{edition}{edition===year&&!requestedYear?' · current':''}</option>)}</select></label><Link to="/dashboard/guide#points">How to earn points</Link></div>
    <p className="sd-guide-intro">{crowd?'Likes are community recognition and do not add competitive R Points.':'Your best three verified event scores count. Equal scores share a rank; likes do not change it.'}</p>
    <div className="sd-community-filters">
      <div className="sd-search">
        <MagnifyingGlassIcon />
        <label htmlFor="community-search" className="sr-only">Search students</label>
        <input id="community-search" type="search" placeholder="Search a name or batch…" value={search} onChange={event => setSearch(event.target.value)} />
      </div>
      <label className="sd-batch-filter">Batch<select value={batch} onChange={event => setBatch(event.target.value)}>
        <option value="All">All batches</option>
        {batches.map(value => <option key={value}>
          {value}
        </option>)}
      </select>
      </label>
    </div>
    {loading ? <div className="sd-skeleton sd-skeleton-block" aria-label="Loading community" /> : error ? <div className="sd-error" role="alert">
      <span>The community could not load.</span>
      <button onClick={() => void refetch()}>Try again</button>
    </div> : filtered.length ? <section className="sd-panel sd-leaderboard">
      <div className="sd-leaderboard-heading">
        <span>{crowd?'RECOGNITION / STUDENT':'RANK / STUDENT'}</span>
        <span>{crowd?'LIKES':'R POINTS'}</span>
      </div>
      <ol>
        {filtered.slice(0, visibleCount).map(star => <li key={star.id}>
          <button className="sd-leaderboard-person" onClick={() => setSelected(star)}>
            <span className={`sd-leaderboard-rank${star.rank > 0 && star.rank <= 3 ? ' is-top' : ''}`}>
              {crowd ? (star.likes_count>0?String(1+stars.filter(other=>other.likes_count>star.likes_count).length).padStart(2,'0'):'—') : star.rank>0?String(star.rank).padStart(2,'0'):'—'}
            </span>
            <span className="sd-avatar">
              {star.avatar_url ? <img src={star.avatar_url} alt="" loading="lazy" /> : star.full_name.slice(0, 1)}
            </span>
            <span>
              <strong>
                {star.full_name}{user?.id === star.id && <small className="sd-you">You</small>}
              </strong>
              <small>
                {star.batch || 'Festival community'}
              </small>
            </span>
          </button>
          <strong className="sd-rpoints">
            {(crowd?star.likes_count:star.hype_score).toLocaleString('en-IN')}
          </strong>
          <button className="sd-like-button" aria-label={`${likes.has(star.id) ? 'Unlike' : 'Like'} ${star.full_name}`} aria-pressed={likes.has(star.id)} disabled={!!pendingLike || star.id === user?.id} onClick={() => void like(star.id)}>
            {likes.has(star.id) ? <HeartFilledIcon /> : <HeartIcon />}<span>
              {star.likes_count}
            </span>
          </button>
          <button className="sd-profile-peek" aria-label={`View ${star.full_name}`} onClick={() => setSelected(star)}>
            <ChevronRightIcon />
          </button>
        </li>)}
      </ol>
      {filtered.length > visibleCount && <button className="sd-button sd-button-secondary sd-load-more" onClick={() => setVisibleCount(count => count + 30)}>Show more students</button>}
    </section> : <div className="sd-panel sd-empty">
      <span className="sd-empty-icon">
        <StarIcon />
      </span>
      <h2>
        {search || batch !== 'All' ? 'No matching students.' : 'You could be the first star.'}
      </h2>
      <p>
        {search || batch !== 'All' ? 'Try another name or choose all batches.' : 'Join an event and help bring this community to life.'}
      </p>
    </div>}
    <ProfileModal profile={selected ? stars.find(star => star.id === selected.id) || selected : null} onClose={() => setSelected(null)} onLike={like} isLiked={!!selected && likes.has(selected.id)} />
  </div>;
}
