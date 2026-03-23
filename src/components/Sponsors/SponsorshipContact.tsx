import React from 'react';
import { Mail, Phone, MapPin, Download } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

interface ContactSection {
  id: string;
  title: string;
  content: string;
  icon: string;
  enabled: boolean;
}

interface SponsorshipContactProps {
  sponsorshipSettings: {
    call_to_action_text?: string;
    brochure_url?: string;
    brochure_title?: string;
  };
  enabledContactSections: ContactSection[];
  brandName: string;
  brandYear: string;
  onBrochureDownload: () => void;
}

const SponsorshipContact: React.FC<SponsorshipContactProps> = ({
  sponsorshipSettings,
  enabledContactSections,
  brandName,
  brandYear,
  onBrochureDownload
}) => {
  const getIconComponent = (iconName: string) => {
    const IconComponent = (LucideIcons as any)[iconName];
    return IconComponent || Mail;
  };

  return (
    <section className="py-20 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-red-950/40 via-orange-950/20 to-red-900/30"></div>
      <div className="container mx-auto px-4 relative z-10">
        <div className="stranger-card max-w-4xl mx-auto">
          <div className="p-8 md:p-12">
            <div className="scroll-animate opacity-0 transform translate-y-20 animate-in">
              <div className="text-center mb-12">
                <h2 className="text-4xl md:text-5xl font-black mb-6 stranger-title">
                  {sponsorshipSettings?.call_to_action_text || 'INTERESTED IN SPONSORING?'}
                </h2>
                <p className="text-xl text-gray-300">Connect with our sponsorship team</p>
              </div>
              
              {enabledContactSections.length > 0 && (
                <div className={`grid ${enabledContactSections.length <= 3 ? 'md:grid-cols-3' : 'md:grid-cols-2 lg:grid-cols-4'} gap-8 text-center mb-12`}>
                  {enabledContactSections.map((section, index) => {
                    const IconComponent = getIconComponent(section.icon);
                    return (
                      <div key={section.id} className="scroll-animate opacity-0 transform translate-y-20 hover-float animate-in" style={{ animationDelay: `${index * 0.1}s` }}>
                        <div className="mb-4">
                          <IconComponent className="w-8 h-8 mx-auto text-red-600 pulse-ring" />
                        </div>
                        <div className="font-semibold mb-2 text-white">{section.title}</div>
                        <div className="text-sm text-gray-300">{section.content}</div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Fallback contact info if no contact sections */}
              {enabledContactSections.length === 0 && (
                <div className="grid md:grid-cols-3 gap-8 text-center mb-12">
                  <div className="scroll-animate opacity-0 transform translate-y-20 hover-float animate-in">
                    <div className="mb-4">
                      <Mail className="w-8 h-8 mx-auto text-red-600 pulse-glow" />
                    </div>
                    <div className="font-semibold mb-2 text-white">Email</div>
                    <div className="text-sm text-gray-300">{brandName.toLowerCase()}{brandYear}@college.edu</div>
                  </div>
                  <div className="scroll-animate opacity-0 transform translate-y-20 hover-float animate-in" style={{ animationDelay: '0.1s' }}>
                    <div className="mb-4">
                      <Phone className="w-8 h-8 mx-auto text-red-600 pulse-glow" />
                    </div>
                    <div className="font-semibold mb-2 text-white">Phone</div>
                    <div className="text-sm text-gray-300">+91 98765 43210</div>
                  </div>
                  <div className="scroll-animate opacity-0 transform translate-y-20 hover-float animate-in" style={{ animationDelay: '0.2s' }}>
                    <div className="mb-4">
                      <MapPin className="w-8 h-8 mx-auto text-red-600 pulse-glow" />
                    </div>
                    <div className="font-semibold mb-2 text-white">Address</div>
                    <div className="text-sm text-gray-300">Campus</div>
                  </div>
                </div>
              )}

              <div className="text-center">
                <button 
                  onClick={onBrochureDownload}
                  disabled={!sponsorshipSettings?.brochure_url}
                  className={`stranger-btn text-lg px-8 py-4 hover-float ${
                    !sponsorshipSettings?.brochure_url ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <span className="relative z-10 flex items-center">
                    <Download className="mr-2" size={20} />
                    {sponsorshipSettings?.brochure_title || 'Download Sponsorship Brochure'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SponsorshipContact;
