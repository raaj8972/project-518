import React from 'react';
import DOMPurify from 'dompurify';
import { ScrollReveal } from '../ui/ScrollReveal';
import { BRAND_NAME, BRAND_YEAR } from '../../constants/brand';

interface AboutSettings {
  enabled: boolean;
  hero_title?: string;
  hero_heading?: string;
  hero_paragraphs?: string[];
  tracks?: string[];
  zones?: string[];
  stats?: { value: string; label: string }[];
}

interface AboutSectionProps {
  aboutSettings: AboutSettings;
}

const AboutSection: React.FC<AboutSectionProps> = ({ aboutSettings }) => {
  if (aboutSettings?.enabled !== true) return null;

  return (
    <section className="py-24 relative overflow-hidden gsap-fade-up">
      <div className="container mx-auto px-4 relative z-10">
        <div className="scroll-animate-3d">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-6xl font-black mb-6 stranger-title-glow uppercase">
              {aboutSettings?.hero_title ? aboutSettings.hero_title : 'ABOUT RICORRENZA'}
            </h2>
            <div className="w-24 h-1 bg-indigo-500/40 mx-auto mb-8 rounded-full"></div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* About Content */}
            <div className="scroll-animate-3d" style={{ animationDelay: '0.2s' }}>
              <div className="stranger-card p-6 sm:p-8 md:p-10 rounded-[2.5rem] md:rounded-[3rem]">
                <h3 className="text-2xl md:text-4xl font-black mb-8 text-white uppercase tracking-tight">
                  {aboutSettings?.hero_heading || 'THE FUTURE IS NOW'}
                </h3>
                <div className="space-y-6 text-white/60 leading-relaxed font-light text-lg">
                  {(aboutSettings?.hero_paragraphs && aboutSettings.hero_paragraphs.length > 0
                    ? aboutSettings.hero_paragraphs
                    : [
                        "{BRAND_NAME} {BRAND_YEAR} is not just a festival—it's a revolution that merges the boundaries between healthcare innovation, cutting-edge technology, and creative expression.",
                        'Born from the vision of creating a platform where digital dreams meet reality, RICORRENZA has evolved into the most anticipated festival experience, attracting visionaries, innovators, and creators from across the digital landscape.',
                        'Our festival celebrates the convergence of disciplines—where medical students become tech innovators, where artists code their creativity, and where the future of human potential is explored through immersive experiences.'
                      ]).map((para, i) => {
                    const html = DOMPurify.sanitize(para, { USE_PROFILES: { html: true } });
                    return (<p key={i} dangerouslySetInnerHTML={{ __html: html }} />);
                  })}
                </div>
                
                {/* Key Features */}
                <div className="mt-8 grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h4 className="text-lg font-bold text-indigo-400 mb-3">FESTIVAL TRACKS</h4>
                    <div className="space-y-2">
                      {(aboutSettings?.tracks?.length ? aboutSettings.tracks : [
                        'Healthcare Technology','Digital Arts & Media','Music','Interactive Experiences'
                      ]).map((track, index) => (
                        <div
                          key={index}
                          className="flex items-center space-x-2 achievement-item"
                          style={{ animationDelay: `${index * 0.1}s` }}
                        >
                          <div className="w-2 h-2 bg-indigo-500 rounded-full pulse-ring flex-shrink-0"></div>
                          <span className="text-gray-300 text-sm">{track}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="text-lg font-bold text-violet-400 mb-3">EXPERIENCE ZONES</h4>
                    <div className="space-y-2">
                      {(aboutSettings?.zones?.length ? aboutSettings.zones : [
                        'Virtual Reality Labs','AI Demonstration Pods','Art Galleries','Future Tech Showcases'
                      ]).map((zone, index) => (
                        <div
                          key={index}
                          className="flex items-center space-x-2 achievement-item"
                          style={{ animationDelay: `${index * 0.1 + 0.4}s` }}
                        >
                          <div className="w-2 h-2 bg-violet-500 rounded-full pulse-ring flex-shrink-0"></div>
                          <span className="text-gray-300 text-sm">{zone}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Visual Element */}
            <div className="scroll-animate-3d" style={{ animationDelay: '0.4s' }}>
              <div className="stranger-card p-6 sm:p-8 md:p-10 rounded-[2.5rem] md:rounded-[3rem] text-center">
                <div className="relative">
                  {/* Animated Stats */}
                  <div className="grid grid-cols-2 gap-8 mb-12">
                    {(aboutSettings?.stats?.length ? aboutSettings.stats : [
                      { value: BRAND_YEAR, label: 'FESTIVAL YEAR' },
                      { value: '3+', label: 'DAYS OF EVENTS' },
                      { value: '1000+', label: 'PARTICIPANTS' },
                      { value: '∞', label: 'POSSIBILITIES' }
                    ]).map((s, i) => (
                      <div key={i} className="text-center group">
                        <div className={`text-4xl md:text-5xl font-black mb-3 transition-transform duration-500 group-hover:scale-110 stranger-title-glow`}>{s.value}</div>
                        <div className="text-white/30 text-[9px] font-black tracking-widest uppercase">{s.label}</div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Mission Statement */}
                  <div className="border-t border-white/5 pt-8">
                    <h4 className="text-lg font-black mb-6 text-white uppercase tracking-widest">OUR MISSION</h4>
                    <p className="text-white/50 text-base leading-relaxed font-light italic">
                      "{aboutSettings?.hero_heading || 'Merging medicine, tech & culture to inspire, innovate and shape the future of healthcare'}"
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
