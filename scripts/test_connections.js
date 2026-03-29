import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load variables from .env
dotenv.config();

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("❌ Mising Supabase credentials in .env file.");
  process.exit(1);
}

console.log(`📡 Connecting to Supabase at: ${url}`);

const supabase = createClient(url, key);

async function testConnection() {
  try {
    // Basic ping to any public table, let's try 'sports_seasons' which exists from Context
    const { data, error } = await supabase.from('sports_seasons').select('id').limit(1);
    
    if (error) {
      console.error("❌ Connection failed or Query Error:", error.message);
    } else {
      console.log("✅ Connection SUCCESSFUL! Local environment can read data.");
      console.log(`📦 Data fetched: ${JSON.stringify(data)}\n`);
    }

    // Ping Upstash just to check it as well
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      console.log(`📡 Ping to Upstash Redis: ${process.env.UPSTASH_REDIS_REST_URL}`);
      const redisRes = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/ping`, {
        headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` }
      });
      if (redisRes.ok) {
        console.log("✅ Upstash Redis Connection SUCCESSFUL!");
      } else {
        console.error("❌ Upstash Connect Failed:", redisRes.statusText);
      }
    } else {
      console.warn("⚠️ No Upstash keys found in .env");
    }

  } catch (err) {
    console.error("❌ Unexpected Error during connection:", err);
  }
}

testConnection();
