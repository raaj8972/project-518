-- Migration: Drop legacy single-chief-enforcement trigger/function if they exist
-- Date: 2025-09-17
-- This is safe to run multiple times.

BEGIN;

-- If earlier you created a function named enforce_single_chief_guest() and a trigger with the same intent
DROP TRIGGER IF EXISTS enforce_single_chief_guest ON chief_guests;
DROP FUNCTION IF EXISTS enforce_single_chief_guest();

COMMIT;
