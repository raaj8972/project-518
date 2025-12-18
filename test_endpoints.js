
const https = require('https');

const SUPABASE_URL = 'https://isfqhascrdzaoebhuohs.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzZnFoYXNjcmR6YW9lYmh1b2hzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1MDAxNDEsImV4cCI6MjA3MzA3NjE0MX0.0akCpqYDlGgEenU4fPzDQorsvygcviBpfk4iluSm9Vs';

const tables = [
  'events',
  'sponsors',
  'hero_media',
  'event_coordinators',
  'sponsorship_packages',
  'sponsorship_settings',
  'gallery_images',
  'admin_users', // Should fail 401/403 or return empty if RLS
];

async function checkTable(table) {
  return new Promise((resolve) => {
    const url = `${SUPABASE_URL}/rest/v1/${table}?select=count&limit=1`;
    const options = {
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    };

    https.get(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          table,
          statusCode: res.statusCode,
          statusMessage: res.statusMessage,
          body: data.substring(0, 100) // Preview
        });
      });
    }).on('error', (e) => {
      resolve({
        table,
        error: e.message
      });
    });
  });
}

async function run() {
  console.log('Starting API Diagnostics...');
  for (const t of tables) {
    const result = await checkTable(t);
    console.log(`[${result.table}] Status: ${result.statusCode} ${result.statusMessage}`);
    if (result.statusCode >= 400) {
      console.log(`   Body: ${result.body}`);
    }
  }
}

run();
