-- Add email column to core_team_members table
ALTER TABLE "public"."core_team_members" ADD COLUMN IF NOT EXISTS "email" text;
