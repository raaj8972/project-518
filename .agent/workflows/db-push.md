---
description: Push new Supabase migrations to the remote database
---

# Push Migrations to Remote Supabase

Use this workflow whenever you create a new migration file and want to apply it to production.

## Prerequisites
- Docker Desktop must be running (check for whale icon in menu bar)
- Must be logged into Supabase CLI (one-time setup below)

## One-time Setup: Persist Access Token


Add your Supabase access token (generate one at [https://supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens)) to your shell:

```bash
# WARNING: Never commit your actual token to version control!
echo 'export SUPABASE_ACCESS_TOKEN="your_personal_access_token_here"' >> ~/.zshrc
source ~/.zshrc
```

## Workflow Steps

// turbo
1. Check current migration status (local vs remote):
```bash
npm run db:status
```

// turbo
2. Create a new migration file (replace `<name>` with a descriptive name):
```bash
npm run db:new -- <name>
# Example: npm run db:new -- add_user_roles
# This creates: supabase/migrations/<timestamp>_<name>.sql
```

3. Write your SQL in the generated migration file.

// turbo
4. Push all pending migrations to remote:
```bash
npm run db:push
```

## Troubleshooting

**"Remote migration versions not found in local directory"**
Run the repair command with the listed versions, then push again:
```bash
npx supabase migration repair --status reverted <version1> <version2> ...
npm run db:push
```

**"Access token not provided"**
Make sure the token is in your shell:
```bash
echo $SUPABASE_ACCESS_TOKEN
```
If empty, re-run the one-time setup above.

**"type already exists" errors**
Your migration has a `CREATE TYPE` that already exists remotely. Use:
```sql
DO $$ BEGIN
  CREATE TYPE your_type AS ENUM ('value1', 'value2');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
```
