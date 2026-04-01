import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const brainDir = '/Users/raaj/.gemini/antigravity/brain/6709cff6-3177-434a-b59f-8c709e7c0247';
const outDir = join(import.meta.dirname, '..', 'public', 'maintenance');
mkdirSync(outDir, { recursive: true });

const mapping = {
  'director_scene_1774956362400.png': 'director.png',
  'actors_scene_1774956377896.png': 'actors.png',
  'shooting_scene_1774956392759.png': 'shooting.png',
  'editing_scene_1774956410476.png': 'editing.png',
  'cinema_scene_1774956427594.png': 'cinema.png',
  'film_van_scene_1774956443756.png': 'filmvan.png'
};

for (const [src, dst] of Object.entries(mapping)) {
  try {
    const data = readFileSync(join(brainDir, src));
    writeFileSync(join(outDir, dst), data);
    console.log(`OK: ${dst} (${data.length} bytes)`);
  } catch (e) {
    console.log(`FAIL: ${dst}: ${e.message}`);
  }
}
