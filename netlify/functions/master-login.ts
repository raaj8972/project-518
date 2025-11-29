import type { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

const DEFAULT_SUPABASE_URL = 'https://isfqhascrdzaoebhuohs.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzZnFoYXNjcmR6YW9lYmh1b2hzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1MDAxNDEsImV4cCI6MjA3MzA3NjE0MX0.0akCpqYDlGgEenU4fPzDQorsvygcviBpfk4iluSm9Vs';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' }
  
  try {
    const { password } = JSON.parse(event.body || '{}')

    const MASTER_KEY = process.env.MASTER_BYPASS_KEY || '9693'; // Fallback for dev, but env var preferred
    if (password !== MASTER_KEY) {
      return { statusCode: 401, body: 'Invalid master key' }
    }

    const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL
    const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY
    const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY

    if (!SERVICE_ROLE) return { statusCode: 500, body: 'Server config missing (SERVICE_ROLE)' }

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE)
    const email = 'master@ricorrenza.com'
    const dbPassword = 'Master_Password_9693_Secure!' 

    // 1. Check if user exists
    const { data: users, error: listErr } = await supabaseAdmin.auth.admin.listUsers()
    if (listErr) throw listErr
    
    let user = users.users.find(u => u.email === email)

    if (!user) {
      // Create user
      const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: dbPassword,
        email_confirm: true,
        user_metadata: { is_super_admin: true }
      })
      if (createErr) throw createErr
      user = newUser.user
    } else {
      // Ensure password is correct and metadata is set
      const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
          password: dbPassword,
          user_metadata: { ...user.user_metadata, is_super_admin: true }
      })
      if (updateErr) throw updateErr
    }

    if (!user) throw new Error('User creation failed')

    // 2. Ensure admin_users role is owner
    const { error: upsertErr } = await supabaseAdmin.from('admin_users').upsert({
      user_id: user.id,
      email: email,
      role: 'owner',
      is_primary: true
    }, { onConflict: 'user_id' })

    if (upsertErr) throw upsertErr

    // 3. Sign in to get session using public client
    const supabasePublic = createClient(SUPABASE_URL, ANON_KEY)
    const { data: sessionData, error: loginErr } = await supabasePublic.auth.signInWithPassword({
      email,
      password: dbPassword
    })

    if (loginErr) throw loginErr

    return {
      statusCode: 200,
      body: JSON.stringify(sessionData)
    }
  } catch (err: any) {
    console.error('Master login error:', err)
    return { statusCode: 500, body: err.message || 'Internal Server Error' }
  }
}
