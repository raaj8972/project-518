import { createClient } from '@supabase/supabase-js'
import { Client } from 'pg'

// This function installs the health_heartbeats table and related policies by executing SQL directly on Postgres.
// Security: Requires Authorization: Bearer <Supabase access token> of an OWNER (admin_users.role = 'owner').

const HEARTBEAT_SQL = `
-- Create health_heartbeats table for Netlify heartbeat diagnostics
do $$ begin
  if not exists (
    select 1 from information_schema.tables where table_schema='public' and table_name='health_heartbeats'
  ) then
    create table public.health_heartbeats (
      id integer primary key,
      last_run timestamptz,
      updated_by text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  end if;
end $$;

-- Trigger to auto-update updated_at
do $$ begin
  if not exists (
    select 1 from pg_proc p join pg_namespace n on p.pronamespace = n.oid
    where p.proname = 'set_updated_at' and n.nspname='public'
  ) then
    create or replace function public.set_updated_at()
    returns trigger as $fn$
    begin
      new.updated_at = now();
      return new;
    end;
    $fn$ language plpgsql;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_trigger t join pg_class c on t.tgrelid=c.oid join pg_namespace n on c.relnamespace=n.oid
    where t.tgname='health_heartbeats_set_updated_at' and n.nspname='public' and c.relname='health_heartbeats'
  ) then
    create trigger health_heartbeats_set_updated_at
    before update on public.health_heartbeats
    for each row execute function public.set_updated_at();
  end if;
end $$;

-- Enable RLS and basic policies
alter table public.health_heartbeats enable row level security;

-- Read policy (authenticated users can read). Relax to 'using (true)' if anonymous read is okay.
do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='health_heartbeats' and policyname='read_health_heartbeats'
  ) then
    create policy read_health_heartbeats on public.health_heartbeats
    for select using (auth.role() = 'authenticated' or (select current_setting('request.jwt.claims', true)) is null);
  end if;
end $$;

-- Upsert seed row id=1 so UI can read something immediately
insert into public.health_heartbeats (id, last_run, updated_by)
values (1, now(), 'migration-seed')
on conflict (id) do update set last_run = excluded.last_run, updated_by = excluded.updated_by;
`;

const getDbUrl = () => {
  const candidates = [
    process.env.SUPABASE_DB_URL,
    process.env.DATABASE_URL,
    process.env.SUPABASE_DB_CONNECTION_STRING,
    process.env.POSTGRES_URL,
    process.env.POSTGRES_PRISMA_URL,
    process.env.SUPABASE_DB_URL_NON_POOLER,
    process.env.SUPABASE_DB_POOLER_URL,
  ].filter(Boolean) as string[]
  return candidates[0] || null
}

export default async (req: Request) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }

  try {
    if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers })

    const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
    const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY
    const DB_URL = getDbUrl()
    
    if (!SUPABASE_URL || !SERVICE_ROLE) {
      return new Response(JSON.stringify({ 
        ok: false, 
        error: 'Server not configured', 
        flags: { SUPABASE_URL: !!SUPABASE_URL, SERVICE_ROLE: !!SERVICE_ROLE, DB_URL: !!DB_URL } 
      }), { status: 500, headers })
    }
    
    if (!DB_URL) {
      return new Response(JSON.stringify({ 
        ok: false, 
        error: 'Missing database connection string. Set SUPABASE_DB_URL (or DATABASE_URL).', 
        flags: { DB_URL: false } 
      }), { status: 500, headers })
    }

    // Verify caller is OWNER
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.toString().startsWith('Bearer ')) {
      return new Response('Missing auth', { status: 401, headers })
    }
    const accessToken = authHeader.toString().replace('Bearer ', '')

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } })
    const userClient = createClient(SUPABASE_URL, accessToken, { auth: { persistSession: false } } as any)

    const { data: me, error: meErr } = await userClient.auth.getUser()
    if (meErr || !me?.user) return new Response('Invalid session', { status: 401, headers })
    const callerId = me.user.id
    const { data: ownerRow, error: ownerErr } = await adminClient
      .from('admin_users')
      .select('user_id, role')
      .eq('user_id', callerId)
      .maybeSingle()
    if (ownerErr) return new Response(ownerErr.message, { status: 400, headers })
    if (!ownerRow || ownerRow.role !== 'owner') return new Response('Only owner can install heartbeat table', { status: 403, headers })

    // Connect to Postgres and run the SQL
    const client = new Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } as any })
    await client.connect()
    try {
      await client.query('begin')
      await client.query(HEARTBEAT_SQL)
      await client.query('commit')
    } catch (e) {
      await client.query('rollback')
      throw e
    } finally {
      await client.end()
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers })
  } catch (e: any) {
    console.error('[install-heartbeat] error', e)
    const msg = e?.message || 'Internal error'
    return new Response(JSON.stringify({ ok: false, error: msg }), { status: 500, headers })
  }
}
