-- Migration: Add special_grouping_enabled to events table
-- Ensures coordinators can manually group students only if this option is enabled by admin.

ALTER TABLE events ADD COLUMN special_grouping_enabled BOOLEAN DEFAULT FALSE;
