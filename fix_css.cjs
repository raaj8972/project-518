const fs = require('fs');

let content = fs.readFileSync('src/index.css', 'utf8');

// The radial black gradient that darkens edges too much
content = content.replace(
  'background: radial-gradient(circle at center, transparent 0%, rgba(0, 0, 0, 0.8) 100%);',
  'background: radial-gradient(circle at center, transparent 0%, rgba(20, 15, 5, 0.15) 100%);'
);

// We can also make cards a bit warmer instead of pure black
content = content.replace(
  'background: rgba(0, 0, 0, 0.8) !important;\n  border-color: rgba(251, 191, 36, 0.2) !important;\n  box-shadow: 0 0 20px rgba(251, 191, 36, 0.05);',
  'background: rgba(15, 12, 10, 0.7) !important;\n  border-color: rgba(251, 191, 36, 0.2) !important;\n  box-shadow: 0 0 20px rgba(251, 191, 36, 0.1);'
);

// We should replace any hardcore 'bg-[#000000]' overrides with something slightly brighter/warmer for bollywood if we want
// I'll do this in HomeHero instead.

fs.writeFileSync('src/index.css', content);
console.log('Fixed index.css');
