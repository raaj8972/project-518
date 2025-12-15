# Schedule Feature Migration Guide

Execute these migrations in order to set up the complete schedule system:

## 1. Create Base Tables (if not already created in Supabase UI)
**File:** `create_schedule_tables.sql`
- Creates `schedule_days` and `schedule_events` tables
- Sets up all columns, constraints, and indexes
- Configures RLS policies
- Safe to run even if tables exist (uses IF NOT EXISTS)

## 2. Add Event/Guest Artist Links (if tables already exist)
**File:** `add_schedule_event_links.sql`
- Adds `event_id` and `guest_artist_id` columns to `schedule_events`
- Creates foreign key constraints
- Adds mutual exclusivity check
- Creates performance indexes
- Only needed if tables were created without these columns

## 3. Add Schedule Type Classification
**File:** `add_schedule_type.sql`
- Adds `schedule_type` column to `schedule_days`
- Enables prelims/mains categorization

## 4. Convert Time Columns to TEXT (Critical for Free-Text Times)
**File:** `change_schedule_time_to_text.sql`
- Changes `schedule_events.time` from TIME to TEXT
- Allows free-form time ranges like "9-10 PM"
- **Must run this to fix insertion errors**

**File:** `change_events_time_to_text.sql`
- Changes `events.time` from TIME to TEXT
- Required for schedule sync feature to work
- **Must run this to fix insertion errors**

---

## Quick Start (Recommended Order)

If you're setting up from scratch:
```sql
-- Run in Supabase SQL Editor (in order):
1. create_schedule_tables.sql
2. change_schedule_time_to_text.sql  -- CRITICAL
3. change_events_time_to_text.sql    -- CRITICAL
```

If your tables already exist but missing features:
```sql
-- Run only what you need:
1. add_schedule_event_links.sql  (if event_id/guest_artist_id missing)
2. add_schedule_type.sql         (if schedule_type missing)
3. change_schedule_time_to_text.sql  -- REQUIRED
4. change_events_time_to_text.sql    -- REQUIRED
```

---

## Verification Queries

After running migrations, verify with:

```sql
-- Check schedule_days structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'schedule_days';

-- Check schedule_events structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'schedule_events';

-- Verify time column is TEXT (not TIME)
SELECT data_type 
FROM information_schema.columns 
WHERE table_name = 'schedule_events' AND column_name = 'time';
-- Should return: "text"

-- Verify events.time is also TEXT
SELECT data_type 
FROM information_schema.columns 
WHERE table_name = 'events' AND column_name = 'time';
-- Should return: "text"
```
