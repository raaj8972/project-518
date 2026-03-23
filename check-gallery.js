import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://isfqhascrdzaoebhuohs.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzZnFoYXNjcmR6YW9lYmh1b2hzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzUwMDE0MSwiZXhwIjoyMDczMDc2MTQxfQ.RiLXG5KPvN62KlnW1v8c2mVbg6Nu3bEYHjKUhvlSYJM'
const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
  console.log('Checking Supabase Gallery Images count...');
  const { count, error } = await supabase
    .from('gallery_images')
    .select('*', { count: 'exact', head: true })

  if (error) {
    console.error('Count error:', error)
  } else {
    console.log('TOTAL_COUNT:', count)
  }

  const { data, error: err2 } = await supabase
    .from('gallery_images')
    .select('id, src, category, year')
    .order('id', { ascending: false })
    .limit(5)

  if (err2) {
    console.error('Data error:', err2)
  } else {
    console.log('LATEST_IMAGES:', JSON.stringify(data, null, 2))
  }
}

check()
