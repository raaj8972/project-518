import { createClient } from '@supabase/supabase-js';

// One-off read-only check for guest_artists table
const SUPABASE_URL = 'https://isfqhascrdzaoebhuohs.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzZnFoYXNjcmR6YW9lYmh1b2hzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1MDAxNDEsImV4cCI6MjA3MzA3NjE0MX0.0akCpqYDlGgEenU4fPzDQorsvygcviBpfk4iluSm9Vs';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

(async () => {
  try {
    const { data, error } = await supabase.from('guest_artists').select('id').limit(1);
    if (error) {
      console.error(JSON.stringify({ ok: false, error: { message: error.message, details: error.details, hint: error.hint, code: error.code } }, null, 2));
      process.exit(1);
    }
    console.log(JSON.stringify({ ok: true, exists: true, sample: (data && data.length ? data[0] : null) }, null, 2));
  } catch (e) {
    console.error(JSON.stringify({ ok: false, error: { message: e?.message || String(e) } }, null, 2));
    process.exit(1);
  }
})();
