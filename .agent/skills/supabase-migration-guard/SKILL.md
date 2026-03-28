---
name: supabase-migration-guard
description: "MANDATORY for all Supabase DDL changes. Ensures RLS hardening, search_path security, and correct migration sequencing."
---

## Overview
This skill protects the project's Supabase production environment by enforcing strict security and deployment patterns for migrations.

## The Checklist (V5)

### 1. File Naming & Path
- [ ] **Timestamped**: Files strictly follow `YYYYMMDDHHMMSS_description.sql`.
- [ ] **Directory**: Located in `supabase/migrations/`.

### 2. Security (Hard Gate)
- [ ] **search_path**: Every function definition MUST start with `SET search_path = ''` (or specific schemas) to prevent search path injection.
- [ ] **RLS Hardening**: New tables MUST have `ALTER TABLE x ENABLE ROW LEVEL SECURITY;`.
- [ ] **Grant/Revoke**: Explicitly REVOKE ALL ON FUNCTION from public/anon where applicable.

### 3. Local Verification
- [ ] **Reset Test**: Run `supabase db reset` locally to ensure the migration is idempotent and doesn't break the shadow database.
- [ ] **Type Check**: Run `npm run supabase:update-types` and verify 0 TypeScript errors in `src/types/database.types.ts`.

## Red Flags
- Functions without `SECURITY DEFINER` and `SET search_path`.
- Permissive RLS policies (`USING (true)`) without clear justification.
- Migrations that skip the `shadow` database check.

## Execution Flow
1. Generate migration SQL.
2. Self-Review against this checklist.
3. Local test using `supabase` CLI.
4. Push using `/db-push` workflow.
