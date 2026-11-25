# Dashboard access review — 22 November 2026

Scope: local source, API authorization tests, and isolated PostgreSQL-compatible policy tests. No production data was read or changed. This review is not a claim that the deployed database has the repository's migrations applied.

## Findings and repairs

1. Council management accepted a valid encrypted session without rechecking the current password/enabled setting before service-role table operations. A rotated/disabled credential could therefore retain suite access for the session lifetime. Every management request now revalidates the council credential; failed authorization checks return 503, invalid credentials return 401, before table access. The rate-limit check now fails closed on unavailable or malformed results.
2. The 21 November all-portals migration overwrote `session_is_current`, dropping the MFA and revoked-admin-account checks from the 19 November repair. The new 22 November migration restores both checks, including treating a missing AAL claim as insufficient when MFA is enrolled.
3. Profile creation did not restrict the approval field. A student could supply `is_approved=true` during their initial insert even though later approval changes were guarded. New restrictive INSERT rules require their own ID and an unapproved profile; DELETE is staff-only.
4. Older sports INSERT policies could permit submitting another student's ID or an approved status. The new migration enforces ownership and pending status, private reads, and assigned staff permissions for status changes/deletion. It revokes anonymous table and column access. Students must sign in to submit sports registrations; student edits to submitted sports records require staff assistance under these rules.
5. Admin UI still contained email/master-flag privilege shortcuts, despite server/database checks. Those shortcuts were removed; UI roles derive from admin membership records. This does not replace server authorization.

## Access boundaries checked

- Student A cannot read Student B's private profile, event registration or QR token in policy fixtures, or update/delete their profile or approve their registration.
- Forged user metadata containing owner/master flags does not confer database staff privileges.
- Anonymous users cannot access private profile, registration, pass, sports, or credential tables in tested fixtures.
- API tests deny anonymous privileged actions, unassigned admin pages, non-owner account administration, wrong-user passkey enrollment, revoked sessions, and insufficient MFA.
- Coordinators are restricted to their signed event; CR fixtures verify batch-scoped approval.
- Ordinary student/admin bearer JWTs are not council-session credentials.
- Sports fixture tests cover private reads, forged ownership, self-approval, unauthorized status changes, and deletion.

## Intended sharing and remaining limitations

- Public profile cards, ranking/winner names, and accepted group-member contact sharing are explicit product behavior; these differ from another student's private dashboard or session.
- Owners intentionally have broad administration access. Assigned admins intentionally manage records within permitted areas.
- Council is a shared-password workspace. All holders of the same council password share access to tasks, budgets, sponsors, announcements and VIP workflows. Individual council-member ownership, per-member revocation, and attribution require individual identities and permission rules; they are not implemented by this patch.
- Coordinator and CR portal credentials are scoped to an event/batch rather than an individual staff member.
- The database tests use representative schemas and deliberately permissive legacy policies; they do not apply the entire historical migration chain or validate the deployed schema.
- Production verification with separate test students, a restricted admin, an owner, a coordinator, a CR and council credentials remains outstanding.

## Activation

Deploy the updated API code and apply `supabase/migrations/20261122000000_restore_portal_session_guards.sql` after the existing 19/21 November security migrations. Applying the file to a production database has not been performed in this session. Test the role matrix against the deployed environment before declaring production isolation verified.

## Validation result

82 tests passed across 12 focused security/portal test files. `npm run check:types` passed. New regression cases cover rotated council sessions, unavailable authorization/rate limiting, cross-student writes, forged metadata, approved-profile inserts, revoked administrator accounts and sports ownership/status isolation.
