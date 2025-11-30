# Biometric Authentication Deployment Guide

## Database Setup (Run in Supabase SQL Editor)

### 1. Run Database Migrations in Order:

```sql
-- First: Create the passkeys tables
-- File: create_passkeys_table.sql
```

```sql
-- Second: Add rate limiting columns
-- File: add_rate_limiting.sql
```

## Netlify Configuration

### Environment Variables (Required)

Go to Netlify Dashboard → Site Settings → Environment Variables:

```env
SUPABASE_URL=https://yourproject.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
VITE_SUPABASE_URL=https://yourproject.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### Auto-Deploy
- ✅ Already configured via GitHub integration
- ✅ Each push to `main` triggers auto-deployment

## Post-Deployment Verification

### 1. Check Function Deployment
Visit: `https://ricorrenza.fun/.netlify/functions/passkey-challenge`

Should see: `Method Not Allowed` (means function is deployed)

### 2. Test Registration Flow
1. Log in with email/password
2. Navigate to Admin Dashboard → Biometric Login
3. Click "Register New Passkey"
4. Complete biometric prompt
5. Verify passkey appears in list

### 3. Test Login Flow
1. Log out
2. Click "LOGIN WITH BIOMETRIC" on login page
3. Complete biometric prompt
4. Should redirect to `/admin` successfully

### 4. Test Security Features
- ✅ Challenge expiration: Wait 6 minutes, registration should fail
- ✅ Rate limiting: Make 5 incorrect attempts, should get locked out
- ✅ Lockout recovery: Wait 5 minutes, lockout should clear

## Security Checklist

### Pre-Production
- [ ] HTTPS enabled (required for WebAuthn)
- [ ] Domain matches RP_ID (`ricorrenza.fun`)
- [ ] Service role key is set in Netlify (not in code)
- [ ] Database tables created
- [ ] RLS policies enabled
- [ ] Test on multiple devices (iOS, Android, Desktop)

### Post-Production
- [ ] Monitor Netlify function logs for errors
- [ ] Test passkey registration works
- [ ] Test passkey login works
- [ ] Verify rate limiting triggers correctly
- [ ] Check failed attempt counter resets

## Troubleshooting

### "Service role key not set"
**Fix**: Add `SUPABASE_SERVICE_ROLE_KEY` to Netlify environment variables

### "RP_ID is invalid for this domain"
**Fix**: Ensure domain is `ricorrenza.fun`, not Netlify subdomain

### "Passkey not found" after registration
**Fix**: May need to re-register passkey after latest deployment (credential ID format changed)

### Rate limiting not working
**Fix**: Run `add_rate_limiting.sql` migration

## Rollback Plan

If issues arise:
```bash
# Revert to previous commit
git revert HEAD
git push

# Or disable biometric login temporarily
# Comment out "Biometric Login" nav item in AdminDashboard.tsx
# Comment out biometric button in Login.tsx
```

## Support

- GitHub Issues: Report bugs at repository
- Documentation: See `walkthrough.md` for full details
- Security Audit: See `security_audit.md` for security analysis

---

**Status**: ✅ Ready for Production  
**Last Updated**: 2025-11-30  
**Version**: 1.0.0
