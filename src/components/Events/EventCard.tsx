import React from 'react';
import { Calendar, MapPin, Clock, Users, UserPlus, FileText, AlertCircle, Phone, ChevronDown, ChevronUp, CheckCircle, ShoppingCart, Trash2 } from 'lucide-react';
import { SpotlightCard } from '../ui/SpotlightCard';
import WatchLiveButton from '../WatchLiveButton';
import PreserveNewlines from '../PreserveNewlines';
import { LIVE_LEAD_MINUTES } from '../../config/liveStream';
import { parseEventDateTime } from '../../utils/eventTime';
import { 
  getFieldDisplay, 
  isStructuredRules, 
  unpackStructured, 
  computeRulesCount,
  canRegisterNow,
  getCountdown,
  getClosingCountdown,
  getSecondsToOpen,
  getSecondsToClose,
  getOpensAtTooltip,
  getClosesAtTooltip,
  isLastTenSeconds,
  getCountdownStylesForSecs,
  yearLabelFor
} from '../../utils/eventUtils';

interface EventCardProps {
  event: any;
  index: number;
  isOwner: boolean;
  isFlipped: boolean;
  onFlip: (id: number) => void;
  onRegister: (id: number) => void;
  onOpenRules: (id: number) => void;
  isRulesExpanded: boolean;
  onToggleRules: (id: number) => void;
  eventWinners: any[];
  coordinators: any[];
  posterFit: 'contain' | 'cover';
  updateEvent: (id: number, data: any) => Promise<void>;
  onOpenProfile?: (userId: string) => void;
  isInCart?: boolean;
  isRegistered?: boolean;
}

export const EventCard: React.FC<EventCardProps> = ({
  event,
  index,
  isOwner,
  isFlipped,
  onFlip,
  onRegister,
  onOpenRules,
  isRulesExpanded,
  onToggleRules,
  eventWinners,
  coordinators,
  posterFit,
  updateEvent,
  onOpenProfile,
  isInCart = false,
  isRegistered = false
}) => {
  const toggleFlip = () => onFlip(event.id);
  const handleRegister = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRegister(event.id);
  };
  const handleToggleRules = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(max-width: 768px)').matches) {
      onOpenRules(event.id);
    } else {
      onToggleRules(event.id);
    }
  };

  const rulesCount = computeRulesCount(event.rules);
  const rulesUrl = event.rules_link || event.rules_url || event.rules_file_url || event.rules_drive_link || null;

  return (
    <div id={`event-${event.id}`} style={{ contain: 'paint layout' }}>
      <SpotlightCard className={`relative flip-3d stranger-anim-border tilt-card h-[500px] ${isFlipped ? 'is-flipped' : ''}`}>
        <div className="flip-3d-inner h-full">
          <button
            className={`flip-face flip-front relative group ${event.watch_live_url ? 'no-front-overlay' : ''}`}
            onClick={(e) => {
              const btn = e.currentTarget as HTMLElement;
              if (btn.dataset.suppressClick) {
                try { delete btn.dataset.suppressClick; } catch {}
                return;
              }
              toggleFlip();
            }}
            aria-label={`Open details for ${event.title}`}
            onTouchStart={(e) => {
              try {
                if (!(isOwner && event.owner_hover_reveal)) return;
                const v = document.getElementById(`event-video-${event.id}`) as HTMLVideoElement | null;
                const btn = e.currentTarget as HTMLElement;
                if (v) {
                  import('../../utils/safePlay').then(({ default: safePlay }) => safePlay(v)).catch(() => { const p = v.play(); if (p) p.catch(() => {}); });
                  try { (btn as any).dataset.suppressClick = '1'; } catch {}
                  setTimeout(() => { try { delete (btn as any).dataset.suppressClick; } catch {} }, 700);
                }
              } catch (err) {}
            }}
            onTouchEnd={() => {
              try {
                if (!(isOwner && event.owner_hover_reveal)) return;
                const v = document.getElementById(`event-video-${event.id}`) as HTMLVideoElement | null;
                if (v) {
                  v.pause();
                  try { v.currentTime = 0; } catch {}
                }
              } catch (err) {}
            }}
          >
            <div className="flip-front-media">
              <div className="poster-fill" style={{ backgroundImage: `url(${event.image})` }} />
              <div className="poster-main">
                <img
                  src={event.image}
                  alt={event.title}
                  loading={index < 6 ? 'eager' : 'lazy'}
                  decoding="async"
                  className="w-full h-full"
                  style={{ objectFit: posterFit }}
                />
              </div>
            </div>
            {event.motion_poster_url ? (
              <video
                id={`event-video-${event.id}`}
                className={`smart-video absolute inset-0 w-full h-full ${posterFit === 'cover' ? 'object-cover' : 'object-contain'} bg-black transition-opacity duration-300 front-video block opacity-90`}
                src={event.motion_poster_url}
                autoPlay
                muted
                playsInline
                loop
                poster={event.image}
                preload="auto"
                {...(index < 6 ? { fetchpriority: "high" } as any : {})}
              />
            ) : null}

            {isOwner && (
              <div className="absolute top-2 left-2 z-30" onClick={(e)=>e.stopPropagation()}>
                <label className="flex items-center text-xs bg-black/50 px-2 py-1 rounded text-white cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!event.owner_hover_reveal}
                    onChange={async (e) => {
                      try {
                        await updateEvent(event.id, { owner_hover_reveal: e.target.checked } as any);
                      } catch (err) {
                        console.error('Failed to update owner_hover_reveal', err);
                      }
                    }}
                    className="mr-2"
                  />
                  Owner preview
                </label>
              </div>
            )}
          </button>

          <div className="flip-face flip-back" onClick={toggleFlip}>
            {(() => {
              const wlu = event.watch_live_url;
              if (wlu) {
                const dt = parseEventDateTime(event.date as any, event.time as any);
                if (dt) {
                  return (
                    <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 pointer-events-auto" onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}>
                      <WatchLiveButton
                        url={wlu}
                        startTime={dt.toISOString()}
                        leadMinutes={LIVE_LEAD_MINUTES}
                        forceLive={event.registration_open || event.featured}
                        size="xs"
                      />
                    </div>
                  );
                }
              }
              return null;
            })()}
            <div className="h-full overflow-hidden flex flex-col">
              <div className="p-6 overflow-y-auto flex-1">
                <h3 className="text-xl font-bold text-white mb-3 nebula-title-text" style={{ transform: 'translateX(16px)', textShadow: '0 0 10px rgba(99, 102, 241, 0.5), 0 0 20px rgba(79, 70, 229, 0.4)' }}>{event.title}</h3>
                <PreserveNewlines text={event.description} className="text-sm sm:text-base text-gray-300 mb-4" />
                <div className="space-y-2 mb-4">
                  {(() => {
                    const dateInfo = getFieldDisplay(event.date);
                    const timeInfo = getFieldDisplay(event.time);
                    const venueInfo = getFieldDisplay(event.venue);
                    return (
                      <>
                        <div className="flex items-center text-sm text-gray-400">
                          <Calendar size={16} className={`mr-2 ${dateInfo.isUnannounced ? 'text-violet-500' : 'text-indigo-400'}`} />
                          <span className={dateInfo.isUnannounced ? 'text-violet-500 font-medium' : 'text-gray-300'}
                            style={dateInfo.isUnannounced 
                              ? { filter: 'drop-shadow(0 0 8px rgba(139, 92, 246, 0.4))' } 
                              : { filter: 'drop-shadow(0 0 6px rgba(79, 70, 229, 0.3))' }}>
                            {dateInfo.text}
                          </span>
                        </div>
                        <div className="flex items-center text-sm text-gray-400">
                          <Clock size={16} className={`mr-2 ${timeInfo.isUnannounced ? 'text-violet-500' : 'text-cyan-400'}`} />
                          <span className={timeInfo.isUnannounced ? 'text-violet-500 font-medium' : 'text-gray-300'}
                            style={timeInfo.isUnannounced 
                              ? { filter: 'drop-shadow(0 0 8px rgba(139, 92, 246, 0.4))' } 
                              : { filter: 'drop-shadow(0 0 6px rgba(34, 211, 238, 0.3))' }}>
                            {timeInfo.text}
                          </span>
                        </div>
                        <div className="flex items-center text-sm text-gray-400">
                          <MapPin size={16} className={`mr-2 ${venueInfo.isUnannounced ? 'text-violet-500' : 'text-cyan-400'}`} />
                          <span className={venueInfo.isUnannounced ? 'text-violet-500 font-medium' : 'text-gray-300'}
                            style={venueInfo.isUnannounced 
                              ? { filter: 'drop-shadow(0 0 8px rgba(139, 92, 246, 0.4))' } 
                              : { filter: 'drop-shadow(0 0 6px rgba(34, 211, 238, 0.3))' }}>
                            {venueInfo.text}
                          </span>
                        </div>
                      </>
                    );
                  })()}
                  {event.participants && String(event.participants).trim() && String(event.participants).trim() !== '0' && (
                    <div className="flex items-center text-sm text-gray-400"><Users size={16} className="mr-2 text-indigo-400" />{event.participants} participants</div>
                  )}
                  {coordinators.length > 0 ? (
                    <div className="mt-2 text-sm text-gray-300">
                      <div className="font-semibold text-gray-200">Coordinators</div>
                      <div className="text-gray-400 space-y-0.5">
                        {coordinators.map((c: any) => {
                          const n = String(c.name ?? '').trim();
                          const p = String(c.phone ?? '').trim();
                          if (n === 'Ø' || n === '∅' || n === '—' || n === '-' || p === 'Ø' || p === '∅' || p === '—') return null;
                          if (!n && !p) return null;
                          return (
                            <div key={c.id} className="flex items-center flex-wrap gap-x-2">
                              <span className="text-cyan-500 font-medium">{n}</span>
                              {p && (
                                <>
                                  <span className="text-white/20">·</span>
                                  <a href={`tel:${p}`} className="inline-flex items-center gap-1 text-cyan-600/70 hover:text-cyan-500 transition-colors" onClick={(e) => e.stopPropagation()}>
                                    <Phone size={12} className="text-cyan-600" />
                                    {p}
                                  </a>
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (() => {
                    const n = String(event.coordinator_name ?? '').trim();
                    const p = String(event.coordinator_phone ?? '').trim();
                    if (!n && !p) return null;
                    if ((n === '0' || n === '-' || n === '—' || n === 'Ø' || n === '∅') && !p) return null;
                    if ((n === '0' || n === '-' || n === '—' || n === 'Ø' || n === '∅') && (p === '0' || p === '-' || p === '—' || p === 'Ø' || p === '∅')) return null;
                    return (
                      <div className="mt-2 text-sm text-gray-300">
                        <div className="font-semibold text-gray-200">Coordinator</div>
                        <div className="text-gray-400 flex items-center flex-wrap gap-x-2">
                          <span className="text-cyan-300 font-medium" style={{ textShadow: '0 0 8px rgba(34, 211, 238, 0.6)' }}>{(n && n !== '0' && n !== '-' && n !== '—' && n !== 'Ø' && n !== '∅') ? n : ''}</span>
                          {(p && p !== '0' && p !== '-' && p !== '—' && p !== 'Ø' && p !== '∅') && (
                            <>
                              <span className="text-white/20">·</span>
                              <a href={`tel:${p}`} className="inline-flex items-center gap-1 text-cyan-600/70 hover:text-cyan-500 transition-colors" onClick={(e) => e.stopPropagation()}>
                                <Phone size={12} className="text-cyan-600" />
                                {p}
                              </a>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
                {event.highlights?.length ? (
                  <div className="mb-4">
                    <h4 className="font-semibold text-gray-300 mb-2">Highlights:</h4>
                    <div className="flex flex-wrap gap-2">
                      {event.highlights.map((h: string, i: number) => (
                        <span key={i} className="bg-gray-800 text-gray-300 px-2 py-1 rounded-full text-xs border border-gray-600">{h}</span>
                      ))}
                    </div>
                  </div>
                ) : null}
                
                {(() => {
                  const evWinners = (eventWinners || [])
                    .filter((w: any) => w.event_id === event.id)
                    .sort((a: any, b: any) => (a.position || 0) - (b.position || 0));
                  if (!evWinners || evWinners.length === 0) return null;
                  const topPositions = [1, 2, 3, 4];
                  const grouped = topPositions.map((pos) => ({
                    pos,
                    items: evWinners.filter((w: any) => Number(w.position) === pos),
                  })).filter(g => g.items.length > 0);
                  if (grouped.length === 0) return null;
                  const posLabel = (p: number) => p === 1 ? '1st' : p === 2 ? '2nd' : p === 3 ? '3rd' : `${p}th`;
                  
                  return (
                    <div className="mb-4 per-event-winners">
                      <h4 className="font-semibold text-gray-200 mb-2">Winners</h4>
                      <div className="space-y-1 text-sm">
                        {grouped.map(g => (
                          <div key={g.pos} className="flex items-start gap-2">
                            <div
                              className={`px-3 py-1 rounded-lg font-black uppercase tracking-tighter ${g.pos === 1 ? 'bg-violet-700 text-white' : g.pos === 2 ? 'bg-zinc-400 text-black shadow-[0_0_10px_rgba(161,161,170,0.3)]' : g.pos === 3 ? 'bg-amber-600 text-black shadow-[0_0_10px_rgba(217,119,6,0.3)]' : 'bg-gray-800 text-gray-400'}`}
                              style={{ 
                                boxShadow: g.pos === 1 ? '0 0 15px rgba(139, 92, 246, 0.4)' : 'none',
                                fontFamily: "'Crimson Text', serif"
                              }}
                            >
                              {posLabel(g.pos)}
                            </div>
                            <div className="text-gray-200">
                              {g.items.map((w: any, idx: number) => {
                                const rawYear = w.registration_year || w.year || null;
                                const year = yearLabelFor(rawYear);
                                return (
                                  <span key={w.id} className="inline">
                                    {w.user_id ? (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (onOpenProfile) onOpenProfile(w.user_id);
                                        }}
                                        className="text-cyan-400 hover:text-cyan-300 font-semibold hover:underline bg-transparent border-none p-0 inline align-baseline cursor-pointer"
                                      >
                                        {w.name}
                                      </button>
                                    ) : (
                                      w.name
                                    )}
                                    {year ? ` (${year})` : ''}
                                    {idx < g.items.length - 1 ? ', ' : ''}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {((event.rules && rulesCount > 0) || rulesUrl) && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between w-full mb-2">
                      <button
                        onClick={handleToggleRules}
                        className="flex items-center text-left font-semibold text-gray-300 hover:text-indigo-400 transition-colors px-2 py-1"
                      >
                        <FileText size={16} className="mr-2" />
                        <span>Event Rules {rulesCount > 0 ? `(${rulesCount})` : ''}</span>
                      </button>
                      <div className="flex items-center gap-2 text-gray-400">
                        {isRulesExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </div>
                    {isRulesExpanded && (
                      <div
                        className="rules-panel rounded-xl p-4 space-y-3 rules-zoom-in custom-scrollbar"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div
                          className="rules-scroll max-h-56 md:max-h-[60vh] overflow-y-auto p-0 space-y-3"
                          tabIndex={0}
                          onWheel={(e) => {
                            const node = e.currentTarget as HTMLElement;
                            const delta = e.deltaY;
                            const atTop = node.scrollTop === 0 && delta < 0;
                            const atBottom = node.scrollHeight - node.clientHeight - node.scrollTop <= 1 && delta > 0;
                            if (!atTop && !atBottom) e.stopPropagation();
                          }}
                        >
                          {isStructuredRules(event.rules) ? (
                            unpackStructured(event.rules).map((sec, sIdx) => (
                              <div key={sIdx} className="space-y-3">
                                {sec.heading?.trim() && <div className="rule-heading">{sec.heading}</div>}
                                {(sec.blocks || []).map((b, bIdx) => (
                                  <div key={bIdx} className="space-y-1">
                                    {b.title?.trim() && <div className="rule-subheading">{b.title}</div>}
                                    {(b.style || 'number') === 'bullet' ? (
                                      <ul className="list-disc list-inside space-y-1">
                                        {b.items.filter(p=>p && String(p).trim()).map((p, i) => (
                                          <li key={i} className="rule-text text-[13px] leading-snug">
                                            {typeof p === 'object' ? JSON.stringify(p) : String(p)}
                                          </li>
                                        ))}
                                      </ul>
                                    ) : (
                                      b.items.filter(p=>p && String(p).trim()).map((p, i) => (
                                        <div key={i} className="flex items-start rule-line">
                                          <span className="rule-index mr-2 mt-0.5 text-[13px]">{i + 1}.</span>
                                          <span className="rule-text text-[13px] leading-snug">
                                            {typeof p === 'object' ? JSON.stringify(p) : String(p)}
                                          </span>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                ))}
                              </div>
                            ))
                          ) : (
                            (event.rules || []).map((rule: string, i: number) => (
                              <div key={i} className="flex items-start rule-line">
                                <span className="rule-index mr-2 mt-0.5 text-[14px]">{i + 1}.</span>
                                <span className="rule-text text-[15px] leading-snug">
                                  {typeof rule === 'object' ? JSON.stringify(rule) : String(rule)}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="p-6 pt-0">
                {canRegisterNow(event) ? (
                  <>
                    <button
                      onClick={handleRegister}
                      disabled={isRegistered || (Boolean(event.max_participants) && (event.current_registrations || 0) >= (event.max_participants ?? 0) && !isRegistered)}
                      className={`w-full font-semibold flex items-center justify-center glow-text-btn ${
                        isRegistered 
                          ? '!bg-green-500/15 !border-green-500/30 !text-green-400 cursor-not-allowed !pointer-events-auto' 
                          : isInCart 
                            ? '!bg-rose-500/15 !border-rose-500/30 !text-rose-400' 
                            : event.max_participants && (event.current_registrations || 0) >= (event.max_participants ?? 0) 
                              ? 'opacity-60 cursor-not-allowed !pointer-events-none' 
                              : ''
                      }`}
                    >
                      {event.max_participants && (event.current_registrations || 0) >= event.max_participants && !isRegistered ? (
                        <>
                          <AlertCircle size={16} className="mr-2" /> EVENT FULL
                        </>
                      ) : isRegistered ? (
                        <span className="flex items-center gap-2 py-2">
                          <CheckCircle size={16} className="text-green-400" /> <span>REGISTERED</span>
                        </span>
                      ) : isInCart ? (
                        <span className="flex items-center gap-2 py-2">
                          <Trash2 size={16} className="text-rose-400 animate-pulse" /> <span>REMOVE FROM CART</span>
                        </span>
                      ) : (
                        <span className="glow-text-btn__content"><ShoppingCart size={16} className="mr-2" /> <span className="glow-text-animated">ADD TO CART</span></span>
                      )}
                    </button>
                    {getClosingCountdown(event) && getClosingCountdown(event) !== 'closed' && (() => {
                      const secsToClose = getSecondsToClose(event);
                      const isUrgent = secsToClose !== null && secsToClose <= 86400;
                      return (
                        <div
                          className={`mt-2 w-full py-2 px-3 rounded-lg text-center text-sm font-medium ${isUrgent ? 'bg-violet-600/20 text-violet-300' : 'bg-cyan-600/20 text-cyan-300'}`}
                          title={getClosesAtTooltip(event)}
                        >
                          <Clock size={14} className="inline mr-1.5 mb-0.5" />
                          Closes in {getClosingCountdown(event)}
                        </div>
                      );
                    })()}
                  </>
                ) : (getClosingCountdown(event) === 'closed') ? (
                  <div className="w-full py-3 px-4 rounded-lg bg-gray-700 text-gray-400 text-center font-medium">REGISTRATION CLOSED</div>
                ) : getCountdown(event) ? (
                  getCountdown(event) === 'now' ? (
                    <div className="w-full py-3 px-4 rounded-lg bg-cyan-600/20 text-cyan-400 text-center font-black uppercase tracking-widest border border-cyan-600/30" title="Open now">REGISTRATION IS OPEN</div>
                  ) : (() => {
                    const secs = getSecondsToOpen(event);
                    const isBoundary = typeof secs === 'number' && secs > 0 && secs <= 3;
                    return (
                      <div
                        className={`w-full py-3 px-4 rounded-lg text-center font-medium ${isBoundary ? 'bg-violet-600/20 text-violet-300 animate-pulse' : 'bg-indigo-600/20 text-indigo-300'}`}
                        title={getOpensAtTooltip(event)}
                      >
                        {isBoundary ? `Starting in ${secs}s` : `Opens in ${getCountdown(event)}`}
                      </div>
                    );
                  })()
                ) : (
                  <div className="w-full py-3 px-4 rounded-lg bg-gray-700 text-gray-400 text-center font-medium">REGISTRATION CLOSED</div>
                )}
              </div>
            </div>
          </div>
        </div>
        {isLastTenSeconds(event) && !canRegisterNow(event) && (
          <div className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center">
            <div className="w-full h-full bg-black/60 flex items-center justify-center">
              <div
                className="font-black select-none countdown-drama"
                style={{
                  fontSize: 'clamp(72px, 16vw, 200px)',
                  lineHeight: 1,
                  ...getCountdownStylesForSecs(getSecondsToOpen(event)),
                }}
                title={getOpensAtTooltip(event)}
              >
                {getSecondsToOpen(event)}
              </div>
            </div>
          </div>
        )}
      </SpotlightCard>
    </div>
  );
};
