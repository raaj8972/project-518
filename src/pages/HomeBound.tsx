import React, { useEffect, useState } from 'react';
import { Music, Heart, Users, Star, Instagram, Youtube, AlignJustify as Spotify, Sparkles, Zap, ArrowRight, Mic, Guitar, Headphones, Volume2 } from 'lucide-react';
import { useData } from '../context/DataContext';
import HeroBackground from '../components/HeroBackground';
import { AuditionModal } from '../components/AuditionModal';

export const HomeBound: React.FC = () => {
  const { bandMembers, formSettings, homeboundSettings } = useData();
  const [glitchActive, setGlitchActive] = useState(false);
  const [auditionModal, setAuditionModal] = useState(false);

  // Filter enabled band members and sort by order
  const enabledBandMembers = (bandMembers || [])
    .filter(member => member.enabled)
    .sort((a, b) => a.order_position - b.order_position);

  // Get featured members (singers/main performers)
  const featuredMembers = enabledBandMembers.filter(member => member.is_featured);
  const regularMembers = enabledBandMembers.filter(member => !member.is_featured);

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
  }, [enabledBandMembers]);

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

  // Check if social media links should be shown
  // Prefer HomeBound-specific Instagram if configured

  return (
    <div className="cyberpunk-theme min-h-screen">
      {/* Hero Section */}
      <section className="hero-section relative min-h-screen flex items-center justify-center overflow-hidden">
        <HeroBackground pageKey="homebound" />

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

        {/* Hero Content */}
        <div className="relative z-10 text-center text-white max-w-6xl mx-auto px-4">
          <div className="scroll-animate opacity-0 transform translate-y-20">
            <div className="inline-flex items-center bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 text-purple-400 px-6 py-3 rounded-full text-sm font-medium mb-8 backdrop-blur-sm">
              <Music className="w-4 h-4 mr-2 animate-pulse" />
               BAND
            </div>
            <h1 className={`text-5xl md:text-7xl lg:text-8xl font-black mb-6 cyberpunk-title ${glitchActive ? 'glitch-active' : ''}`}>
              HOME <span className="neon-purple">BOUND</span>
            </h1>
            <p className="text-xl md:text-2xl lg:text-3xl font-light max-w-4xl mx-auto leading-relaxed mb-8">
              The <span className="neon-pink">official band</span> of RICORRENZA 2025, bringing 
              <span className="neon-blue">  beats</span> and 
              <span className="neon-purple">  melodies</span> to life
            </p>
          </div>
        </div>
      </section>

      {/* Featured Members (Singers/Main Performers) */}
      {featuredMembers.length > 0 && (
        <section className="py-20 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-pink-900/20 via-purple-900/30 to-blue-900/20"></div>
          <div className="container mx-auto px-4 relative z-10">
            <div className="scroll-animate opacity-0 transform translate-y-20">
              <div className="text-center mb-16">
                <h2 className="text-4xl md:text-5xl font-black mb-6 cyberpunk-title">
                  FEATURED <span className="neon-pink">ARTISTS</span>
                </h2>
                <div className="w-32 h-1 bg-gradient-to-r from-pink-500 to-purple-500 mx-auto mb-8 expand-width"></div>
                <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                  Meet the voices and talents that define our  sound
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-12">
              {featuredMembers.map((member, index) => (
                <div
                  key={member.id}
                  className="scroll-animate opacity-0 transform translate-y-20"
                  style={{ animationDelay: `${index * 0.3}s` }}
                >
                  <div className="cyberpunk-card overflow-hidden featured-artist">
                    <div className="grid md:grid-cols-2 gap-0">
                      {/* Image Section */}
                      <div className="relative h-80 overflow-hidden">
                        <img
                          src={member.image}
                          alt={member.name}
                          className="w-full h-full object-cover artist-image"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                        <div className="absolute top-4 right-4">
                          <Star className="w-6 h-6 text-pink-400 animate-pulse pulse-ring" />
                        </div>
                        <div className="absolute bottom-4 left-4 right-4">
                          <div className="bg-gradient-to-r from-pink-400 to-purple-500 text-white px-3 py-1 rounded-full text-xs font-bold inline-block">
                            FEATURED ARTIST
                          </div>
                        </div>
                      </div>
                      
                      {/* Content Section */}
                      <div className="p-6 flex flex-col justify-center">
                        <h3 className="text-2xl font-bold text-white mb-2 neon-pink artist-name">
                          {member.name}
                        </h3>
                        <p className="text-lg text-pink-400 mb-3 font-semibold">
                          {member.role}
                        </p>
                        <div className="mb-3">
                          <span className="inline-block bg-purple-500/20 text-purple-400 px-3 py-1 rounded-full text-sm font-medium border border-purple-500/30">
                            {member.specialty}
                          </span>
                        </div>
                        <p className="text-gray-300 mb-4 leading-relaxed text-sm">
                          {member.description}
                        </p>
                        
                        {/* Social Links */}
                        {member.social_links && Object.keys(member.social_links).length > 0 && (
                          <div className="flex space-x-3 mb-4">
                            {member.social_links.instagram && (
                              <a
                                href={member.social_links.instagram}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-pink-400 hover:text-pink-300 transition-colors"
                              >
                                <Instagram size={40} />
                              </a>
                            )}
                            {member.social_links.youtube && (
                              <a
                                href={member.social_links.youtube}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-red-400 hover:text-red-300 transition-colors"
                              >
                                <Youtube size={20} />
                              </a>
                            )}
                            {member.social_links.spotify && (
                              <a
                                href={member.social_links.spotify}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-green-400 hover:text-green-300 transition-colors"
                              >
                                <Spotify size={20} />
                              </a>
                            )}
                          </div>
                        )}
                        
                        {/* Achievements */}
                        {member.achievements.length > 0 && (
                          <div>
                            <h4 className="text-sm font-bold text-cyan-400 mb-3">ACHIEVEMENTS</h4>
                            <div className="space-y-2">
                              {member.achievements.slice(0, 3).map((achievement, achievementIndex) => (
                                <div
                                  key={achievementIndex}
                                  className="flex items-start space-x-2 achievement-item"
                                  style={{ animationDelay: `${achievementIndex * 0.2}s` }}
                                >
                                  <div className="w-2 h-2 bg-pink-400 rounded-full mt-2 pulse-ring flex-shrink-0"></div>
                                  <span className="text-gray-300 text-xs">{achievement}</span>
                                </div>
                              ))}
                              {member.achievements.length > 3 && (
                                <div className="text-xs text-gray-500">
                                  +{member.achievements.length - 3} more achievements
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Band Members Section */}
      {regularMembers.length > 0 && (
        <section className="py-20 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/30 to-pink-900/20"></div>
          <div className="container mx-auto px-4 relative z-10">
            <div className="scroll-animate opacity-0 transform translate-y-20">
              <div className="text-center mb-16">
                <h2 className="text-4xl md:text-5xl font-black mb-6 cyberpunk-title">
                  BAND <span className="neon-blue">MEMBERS</span>
                </h2>
                <div className="w-32 h-1 bg-gradient-to-r from-blue-500 to-cyan-500 mx-auto mb-8 expand-width"></div>
                <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                  The talented musicians and artists behind our  sound
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {regularMembers.map((member, index) => (
                <div
                  key={member.id}
                  className="scroll-animate opacity-0 transform translate-y-20 hover-float band-card"
                  style={{ animationDelay: `${index * 0.15}s` }}
                >
                  <div className="cyberpunk-card group h-full overflow-hidden">
                    {/* Member Image */}
                    <div className="relative h-64 overflow-hidden">
                      <img
                        src={member.image}
                        alt={member.name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 band-member-image"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                      
                      {/* Specialty Badge */}
                      <div className="absolute top-4 left-4">
                        <span className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg pulse-glow">
                          {member.category}
                        </span>
                      </div>
                      
                      {/* Category Badge */}
                      <div className="absolute bottom-4 left-4">
                        <span className="bg-black/70 text-white px-2 py-1 rounded text-xs font-medium">
                          {member.specialty}
                        </span>
                      </div>
                      
                      {/* Floating Icon */}
                      <div className="absolute top-4 right-4 floating-icon">
                        <Volume2 className="w-6 h-6 text-cyan-400 animate-pulse" />
                      </div>
                    </div>
                    
                    {/* Member Info */}
                    <div className="p-6">
                      <h4 className="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors member-name">
                        {member.name}
                      </h4>
                      <p className="text-blue-400 font-semibold mb-3 text-sm">
                        {member.role}
                      </p>
                      <p className="text-gray-300 text-sm leading-relaxed mb-4">
                        {member.description}
                      </p>
                      
                      {/* Social Links */}
                      {member.social_links && Object.keys(member.social_links).length > 0 && (
                        <div className="flex space-x-3 mb-4">
                          {member.social_links.instagram && (
                            <a
                              href={member.social_links.instagram}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-pink-400 hover:text-pink-300 transition-colors hover:scale-110"
                            >
                              <Instagram size={18} />
                            </a>
                          )}
                          {member.social_links.youtube && (
                            <a
                              href={member.social_links.youtube}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-red-400 hover:text-red-300 transition-colors hover:scale-110"
                            >
                              <Youtube size={18} />
                            </a>
                          )}
                          {member.social_links.spotify && (
                            <a
                              href={member.social_links.spotify}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-green-400 hover:text-green-300 transition-colors hover:scale-110"
                            >
                              <Spotify size={18} />
                            </a>
                          )}
                        </div>
                      )}
                      
                      {/* Achievements */}
                      {member.achievements.length > 0 && (
                        <div>
                          <h5 className="text-xs font-bold text-cyan-400 uppercase tracking-wide mb-2">Achievements</h5>
                          <div className="space-y-1">
                            {member.achievements.slice(0, 2).map((achievement, achievementIndex) => (
                              <div
                                key={achievementIndex}
                                className="flex items-start space-x-2 achievement-item"
                                style={{ animationDelay: `${achievementIndex * 0.2}s` }}
                              >
                                <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full mt-1.5 pulse-ring flex-shrink-0"></div>
                                <span className="text-gray-300 text-xs">{achievement}</span>
                              </div>
                            ))}
                            {member.achievements.length > 2 && (
                              <div className="text-xs text-gray-500">
                                +{member.achievements.length - 2} more achievements
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Animated Underline */}
                      <div className="mt-4 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* No Band Members Message */}
      {enabledBandMembers.length === 0 && (
        <section className="py-20 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/30 to-pink-900/20"></div>
          <div className="container mx-auto px-4 relative z-10">
            <div className="scroll-animate opacity-0 transform translate-y-20">
              <div className="text-center mb-16">
                <h2 className="text-4xl md:text-5xl font-black mb-6 cyberpunk-title">
                  BAND <span className="neon-blue">MEMBERS</span>
                </h2>
                <div className="w-32 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto mb-8 expand-width"></div>
              </div>
            </div>

            <div className="text-center py-12">
              <div className="cyberpunk-card max-w-md mx-auto p-8">
                <Music size={64} className="mx-auto mb-4 text-gray-400" />
                <h3 className="text-xl font-semibold text-gray-300 mb-2">No Band Members Yet</h3>
                <p className="text-gray-500">
                  Band members will be managed through the admin dashboard
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* About the Band */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 via-blue-900/20 to-pink-900/20"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="scroll-animate opacity-0 transform translate-y-20">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-black mb-6 cyberpunk-title">
                OUR <span className="neon-purple">SOUND</span>
              </h2>
              <div className="w-32 h-1 bg-gradient-to-r from-purple-500 to-pink-500 mx-auto mb-8 expand-width"></div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { 
                icon: Mic, 
                title: 'VOCALS', 
                desc: 'Powerful voices that blend traditional melodies with futuristic electronic beats' 
              },
              { 
                icon: Guitar, 
                title: 'INSTRUMENTS', 
                desc: 'Master musicians creating the perfect fusion of acoustic and digital soundscapes' 
              },
              { 
                icon: Headphones, 
                title: 'PRODUCTION', 
                desc: 'Cutting-edge audio engineering and production that defines our aesthetic' 
              }
            ].map((item, index) => (
              <div key={index} className="scroll-animate opacity-0 transform translate-y-20 hover-float" style={{ animationDelay: `${index * 0.2}s` }}>
                <div className="cyberpunk-card group text-center p-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 group-hover:scale-110 transition-transform pulse-ring">
                    <item.icon size={32} className="text-white" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4 neon-text">{item.title}</h3>
                  <p className="text-gray-300 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Join the Band CTA */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-pink-900/40 via-purple-900/60 to-blue-900/40"></div>
        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="scroll-animate opacity-0 transform translate-y-20">
            <h2 className="text-5xl md:text-7xl font-black mb-6 cyberpunk-title">
              JOIN THE <span className="neon-pink">BAND</span>
            </h2>
            <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
              Become part of Home Bound and help create the soundtrack for RICORRENZA 2025
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-12">
              {formSettings?.audition_form_enabled ? (
                <button 
                  onClick={() => setAuditionModal(true)}
                  className="cyberpunk-btn cyberpunk-btn-primary group text-lg px-8 py-4 hover-float"
                >
                  <span className="relative z-10 flex items-center">
                    <Music className="mr-2 group-hover:animate-pulse" size={24} />
                    AUDITION NOW
                    <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={24} />
                  </span>
                </button>
              ) : (
                <div className="cyberpunk-card p-6 text-center max-w-md">
                  <Music className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-semibold text-gray-300 mb-2">Auditions Closed</h3>
                  <p className="text-gray-500 text-sm">
                    {formSettings?.audition_form_message || 'Auditions are currently closed. Please check back later.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Audition Modal */}
      {/* HomeBound Instagram Link (footer-like section) */}
      {(homeboundSettings?.instagram_enabled && homeboundSettings?.instagram_url) && (
        <section className="py-8 bg-black/60 border-t border-pink-500/20">
          <div className="container mx-auto px-4 text-center">
            <a
              href={homeboundSettings.instagram_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 text-pink-400 hover:text-pink-300 transition-colors"
            >
              <Instagram className="w-6 h-6" />
              <span className="font-medium">Follow Home Bound on Instagram</span>
            </a>
          </div>
        </section>
      )}
      {formSettings?.audition_form_enabled && (
        <AuditionModal
          isOpen={auditionModal}
          onClose={() => setAuditionModal(false)}
        />
      )}

      <style>{`
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

        .neon-text {
          color: #00ffff;
          text-shadow: 
            0 0 5px #00ffff,
            0 0 10px #00ffff,
            0 0 15px #00ffff;
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

        .expand-width {
          animation: expandWidth 1s ease-out 0.8s both;
        }

        @keyframes expandWidth {
          from {
            width: 0;
          }
          to {
            width: 8rem;
          }
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

        /* Featured Artist Specific Styles */
        .featured-artist {
          position: relative;
          overflow: hidden;
        }

        .featured-artist::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(45deg, transparent 30%, rgba(255, 0, 255, 0.05) 50%, transparent 70%);
          animation: artistShine 4s ease-in-out infinite;
          pointer-events: none;
        }

        @keyframes artistShine {
          0%, 100% { transform: translateX(-100%) rotate(45deg); }
          50% { transform: translateX(100%) rotate(45deg); }
        }

        .artist-image {
          transition: all 0.5s ease;
          filter: grayscale(20%) contrast(110%);
        }

        .featured-artist:hover .artist-image {
          filter: grayscale(0%) contrast(120%);
          transform: scale(1.05);
        }

        .artist-name {
          animation: nameGlow 3s ease-in-out infinite alternate;
        }

        @keyframes nameGlow {
          from {
            text-shadow: 
              0 0 5px #ff00ff,
              0 0 10px #ff00ff;
          }
          to {
            text-shadow: 
              0 0 10px #ff00ff,
              0 0 20px #ff00ff,
              0 0 30px #ff00ff;
          }
        }

        /* Band Member Specific Styles */
        .band-card {
          position: relative;
        }

        .band-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(45deg, transparent, rgba(0, 255, 255, 0.1), transparent);
          opacity: 0;
          transition: opacity 0.5s ease;
          pointer-events: none;
          z-index: 1;
        }

        .band-card:hover::before {
          opacity: 1;
          animation: bandCardSweep 1s ease-in-out;
        }

        @keyframes bandCardSweep {
          0% { transform: translateX(-100%) rotate(45deg); }
          100% { transform: translateX(100%) rotate(45deg); }
        }

        .band-member-image {
          filter: grayscale(30%) contrast(110%);
          transition: all 0.5s ease;
        }

        .band-card:hover .band-member-image {
          filter: grayscale(0%) contrast(120%);
        }

        .member-name {
          position: relative;
          overflow: hidden;
        }

        .member-name::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          width: 0;
          height: 2px;
          background: linear-gradient(90deg, #00ffff, #ff00ff);
          transition: width 0.5s ease;
        }

        .band-card:hover .member-name::after {
          width: 100%;
        }

        .floating-icon {
          animation: floatingIcon 3s ease-in-out infinite;
        }

        @keyframes floatingIcon {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(180deg); }
        }

        .pulse-glow {
          animation: pulseGlow 2s ease-in-out infinite alternate;
        }

        @keyframes pulseGlow {
          from {
            box-shadow: 0 0 5px rgba(59, 130, 246, 0.3);
          }
          to {
            box-shadow: 0 0 15px rgba(59, 130, 246, 0.6);
          }
        }

        .achievement-item {
          opacity: 0;
          animation: achievementSlideIn 0.6s ease-out forwards;
        }

        @keyframes achievementSlideIn {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
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
          
          .container {
            padding-left: 1rem;
            padding-right: 1rem;
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
          
          .container {
            padding-left: 0.5rem;
            padding-right: 0.5rem;
          }
        }
      `}</style>
    </div>
  );
};