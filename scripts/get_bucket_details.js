import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function getBucketDetails() {
  const { data, error } = await supabase.storage.getBucket('avatars')
  if (error) {
    console.error('Error getting bucket:', error.message)
  } else {
    console.log('Bucket Details:', data)
  }
}

getBucketDetails()
