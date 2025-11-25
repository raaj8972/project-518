import { Handler } from '@netlify/functions';
import { Client } from 'pg';

const handler: Handler = async (event, context) => {
  // 1. Security Check
  const secret = process.env.FORCE_LOGOUT_SECRET;
  const headerSecret = event.headers['x-force-logout-secret'];

  if (!secret || secret !== headerSecret) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Unauthorized: Invalid or missing secret' }),
    };
  }

  // 2. Database Connection
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server Configuration Error: DATABASE_URL is missing' }),
    };
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }, // Required for Supabase/many cloud DBs
  });

  try {
    await client.connect();

    // 3. Execute Force Logout SQL
    // We use the dynamic block to handle 'data' vs 'access_token' schema differences safely.
    const sql = `
      -- 1. Clear app-level tracking
      TRUNCATE TABLE public.admin_sessions;

      -- 2. Delete malformed or all admin sessions from auth.sessions
      DO $$
      DECLARE
        del_sql TEXT;
      BEGIN
        IF EXISTS(
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'auth' AND table_name = 'sessions' AND column_name = 'data'
        ) THEN
          del_sql := $q$
            DELETE FROM auth.sessions
            WHERE user_id::text IN (SELECT user_id::text FROM public.admin_users);
          $q$;
        ELSIF EXISTS(
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'auth' AND table_name = 'sessions' AND column_name = 'access_token'
        ) THEN
          del_sql := $q$
            DELETE FROM auth.sessions
            WHERE user_id::text IN (SELECT user_id::text FROM public.admin_users);
          $q$;
        ELSE
          del_sql := $q$
            DELETE FROM auth.sessions
            WHERE user_id::text IN (SELECT user_id::text FROM public.admin_users);
          $q$;
        END IF;
        EXECUTE del_sql;
      END$$;

      -- 3. Revoke refresh tokens
      DELETE FROM auth.refresh_tokens
      WHERE user_id::text IN (SELECT user_id::text FROM public.admin_users);
    `;

    await client.query(sql);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Successfully forced logout for all admin users.' }),
    };

  } catch (error: any) {
    console.error('Force logout error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Database error', details: error.message }),
    };
  } finally {
    await client.end();
  }
};

export { handler };
