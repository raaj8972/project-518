import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const TARGET_KEYS = ['Raja@76023', '9693'];
const ROOT_DIR = process.cwd();

/**
 * Searches and replaces hardcoded keys with environment variable calls.
 */
function purgeKeys() {
  console.log('--- RICO Secret Purge Script ---');
  console.log(`Target Keys: ${TARGET_KEYS.join(', ')}`);
  
  let files = [];
  try {
    files = execSync('grep -rlE "Raja@76023|9693" . --exclude-dir={node_modules,.git,dist,build} --exclude="secret_purge.mjs"', { encoding: 'utf8' })
      .split('\n')
      .filter(Boolean);
  } catch (e) {
    console.log('No files found with target keys or grep failed.');
    return;
  }

  console.log(`Found ${files.length} files with hardcoded keys.`);

  files.forEach(file => {
    const absolutePath = path.resolve(ROOT_DIR, file);
    if (fs.lstatSync(absolutePath).isDirectory()) return;
    
    let content = fs.readFileSync(absolutePath, 'utf8');
    let modified = false;

    // Detect if it's a Netlify function (backend) or frontend file
    const isBackend = absolutePath.includes('netlify/functions');
    const envVar = isBackend ? 'process.env.MASTER_BYPASS_KEY' : 'import.meta.env.VITE_MASTER_BYPASS_KEY || process.env.VITE_MASTER_BYPASS_KEY';

    TARGET_KEYS.forEach(key => {
      const regex = new RegExp(`'${key}'|"${key}"`, 'g');
      if (regex.test(content)) {
        console.log(`[Purge] Replacing "${key}" in ${file}`);
        content = content.replace(regex, envVar);
        modified = true;
      }
    });

    if (modified) {
      fs.writeFileSync(absolutePath, content);
    }
  });

  console.log('--- Purge Complete ---');
}

purgeKeys();
