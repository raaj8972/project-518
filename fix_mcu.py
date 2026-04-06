import re

file_path = "src/pages/RicoFamily.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Find where the Values section starts
split_marker = "      {/* Values Section */}"
if split_marker in content:
    top_part = content.split(split_marker)[0]
    
    bottom_part = """      {/* Values Section */}
      <section className="py-20 relative overflow-hidden bg-[#030712] border-t border-cyan-500/20">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.02]"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className={!isMobile ? "scroll-animate opacity-0 transform translate-y-20" : ""}>
            <div className="text-center mb-16">
              <h2 className="text-4xl sm:text-5xl md:text-7xl mb-4 mcu-title-text mcu-title-glow">
                CORE <span className="text-cyan-500/80 font-light">DIRECTIVES</span>
              </h2>
              <div className="w-32 h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent mx-auto mb-8 expand-width"></div>
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
              <div key={index} className={!isMobile ? "scroll-animate opacity-0 transform translate-y-20 hover-float" : "hover-float"} style={{ animationDelay: `${index * 0.2}s` }}>
                <div className="shield-dossier clip-angular-br border-cyan-500/30 bg-black/60 backdrop-blur-md box-glow-cyan p-8 group transition-all duration-300 relative">
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.2] mix-blend-overlay"></div>
                  {/* Corner Target Markers */}
                  <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-cyan-500/50"></div>
                  <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-cyan-500/50"></div>
                  
                  <div className="inline-flex items-center justify-center w-16 h-16 mb-6 bg-cyan-500/10 border border-cyan-500/50 clip-angular-sm group-hover:bg-cyan-500/20 transition-colors">
                    <value.icon size={32} className="text-cyan-400 group-hover:text-cyan-300 pulse-glow" />
                  </div>
                  <h3 className="text-xl font-bold mb-4 mcu-title-text text-cyan-50 tracking-wider">{value.title}</h3>
                  <p className="text-cyan-100/60 font-light font-mono text-sm leading-relaxed">{value.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Join the Family CTA */}
      <section className="py-20 relative overflow-hidden bg-[#030712] border-t border-cyan-500/20">
        <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[150px] pointer-events-none mix-blend-screen"></div>
        <div className="container mx-auto px-4 text-center relative z-10">
          <div className={!isMobile ? "scroll-animate opacity-0 transform translate-y-20" : ""}>
            <h2 className="text-4xl sm:text-5xl md:text-7xl mb-4 mcu-title-text mcu-title-glow">
              JOIN THE <span className="text-cyan-500/80 font-light">INITIATIVE</span>
            </h2>
            <p className="text-sm md:text-lg text-cyan-100/50 mb-8 max-w-3xl mx-auto font-light hud-monospace">
              Become part of the RICORRENZA legacy and help shape the future of medical education
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-12">
              {formSettings?.membership_form_enabled ? (
                <button 
                  onClick={() => startTransition(() => setMembershipModal(true))}
                  className="relative px-8 py-4 bg-cyan-500/10 border border-cyan-500 text-cyan-400 font-bold tracking-[0.2em] uppercase box-glow-cyan clip-angular-sm transition-all hover:bg-cyan-500/30 hover:text-white group hover:-translate-y-1"
                >
                  <span className="relative z-10 flex items-center">
                    <Users className="mr-3 w-5 h-5 text-cyan-300" />
                    ENLIST NOW
                    <ArrowRight className="ml-3 w-5 h-5 text-cyan-300 group-hover:translate-x-2 transition-transform" />
                  </span>
                </button>
              ) : (
                <div className="shield-dossier clip-angular-br border-red-500/30 bg-black/60 backdrop-blur-md box-glow-red p-8 max-w-md mx-auto">
                  <div className="inline-flex items-center justify-center w-12 h-12 mb-4 bg-red-500/10 border border-red-500/50 clip-angular-sm">
                    <Shield className="w-6 h-6 text-red-500" />
                  </div>
                  <h3 className="mcu-title-text text-red-400 text-xl mb-2">ACCESS RESTRICTED</h3>
                  <p className="text-red-300/70 hud-monospace text-xs">
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
          onClose={() => startTransition(() => setMembershipModal(false))}
        />
      )}

      {/* Faculty Profile Modal */}
      <FacultyProfileModal
        open={facultyModalOpen}
        onClose={() => { startTransition(() => { setFacultyModalOpen(false); setFacultyPaused(false); }); }}
        person={selectedFaculty ? {
          name: selectedFaculty.name,
          title: selectedFaculty.title,
          image: selectedFaculty.image,
          email: (selectedFaculty as any).email,
          phone: (selectedFaculty as any).phone,
          social_links: (selectedFaculty as any).social_links,
        } : null}
      />
    </div>
  );
};
"""
    new_content = top_part + bottom_part
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(new_content)
    print("Successfully replaced the neon/synthwave style with MCU styling.")
else:
    print("Could not find the target section.")
