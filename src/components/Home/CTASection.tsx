import React from 'react';
import { Zap, Users, ArrowRight } from 'lucide-react';
import { Parallax } from '../ui/Parallax';
import { KineticText } from '../ui/KineticText';

interface CTASectionProps {
  formSettings: any;
  setMembershipModal: (open: boolean) => void;
}

const CTASection: React.FC<CTASectionProps> = ({
  formSettings,
  setMembershipModal
}) => {
  return (
    <section className="py-32 relative overflow-hidden gsap-fade-up">
      <div className="container mx-auto px-4 text-center relative z-10">
        <Parallax speed={0.3}>
          <div className="scroll-animate-3d">
            <KineticText as="h2" className="text-4xl sm:text-6xl md:text-8xl font-black mb-8 stranger-title-glow uppercase tracking-tighter">
              JOIN THE FUTURE
            </KineticText>
            <p className="text-xl md:text-2xl text-white/50 mb-16 max-w-3xl mx-auto font-light leading-relaxed">
              Be part of the most innovative festival experience
            </p>
            
            <div className="flex flex-col sm:flex-row gap-8 justify-center items-center">
              <a
                href="/events"
                className="stranger-btn stranger-btn-primary px-12 py-5 text-base"
              >
                <span className="relative z-10 flex items-center gap-4">
                  <Zap className="w-6 h-6" />
                  Register Now
                  <ArrowRight className="w-6 h-6" />
                </span>
              </a>
            
              {formSettings?.membership_form_enabled && (
                <button 
                  onClick={() => setMembershipModal(true)}
                  className="stranger-btn px-12 py-5 text-base"
                >
                  <span className="relative z-10 flex items-center gap-4">
                    <Users className="w-6 h-6" />
                    Join the Family
                    <ArrowRight className="w-6 h-6" />
                  </span>
                </button>
              )}
            </div>
          </div>
        </Parallax>
      </div>
    </section>
  );
};

export default CTASection;
