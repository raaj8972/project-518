# Website functionality audit — 2 November 2026

This records the pre-repair findings. See [the repair summary](2026-11-02-repair-summary.md) for implemented changes and deployment requirements.

The website has confirmed broken controls, a compilation blocker, payment-flow defects, and authentication inconsistencies. This is a source and local HTTP audit, not a completed logged-in browser acceptance test.

**Scope and evidence**

- Scanned all 376 JavaScript/TypeScript source files under `src`, including routing, public pages, student dashboard, admin panels, coordinator, CR, council, sports, and security flows.
- Inventoried 1,124 native/animated button elements. This is a source-element count, not a count of buttons clicked or unique buttons visible to a user.
- Requested all 375 non-declaration source modules from the running Vite server: 374 returned HTTP 200; `EventForm.tsx` returned HTTP 500. Successful module transformation does not verify rendering, data loading, or button behavior.
- Checked frontend API references against the repository's Netlify function files and reviewed SQL contracts in committed migrations.
- The normal application TypeScript check fails on six syntax diagnostics in `EventForm.tsx`. An additional diagnostic pass, correcting that one JSX mismatch only in memory, exposed 200 further diagnostics, including unused declarations, type mismatches, and undefined runtime references. Application source was not changed.
- Production build failed on a missing local Apple Silicon esbuild dependency before build verification could complete.
- Browser automation failed to connect with a platform error (`missing field sandboxPolicy`). No authenticated account sessions or staging URL were supplied. No real approvals, registrations, payments, emails, messages, password changes, or deletions were submitted.
- Deployed database policies, functions, secrets, and email templates were not inspected. SQL findings below describe the committed schema and require comparison with the deployed database.

**Confirmed application defects**

| ID | Priority | Area / trigger | Broken behavior and evidence | Repair direction |
|---|---|---|---|---|
| F01 | Medium | Unused event-form component / application typecheck | Invalid JSX closing structure in `src/components/admin/events/EventForm.tsx:177` breaks module transformation. HTTP 500 reproduced; TypeScript parsing also fails because the file is included in the application tsconfig. No importing consumer was found: the active EventsManagement panel has its own inline form. This does not establish that the active Events panel crashes or that production bundling includes this component. | Correct or remove the unused component; repeat typecheck. |
| F02 | High | Admin → Roadmap milestones | `src/context/DataContext.tsx:51` reads `core.roadmapMilestones`, but CoreDataContext never provides that property. The real array belongs to EventsContext. `RoadmapMilestonesAdmin.tsx:49` spreads the resulting `undefined`, so opening this panel fails; the public Roadmap also cannot consume configured milestones. | Forward `events.roadmapMilestones`. |
| F03 | High | Student → Active Events rankings | `src/pages/dashboard/ActiveEvents.tsx:162` and `:197` use undeclared `roundsCleared`. Any nonempty approved-profile ranking calculation reaches the undefined value and enters its error handler, leaving ranking information unavailable. | Initialize the counter per profile and verify a dataset with qualified rounds. |
| F04 | High | Coordinator → unanswered-message warning | `src/components/coordinator/CoordinatorDashboard.tsx:1458` uses `motion.div` without importing `motion`. When the SLA warning is shown, rendering throws. The warning is enabled for unanswered conversations at least two hours old. | Import `motion`; verify warning open/dismiss and chat navigation. |
| F05 | High | Public Events → add a paid event → cart checkout | `src/pages/Events.tsx:504` puts only event ID/title/category/team limits into the cart. `CartDrawer.tsx:127` relies on `payment_enabled`, `payment_amount`, and `coordinator_upi_id`, which are absent. Paid items therefore take the nonpayment branch and skip UPI/UTR collection. The committed registration RPC can still leave these registrations `payment_pending`. | Fetch authoritative payment settings for every cart event before checkout and retain the required fields. |
| F06 | Medium | Events → duplicate-registration guard | `Events.tsx:103` stores registration objects, but `:491` uses `userRegistrations.includes(String(eventId))`. That comparison never matches those objects. The guard fails; a backend duplicate check may reject later. | Use an object predicate and consistent state typing. |
| F07 | High | Coordinator → Student Chat | `CoordinatorLogin.tsx:80` creates a random browser token and sessionStorage record, without creating a Supabase Auth session. `shared/ChatPanel.tsx:87` requires `supabase.auth.getUser()` to return a user, and `:92` stops conversation loading otherwise. In a fresh coordinator-only session, chat cannot load or send. Existing staff sessions may mask this defect. | Use a real scoped coordinator identity/session or authorized backend chat endpoints. |
| F08 | High | Admin → Rico Family → committee heads/members → photo upload | `TeamMembersManagement.tsx:364` passes `url` and `onUpload` to ImageUpload. The component requires `currentImage`, `onImageSelect`, and `bucket` (`ImageUpload.tsx:51`). The expected callback is undefined, so uploading cannot update the member form correctly and can fail after upload. | Supply the correct props and team-image bucket. |
| F09 | High | Admin security controls and login repair | `/api/admin-security-controls` and `/.netlify/functions/admin-security-controls` have no implementation in either `netlify/functions` or `api`. Six source references depend on it: user listing, another user's 2FA toggle, forced logout, council credential sync, password bridge, and login auth repair. See `SecuritySettings.tsx:107,139,171`, `AdminPasscodesPanel.tsx:223`, `lib/firebase.ts:32`, `pages/Login.tsx:267`. | Implement authorized handlers or connect controls to existing supported endpoints. |
| F10 | Medium | Owner profile recovery during login | `AuthContext.tsx:204` and `:214` call `.catch()` directly on Supabase upsert builders. The installed SDK's builder has no `.catch` method; verified locally without making a network request. This recovery branch throws instead of completing provisioning. | Await the query and inspect its returned error, or wrap it in a real Promise. |
| F11 | Medium | Admin → Protection Center → Panic Lockdown / Maintenance / Run Integrity Check | `ProtectionCenter.tsx:42` declares a timer that announces scan success without scanning. `:51` only toggles component state for lockdown. Maintenance at `:183` also only changes component state. These controls do not enforce the advertised platform protections or maintenance setting. The security event stream is a hardcoded array (`:240`). | Connect controls and reporting to real server enforcement and actual audit data; accurately label any demonstration UI. |
| F12 | Medium | Student → Cultural Events status | `pages/dashboard/Events.tsx:17` consumes all registrations forwarded by DashboardLayout. Both status badges are hardcoded to “Confirmed” (`:77`, `:89`), even for pending, payment-pending, or rejected registrations. | Render the actual registration status. |
| F13 | Medium | Checkout → register using a group owned by someone else | Cart group lookup includes groups the current student has joined (`CartDrawer.tsx:77`). Checkout constructs participants as current user plus all accepted member rows (`:188` onward), while the owner is not automatically a member row in the group-creation flow (`Teams.tsx:232`). A member checking out can be duplicated while the actual group owner is omitted. Group-size validation also assumes the current user is the owner. | Build a deduplicated participant set from the actual group owner plus accepted members. |
| F14 | Medium | Checkout → save payment reference | `CartDrawer.tsx:239` and `:283` await `payment_submissions.insert(...)` without inspecting its returned error. Registration is already marked successful in local state. A failed payment-record insert can silently lose the UTR while checkout reports success. | Check insertion errors and make failed payment submission retryable. |
| F15 | Medium | Event card → Watch Live visibility transition | `WatchLiveButton.tsx:45` returns early before hooks for missing/invalid inputs; `:58` returns before later hooks when the event is outside its lead window. Changing props/time across these boundaries changes hook ordering and can cause a React hook-order error. A hidden button also does not start its own countdown interval. | Call hooks consistently before conditional rendering; verify hidden → countdown → live transitions. |

**Unwired enabled controls**

These controls have no implementation for their advertised action in the active component code. No logged-in browser click is claimed. Pass-card controls can bubble to the card's “open pass” handler, but their named wallet/directions/status action is still absent.

| Panel / page | Control | Source |
|---|---|---|
| Student → Cultural Events | Add to Cal | `src/pages/dashboard/Events.tsx:109` |
| Student → Cultural Events | Share | `src/pages/dashboard/Events.tsx:112` |
| Student → Entry Pass | Add to Wallet | `src/components/dashboard/EntryPass.tsx:233` |
| Student → Entry Pass | Directions | `src/components/dashboard/EntryPass.tsx:240` |
| Student → Entry Pass | Gate Status | `src/components/dashboard/EntryPass.tsx:246` |
| Admin layout | Notification bell | `src/components/admin/layout/AdminLayout.tsx:364` |
| Admin → Protection Center | Logs Cache | `src/components/admin/ProtectionCenter.tsx:178` |
| Admin → Protection Center | Download Security Audit PDF | `src/components/admin/ProtectionCenter.tsx:259` |
| Admin → Student Pass Management | Right-arrow action beside each student | `src/components/admin/StudentPassManagement.tsx:571` |
| Public → Home Bound | Main Play button | `src/pages/HomeBound.tsx:71` |
| Public → Home Bound → artist card | Artist Play button | `src/components/HomeBound/ArtistScrollSection.tsx:38` |

Three admin footer links — Documentation, Support, and Logs — use only `href="#"` (`AdminLayout.tsx:388–390`). They have no useful destination.

Two more unwired buttons, Full Archive and Protocol, exist in `admin/dashboard/IdentityDatabase.tsx:34,87`. No importing consumer was found, so they are recorded as unused-component defects rather than currently reachable UI failures.

The disabled pre-start Watch Live button, intentionally disabled Follow button when Instagram is unconfigured, and GuestArtistForm's external `form="guest-artist-form"` submit button were excluded from the dead-button list.

**Database-contract defects requiring deployed-schema verification**

| ID | Priority | Area | Repository evidence and consequence |
|---|---|---|---|
| D01 | High | Security → online QR scan | `offlineStorage.ts:455` calls `validate_entry_pass` with `p_pass_token` and `p_scanned_by`. The committed baseline defines only the one-parameter function (`20260326000000_baseline.sql:2149`), and no later migration defines a compatible overload. A database matching the repository rejects this call and the client falls back to offline validation. |
| D02 | Medium | Security → invalid/already-used/inactive scan feedback | The same client reads `data.error_code` and `data.reason`; the committed RPC returns `result` and `message`. Even after resolving the signature mismatch, specific rejection reasons are lost. |
| D03 | High | Security → sync offline scans, then rescan on another device | `syncPendingScansToServer` (`offlineStorage.ts:339`) inserts a scan log without invoking the online validator or reporting consumption conflicts. Refined during implementation: baseline triggers can resolve `pass_id` from the token, so the original assumption that these rows never participate in duplicate detection was too broad. The replacement uses the same atomic, idempotent validator for online scans and offline reconciliation. |
| D04 | High | Council → passcode verification | The verify-council backend calls `verify_council_password`, but that RPC has no definition in the committed migrations. Its fallback accepts `security_settings.council_passcode`. Council dashboard RPCs instead verify `council_password_hash` (`baseline.sql:1005,1136`), while AdminPasscodesPanel saves only the plaintext passcode (`:121`). With a repository-only deployment, changing the visible passcode need not update the password accepted by the dashboard. |
| D05 | High | Council → list VIP passes | `get_council_vip_passes_v3` declares its `pass_type` result as the enum, while `entry_passes.pass_type` is text (`baseline.sql:1136,2753`), and its query returns the text column without a cast. PostgreSQL can reject the result structure. It also omits `valid_date`, while `CouncilDashboard.tsx:658` uses that field; date-specific passes can be displayed as All-Day Access. |
| D06 | High | Registration and CR permission boundaries | Latest `register_cart_event` (`20260629000007_update_register_cart_event.sql`) does not check the registration-open flag/window, caller's approval, or ownership/membership of the supplied user IDs. `approve_student_profile` (`20260628000011_cr_approval_security.sql:40`) validates CR credentials for a batch but does not require the target student's batch to match. These committed functions do not enforce the UI's intended boundaries. Verify deployed functions before treating those restrictions as effective. |

**Authentication and security defects found during flow tracing**

- **Critical: privileged database key in client source.** A hardcoded JWT whose payload declares `service_role` is present in `coordinator/EventRoundsSection.tsx:44` and `admin/CoordinatorPasswordManagement.tsx:98`, and is used in browser REST calls. Its live validity was not tested. Remove the client secret, rotate/revoke it if active, and move privileged calls behind authorized backend handlers. The key is deliberately omitted from this report and artifacts.
- **High: frontend master bypass secret.** `AuthContext.tsx:383` reads `VITE_MASTER_BYPASS_KEY` for its rescue login path. Any configured VITE-prefixed secret is part of the client environment. That path also creates only local owner state, so a successful-looking rescue login does not establish the Supabase session required by protected operations. Do not use a client-visible shared secret for privileged recovery.
- **High: failed admin authorization can grant local access.** `AuthContext.tsx:147` resolves an admin whitelist timeout with `allowed: true, role: 'admin'`. Database/API authorization may still reject actions, but the UI authorization layer fails open on a slow lookup.
- **Medium: security settings PIN is not checked.** `SecuritySettings.tsx:91` marks any nonempty PIN as verified. It provides no actual PIN verification.
- **High: coordinator access check is entirely client-side.** `CoordinatorLogin.tsx:74` compares a password already downloaded with public event data and generates an unsigned token. Coordinator database reads/writes do not authenticate that token. The committed baseline additionally contains anonymous update policies for events and registrations (`:5163,5167`). These controls do not enforce coordinator isolation in a database matching those policies.

**Local environment and deployment blockers**

1. The running command is `npm run dev`, which starts Vite only. There is no Vite API proxy. Read-only probes of `/api/health` and `/api/admin-security-controls` both returned `200 text/html`, serving the SPA document instead of JSON. Council/sports login, email/reset APIs, AI tools, R2 uploads, admin operations, and other backend-dependent features cannot be accepted on this server setup. Use the configured Netlify development environment with its required backend variables to test those flows.
2. The production-build check failed because `@esbuild/darwin-arm64` is missing from the installed dependency tree. This is an environment blocker, separately from F01's source syntax failure.
3. `api/` contains only a placeholder and a tsconfig. `vercel.json` does not route `/api/*` to Netlify functions. A Vercel deployment of this tree has no implementations for those frontend API routes. Netlify has the relevant function files and redirect mapping, except for the missing security-controls endpoint in F09.
4. `noise.png` was reported missing by the production build. This is cosmetic and lower priority than the panel/functionality defects.

**Coverage and remaining acceptance work**

| Area | Checked here | Still requires a working browser and authorized test environment |
|---|---|---|
| Public pages: home, events, schedule, gallery, Home Bound, Rico Family, sponsors, sports | Route wiring, source-module transforms, visible control wiring, shared providers and API references | Desktop/mobile rendering, filters with real data, modal focus/scroll, media, downloads and external links |
| Student | Login/profile source; overview, announcements, chat, passes, cultural/sports registrations, stories, community, active events, teams, settings, cart | Real login/approval; team invites, checkout/payment, cancellation, uploads, real-time updates and download output |
| Admin/owner | Lazy panel imports, event/team/roadmap forms, security/credential controls, provider exports, uploads, API mapping, unwired controls | Every CRUD form with test fixtures; permissions per role; exports, storage, AI, emails, session management and approval workflows |
| Coordinator | Event/password/session handling, participants/status handlers, grouping, chat, rounds, payment settings and exports | Scoped login, RLS outcomes, actual status/payment/round updates, chat delivery, export contents and reconnect behavior |
| CR | Batch login RPC, profile listing, individual/bulk approval handlers and approval SQL | Login for each batch; approval/revoke; target-batch enforcement; partial bulk failures and expired sessions |
| Council | Login/function contract, dashboard stats RPC, VIP create/list/delete source and QR modal | Successful authentication, hash/plaintext consistency, VIP list/query contract, date restrictions and QR output |
| Sports staff | Passcode API, shared admin login handoff, annual match scheduling/provider wiring | Live passcode lookup and account provisioning; sports role restrictions; team/auction/match/registration writes |
| Security staff | Login RPC, scanner handlers, manual search, offline sync, validator SQL contract | Camera permission and device scan; valid/invalid/reused/wrong-day QR cases; multiple devices; offline-to-online reconciliation |

No area is marked fully passed. A module returning 200 and a button having an onClick handler are insufficient proof that its full user workflow works.

**Suggested repair order**

1. Remove/rotate exposed privileged client secrets and close fail-open authorization paths.
2. Fix F02–F04 so the affected panels render/load their data; resolve F01 to restore application typechecking.
3. Start the actual backend locally and implement/replace the missing security-controls endpoint.
4. Correct paid checkout, coordinator authentication/chat, and gate-scan database contracts.
5. Repair uploads/status displays and wire or remove misleading/dead controls.
6. Complete the remaining role-by-role browser acceptance tests using test accounts and disposable data.

**Artifacts**

- `source-inventory.json`: button candidates, API-reference locations, parse diagnostics, and scan scope.
- `module-http-results.tsv`: all local module HTTP results.
- `typescript-diagnostics.json`: additional diagnostics from the in-memory syntax-corrected analysis; these are not all user-visible bugs.

At the time of the initial audit, application source was left unchanged. The pre-existing modification to `public/sitemap.xml` was preserved.
