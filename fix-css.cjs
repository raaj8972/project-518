const fs = require('fs');

let css = fs.readFileSync('src/index.css', 'utf8');

// Strip out everything from /* BOLLYWOOD THEME TARGETED OVERRIDES */ to the end of the file
const cutoff = css.indexOf('/* BOLLYWOOD THEME TARGETED OVERRIDES */');
if (cutoff !== -1) {
  css = css.substring(0, cutoff);
}

// Append a fresh replacement that prioritizes pure blacks + gold/amber elements, plus cinema graphics
css += `
/* BOLLYWOOD THEME TARGETED OVERRIDES */
body.theme-bollywood {
  background-color: #000000 !important;
  color: #fef08a !important;
}

body.theme-bollywood .bg-\\[\\#0a0a0a\\],
body.theme-bollywood .bg-\\[\\#070707\\] {
  background-color: #000000 !important;
}

body.theme-bollywood .bg-\\[\\#111\\],
body.theme-bollywood .bg-\\[\\#1a1a1a\\] {
  background-color: #0a0a0a !important;
}

/* Turn common neon pink/purple texts into gold/amber */
body.theme-bollywood .text-pink-500,
body.theme-bollywood .text-purple-500,
body.theme-bollywood .text-rose-500,
body.theme-bollywood .text-red-500 {
  color: #fbbf24 !important;
  text-shadow: 0 0 12px rgba(251, 191, 36, 0.4);
}

/* Gradients overriding for buttons/icons */
body.theme-bollywood .bg-gradient-to-r,
body.theme-bollywood .bg-gradient-to-br {
  background-image: linear-gradient(to right, #b45309, #fbbf24) !important;
  -webkit-background-clip: inherit;
  background-clip: inherit;
}

body.theme-bollywood .bg-gradient-to-r.text-transparent {
  -webkit-background-clip: text;
  background-clip: text;
}

/* Cards and borders */
body.theme-bollywood .border-pink-500\\/30,
body.theme-bollywood .border-purple-500\\/30,
body.theme-bollywood .border-rose-500\\/30,
body.theme-bollywood .border-white\\/10 {
  border-color: rgba(251, 191, 36, 0.2) !important;
}

body.theme-bollywood .rico-glass,
body.theme-bollywood .rico-glass-card {
  background: rgba(0, 0, 0, 0.8) !important;
  border-color: rgba(251, 191, 36, 0.2) !important;
  box-shadow: 0 0 20px rgba(251, 191, 36, 0.05);
}

body.theme-bollywood .bg-pink-500\\/10,
body.theme-bollywood .bg-purple-500\\/10,
body.theme-bollywood .bg-rose-500\\/10 {
  background-color: rgba(251, 191, 36, 0.1) !important;
}

/* Glow effects */
body.theme-bollywood .glow-strong,
body.theme-bollywood .glow-medium,
body.theme-bollywood .glow-soft {
  filter: hue-rotate(-60deg) saturate(1.5) brightness(1.2);
}

/* Additional thematic touches */
body.theme-bollywood::after {
  content: "";
  position: fixed;
  top: 0; left: 0; width: 100vw; height: 100vh;
  pointer-events: none;
  background: radial-gradient(circle at center, transparent 0%, rgba(0, 0, 0, 0.8) 100%);
  border: 1px solid rgba(251,191,36,0.1);
  box-sizing: border-box;
  z-index: 9999;
}
`;

fs.writeFileSync('src/index.css', css);
