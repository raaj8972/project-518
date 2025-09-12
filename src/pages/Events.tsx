import React, { useEffect, useRef, useState } from 'react';
import { Calendar, Clock, MapPin, Users, UserPlus, AlertCircle, FileText, ChevronDown, ChevronUp, Zap, Play, Star } from 'lucide-react';
import { useData } from '../context/DataContext';
import { RegistrationModal } from '../components/RegistrationModal';
import { HeroBackground } from '../components/HeroBackground';

export const Events: React.FC = () => {
  const { events, connectionStatus, lastError, refreshAll } = useData();
  const eventsRef = useRef<HTMLDivElement>(null);
  const [registrationModal, setRegistrationModal] = useState<{ isOpen: boolean; eventId: number; eventTitle: string }>(
    { isOpen: false, eventId: 0, eventTitle: '' }
  );
  const [expandedRules, setExpandedRules] = useState<Set<number>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [glitchActive, setGlitchActive] = useState(false);
  const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set());

  const visibleEvents = events.filter((e) => e.visible !== false);
  const categories = ['All', ...Array.from(new Set(visibleEvents.map((e) => e.category)))];
  const filteredEvents = selectedCategory === 'All' ? visibleEvents : visibleEvents.filter((e) => e.category === selectedCategory);

  useEffect(() => {
    const t = setInterval(() => {
      setGlitchActive(true);
      setTimeout(() => setGlitchActive(false), 200);
    }, 12000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add('animate-in');
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );
    document.querySelectorAll('.scroll-animate').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [events]);

  const openRegistration = (eventId: number, eventTitle: string) => setRegistrationModal({ isOpen: true, eventId, eventTitle });
  const closeRegistration = () => setRegistrationModal({ isOpen: false, eventId: 0, eventTitle: '' });
  const toggleRules = (id: number) => setExpandedRules((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleFlip = (id: number) => setFlippedCards((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const getCategoryColor = (c: string) => ({ Cultural: 'from-purple-500 to-pink-500', Technical: 'from-blue-500 to-cyan-500', Sports: 'from-green-500 to-emerald-500', default: 'from-gray-500 to-gray-600' } as Record<string, string>)[c] || 'from-gray-500 to-gray-600';

  return (
    <div className="cyberpunk-theme min-h-screen">
      {connectionStatus !== 'ok' && (
        <div className={`w-full z-50 ${connectionStatus === 'offline' ? 'bg-red-600' : 'bg-yellow-600'} text-white px-4 py-2 text-sm flex items-center justify-between`}>
          <span>
            {connectionStatus === 'offline' ? 'Offline: Unable to reach data service.' : 'Degraded: Some data failed to load.'}
            {lastError ? ` — ${lastError}` : ''}
          </span>
          <button onClick={() => refreshAll(true)} className="ml-4 px-3 py-1 rounded bg-white/10 hover:bg-white/20 border border-white/20">Retry</button>
        </div>
      )}

      <section className="hero-section relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <HeroBackground pageKey="events" />
          <div className="particles-container">
            {[...Array(50)].map((_, i) => (
              <div key={i} className="particle" style={{ left: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 20}s`, animationDuration: `${15 + Math.random() * 10}s` }} />
            ))}
          </div>
          <div className={`glitch-overlay ${glitchActive ? 'active' : ''}`} />
        </div>
        <div className="relative z-10 text-center text-white max-w-6xl mx-auto px-4">
          <div className="scroll-animate opacity-0 transform translate-y-20">
            <div className="inline-flex items-center bg-gradient-to-r from-pink-500/20 to-blue-500/20 border border-pink-500/30 text-pink-400 px-6 py-3 rounded-full text-sm font-medium mb-8 backdrop-blur-sm pulse-glow">
              <Zap className="w-4 h-4 mr-2 animate-pulse" /> EVENTS 2025
            </div>
            <h1 className={`text-5xl md:text-7xl lg:text-8xl font-black mb-6 cyberpunk-title ${glitchActive ? 'glitch-active' : ''}`}>
              DIGITAL <span className="neon-pink">EVENTS</span>
            </h1>
            <p className="text-xl md:text-2xl lg:text-3xl font-light max-w-4xl mx-auto leading-relaxed mb-8">
              Experience the <span className="neon-blue glow-text">future</span> of innovation through our
              <span className="neon-purple glow-text"> cutting-edge events</span>
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <div className="cyberpunk-btn cyberpunk-btn-primary hover-float">
                <span className="relative z-10 flex items-center">
                  <Play className="mr-2" size={20} /> EXPLORE EVENTS
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 relative">
        <div className="container mx-auto px-4">
          <div className="scroll-animate opacity-0 transform translate-y-10">
            <div className="flex justify-center mb-8">
              <div className="cyberpunk-card inline-block p-4">
                <div className="flex flex-wrap gap-3 justify-center">
                  {categories.map((category) => (
                    <button key={category} onClick={() => setSelectedCategory(category)} className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 border-2 hover-float ${selectedCategory === category ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white border-pink-500 shadow-lg shadow-pink-500/25' : 'text-gray-300 border-gray-600 hover:border-pink-500/50 hover:text-pink-400'}`}>{category}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 relative">
        <div className="container mx-auto px-4" ref={eventsRef}>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredEvents.map((event, index) => (
              <div key={event.id} className="scroll-animate opacity-0 transform translate-y-20" style={{ animationDelay: `${index * 0.1}s` }}>
                <div className={`flip-3d ${flippedCards.has(event.id) ? 'is-flipped' : ''}`}>
                  <div className="flip-3d-inner">
                    <button className="flip-face flip-front relative" onClick={() => toggleFlip(event.id)} aria-label={`Open details for ${event.title}`}>
                      <div className="flip-front-media" style={{ backgroundImage: `url(${event.image})` }} />
                      <div className="absolute top-4 left-4">
                        <span className={`bg-gradient-to-r ${getCategoryColor(event.category)} text-white px-3 py-1 rounded-full text-sm font-semibold shadow-lg`}>{event.category}</span>
                      </div>
                      {event.featured && (
                        <div className="absolute bottom-4 right-4">
                          <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black p-2 rounded-full animate-pulse pulse-ring">
                            <Star className="w-4 h-4 fill-current" />
                          </div>
                        </div>
                      )}
                    </button>

                    <div className="flip-face flip-back" onClick={() => toggleFlip(event.id)}>
                      <div className="h-full overflow-hidden flex flex-col">
                        <div className="p-6 overflow-y-auto flex-1">
                          <h3 className="text-xl font-bold text-white mb-3">{event.title}</h3>
                          <p className="text-gray-300 mb-4">{event.description}</p>
                          <div className="space-y-2 mb-4">
                            <div className="flex items-center text-sm text-gray-400"><Calendar size={16} className="mr-2 text-blue-400" />{event.date}</div>
                            <div className="flex items-center text-sm text-gray-400"><Clock size={16} className="mr-2 text-green-400" />{event.time}</div>
                            <div className="flex items-center text-sm text-gray-400"><MapPin size={16} className="mr-2 text-purple-400" />{event.venue}</div>
                            <div className="flex items-center text-sm text-gray-400"><Users size={16} className="mr-2 text-pink-400" />{event.participants} participants</div>
                            {event.max_participants && (
                              <div className="mt-3">
                                <div className="flex justify-between text-sm text-gray-400 mb-1"><span>Registrations</span><span>{event.current_registrations || 0} / {event.max_participants}</span></div>
                                <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                                  <div className="bg-gradient-to-r from-pink-500 to-purple-500 h-2 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (((event.current_registrations || 0) / (event.max_participants || 1)) * 100))}%` }} />
                                </div>
                              </div>
                            )}
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
                          {event.rules && event.rules.length > 0 && (
                            <div className="mb-4">
                              <button onClick={(e) => { e.stopPropagation(); toggleRules(event.id); }} className="flex items-center justify-between w-full text-left font-semibold text-gray-300 mb-2 hover:text-pink-400 transition-colors">
                                <div className="flex items-center"><FileText size={16} className="mr-2" />Event Rules ({event.rules.length})</div>
                                {expandedRules.has(event.id) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              </button>
                              {expandedRules.has(event.id) && (
                                <div className="bg-gray-800/50 rounded-lg p-3 space-y-2 border border-gray-700 max-h-40 overflow-y-auto">
                                  {event.rules.map((rule: string, i: number) => (
                                    <div key={i} className="flex items-start text-sm text-gray-300"><span className="font-medium text-pink-400 mr-2 mt-0.5">{i + 1}.</span><span>{rule}</span></div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="p-6 pt-0">
                          {event.registration_open ? (
                            <button onClick={(e) => { e.stopPropagation(); openRegistration(event.id, event.title); }} disabled={Boolean(event.max_participants) && (event.current_registrations || 0) >= (event.max_participants ?? 0)} className={`w-full py-3 px-4 rounded-lg font-medium flex items-center justify-center transition-all duration-300 ${event.max_participants && (event.current_registrations || 0) >= event.max_participants ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'cyberpunk-btn cyberpunk-btn-primary'}`}>
                              {event.max_participants && (event.current_registrations || 0) >= event.max_participants ? (
                                <>
                                  <AlertCircle size={16} className="mr-2" /> EVENT FULL
                                </>
                              ) : (
                                <span className="relative z-10 flex items-center"><UserPlus size={16} className="mr-2" /> REGISTER NOW</span>
                              )}
                            </button>
                          ) : (
                            <div className="w-full py-3 px-4 rounded-lg bg-gray-700 text-gray-400 text-center font-medium">REGISTRATION CLOSED</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredEvents.length === 0 && (
            <div className="text-center py-12 scroll-animate opacity-0 transform translate-y-20">
              <div className="cyberpunk-card max-w-md mx-auto">
                <Calendar size={64} className="mx-auto mb-4 text-gray-400" />
                <h3 className="text-xl font-semibold text-gray-300 mb-2">No Events Found</h3>
                <div className="text-gray-500 space-y-2">
                  <p>{selectedCategory === 'All' ? 'No events are currently available.' : `No events found in the ${selectedCategory} category.`}</p>
                  {connectionStatus !== 'ok' && (<p className="text-xs text-yellow-400">{lastError || 'Data fetch issue. Please retry.'}</p>)}
                  <div><button onClick={() => refreshAll(true)} className="mt-3 px-4 py-2 rounded bg-pink-600/20 text-pink-300 border border-pink-500/40 hover:bg-pink-600/30">Retry loading events</button></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <RegistrationModal isOpen={registrationModal.isOpen} onClose={closeRegistration} eventTitle={registrationModal.eventTitle} eventId={registrationModal.eventId} />

      <style>{`
        /* Flip card styles */
        .flip-3d { perspective: 1200px; position: relative; height: 380px; }
        @media (min-width: 480px) { .flip-3d { height: 420px; } }
        @media (min-width: 768px) { .flip-3d { height: 520px; } }
        .flip-3d-inner { position: relative; width: 100%; height: 100%; transform-style: preserve-3d; transition: transform 600ms cubic-bezier(.2,.8,.2,1); }
        .flip-3d.is-flipped .flip-3d-inner { transform: rotateY(180deg); }
        /* Only enable hover flip on devices with fine pointer (non-touch) */
        @media (hover: hover) and (pointer: fine) {
          .flip-3d:hover .flip-3d-inner { transform: rotateY(180deg); }
          .flip-3d:hover .flip-front-media { transform: scale(1.08); }
        }
        .flip-face { position: absolute; inset: 0; backface-visibility: hidden; -webkit-backface-visibility: hidden; border-radius: 12px; overflow: hidden; }
        .flip-front { z-index: 2; }
        .flip-front-media { position: absolute; inset: 0; background-size: cover; background-position: center; transform: scale(1.02); transition: transform 400ms ease; }
        .flip-back { transform: rotateY(180deg); background: rgba(20,20,40,0.92); border: 1px solid rgba(255,0,255,0.3); box-shadow: 0 10px 30px rgba(0,0,0,0.4); }

        /* Theme and effects */
        .cyberpunk-theme { background:#0a0a0a; color:#ffffff; font-family:'Orbitron','Rajdhani',sans-serif; min-height:100vh; }
        .hero-section { position:relative; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%); }
        .particles-container { position:absolute; top:0; left:0; width:100%; height:100%; overflow:hidden; }
        .particle { position:absolute; width:2px; height:2px; background: linear-gradient(45deg, #ff00ff, #00ffff); border-radius:50%; animation: particleFloat linear infinite; }
        @keyframes particleFloat { 0% { transform: translateY(100vh) scale(0); opacity:0; } 10% { opacity:1; } 90% { opacity:1; } 100% { transform: translateY(-100px) scale(1); opacity:0; } }
        .cyberpunk-title { background: linear-gradient(45deg, #ff00ff, #00ffff, #ff00ff); background-size:200% 200%; -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; animation: gradientShift 3s ease-in-out infinite; }
        @keyframes gradientShift { 0%,100% { background-position:0% 50%; } 50% { background-position:100% 50%; } }
        .neon-pink { color:#ff00ff; text-shadow: 0 0 5px #ff00ff, 0 0 10px #ff00ff; }
        .neon-blue { color:#00ffff; text-shadow: 0 0 5px #00ffff, 0 0 10px #00ffff; }
        .neon-purple { color:#8a2be2; text-shadow: 0 0 5px #8a2be2, 0 0 10px #8a2be2; }
        .glow-text { text-shadow: 0 0 3px currentColor, 0 0 6px currentColor; }
        .pulse-glow { animation: pulseGlow 2s ease-in-out infinite alternate; }
        @keyframes pulseGlow { from { box-shadow: 0 0 5px rgba(255,0,255,0.3);} to { box-shadow: 0 0 15px rgba(255,0,255,0.6);} }
        .glitch-active { animation: glitch 0.3s ease-in-out; }
        @keyframes glitch { 0% { transform: translate(0);} 20% { transform: translate(-2px, 2px);} 40% { transform: translate(-2px, -2px);} 60% { transform: translate(2px, 2px);} 80% { transform: translate(2px, -2px);} 100% { transform: translate(0);} }
        .glitch-overlay { position:absolute; top:0; left:0; width:100%; height:100%; background: linear-gradient(90deg, transparent 0%, rgba(255,0,255,0.1) 50%, transparent 100%); opacity:0; pointer-events:none; transition: opacity .3s ease; }
        .glitch-overlay.active { opacity:1; animation: glitchSweep .3s ease-in-out; }
        @keyframes glitchSweep { 0% { transform: translateX(-100%);} 100% { transform: translateX(100%);} }
        .cyberpunk-btn { position:relative; padding:12px 32px; font-weight:700; text-transform:uppercase; letter-spacing:1px; border:2px solid; background:transparent; overflow:hidden; transition: all .3s ease; clip-path: polygon(0 0, calc(100% - 20px) 0, 100% 100%, 20px 100%); }
        .cyberpunk-btn::before { content:''; position:absolute; top:0; left:-100%; width:100%; height:100%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent); transition:left .5s; }
        .cyberpunk-btn:hover::before { left:100%; }
        .cyberpunk-btn-primary { border-color:#ff00ff; color:#ff00ff; box-shadow: 0 0 10px rgba(255,0,255,0.2), inset 0 0 10px rgba(255,0,255,0.05); }
        .cyberpunk-btn-primary:hover { background: rgba(255,0,255,0.1); box-shadow: 0 0 20px rgba(255,0,255,0.4), inset 0 0 20px rgba(255,0,255,0.1); transform: translateY(-2px); }
        .cyberpunk-card { background: rgba(20,20,40,0.8); border:1px solid rgba(0,255,255,0.3); border-radius:8px; backdrop-filter: blur(10px); transition: all .3s ease; position: relative; overflow:hidden; }
        .cyberpunk-card::before { content:''; position:absolute; top:0; left:0; right:0; height:2px; background: linear-gradient(90deg, #ff00ff, #00ffff, #ff00ff); transform: translateX(-100%); transition: transform .5s ease; }
        .cyberpunk-card:hover::before { transform: translateX(0); }
        .cyberpunk-card:hover { border-color: rgba(255,0,255,0.6); box-shadow: 0 10px 30px rgba(0,0,0,0.5), 0 0 15px rgba(255,0,255,0.1); transform: translateY(-5px); }
        .scroll-animate { transition: all .8s cubic-bezier(.25,.46,.45,.94); }
        .scroll-animate.animate-in { opacity:1 !important; transform: translateY(0) !important; }
        @media (max-width: 768px) {
          .cyberpunk-title { font-size: 2rem; }
          .hero-section h1 { font-size: 2.25rem !important; }
          .hero-section p { font-size: 0.95rem !important; }
        }
      `}</style>
    </div>
  );
};