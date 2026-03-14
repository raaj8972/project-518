import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

/**
 * Searches and replaces hardcoded keys with environment variable calls.
 * Targets keys provided via VITE_MASTER_BYPASS_KEY and other env vars if needed.
 */
function purgeKeys() {
  console.log('--- RICO Secret Purge Script (MJS) ---');
  
  // Use environment variables to avoid hardcoding secrets in this script
  const masterKey = process.env.VITE_MASTER_BYPASS_KEY;
  const targetKeys = [masterKey].filter(Boolean);

  if (targetKeys.length === 0) {
    console.log('No target keys found in environment variables. Set VITE_MASTER_BYPASS_KEY to run purge.');
    return;
  }

  const ROOT_DIR = process.cwd();
  const grepPattern = targetKeys.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  
  let files = [];
  try {
    files = execSync(`grep -rlE "${grepPattern}" . --exclude-dir={node_modules,.git,dist,build} --exclude="secret_purge.ts" --exclude="secret_purge.mjs"`, { encoding: 'utf8' })
      .split('\n')
      .filter(Boolean);
  } catch (e) {
    console.log('No files found with target keys.');
    return;
  }

  console.log(`Found ${files.length} files with potential hardcoded keys.`);

  files.forEach(file => {
    const absolutePath = path.resolve(ROOT_DIR, file);
    if (fs.lstatSync(absolutePath).isDirectory()) return;

    let content = fs.readFileSync(absolutePath, 'utf8');
    let modified = false;

    // Detect if it's a Netlify function (backend) or frontend file
    const isBackend = absolutePath.includes('netlify/functions');
    const envVar = isBackend ? 'process.env.MASTER_BYPASS_KEY' : 'import.meta.env.VITE_MASTER_BYPASS_KEY';

    targetKeys.forEach(key => {
      const regex = new RegExp(`'${key}'|"${key}"`, 'g');
      if (regex.test(content)) {
        console.log(`[Purge] Replacing secret value with ${envVar} in ${file}`);
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
