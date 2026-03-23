import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://isfqhascrdzaoebhuohs.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzZnFoYXNjcmR6YW9lYmh1b2hzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1MDAxNDEsImV4cCI6MjA3MzA3NjE0MX0.0akCpqYDlGgEenU4fPzDQorsvygcviBpfk4iluSm9Vs'
const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
  console.log('Checking Supabase Gallery Images count (ANON)...');
  const { count, error } = await supabase
    .from('gallery_images')
    .select('*', { count: 'exact', head: true })

  if (error) {
    console.error('Count error:', error)
  } else {
    console.log('ANON_TOTAL_COUNT:', count)
  }

  const { data, error: err2 } = await supabase
    .from('gallery_images')
    .select('id')
    .limit(1001)

  if (err2) {
    console.error('Data error:', err2)
  } else {
    console.log('ANON_DATA_LENGTH:', data.length)
  }
}

check()
