const fs = require('fs');

let content = fs.readFileSync('src/index.css', 'utf8');

content = content.replace(
  'body.theme-bollywood,\nbody.theme-bollywood main,\nbody.theme-bollywood .bg-\\[\\#050505\\],\nbody.theme-bollywood .bg-\\[\\#0a0a0a\\],\nbody.theme-bollywood .bg-black {\n  background-color: #000000 !important;\n}',
  '/* Removed forced #000000 to keep natural dark background */'
);

content = content.replace(
  'body.theme-bollywood .bg-\\[\\#000000\\] {\n  background-color: #000000 !important;\n}',
  '/* Removed forced #000000 to keep natural dark background */'
);

content = content.replace(
  'body.theme-bollywood::after {\n  content: "";\n  position: fixed;\n  top: 0; left: 0; width: 100vw; height: 100vh;\n  pointer-events: none;\n  background: radial-gradient(circle at center, transparent 0%, rgba(20, 15, 5, 0.15) 100%);\n  border: 1px solid rgba(251,191,36,0.1);\n  box-sizing: border-box;\n  z-index: 9999;\n}',
  '/* Removed dark overlay mask */'
);


fs.writeFileSync('src/index.css', content);
console.log('Fixed index.css second pass');
