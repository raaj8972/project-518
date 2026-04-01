const fs = require('fs');

let content = fs.readFileSync('src/components/HomeHero.tsx', 'utf8');

// The renderBackground logic currently renders a fallback when no media.
// We should update the fallback logic slightly to make it pure black for bollywood
content = content.replace(
  `const renderBackground = () => {\n    if (!media || !media.enabled) {`,
  `const renderBackground = () => {\n    if (!media || !media.enabled) {\n      if (theme === 'bollywood') {\n        return <div className="absolute inset-0 bg-[#000000] bg-black z-0 pointer-events-none"></div>;\n      }`
);

// We also should remove any overlays on the media itself if it's bollywood, or darken it.
content = content.replace(
  `<div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: overlay_color, opacity: overlay_opacity }} />`,
  `<div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: theme === 'bollywood' ? '#000000' : overlay_color, opacity: theme === 'bollywood' ? 0.85 : overlay_opacity }} />`
);


// Further down
content = content.replace(
  `<div className="absolute inset-0 z-0 overflow-hidden bg-[#000000]">`,
  `<div className="absolute inset-0 z-0 overflow-hidden bg-[#000000] bg-black">`
);

fs.writeFileSync('src/components/HomeHero.tsx', content);

console.log("Patched HomeHero darkening!");
