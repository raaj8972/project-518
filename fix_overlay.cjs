const fs = require('fs');

let content = fs.readFileSync('src/components/ui/BollywoodThemeOverlay.tsx', 'utf8');

// Soften Film Strip margins
content = content.replace(
  'bg-black/40',
  'bg-[#0f0904]/40'
);
content = content.replace(
  'bg-black/40',
  'bg-[#0f0904]/40'
);

// Lighten letterboxes
content = content.replace(
  '<div className="absolute top-0 left-0 w-full h-[5vh] bg-black border-b border-[#fbbf24]/10 shadow-[0_10px_30px_rgba(0,0,0,0.8)] z-10"></div>',
  '<div className="absolute top-0 left-0 w-full h-[2vh] bg-gradient-to-b from-black/50 to-transparent z-10"></div>'
);

content = content.replace(
  '<div className="absolute bottom-0 left-0 w-full h-[5vh] bg-black border-t border-[#fbbf24]/10 shadow-[0_-10px_30px_rgba(0,0,0,0.8)] z-10"></div>',
  '<div className="absolute bottom-0 left-0 w-full h-[2vh] bg-gradient-to-t from-black/50 to-transparent z-10"></div>'
);

fs.writeFileSync('src/components/ui/BollywoodThemeOverlay.tsx', content);
console.log('Fixed overlay');
