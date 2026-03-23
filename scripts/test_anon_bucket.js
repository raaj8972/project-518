import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testAnonAccess() {
  console.log('Testing with URL:', supabaseUrl)
  const { data, error } = await supabase.storage.getBucket('avatars')
  if (error) {
    console.error('Error with anon key:', error.message, error)
  } else {
    console.log('Success with anon key! Bucket details:', data)
  }
}

testAnonAccess()
