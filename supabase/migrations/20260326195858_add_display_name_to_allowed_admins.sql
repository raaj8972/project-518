ALTER TABLE "public"."allowed_admins" 
ADD COLUMN IF NOT EXISTS "display_name" text,
ADD COLUMN IF NOT EXISTS "permissions" jsonb DEFAULT '{}'::jsonb;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
