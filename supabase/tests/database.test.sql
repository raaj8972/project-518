begin;
select plan(6);

-- Check if table exists
select has_table('biometric_profiles');

-- Check columns
select has_column('biometric_profiles', 'user_id');
select col_is_pk('biometric_profiles', 'user_id');

-- Check RLS is enabled
-- We use native postgres check because pgTAP's rls_enabled is sometimes tricky depending on version
select ok(
  (select relrowsecurity from pg_class where relname = 'biometric_profiles'),
  'RLS should be enabled on biometric_profiles'
);

-- Test a policy (simplified example)
-- We use a custom check since has_policy is not standard in some pgTAP versions
select ok(
  exists (
    select 1 from pg_policies 
    where tablename = 'biometric_profiles' 
    and policyname = 'admin_own_biometric_select'
  ),
  'Policy admin_own_biometric_select should exist on biometric_profiles'
);

-- Add a test for a known global policy to verify the test framework works
select ok(
  exists (
    select 1 from pg_policies 
    where tablename = 'events' 
    and policyname = 'Allow anon to update event status'
  ),
  'Global policy Allow anon to update event status should exist'
);

select * from finish();
rollback;

