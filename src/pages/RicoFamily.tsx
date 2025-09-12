import React, { useEffect, useState } from 'react';
import { Users, Heart, Star, Crown, Instagram, Youtube, AlignJustify as Spotify, Zap, ArrowRight, Shield } from 'lucide-react';
import { useData } from '../context/DataContext';
import HeroBackground from '../components/HeroBackground';
import { MembershipModal } from '../components/MembershipModal';
import InfiniteMarquee from '../components/InfiniteMarquee';
import CoverflowCarousel from '../components/CoverflowCarousel';
import FacultyProfileModal from '../components/FacultyProfileModal';

// Local FacultyHead type removed; rely on DataContext types instead

export const RicoFamily: React.FC = () => {
  const { facultyHeads, coreCommittees, coreTeamMembers, formSettings } = useData();
  const [glitchActive, setGlitchActive] = useState(false);
  const [membershipModal, setMembershipModal] = useState(false);
  const [facultyModalOpen, setFacultyModalOpen] = useState(false);
  const [selectedFaculty, setSelectedFaculty] = useState<any | null>(null);
  const [facultyPaused, setFacultyPaused] = useState(false);

  // Filter enabled faculty heads and sort by order
  const enabledFacultyHeads = (facultyHeads || [])
    .filter(faculty => faculty.enabled)
    .sort((a, b) => a.order_position - b.order_position);

  // Filter enabled committees and sort by order
  const enabledCommittees = (coreCommittees || [])
    .filter(committee => committee.enabled)
    .sort((a, b) => a.order_position - b.order_position);

  // Group members by committee
  const membersByCommittee = (coreTeamMembers || []).reduce((acc, member) => {
    if (member.enabled && member.committee_id) {
      if (!acc[member.committee_id]) {
        acc[member.committee_id] = [];
      }
      acc[member.committee_id].push(member);
    }
    return acc;
  }, {} as Record<string, typeof coreTeamMembers>);

  // Sort members within each committee by order position
  Object.keys(membersByCommittee).forEach(committee_id => {
    membersByCommittee[committee_id].sort((a, b) => a.order_position - b.order_position);
  });

  // Committee heads across all committees (for marquee)
  const committeeHeads = (coreTeamMembers || [])
    .filter(m => m.enabled && m.is_head)
    .sort((a, b) => a.order_position - b.order_position);

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
  }, [enabledFacultyHeads, enabledCommittees]); // Re-run when faculty heads or committees change

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
  // Social media settings available via context if needed

  return (
    <div className="cyberpunk-theme min-h-screen">
      {/* Hero Section */}
      <section className="hero-section relative min-h-screen flex items-center justify-center overflow-hidden">
        <HeroBackground pageKey="ricofamily" />

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
            <div className="inline-flex items-center bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 text-blue-400 px-6 py-3 rounded-full text-sm font-medium mb-8 backdrop-blur-sm">
              <Users className="w-5 h-4 mr-2 animate-pulse" />
              Fest Architects
            </div>
            <h1 className={`text-5xl md:text-7xl lg:text-8xl font-black mb-6 cyberpunk-title ${glitchActive ? 'glitch-active' : ''}`}>
              RICO <span className="neon-blue">FAMILY</span>
            </h1>
            <p className="text-xl md:text-2xl lg:text-3xl font-light max-w-4xl mx-auto leading-relaxed mb-8">
              Meet the <span className="neon-pink">visionaries</span>, 
              <span className="neon-purple"> innovators</span>, and 
              <span className="neon-blue"> leaders</span> who make RICORRENZA possible
            </p>
          </div>
        </div>
      </section>

      {/* Faculty Head Section — 3D coverflow autoplay */}
      {enabledFacultyHeads.length > 0 && (
        <section className="py-13 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-900/20 via-orange-900/30 to-red-900/20"></div>
          <div className="container mx-auto px-4 relative z-10">
            <div className="scroll-animate opacity-0 transform translate-y-20">
              <div className="text-center mb-8">
                <h2 className="text-2xl md:text-4xl font-black mb-4 cyberpunk-title">
                  FACULTY <span className="neon-yellow">LEADERSHIP</span>
                </h2>
                <div className="w-24 h-1 bg-gradient-to-r from-yellow-300 to-orange-500 mx-auto mb-4 expand-width"></div>
                <p className="text-lg text-gray-300 max-w-2xl mx-auto">
                  Leading the revolution in medical education
                </p>
              </div>
            </div>

            <CoverflowCarousel
              items={[...enabledFacultyHeads].sort((a, b) => a.order_position - b.order_position)}
              intervalMs={2600}
              visibleRange={2}
              stepPx={280}
              rotateYDeg={42}
              scaleStep={0.13}
              translateZStep={-80}
              blurPerStep={2.5}
              edgeFades={true}
              centerGlow={true}
              arrowSize={48}
              paused={facultyPaused}
              onItemClick={(item) => { setSelectedFaculty(item); setFacultyModalOpen(true); setFacultyPaused(true); }}
              pauseOnHover={true}
              showArrows={true}
              className="py-6"
              renderItem={(head) => (
                <div className="w-72 md:w-80 cyberpunk-card p-5">
                  <div className="aspect-square w-full overflow-hidden rounded-lg mb-4 bg-black/30">
                    <img src={head.image} alt={head.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                  </div>
                  <div className="font-bold text-white text-center">{head.name}</div>
                  <div className="text-sm text-gray-300 text-center">{head.title}</div>
                </div>
              )}
            />
          </div>
        </section>
      )}

      {/* Committee Heads marquee — opposite direction */}
      {committeeHeads.length > 0 && (
        <section className="py-13 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/30 to-pink-900/20"></div>
          <div className="container mx-auto px-4 relative z-10">
            <div className="scroll-animate opacity-0 transform translate-y-20">
              <div className="text-center mb-8">
                <h2 className="text-2xl md:text-4xl font-black mb-4 cyberpunk-title">
                  COMMITTEE <span className="neon-blue">HEADS</span>
                </h2>
                <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto mb-4 expand-width"></div>
                <p className="text-lg text-gray-300 max-w-2xl mx-auto">
                  Leading the specialized teams driving RICORRENZA's innovation
                </p>
              </div>
            </div>

            <InfiniteMarquee
              items={committeeHeads}
              direction="right"
              speedPxPerSec={140}
              itemWrapperClassName="px-3"
              className="py-2 -mx-4 sm:mx-0"
              renderItem={(m) => (
                <div className="w-64 cyberpunk-card p-4">
                  <div className="aspect-square w-full overflow-hidden rounded-lg mb-3 bg-black/30">
                    <img src={m.image} alt={m.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                  </div>
                  <div className="font-bold text-white flex items-center">
                    <Crown className="w-4 h-4 text-yellow-400 mr-1" /> {m.name}
                  </div>
                  <div className="text-sm text-gray-300">{m.role}</div>
                </div>
              )}
            />
          </div>
        </section>
      )}

      {/* Core Committees Section */}
      {enabledCommittees.length > 0 && (
        <section className="py-20 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/30 to-pink-900/20"></div>
          <div className="container mx-auto px-4 relative z-10">
            <div className="scroll-animate opacity-0 transform translate-y-20">
              <div className="text-center mb-16">
                <h2 className="text-5xl md:text-6xl font-black mb-6 cyberpunk-title">
                  CORE <span className="neon-blue">COMMITTEES</span>
                </h2>
                <div className="w-32 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto mb-8 expand-width"></div>
                <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                  The specialized teams driving RICORRENZA's innovation
                </p>
              </div>
            </div>

            {/* Committees */}
            <div className="space-y-16">
              {enabledCommittees.map((committee, committeeIndex) => {
                const allCommitteeMembers = membersByCommittee[committee.id] || [];
                const regularMembers = allCommitteeMembers.filter(member => !member.is_head);
                
                if (allCommitteeMembers.length === 0) return null;

                return (
                  <div
                    key={committee.id}
                    className="scroll-animate opacity-0 transform translate-y-20"
                    style={{ animationDelay: `${committeeIndex * 0.3}s` }}
                  >
                    {/* Committee Header */}
                    <div className="text-center mb-12">
                      <div className="inline-flex items-center bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 text-blue-400 px-6 py-3 rounded-full text-sm font-medium mb-6 backdrop-blur-sm">
                        <Users className="w-4 h-4 mr-2" />
                        {committee.is_core ? 'CORE COMMITTEE' : 'SPECIALIZED TEAM'}
                      </div>
                      <h3 className="text-4xl md:text-5xl font-black mb-4 cyberpunk-title committee-title" style={{ color: committee.color }}>
                        {committee.name.toUpperCase()}
                      </h3>
                      <p className="text-lg text-gray-300 max-w-2xl mx-auto">
                        {committee.description}
                      </p>
                    </div>

                    {/* Committee Head */}
                    {allCommitteeMembers.filter(m => m.is_head).length > 0 && (
                      <div className="mb-8">
                        <h4 className="text-lg font-semibold text-gray-300 mb-4 flex items-center justify-center">
                          <Crown className="w-5 h-5 text-yellow-500 mr-2" />
                          Committee Heads ({allCommitteeMembers.filter(m => m.is_head).length})
                        </h4>
                        <div className="grid md:grid-cols-2 gap-8">
                          {allCommitteeMembers.filter(m => m.is_head).map((head) => (
                            <div key={head.id} className="committee-head-card cyberpunk-card overflow-hidden faculty-spotlight">
                              <div className="grid md:grid-cols-2 gap-0">
                                {/* Image Section */}
                                <div className="relative h-85 md:h-auto overflow-hidden">
                                  <img
                                    src={head.image}
                                    alt={head.name}
                                    className="w-full h-full object-cover faculty-image"
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                                  <div className="absolute top-4 right-4">
                                    <Crown className="w-6 h-6 text-yellow-400 animate-pulse pulse-ring" />
                                  </div>
                                  <div className="absolute bottom-4 left-4 right-4">
                                    <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black px-4 py-1 rounded-full text-sm font-bold inline-block">
                                      COMMITTEE HEAD
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Content Section */}
                                <div className="p-6 flex flex-col justify-center">
                                  <h5 className="text-2xl font-bold text-white mb-2 neon-yellow faculty-name">
                                    {head.name}
                                  </h5>
                                  <p className="text-lg text-yellow-400 mb-3 font-semibold">
                                    {head.role}
                                  </p>
                                  <p className="text-gray-300 mb-4 leading-relaxed text-sm">
                                    {head.description}
                                  </p>
                                  <div className="mb-4">
                                    <span className="inline-block bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-full text-xs font-medium border border-yellow-500/30">
                                      {head.specialty}
                                    </span>
                                  </div>
                                  
                                  {/* Social Links */}
                                  {head.social_links && Object.values(head.social_links).some(link => link) && (
                                    <div className="flex space-x-3 mb-4">
                                      {head.social_links.instagram && (
                                        <a
                                          href={head.social_links.instagram}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-pink-400 hover:text-pink-300 transition-colors hover:scale-150"
                                        >
                                          <Instagram size={48} />
                                        </a>
                                      )}
                                      {head.social_links.youtube && (
                                        <a
                                          href={head.social_links.youtube}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-red-400 hover:text-red-300 transition-colors hover:scale-110"
                                        >
                                          <Youtube size={30} />
                                        </a>
                                      )}
                                      {head.social_links.spotify && (
                                        <a
                                          href={head.social_links.spotify}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-green-400 hover:text-green-300 transition-colors hover:scale-110"
                                        >
                                          <Spotify size={30} />
                                        </a>
                                      )}
                                    </div>
                                  )}
                                  
                                  {/* Achievements */}
                                  {head.achievements.length > 0 && (
                                    <div>
                                      <h6 className="text-sm font-bold text-cyan-400 mb-3">KEY ACHIEVEMENTS</h6>
                                      <div className="space-y-2">
                                        {head.achievements.map((achievement, achievementIndex) => (
                                          <div
                                            key={achievementIndex}
                                            className="flex items-start space-x-2 achievement-item"
                                            style={{ animationDelay: `${achievementIndex * 0.2}s` }}
                                          >
                                            <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2 pulse-ring flex-shrink-0"></div>
                                            <span className="text-gray-300 text-xs">{achievement}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Team Members Grid */}
                    {regularMembers.length > 0 && (
                      <>
                        <h4 className="text-lg font-semibold text-gray-300 mb-4 text-center">Team Members</h4>
                        <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
                          {regularMembers.map((member, memberIndex) => (
                            <div
                              key={member.id}
                              className="scroll-animate opacity-0 transform translate-y-20 hover-float team-card"
                              style={{ animationDelay: `${(committeeIndex * 0.3) + (memberIndex * 0.15)}s` }}
                            >
                              <div className="cyberpunk-card group h-full overflow-hidden">
                                {/* Member Image */}
                                <div className="relative h-80 overflow-hidden">
                                  <img
                                    src={member.image}
                                    alt={member.name}
                                    className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-110 team-member-image"
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                                  
                                  {/* Specialty Badge */}
                                  <div className="absolute top-2 left-2">
                                    <span 
                                      className="text-white px-2 py-1 rounded-full text-xs font-bold shadow-lg pulse-glow"
                                      style={{ backgroundColor: committee.color }}
                                    >
                                      {member.specialty}
                                    </span>
                                  </div>
                                  
                                  {/* Floating Icon */}
                                  <div className="absolute top-2 right-2 floating-icon">
                                    <Star className="w-4 h-4 text-yellow-400 animate-pulse" />
                                  </div>
                                </div>
                                
                                {/* Member Info */}
                                <div className="p-4">
                                  <h4 className="text-lg font-bold text-white mb-1 group-hover:text-blue-400 transition-colors member-name">
                                    {member.name}
                                  </h4>
                                  <p className="text-blue-400 font-semibold mb-2 text-sm">
                                    {member.role}
                                  </p>
                                  <p className="text-gray-300 text-xs leading-relaxed mb-3 line-clamp-2">
                                    {member.description}
                                  </p>
                                  
                                  {/* Social Links */}
                                  {member.social_links && Object.values(member.social_links).some(link => link) && (
                                    <div className="flex space-x-3 mb-3">
                                      {member.social_links.instagram && (
                                        <a
                                          href={member.social_links.instagram}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-pink-400 hover:text-pink-300 transition-colors hover:scale-110"
                                        >
                                          <Instagram size={28} />
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
                                    <div className="mb-3">
                                      <p className="text-xs font-bold text-cyan-400 uppercase tracking-wide mb-1">
                                        {member.achievements.length} Achievement{member.achievements.length !== 1 ? 's' : ''}
                                      </p>
                                      <div className="text-xs text-gray-500">
                                        {member.achievements.slice(0, 1).map((achievement, index) => (
                                          <div key={index} className="truncate">• {achievement}</div>
                                        ))}
                                        {member.achievements.length > 1 && (
                                          <div>+{member.achievements.length - 1} more</div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Animated Underline */}
                                  <div className="mt-2 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Legacy Core Team Section (fallback if no committees) */}
      {enabledCommittees.length === 0 && (
        <section className="py-20 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/30 to-pink-900/20"></div>
          <div className="container mx-auto px-4 relative z-10">
            <div className="scroll-animate opacity-0 transform translate-y-20">
              <div className="text-center mb-16">
                <h2 className="text-5xl md:text-6xl font-black mb-6 cyberpunk-title">
                  CORE <span className="neon-blue">TEAM</span>
                </h2>
                <div className="w-32 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto mb-8 expand-width"></div>
                <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                  Team information will be managed through the admin dashboard
                </p>
              </div>
            </div>

            <div className="text-center py-12">
              <div className="cyberpunk-card max-w-md mx-auto p-8">
                <Users size={64} className="mx-auto mb-4 text-gray-400" />
                <h3 className="text-xl font-semibold text-gray-300 mb-2">No Committees Yet</h3>
                <p className="text-gray-500">
                  Core team committees will be managed through the admin dashboard
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* All Styles */}
      <style>{`
        .committee-title {
          text-shadow: 
            0 0 10px currentColor,
            0 0 20px currentColor;
          animation: committeeGlow 3s ease-in-out infinite alternate;
        }

        @keyframes committeeGlow {
          from {
            text-shadow: 
              0 0 5px currentColor,
              0 0 10px currentColor;
          }
          to {
            text-shadow: 
              0 0 15px currentColor,
              0 0 25px currentColor,
              0 0 35px currentColor;
          }
        }

        .committee-head-card {
          position: relative;
          overflow: hidden;
        }
        
        .committee-head-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
          transition: left 0.5s;
        }
        
        .committee-head-card:hover::before {
          left: 100%;
        }

        @keyframes headNameGlow {
          from {
            text-shadow: 
              0 0 5px #ffff00,
              0 0 10px #ffff00;
          }
          to {
            text-shadow: 
              0 0 15px #ffff00,
              0 0 25px #ffff00,
              0 0 35px #ffff00;
          }
        }

      `}</style>

      {/* Values Section */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 via-blue-900/20 to-pink-900/20"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="scroll-animate opacity-0 transform translate-y-20">
            <div className="text-center mb-16">
              <h2 className="text-5xl md:text-6xl font-black mb-6 cyberpunk-title">
                OUR <span className="neon-pink">VALUES</span>
              </h2>
              <div className="w-32 h-1 bg-gradient-to-r from-purple-500 to-pink-500 mx-auto mb-8 expand-width"></div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { 
                icon: Heart, 
                title: 'COMPASSION', 
                desc: 'We believe in the healing power of empathy and human connection in healthcare' 
              },
              { 
                icon: Zap, 
                title: 'INNOVATION', 
                desc: 'Pushing the boundaries of medical science through technology and creative thinking' 
              },
              { 
                icon: Shield, 
                title: 'INTEGRITY', 
                desc: 'Maintaining the highest ethical standards in all our endeavors and relationships' 
              }
            ].map((value, index) => (
              <div key={index} className="scroll-animate opacity-0 transform translate-y-20 hover-float" style={{ animationDelay: `${index * 0.2}s` }}>
                <div className="cyberpunk-card group text-center p-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 group-hover:scale-110 transition-transform pulse-ring">
                    <value.icon size={32} className="text-white" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4 neon-text">{value.title}</h3>
                  <p className="text-gray-300 leading-relaxed">{value.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Join the Family CTA */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-pink-900/40 via-purple-900/60 to-blue-900/40"></div>
        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="scroll-animate opacity-0 transform translate-y-20">
            <h2 className="text-5xl md:text-7xl font-black mb-6 cyberpunk-title">
              JOIN THE <span className="neon-pink">FAMILY</span>
            </h2>
            <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
              Become part of the RICORRENZA legacy and help shape the future of medical education
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-12">
              {formSettings?.membership_form_enabled ? (
                <button 
                  onClick={() => setMembershipModal(true)}
                  className="cyberpunk-btn cyberpunk-btn-primary group text-lg px-8 py-4 hover-float"
                >
                  <span className="relative z-10 flex items-center">
                    <Users className="mr-2 group-hover:animate-pulse" size={24} />
                    BECOME A MEMBER
                    <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={24} />
                  </span>
                </button>
              ) : (
                <div className="cyberpunk-card p-6 text-center max-w-md">
                  <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-semibold text-gray-300 mb-2">Membership Closed</h3>
                  <p className="text-gray-500 text-sm">
                    {formSettings?.membership_form_message || 'Membership applications are currently closed. Please check back later.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Membership Modal */}
      {formSettings?.membership_form_enabled && (
        <MembershipModal
          isOpen={membershipModal}
          onClose={() => setMembershipModal(false)}
        />
      )}

      {/* Faculty Profile Modal */}
      <FacultyProfileModal
        open={facultyModalOpen}
        onClose={() => { setFacultyModalOpen(false); setFacultyPaused(false); }}
        person={selectedFaculty}
      />

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

        .neon-yellow {
          color: #ffff00;
          text-shadow: 
            0 0 5px #ffff00,
            0 0 10px #ffff00;
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

        /* Faculty Head Specific Styles */
        .faculty-spotlight {
          position: relative;
          overflow: hidden;
        }

        .faculty-spotlight::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(45deg, transparent 30%, rgba(255, 255, 0, 0.05) 50%, transparent 70%);
          animation: facultyShine 4s ease-in-out infinite;
          pointer-events: none;
        }

        @keyframes facultyShine {
          0%, 100% { transform: translateX(-100%) rotate(45deg); }
          50% { transform: translateX(100%) rotate(45deg); }
        }

        .faculty-image {
          transition: all 0.5s ease;
          filter: grayscale(20%) contrast(110%);
        }

        .faculty-spotlight:hover .faculty-image {
          filter: grayscale(0%) contrast(120%);
          transform: scale(1.05);
        }

        .faculty-name {
          animation: nameGlow 3s ease-in-out infinite alternate;
        }

        @keyframes nameGlow {
          from {
            text-shadow: 
              0 0 5px #ffff00,
              0 0 10px #ffff00;
          }
          to {
            text-shadow: 
              0 0 10px #ffff00,
              0 0 20px #ffff00,
              0 0 30px #ffff00;
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

        /* Core Team Specific Styles */
        .team-card {
          position: relative;
        }

        .team-card::before {
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

        .team-card:hover::before {
          opacity: 1;
          animation: teamCardSweep 1s ease-in-out;
        }

        @keyframes teamCardSweep {
          0% { transform: translateX(-100%) rotate(45deg); }
          100% { transform: translateX(100%) rotate(45deg); }
        }

        .team-member-image {
          filter: grayscale(30%) contrast(110%);
          transition: all 0.5s ease;
        }

        .team-card:hover .team-member-image {
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

        .team-card:hover .member-name::after {
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