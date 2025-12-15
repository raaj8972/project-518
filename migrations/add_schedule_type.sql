-- Add schedule_type column to schedule_days table
-- This allows categorizing schedules as prelims or mains
ALTER TABLE schedule_days 
ADD COLUMN IF NOT EXISTS schedule_type TEXT CHECK (schedule_type IN ('prelims', 'mains'));
