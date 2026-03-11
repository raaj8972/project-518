import pkg from 'pg';
const { Client } = pkg;
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const connectionString = process.env.DATABASE_URL;

async function applyMigration() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to database');

    /* 
    const migrationPath = path.resolve('supabase/migrations/20260309_decoupled_annual_sports.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Applying migration: 20260309_decoupled_annual_sports.sql');
    await client.query(sql);
    console.log('Migration applied successfully');

    const modeMigrationPath = path.resolve('supabase/migrations/20260309_annual_sports_mode.sql');
    const modeSql = fs.readFileSync(modeMigrationPath, 'utf8');
    console.log('Applying migration: 20260309_annual_sports_mode.sql');
    await client.query(modeSql);
    console.log('Annual mode column added');
    */

    const enhancementsPath = path.resolve('supabase/migrations/20260309_annual_sports_enhancements.sql');
    if (fs.existsSync(enhancementsPath)) {
        const enhancedSql = fs.readFileSync(enhancementsPath, 'utf8');
        console.log('Applying enhancements migration...');
        await client.query(enhancedSql);
        console.log('Enhancements applied');
    }

    // Enable annual sports mode
    console.log('Enabling annual sports mode in site_settings...');
    await client.query("UPDATE site_settings SET annual_sports_mode_enabled = true");
    console.log('Annual sports mode enabled');

    // Add some dummy data for verification
    console.log('Adding dummy annual sports event...');
    await client.query(`
      INSERT INTO annual_sports_events (name, category, description, registration_open)
      VALUES 
      ('Inter-College Cricket', 'Athletics', 'The grand cricket tournament of the year.', true),
      ('Royal Chess Championship', 'Indoor', 'Grandmaster level chess event.', true)
      ON CONFLICT DO NOTHING
    `);
    console.log('Dummy data added');

  } catch (err) {
    console.error('Error applying migration:', err);
  } finally {
    await client.end();
  }
}

applyMigration();
