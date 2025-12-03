-- Fix incorrect column name in pending_approvals
-- The frontend was sending 'isCouncil' but the DB column is 'is_council'
-- This updates any pending approvals to use the correct key

UPDATE pending_approvals
SET changes = (changes - 'isCouncil') || jsonb_build_object('is_council', changes->'isCouncil')
WHERE entity_type = 'core_team_member'
  AND status = 'pending'
  AND changes ? 'isCouncil';
