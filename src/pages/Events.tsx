import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Clock, MapPin, Users, UserPlus, AlertCircle, Instagram, Youtube, FileText, ChevronDown, ChevronUp, Sparkles, Zap, Play, Star } from 'lucide-react';
import { useData } from '../context/DataContext';
import { RegistrationModal } from '../components/RegistrationModal';

export const Events: React.FC = () => {
  const { events, socialMediaSettings } = useData();
  const eventsRef = useRef<HTMLDivElement>(null);
  const [registrationModal, setRegistrationModal] = useState<{
    isOpen: boolean;
    eventId: number;
    eventTitle: string;
  }>({
    isOpen: false,
    eventId: 0,
    eventTitle: ''
  });
  const [expandedRules, setExpandedRules] = useState<Set<number>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [glitchActive, setGlitchActive] = useState(false);

  // Filter out hidden events for public view
  const visibleEvents = events.filter(event => event.visible !== false);
  
  // Get unique categories
  const categories = ['All', ...Array.from(new Set(visibleEvents.map(event => event.category)))];
  
  // Filter events by category
  const filteredEvents = selectedCategory === 'All' 
    ? visibleEvents 
    : visibleEvents.filter(event => event.category === selectedCategory);

  // Glitch effect trigger
  useEffect(() => {
    const glitchTimer = setInterval(() => {
      setGlitchActive(true);
      setTimeout(() => setGlitchActive(false), 200);
    }, 12000);
    return () => clearInterval(glitchTimer);
  }, []);

  // Intersection Observer for scroll animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    const animatedElements = document.querySelectorAll('.scroll-animate');
    animatedElements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [events]);

  // Parallax effect
  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.pageYOffset;
      const parallaxElements = document.querySelectorAll('.parallax');
      
      parallaxElements.forEach((element) => {
        const speed = parseFloat(element.getAttribute('data-speed') || '0.5');
        const yPos = -(scrolled * speed);
        (element as HTMLElement).style.transform = `translateY(${yPos}px)`;
      });
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const openRegistration = (eventId: number, eventTitle: string) => {
    setRegistrationModal({
      isOpen: true,
      eventId,
      eventTitle
    });
  };

  const closeRegistration = () => {
    setRegistrationModal({
      isOpen: false,
      eventId: 0,
      eventTitle: ''
    });
  };

  const toggleRules = (eventId: number) => {
    const newExpanded = new Set(expandedRules);
    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId);
    } else {
      newExpanded.add(eventId);
    }
    setExpandedRules(newExpanded);
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Cultural': 'from-purple-500 to-pink-500',
      'Technical': 'from-blue-500 to-cyan-500',
      'Sports': 'from-green-500 to-emerald-500',
      'default': 'from-gray-500 to-gray-600'
    };
    return colors[category] || colors.default;
  };

  // Check if social media links should be shown
  const showInstagram = socialMediaSettings?.instagram_enabled && socialMediaSettings?.instagram_url;
  const showYoutube = socialMediaSettings?.youtube_enabled && socialMediaSettings?.youtube_url;
  const showSocialMedia = showInstagram || showYoutube;

  return (
    <div className="cyberpunk-theme min-h-screen">
      {/* Hero Section */}
      <section className="hero-section relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 z-0">
          <div className="hero-bg parallax" data-speed="0.3">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-900/80 via-blue-900/60 to-pink-900/80"></div>
            <div className="absolute inset-0 bg-black/50"></div>
          </div>
          
          {/* Cyberpunk Grid Overlay */}
          <div className="absolute inset-0 cyberpunk-grid opacity-20"></div>
          
          {/* Floating Particles */}
          <div className="particles-container">
            {[...Array(50)].map((_, i) => (
              <div
                key={i}
                className="particle"
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 20}s`,
                  animationDuration: `${15 + Math.random() * 10}s`
                }}
              ></div>
            ))}
          </div>

          {/* Glitch Overlay */}
          <div className={`glitch-overlay ${glitchActive ? 'active' : ''}`}></div>
        </div>

        {/* Hero Content */}
        <div className="relative z-10 text-center text-white max-w-6xl mx-auto px-4">
          <div className="scroll-animate opacity-0 transform translate-y-20">
            <div className="inline-flex items-center bg-gradient-to-r from-pink-500/20 to-blue-500/20 border border-pink-500/30 text-pink-400 px-6 py-3 rounded-full text-sm font-medium mb-8 backdrop-blur-sm pulse-glow">
              <Zap className="w-4 h-4 mr-2 animate-pulse" />
              EVENTS 2025
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
                  <Play className="mr-2" size={20} />
                  EXPLORE EVENTS
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Category Filter */}
      <section className="py-12 relative">
        <div className="container mx-auto px-4">
          <div className="scroll-animate opacity-0 transform translate-y-10">
            <div className="flex justify-center mb-8">
              <div className="cyberpunk-card inline-block p-4">
                <div className="flex flex-wrap gap-3 justify-center">
                  {categories.map((category) => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 border-2 hover-float ${
                        selectedCategory === category
                          ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white border-pink-500 shadow-lg shadow-pink-500/25'
                          : 'text-gray-300 border-gray-600 hover:border-pink-500/50 hover:text-pink-400'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Events Grid */}
      <section className="py-12 relative">
        <div className="container mx-auto px-4" ref={eventsRef}>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredEvents.map((event, index) => (
              <div
                key={event.id}
                className="scroll-animate opacity-0 transform translate-y-20 hover-float"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="cyberpunk-card group h-full overflow-hidden">
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={event.image}
                      alt={event.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                    
                    {/* Category Badge */}
                    <div className="absolute top-4 left-4">
                      <span className={`bg-gradient-to-r ${getCategoryColor(event.category)} text-white px-3 py-1 rounded-full text-sm font-semibold shadow-lg pulse-ring`}>
                        {event.category}
                      </span>
                    </div>
                    
                    {/* Registration Status */}
                    <div className="absolute top-4 right-4">
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                        event.max_participants && (event.current_registrations || 0) < event.max_participants
                          ? 'bg-green-500/80 text-white animate-pulse' 
                          : 'bg-red-500/80 text-white'
                      }`}>
                        {event.max_participants && (
                          <span>{event.current_registrations || 0} / {event.max_participants}</span>
                        )}
                      </div>
                    </div>

                    {/* Featured Badge */}
                    {event.featured && (
                      <div className="absolute bottom-4 right-4">
                        <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black p-2 rounded-full animate-pulse pulse-ring">
                          <Star className="w-4 h-4 fill-current" />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-6">
                    <h3 className="text-xl font-bold text-white mb-3 group-hover:text-pink-400 transition-colors">
                      {event.title}
                    </h3>
                    <p className="text-gray-300 mb-4 line-clamp-3">{event.description}</p>

                    {/* Event Details */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm text-gray-400">
                        <Calendar size={16} className="mr-2 text-blue-400" />
                        {event.date}
                      </div>
                      <div className="flex items-center text-sm text-gray-400">
                        <Clock size={16} className="mr-2 text-green-400" />
                        {event.time}
                      </div>
                      <div className="flex items-center text-sm text-gray-400">
                        <MapPin size={16} className="mr-2 text-purple-400" />
                        {event.venue}
                      </div>
                      <div className="flex items-center text-sm text-gray-400">
                        <Users size={16} className="mr-2 text-pink-400" />
                        {event.participants} participants
                      </div>
                      
                      {/* Registration Progress */}
                      {event.maxParticipants && (
                        <div className="mt-3">
                          <div className="flex justify-between text-sm text-gray-400 mb-1">
                            <span>Registrations</span>
                            <span>{event.currentRegistrations || 0} / {event.maxParticipants}</span>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                            <div 
                              className="bg-gradient-to-r from-pink-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                              style={{ 
                                width: `${Math.min(100, ((event.currentRegistrations || 0) / event.maxParticipants) * 100)}%` 
                              }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Highlights */}
                    <div className="mb-4">
                      <h4 className="font-semibold text-gray-300 mb-2">Highlights:</h4>
                      <div className="flex flex-wrap gap-2">
                        {event.highlights.map((highlight, index) => (
                          <span
                            key={index}
                            className="bg-gray-800 text-gray-300 px-2 py-1 rounded-full text-xs border border-gray-600 hover:border-cyan-500 transition-colors"
                          >
                            {highlight}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Event Rules */}
                    {event.rules && event.rules.length > 0 && (
                      <div className="mb-4">
                        <button
                          onClick={() => toggleRules(event.id)}
                          className="flex items-center justify-between w-full text-left font-semibold text-gray-300 mb-2 hover:text-pink-400 transition-colors"
                        >
                          <div className="flex items-center">
                            <FileText size={16} className="mr-2" />
                            Event Rules ({event.rules.length})
                          </div>
                          {expandedRules.has(event.id) ? (
                            <ChevronUp size={16} />
                          ) : (
                            <ChevronDown size={16} />
                          )}
                        </button>
                        
                        {expandedRules.has(event.id) && (
                          <div className="bg-gray-800/50 rounded-lg p-3 space-y-2 border border-gray-700">
                            {event.rules.map((rule, index) => (
                              <div key={index} className="flex items-start text-sm text-gray-300">
                                <span className="font-medium text-pink-400 mr-2 mt-0.5">{index + 1}.</span>
                                <span>{rule}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Registration Button */}
                    {event.registration_open ? (
                      <button 
                        onClick={() => openRegistration(event.id, event.title)}
                        disabled={event.max_participants && (event.current_registrations || 0) >= event.max_participants}
                        className={`w-full py-3 px-4 rounded-lg font-medium flex items-center justify-center transition-all duration-300 ${
                          event.max_participants && (event.current_registrations || 0) >= event.max_participants
                            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                            : 'cyberpunk-btn cyberpunk-btn-primary'
                        }`}
                      >
                        {event.max_participants && (event.current_registrations || 0) >= event.max_participants ? (
                          <>
                            <AlertCircle size={16} className="mr-2" />
                            EVENT FULL
                          </>
                        ) : (
                          <span className="relative z-10 flex items-center">
                            <UserPlus size={16} className="mr-2" />
                            REGISTER NOW
                          </span>
                        )}
                      </button>
                    ) : (
                      <div className="w-full py-3 px-4 rounded-lg bg-gray-700 text-gray-400 text-center font-medium">
                        REGISTRATION CLOSED
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* No Events Message */}
          {filteredEvents.length === 0 && (
            <div className="text-center py-12 scroll-animate opacity-0 transform translate-y-20">
              <div className="cyberpunk-card max-w-md mx-auto">
                <Calendar size={64} className="mx-auto mb-4 text-gray-400" />
                <h3 className="text-xl font-semibold text-gray-300 mb-2">No Events Found</h3>
                <p className="text-gray-500">
                  {selectedCategory === 'All' 
                    ? "No events are currently available."
                    : `No events found in the ${selectedCategory} category.`
                  }
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Registration Modal */}
      <RegistrationModal
        isOpen={registrationModal.isOpen}
        onClose={closeRegistration}
        eventTitle={registrationModal.eventTitle}
        eventId={registrationModal.eventId}
      />

      <style jsx>{`
        .cyberpunk-theme {
          background: #0a0a0a;
          color: #ffffff;
          font-family: 'Orbitron', 'Rajdhani', sans-serif;
          min-height: 100vh;
        }

        .hero-section {
          position: relative;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
        }

        .cyberpunk-grid {
          background-image: 
            linear-gradient(rgba(0, 255, 255, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 255, 255, 0.1) 1px, transparent 1px);
          background-size: 50px 50px;
          animation: gridMove 20s linear infinite;
        }

        @keyframes gridMove {
          0% { transform: translate(0, 0); }
          100% { transform: translate(50px, 50px); }
        }

        .particles-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
        }

        .particle {
          position: absolute;
          width: 2px;
          height: 2px;
          background: linear-gradient(45deg, #ff00ff, #00ffff);
          border-radius: 50%;
          animation: particleFloat linear infinite;
        }

        @keyframes particleFloat {
          0% {
            transform: translateY(100vh) scale(0);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(-100px) scale(1);
            opacity: 0;
          }
        }

        .cyberpunk-title {
          background: linear-gradient(45deg, #ff00ff, #00ffff, #ff00ff);
          background-size: 200% 200%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: gradientShift 3s ease-in-out infinite;
        }

        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        .neon-pink {
          color: #ff00ff;
          text-shadow: 
            0 0 5px #ff00ff,
            0 0 10px #ff00ff;
        }

        .neon-blue {
          color: #00ffff;
          text-shadow: 
            0 0 5px #00ffff,
            0 0 10px #00ffff;
        }

        .neon-purple {
          color: #8a2be2;
          text-shadow: 
            0 0 5px #8a2be2,
            0 0 10px #8a2be2;
        }

        .glow-text {
          text-shadow: 
            0 0 3px currentColor,
            0 0 6px currentColor;
        }

        .pulse-glow {
          animation: pulseGlow 2s ease-in-out infinite alternate;
        }

        @keyframes pulseGlow {
          from {
            box-shadow: 0 0 5px rgba(255, 0, 255, 0.3);
          }
          to {
            box-shadow: 0 0 15px rgba(255, 0, 255, 0.6);
          }
        }

        .glitch-active {
          animation: glitch 0.3s ease-in-out;
        }

        @keyframes glitch {
          0% { transform: translate(0); }
          20% { transform: translate(-2px, 2px); }
          40% { transform: translate(-2px, -2px); }
          60% { transform: translate(2px, 2px); }
          80% { transform: translate(2px, -2px); }
          100% { transform: translate(0); }
        }

        .glitch-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255, 0, 255, 0.1) 50%,
            transparent 100%
          );
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.3s ease;
        }

        .glitch-overlay.active {
          opacity: 1;
          animation: glitchSweep 0.3s ease-in-out;
        }

        @keyframes glitchSweep {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        .cyberpunk-btn {
          position: relative;
          padding: 12px 32px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          border: 2px solid;
          background: transparent;
          overflow: hidden;
          transition: all 0.3s ease;
          clip-path: polygon(0 0, calc(100% - 20px) 0, 100% 100%, 20px 100%);
        }

        .cyberpunk-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
          transition: left 0.5s;
        }

        .cyberpunk-btn:hover::before {
          left: 100%;
        }

        .cyberpunk-btn-primary {
          border-color: #ff00ff;
          color: #ff00ff;
          box-shadow: 
            0 0 10px rgba(255, 0, 255, 0.2),
            inset 0 0 10px rgba(255, 0, 255, 0.05);
        }

        .cyberpunk-btn-primary:hover {
          background: rgba(255, 0, 255, 0.1);
          box-shadow: 
            0 0 20px rgba(255, 0, 255, 0.4),
            inset 0 0 20px rgba(255, 0, 255, 0.1);
          transform: translateY(-2px);
        }

        .cyberpunk-card {
          background: rgba(20, 20, 40, 0.8);
          border: 1px solid rgba(0, 255, 255, 0.3);
          border-radius: 8px;
          backdrop-filter: blur(10px);
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .cyberpunk-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, #ff00ff, #00ffff, #ff00ff);
          transform: translateX(-100%);
          transition: transform 0.5s ease;
        }

        .cyberpunk-card:hover::before {
          transform: translateX(0);
        }

        .cyberpunk-card:hover {
          border-color: rgba(255, 0, 255, 0.6);
          box-shadow: 
            0 10px 30px rgba(0, 0, 0, 0.5),
            0 0 15px rgba(255, 0, 255, 0.1);
          transform: translateY(-5px);
        }

        .scroll-animate {
          transition: all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }

        .scroll-animate.animate-in {
          opacity: 1 !important;
          transform: translateY(0) !important;
        }

        .hover-float:hover {
          animation: float 3s ease-in-out infinite;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }

        .pulse-ring {
          position: relative;
        }

        .pulse-ring::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 100%;
          height: 100%;
          border: 2px solid rgba(255, 0, 255, 0.3);
          border-radius: 50%;
          transform: translate(-50%, -50%);
          animation: pulseRing 2s ease-out infinite;
        }

        @keyframes pulseRing {
          0% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) scale(2);
            opacity: 0;
          }
        }

        .line-clamp-3 {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        /* Mobile optimizations */
        @media (max-width: 768px) {
          .cyberpunk-title {
            font-size: 2rem;
          }
          
          .hero-section h1 {
            font-size: 2.5rem !important;
          }
          
          .hero-section p {
            font-size: 1rem !important;
          }
          
          .particles-container {
            display: none;
          }
          
          .cyberpunk-btn {
            padding: 10px 24px;
            font-size: 0.9rem;
            clip-path: polygon(0 0, calc(100% - 10px) 0, 100% 100%, 10px 100%);
          }
          
          .cyberpunk-card {
            margin: 0 4px;
          }
        }
        
        @media (max-width: 480px) {
          .cyberpunk-title {
            font-size: 1.5rem;
          }
          
          .hero-section h1 {
            font-size: 2rem !important;
          }
          
          .hero-section p {
            font-size: 0.9rem !important;
          }
          
          .cyberpunk-btn {
            padding: 8px 16px;
            font-size: 0.8rem;
            clip-path: polygon(0 0, calc(100% - 5px) 0, 100% 100%, 5px 100%);
          }
        }
      `}</style>
    </div>
  );
};