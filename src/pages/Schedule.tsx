import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, ChevronLeft, ChevronRight, Instagram, Youtube, Zap, Play } from 'lucide-react';
import { useData } from '../context/DataContext';

export const Schedule: React.FC = () => {
  const { schedule, socialMediaSettings } = useData();
  const [selectedDay, setSelectedDay] = useState(0);

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
  }, []);

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

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Cultural':
        return 'from-purple-500 to-pink-500';
      case 'Technical':
        return 'from-blue-500 to-cyan-500';
      case 'Sports':
        return 'from-green-500 to-emerald-500';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  // Check if social media links should be shown
  const showInstagram = socialMediaSettings?.instagramEnabled && socialMediaSettings?.instagramUrl;
  const showYoutube = socialMediaSettings?.youtubeEnabled && socialMediaSettings?.youtubeUrl;
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
            {[...Array(30)].map((_, i) => (
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
        </div>

        {/* Hero Content */}
        <div className="relative z-10 text-center text-white max-w-6xl mx-auto px-4">
          <div className="scroll-animate opacity-0 transform translate-y-20">
            <div className="inline-flex items-center bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-500/30 text-blue-400 px-6 py-3 rounded-full text-sm font-medium mb-8 backdrop-blur-sm">
              <Clock className="w-4 h-4 mr-2 animate-pulse" />
              TIMELINE
            </div>
            <h1 className="text-3xl md:text-5xl lg:text-8xl font-black mb-6 cyberpunk-title">
              EVENT <span className="neon-blue">SCHEDULE</span>
            </h1>
            <p className="text-xl md:text-2xl lg:text-3xl font-light max-w-4xl mx-auto leading-relaxed mb-8">
              Plan your <span className="neon-pink">journey</span> through our 
              <span className="neon-purple"> detailed timeline</span> of digital experiences
            </p>
          </div>
        </div>
      </section>

      {/* Day Navigation */}
      <section className="py-12 relative overflow-y-auto max-h-screen">
        <div className="container mx-auto px-4">
          <div className="scroll-animate opacity-0 transform translate-y-20">
            <div className="flex justify-center mb-8">
              <div className="cyberpunk-card p-2">
                <div className="flex items-center space-x-2 sm:space-x-4 overflow-x-auto pb-2 whitespace-nowrap">
                  <button
                    onClick={() => setSelectedDay(Math.max(0, selectedDay - 1))}
                    disabled={selectedDay === 0}
                    className={`cyberpunk-btn cyberpunk-btn-secondary flex-shrink-0 ${selectedDay === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <ChevronLeft size={20} />
                  </button>
                  
                  <div className="flex space-x-1 sm:space-x-2 flex-shrink-0">
                    {schedule.map((day, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedDay(index)}
                        className={`px-3 sm:px-6 py-3 sm:py-4 rounded-lg font-medium transition-all duration-300 border-2 flex-shrink-0 ${
                          selectedDay === index
                            ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-blue-500 shadow-lg shadow-blue-500/25'
                            : 'text-gray-300 border-gray-600 hover:border-blue-500/50 hover:text-blue-400'
                        }`}
                      >
                        <div className="text-center">
                          <div className="font-bold text-sm sm:text-lg">{day.day}</div>
                          <div className="text-xs opacity-75 hidden sm:block">{day.date}</div>
                          <div className="text-xs mt-1">{(day.events ?? []).length}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                  
                  <button
                    onClick={() => setSelectedDay(Math.min(schedule.length - 1, selectedDay + 1))}
                    disabled={selectedDay === schedule.length - 1}
                    className={`cyberpunk-btn cyberpunk-btn-secondary flex-shrink-0 ${selectedDay === schedule.length - 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Selected Day Schedule */}
      {schedule.length > 0 && (
        <section className="py-12 relative">
          <div className="container mx-auto px-4">
            <div className="cyberpunk-card overflow-hidden">
              {/* Day Header */}
              <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-7 text-white">
                <div className="scroll-animate opacity-0 transform translate-y-20">
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-black mb-4 cyberpunk-title">{schedule[selectedDay].title}</h2>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-6 space-y-2 sm:space-y-0 text-sm sm:text-lg opacity-90">
                    <div className="flex items-center">
                      <Calendar size={14} className="mr-2" />
                      {schedule[selectedDay].date}
                    </div>
                    <div className="flex items-center">
                      <Clock size={14} className="mr-2" />
                      {(schedule[selectedDay]?.events ?? []).length} Events Scheduled
                    </div>
                  </div>
                </div>
              </div>

              {/* Events Timeline */}
              <div className="p-4 sm:p-6 md:p-8">
                <div className="space-y-6">
                  {(schedule[selectedDay]?.events ?? []).map((event, index) => (
                    <div
                      key={index}
                      className="scroll-animate opacity-0 transform translate-y-20"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <div className="cyberpunk-card group border-l-4 border-blue-500">
                        <div className="flex flex-col sm:flex-row sm:items-start space-y-4 sm:space-y-0 sm:space-x-6 p-4 sm:p-6">
                          {/* Time Block */}
                          <div className="flex-shrink-0 text-center mb-4 sm:mb-0">
                            <div className="bg-gradient-to-r from-gray-800 to-gray-900 text-white px-4 py-3 rounded-lg border border-blue-500/50">
                              <div className="text-sm sm:text-lg font-bold neon-blue">{event.time}</div>
                              <div className="text-xs text-gray-400 mt-1">{event.duration}</div>
                            </div>
                          </div>
                          
                          {/* Event Details */}
                          <div className="flex-grow w-full">
                            <div className="flex items-start justify-between mb-3">
                              <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-blue-400 transition-colors">
                                {event.title}
                              </h3>
                              <span className={`px-2 sm:px-4 py-1 sm:py-2 rounded-full text-xs sm:text-sm font-medium bg-gradient-to-r ${getTypeColor(event.type)} text-white shadow-lg flex-shrink-0 ml-2`}>
                                {event.type}
                              </span>
                            </div>
                            
                            <div className="flex items-center text-gray-400 mb-2 text-sm">
                              <MapPin size={16} className="mr-2 text-purple-400" />
                              <span>{event.venue}</span>
                            </div>
                            
                            {/* Event Type Indicator */}
                            <div className="flex items-center space-x-2">
                              <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${getTypeColor(event.type)}`}></div>
                              <span className="text-xs sm:text-sm text-gray-500">Duration: {event.duration}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Quick Stats */}
      <section className="py-12 relative">
        <div className="container mx-auto px-4">
          <div className="scroll-animate opacity-0 transform translate-y-20">
            <div className="cyberpunk-card">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-8 p-4 sm:p-8 text-center">
                <div>
                  <div className="text-2xl sm:text-4xl font-bold neon-blue mb-2">{schedule.length}</div>
                  <div className="text-gray-400 text-sm sm:text-base">Days of Events</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-4xl font-bold neon-purple mb-2">
                    {schedule.reduce((total, day) => total + (day.events ?? []).length, 0)}
                  </div>
                  <div className="text-gray-400 text-sm sm:text-base">Total Events</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-4xl font-bold neon-pink mb-2">12+</div>
                  <div className="text-gray-400 text-sm sm:text-base">Venues</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <style>
        {`
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
            0 0 3px #ff00ff,
            0 0 6px #ff00ff;
        }

        .neon-blue {
          color: #00ffff;
          text-shadow: 
            0 0 3px #00ffff,
            0 0 6px #00ffff;
        }

        .neon-purple {
          color: #8a2be2;
          text-shadow: 
            0 0 3px #8a2be2,
            0 0 6px #8a2be2;
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

        .cyberpunk-btn-secondary {
          border-color: #00ffff;
          color: #00ffff;
          box-shadow: 
            0 0 10px rgba(0, 255, 255, 0.2),
            inset 0 0 10px rgba(0, 255, 255, 0.05);
        }

        .cyberpunk-btn-secondary:hover {
          background: rgba(0, 255, 255, 0.1);
          box-shadow: 
            0 0 20px rgba(0, 255, 255, 0.4),
            inset 0 0 20px rgba(0, 255, 255, 0.1);
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
        `}
      </style>
    </div>
  );
};