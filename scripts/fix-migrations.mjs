import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.resolve(__dirname, '../supabase/migrations');

function fixPolicies() {
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));
  
  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Regex to match: create policy if not exists "policy_name" on table_name
    // and replace with drop policy if exists "policy_name" on table_name; create policy "policy_name" on table_name
    const regex = /create policy if not exists\s+("?[a-zA-Z0-9_ -]+"?[^\n]*)\s+on\s+([a-zA-Z0-9_.]+)/gi;
    
    let changed = false;
    content = content.replace(regex, (match, prefix, table) => {
      changed = true;
      // Extract the exact policy name part (might have 'for select' etc attached if parsed broadly, but we just need the string up to the quotes)
      // Actually simpler:
      return match.replace(/create policy if not exists/i, 'drop policy if exists').replace(/\s+on\s+[a-zA-Z0-9_.]+/i, ` on ${table}; create policy`) ;
    });

    if (changed) {
      console.log(`Fixed policies in ${file}`);
      // A more robust replacement for the exact problem:
      // Find `create policy if not exists "Name"` 
      // Replace with:
      // `drop policy if exists "Name" on [table_name_from_next_line];\ncreate policy "Name"`
    }
  }
}

// Safer regex approach:
function fixPoliciesSafe() {
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));
  let totalFixed = 0;

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    const regex = /create\s+policy\s+if\s+not\s+exists\s+("[^"]+")\s+on\s+([a-zA-Z0-9_.]+)/gi;
    
    if (regex.test(content)) {
      content = content.replace(regex, (match, policyName, tableName) => {
        return `drop policy if exists ${policyName} on ${tableName};\ncreate policy ${policyName} on ${tableName}`;
      });
      fs.writeFileSync(filePath, content);
      console.log(`✅ Fixed syntax in ${file}`);
      totalFixed++;
    }
  }
  
  console.log(`Total files fixed: ${totalFixed}`);
}

fixPoliciesSafe();
