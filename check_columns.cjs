
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://isfqhascrdzaoebhuohs.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzZnFoYXNjcmR6YW9lYmh1b2hzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1MDAxNDEsImV4cCI6MjA3MzA3NjE0MX0.0akCpqYDlGgEenU4fPzDQorsvygcviBpfk4iluSm9Vs';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkAllSettings() {
  const tables = [
    'social_media_settings',
    'about_settings',
    'homebound_settings',
    'homepage_settings',
    'form_settings',
    'security_settings',
    'site_settings'
  ];

  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (error) {
        console.error(`Error fetching ${table}:`, error.message);
        continue;
      }
      console.log(`${table} keys:`, data.length > 0 ? Object.keys(data[0]) : 'No data');
    } catch (err) {
      console.error(`Unexpected error for ${table}:`, err.message);
    }
  }
}

checkAllSettings();
