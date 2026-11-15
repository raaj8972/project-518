import { loadEnv } from 'vite';
import { createClient } from '@supabase/supabase-js';
import { mkdir, writeFile } from 'node:fs/promises';

// Only add tagged demo team rows. Existing people, departments and faculty are preserved.
const env = loadEnv('production', process.cwd(), '');
const url = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('The configured Supabase service connection is missing.');
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const prefix = 'family-lighting-demo-v1';
const samples = [
  { code: 'council-red', name: 'Aarav Sen', group: 'council', color: 'red', portrait: 'men/32' },
  { code: 'council-blue', name: 'Ishita Roy', group: 'council', color: 'blue', portrait: 'women/44' },
  { code: 'council-green', name: 'Kabir Das', group: 'council', color: 'green', portrait: 'men/75' },
  { code: 'council-yellow', name: 'Meera Bose', group: 'council', color: 'yellow', portrait: 'women/68' },
  { code: 'tech-head-1', name: 'Neel Banerjee', group: 'head', portrait: 'men/11' },
  { code: 'tech-head-2', name: 'Aditi Paul', group: 'head', portrait: 'women/11' },
  { code: 'tech-head-3', name: 'Rohan Sinha', group: 'head', portrait: 'men/12' },
  { code: 'tech-member-1', name: 'Ananya Sen', group: 'member', portrait: 'women/32' },
  { code: 'tech-member-2', name: 'Dev Roy', group: 'member', portrait: 'men/15' },
  { code: 'tech-member-3', name: 'Sana Khan', group: 'member', portrait: 'women/65' },
  { code: 'tech-member-4', name: 'Arjun Das', group: 'member', portrait: 'men/56' },
  { code: 'tech-member-5', name: 'Riya Bose', group: 'member', portrait: 'women/24' },
  { code: 'tech-member-6', name: 'Vihaan Paul', group: 'member', portrait: 'men/41' },
];
const { data: departments, error: departmentError } = await db.from('core_committees').select('id,name,enabled').order('order_position');
if (departmentError) throw new Error(departmentError.message);
const department = departments.find(row => row.enabled && /^technical team$/i.test(row.name))
  || departments.find(row => row.enabled && /^tech team$/i.test(row.name))
  || departments.find(row => row.enabled && /tech|web/i.test(row.name));
if (!department) throw new Error('Create or enable a Tech department before adding the demo.');
const { data: existing, error: readError } = await db.from('core_team_members').select('id,name,specialty,color,is_council,order_position');
if (readError) throw new Error(readError.message);
const pending = samples.filter(sample => !existing.some(row => row.specialty === `${prefix}:${sample.code}`));
console.log(JSON.stringify({ mode: process.argv.includes('--apply') ? 'apply' : 'check', department: department.name, council: pending.filter(row => row.group === 'council').length, heads: pending.filter(row => row.group === 'head').length, members: pending.filter(row => row.group === 'member').length, preservedExistingRows: existing.length }));
if (!process.argv.includes('--apply') || !pending.length) process.exit(0);

let bucket;
for (const candidate of ['team-images', 'ricorrenza-public']) {
  const result = await db.storage.getBucket(candidate);
  if (!result.error && result.data.public) { bucket = candidate; break; }
}
if (!bucket) throw new Error('No existing public profile-image bucket was found.');
const maxOrder = Math.max(0, ...existing.map(row => row.order_position || 0));
const existingColors = new Set(existing.filter(row => row.is_council).map(row => row.color));
const rows = [];
for (const [index, sample] of pending.entries()) {
  const imagePath = `${prefix}/${sample.code}.jpg`;
  const source = `https://randomuser.me/api/portraits/${sample.portrait}.jpg`;
  const response = await fetch(source, { signal: AbortSignal.timeout(20000) });
  if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) throw new Error(`Could not download demo portrait ${sample.code}.`);
  const image = new Uint8Array(await response.arrayBuffer());
  if (image.length < 2000 || image.length > 1024 * 1024) throw new Error(`Unexpected portrait size for ${sample.code}.`);
  const upload = await db.storage.from(bucket).upload(imagePath, image, { contentType: 'image/jpeg', cacheControl: '3600', upsert: false });
  if (upload.error && !/already exists|duplicate/i.test(upload.error.message)) throw new Error(`Portrait upload failed: ${upload.error.message}`);
  const imageUrl = db.storage.from(bucket).getPublicUrl(imagePath).data.publicUrl;
  rows.push({
    name: `${sample.name} (Demo)`, role: sample.group === 'head' ? 'Head' : sample.group === 'council' ? 'Council' : 'Member',
    image: imageUrl, committee_id: sample.group === 'council' ? null : department.id,
    is_council: sample.group === 'council', is_head: sample.group === 'head', enabled: true,
    order_position: maxOrder + index + 1,
    color: sample.color && !existingColors.has(sample.color) ? sample.color : null,
    specialty: `${prefix}:${sample.code}`,
    description: 'Fictional demo profile for the Rico Family layout and council lights. This demo entry can be removed in People & teams.',
    achievements: [], social_links: { demo: true },
  });
}
const { data: inserted, error: insertError } = await db.from('core_team_members').insert(rows).select('id,name,is_council,is_head,committee_id,color,specialty');
if (insertError) throw new Error(insertError.message);
await mkdir('tmp', { recursive: true });
await writeFile('tmp/family-lighting-demo-manifest.json', JSON.stringify({ department, bucket, profiles: inserted, portraitSource: 'https://randomuser.me/photos', names: 'Fictional, explicitly labelled demo profiles' }, null, 2));
console.log(JSON.stringify({ uploaded: inserted.length, council: inserted.filter(row => row.is_council).length, heads: inserted.filter(row => row.is_head).length, members: inserted.filter(row => !row.is_head && !row.is_council).length, bucket, department: department.name }));
