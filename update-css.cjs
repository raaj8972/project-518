const fs = require('fs');

let css = fs.readFileSync('src/index.css', 'utf8');

// Replace the bollywood block with deep black background instead of reddish/warm tones
// AND change the text overrides (which used to be pink) to pure cinematic gold/yellow
let newCss = css.replace(/body\.theme-bollywood \{\n  background-color: #[a-f0-9]+ !important;\n  color: #[a-f0-9]+ !important;\n\}/g, `/* BOLLYWOOD THEME TARGETED OVERRIDES */
body.theme-bollywood {
  background-color: #000000 !important;
  color: #fbbf24 !important;
}`);

newCss = newCss.replace(/body\.theme-bollywood \.bg-\\[\\#0a0a0a\\],\nbody\.theme-bollywood \.bg-\\[\\#070707\\] \{\n  background-color: #[a-f0-9]+ !important;\n\}/g, `body.theme-bollywood .bg-\\[\\#0a0a0a\\],\nbody.theme-bollywood .bg-\\[\\#070707\\] {\n  background-color: #0a0a0a !important;\n}`);

newCss = newCss.replace(/body\.theme-bollywood \.bg-\\[\\#111\\],\nbody\.theme-bollywood \.bg-\\[\\#1a1a1a\\] \{\n  background-color: #[a-f0-9]+ !important;\n\}/g, `body.theme-bollywood .bg-\\[\\#111\\],\nbody.theme-bollywood .bg-\\[\\#1a1a1a\\] {\n  background-color: #111111 !important;\n}`);


fs.writeFileSync('src/index.css', newCss);
