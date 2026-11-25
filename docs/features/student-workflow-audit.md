# Student workflow audit — 23 November 2026

The student journey now uses this sequence:

1. Browse the published event catalogue. Google login retains the chosen local event destination. Its callback uses the same profile setup as `/dashboard`; the obsolete username completion form has been removed.
2. Add a full name, a valid 10–15 digit phone number, batch and unique college IQMG number. Duplicate claims show a correction message and retain the typed value. Technical Help works before profile completion or account approval.
3. Account approval is separate from college roster verification. Pending accounts wait for admin approval. Approved students with complete profiles and an IQMG claim can register individually. Every participant in a team must have a verified college IQMG and an accepted membership. PDF extraction still needs a Gemini-enabled server key.
4. Both individual and team registration go to reviewed cart checkout. It refreshes availability, event mode, team membership/size and current prices, then checks the student's schedule before showing payment instructions. A manually closed switch always stops entries. An enabled registration window also enforces its opening/closing times; disabled timers ignore saved window fields.
5. Free individual/team entries are `pending` and inactive. Paid entries and their transaction reference are stored atomically as `payment_pending` and inactive. No student cart path auto-approves a team. Amount and recipient snapshots must still match at the server when submitting. Existing registrations/payment records are not rewritten.
6. The coordinator/admin reviews entries. Only approved, active registrations unlock the private WhatsApp group. Team acceptance alone does not unlock it. Issued passes appear in Entry pass, with date/use status, download/share and a current gate-status check; an event registration does not itself issue a festival pass.
7. Notifications, reminders, points and support retain their existing connected services. Both incoming invitations and captain join requests are described as team requests. Team names now display correctly for cart-created registrations, including those without a legacy `teams` relation.

## Defects fixed

- Google callback still requested an obsolete username and had no IQMG input, preventing first-time completion.
- Profile completion sent an empty PATCH after claiming IQMG. It now refreshes directly; profile validation is shared with Settings.
- Paid individual registration used a direct insert that conflicted with registration RLS. Production registration now uses one atomic checkout path.
- The live legacy cart function automatically approved free teams and trusted caller-provided participant details. The replacement validates session, approved complete profiles, IQMG, accepted membership, event window/mode/capacity and duplicates, and reads participant details from authoritative tables.
- Individual events could be treated as teams merely because unused team-size limits existed. Event mode and the student's allowed choice now determine this.
- Payment details changing during checkout could retain a reference for the previous amount/recipient. The client invalidates it; the server also checks the displayed snapshot.
- Late profile/dashboard requests could restore data from an earlier session. Session versions and account-scoped results prevent those responses from replacing the current student's data.
- Manual registration closure and scheduled windows disagreed between catalogue and checkout. Both layers now apply the same rules.

Migration: `20261123080000_student_checkout_review.sql`. It replaces the unsafe internal cart function, adds `checkout_student_event` with an expected payment snapshot, revokes student execution of legacy checkout, and requires direct registration inserts to come from authorized staff. Existing records remain unchanged.

## Verification and limits

The automated checks cover first-time OAuth callback routing through IQMG setup, duplicate claims, invalid phone numbers, approval waiting, technical help, return to the chosen event, account-switch races, accepted-team checkout, price changes, registration windows, atomic payment evidence and coordinator-only WhatsApp unlock. Database fixtures apply the checkout migration twice and combine it with the real WhatsApp RLS migration.

Live browser checks reached profile completion and Technical Help without entering a fake IQMG or sending a support message. The browser session later displayed guest login; the approved-student and coordinator actions were verified using isolated UI/database fixtures. No real registration, payment submission or test identity was created.

A generated synthetic PDF was checked against the configured Google key again. The Generative Language API still returned `403 PERMISSION_DENIED / ACCESS_DENIED`. Set a Gemini-enabled `GEMINI_API_KEY` on the server to enable the PDF extraction step; keys are never placed in the client bundle.

The checkout migration was installed on the connected database. Live metadata checks confirmed that authenticated students can execute the new reviewed checkout, anonymous callers and the old cart entry points cannot, the cart function has no team auto-approval branch, and the staff-only direct-insert restriction is active. Existing registration and payment row counts were preserved during installation. The focused student suites and the related public-events/coordinator suites passed after updating their fixtures to include the current profile/approval contract. TypeScript, the production build and the security scan also passed with no security findings.
