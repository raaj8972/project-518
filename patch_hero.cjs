const fs = require('fs');

let content = fs.readFileSync('src/components/HomeHero.tsx', 'utf8');

// 1. Add BollywoodHeroContent import if missing
if (!content.includes('BollywoodHeroContent')) {
  content = content.replace("import GlitchBrandName", "import { useTheme } from '../context/ThemeContext';\nimport { BollywoodHeroContent } from './ui/BollywoodHeroContent';\nimport GlitchBrandName");
  content = content.replace("const { homepageSettings } = useData();", "const { homepageSettings } = useData();\n  const { theme } = useTheme();");
}

// 2. Disable GSAP for Bollywood theme
if (!content.includes("if (theme === 'bollywood')")) {
  content = content.replace(
    "gsap.registerPlugin(ScrollTrigger);",
    `gsap.registerPlugin(ScrollTrigger);\n    \n    if (theme === 'bollywood') {\n      if (textContainerRef.current) {\n        gsap.set(textContainerRef.current, { clearProps: 'all', opacity: 1, y: 0, scale: 1 });\n      }\n      if (scrollHintRef.current) {\n        gsap.set(scrollHintRef.current, { clearProps: 'all', opacity: 1 });\n      }\n      return;\n    }`
  );
}

// 3. Fix the rendering block
const renderBlockStart = '{/* Hero Content */}';
const renderBlockEnd = '<div ref={scrollHintRef}';

const parts = content.split('{/* Hero Content */}');
if (parts.length > 1) {
  const parts2 = parts[1].split('<div ref={scrollHintRef}');
  
  const originalMiddle = parts2[0];
  
  // We completely replace the middle part.
  const newMiddle = `
        <div 
          ref={textContainerRef}
          className="relative z-10 w-full opacity-0 translate-y-12 scale-95 flex justify-center items-center h-full min-h-[80vh]"
        >
          {theme === 'bollywood' ? (
            <BollywoodHeroContent scrollReady={true} />
          ) : (
            <div className="text-center text-white max-w-6xl mx-auto px-4 mt-16 md:mt-0">
              <div className="flex flex-col items-center justify-center space-y-6 md:space-y-8 w-full">
                <div className="inline-flex items-center justify-center bg-red-950/20 backdrop-blur-xl border border-red-900/30 px-6 py-3 md:py-3 rounded-full text-[3.5vw] sm:text-sm font-black uppercase tracking-[0.25em] text-red-500/90 shadow-[0_8px_32px_rgba(0,0,0,0.6)] hover:bg-red-900/20 transition-colors duration-300">
                  <Sparkles className="w-5 h-5 mr-3 text-red-600 animate-pulse" />
                  ANNUAL FESTIVAL
                </div>
                
                <div className="relative overflow-visible">
                  <div className="text-[10vw] leading-[1.8] sm:text-8xl md:text-9xl lg:text-[10rem] font-black tracking-tighter drop-shadow-[0_0_30px_rgba(220,38,38,0.5)] overflow-visible">
                    <GlitchBrandName />
                  </div>
                </div>
                
                <p className="text-[6vw] sm:text-4xl md:text-5xl font-bold max-w-4xl mx-auto leading-tight text-transparent bg-clip-text bg-gradient-to-r from-red-50 to-red-600 drop-shadow-md">
                  {homepageSettings?.hero_subtitle || 'Welcome to the Experience'}
                </p>
                
                <p className="text-[4.5vw] sm:text-2xl text-gray-400 max-w-3xl mx-auto leading-relaxed font-medium px-4">
                  {homepageSettings?.hero_description || 'Where Healthcare meets Technology and Creativity'}
                </p>
                
                <div className="flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-6 pt-8">
                  <a
                    href="/events"
                    className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-red-700 to-black hover:from-red-600 hover:to-zinc-900 text-white font-bold tracking-widest uppercase text-sm transition-all duration-300 shadow-[0_8px_32px_rgba(220,38,38,0.4)] hover:shadow-[0_16px_48px_rgba(220,38,38,0.6)] hover:-translate-y-1 flex items-center justify-center gap-3 border border-red-900/30"
                  >
                    <Calendar className="w-5 h-5" />
                    Explore The Gate
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

        `;
        
   content = parts[0] + '{/* Hero Content */}\n' + newMiddle + '\n        <div ref={scrollHintRef}' + parts2[1];     
}

fs.writeFileSync('src/components/HomeHero.tsx', content);

console.log("Patched HomeHero successfully!");
